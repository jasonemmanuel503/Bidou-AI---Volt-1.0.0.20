import { GoogleGenAI } from '@google/genai';
import { GenerationTaskContext, VariantDispatchResult } from './types';
import { saveGenerationAsset } from '../storage';
import { recordProviderFailure, recordProviderSuccess } from './health';
import { isDemoMode, isLiveMode } from '../config/mode';
import { IMAGE_ROUTES } from '../../src/services/providerCatalog';
import { resolveGoogleModelId } from './routing';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

/**
 * Imagen Image Provider Adapter
 * Native batching with sampleCount: n (or concurrent generation).
 * Writes each image to storage and updates variant status.
 */
export async function executeImageGeneration(
  ctx: GenerationTaskContext
): Promise<VariantDispatchResult[]> {
  const { userId, jobId, prompt, enhancedPrompt, aspectRatio = '1:1', variantCount } = ctx;
  const activePrompt = enhancedPrompt || prompt;
  const n = Math.max(1, Math.min(variantCount, 4));

  const results: VariantDispatchResult[] = [];
  const ai = getGemini();

  if (!process.env.GEMINI_API_KEY) {
    if (isLiveMode()) {
      for (let i = 0; i < n; i++) {
        results.push({
          status: 'failed',
          errorMessage: 'PROVIDER_KEY_MISSING',
        });
      }
      return results;
    }
  }

  if (ai && process.env.GEMINI_API_KEY) {
    // Route to the exact model tier the customer paid for (Nano Banana 2 Lite / Flash / Pro)
    const route = IMAGE_ROUTES[ctx.model.model_name];
    if (!route) {
      console.error(`[Image Provider] Unknown model_name: ${ctx.model.model_name}; failing closed`);
      if (isLiveMode()) {
        return Array.from({ length: n }).map(() => ({
          status: 'failed' as const,
          errorMessage: 'MODEL_NOT_CONFIGURED',
        }));
      }
    }
    const defaultModelId = route?.googleModelId || 'gemini-3.1-flash-image';
    const googleModel = resolveGoogleModelId(ctx.model.model_name || 'nano_banana_2', defaultModelId);
    const imageSize = route?.imageSize || (ctx.model.quality_tier === 'pro' ? '2K' : '1K');
    try {
      // 1. Attempt generateImages (Imagen API) with native numberOfImages
      let imagesData: { buffer: Buffer; mime: string }[] = [];

      try {
        const response: any = await (ai.models as any).generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: activePrompt,
          config: {
            numberOfImages: n,
            aspectRatio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1',
            outputMimeType: 'image/png',
          },
        });

        if (response?.generatedImages?.length) {
          imagesData = response.generatedImages.map((img: any) => ({
            buffer: Buffer.from(img.image.imageBytes, 'base64'),
            mime: 'image/png',
          }));
        }
      } catch (imagenErr: any) {
        console.warn('[Imagen] generateImages direct call failed, attempting generateContent fallback:', imagenErr?.message);
        
        // Fallback to gemini-3.1-flash-image with concurrent calls for n variants
        const calls = Array.from({ length: n }).map(async (_, idx) => {
          const resp = await ai.models.generateContent({
            model: googleModel,
            contents: {
              parts: [{ text: `${activePrompt} (variation ${idx + 1}, seed ${Date.now() + idx})` }],
            },
            config: {
              imageConfig: {
                aspectRatio: (aspectRatio as any) || '1:1',
                imageSize,
              },
            } as any,
          });

          for (const part of resp.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              return {
                buffer: Buffer.from(part.inlineData.data, 'base64'),
                mime: part.inlineData.mimeType || 'image/png',
              };
            }
          }
          return null;
        });

        const settled = await Promise.allSettled(calls);
        for (const s of settled) {
          if (s.status === 'fulfilled' && s.value) {
            imagesData.push(s.value);
          }
        }
      }

      if (imagesData.length > 0) {
        recordProviderSuccess('google');

        // Process returned images
        for (let i = 0; i < n; i++) {
          const img = imagesData[i];
          if (img) {
            const url = await saveGenerationAsset({
              userId,
              jobId,
              variantIndex: i,
              extension: 'png',
              contentType: img.mime,
              data: img.buffer,
            });

            results.push({
              status: 'completed',
              outputUrl: url,
              thumbnailUrl: url,
              storagePath: `${userId}/${jobId}/${i}.png`,
            });
          } else {
            // Content filtered or missing
            results.push({
              status: 'failed',
              errorMessage: isLiveMode()
                ? 'PROVIDER_UNAVAILABLE'
                : 'Safety filter blocked variant or generation failed',
            });
          }
        }

        return results;
      }
    } catch (err: any) {
      console.error('[Imagen Provider] Generation failed:', err);
      recordProviderFailure('google');
      if (isLiveMode()) {
        for (let i = 0; i < n; i++) {
          results.push({
            status: 'failed',
            errorMessage: 'PROVIDER_UNAVAILABLE',
          });
        }
        return results;
      }
    }
  }

  if (isLiveMode()) {
    for (let i = 0; i < n; i++) {
      results.push({
        status: 'failed',
        errorMessage: 'PROVIDER_UNAVAILABLE',
      });
    }
    return results;
  }

  // DEMO ONLY: aspect-correct placeholder with visible processing delay
  const [w, h] = aspectRatio === '16:9' ? [1280, 720] : aspectRatio === '9:16' ? [720, 1280] : [1024, 1024];
  for (let i = 0; i < n; i++) {
    await sleep(2200 + i * 350);
    const placeholderUrl = `https://picsum.photos/seed/${jobId}-${i}/${w}/${h}`;
    results.push({
      status: 'completed',
      outputUrl: placeholderUrl,
      thumbnailUrl: placeholderUrl,
    });
  }

  return results;
}
