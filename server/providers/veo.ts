import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { GenerationTaskContext, VariantDispatchResult } from './types';
import { saveGenerationAsset } from '../storage';
import { recordProviderFailure, recordProviderSuccess } from './health';
import { isDemoMode, isLiveMode } from '../config/mode';
import { VEO_ROUTES, normalizeVideoParams } from '../../src/services/providerCatalog';
import { resolveGoogleModelId } from './routing';
import crypto from 'crypto';

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

/**
 * Veo 3.1 Video Provider Adapter (Asynchronous LRO)
 * Veo does not batch natively; dispatches n calls with randomized seeds.
 */
export async function startVeoVariants(
  ctx: GenerationTaskContext
): Promise<VariantDispatchResult[]> {
  const { prompt, enhancedPrompt, aspectRatio = '16:9', resolution = '720p', durationSeconds = 8, variantCount, model } = ctx;
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
    // Look up the exact model the user paid for (NEVER route a Lite user to Standard or vice versa)
    const route = VEO_ROUTES[model.model_name];
    if (!route) {
      console.error(`[Veo] Unknown model_name: ${model.model_name}; cannot route to Google`);
      if (isLiveMode()) {
        return Array.from({ length: n }).map(() => ({
          status: 'failed' as const,
          errorMessage: 'MODEL_NOT_CONFIGURED',
        }));
      }
    }
    const defaultModelId = route?.googleModelId || 'veo-3.1-lite-generate-preview';
    const modelName = resolveGoogleModelId(model.model_name || 'veo_3_1_lite', defaultModelId);
    const normalized = normalizeVideoParams(resolution, durationSeconds);

    const dispatchPromises = Array.from({ length: n }).map(async (_, idx) => {
      try {
        const config: any = {
          numberOfVideos: 1,
          aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
          resolution: normalized.resolution,
          durationSeconds: normalized.durationSeconds,
        };

        // Only supply seed if Vertex Project ID is present (Enterprise mode)
        if (process.env.GOOGLE_VERTEX_PROJECT_ID) {
          config.seed = Math.floor(Math.random() * 1000000);
        }

        const op: any = await ai.models.generateVideos({
          model: modelName,
          prompt: activePrompt,
          config,
        });

        recordProviderSuccess('google');
        return {
          providerJobId: op?.name || `veo_op_${crypto.randomUUID()}_${idx}`,
          status: 'processing' as const,
        };
      } catch (err: any) {
        console.error(`[Veo Provider] Error dispatching variant ${idx}:`, err);
        recordProviderFailure('google');

        if (isLiveMode()) {
          return {
            status: 'failed' as const,
            errorMessage: 'PROVIDER_UNAVAILABLE',
          };
        }

        // Fallback simulation only in demo mode
        return {
          providerJobId: `sim_veo_${crypto.randomUUID()}_${idx}`,
          status: 'processing' as const,
        };
      }
    });

    const settled = await Promise.allSettled(dispatchPromises);
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        results.push({
          status: 'failed',
          errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : (s.reason?.message || 'Failed to dispatch Veo operation'),
        });
      }
    }

    return results;
  }

  if (isLiveMode()) {
    for (let i = 0; i < n; i++) {
      results.push({
        status: 'failed',
        errorMessage: 'PROVIDER_KEY_MISSING',
      });
    }
    return results;
  }

  // Fallback simulation when provider key is missing (DEMO ONLY)
  for (let i = 0; i < n; i++) {
    results.push({
      providerJobId: `sim_veo_${crypto.randomUUID()}_${i}`,
      status: 'processing',
    });
  }

  return results;
}

/**
 * Polls an individual Veo operation status.
 */
export async function pollVeoOperation(params: {
  operationName: string;
  userId: string;
  jobId: string;
  variantIndex: number;
}): Promise<VariantDispatchResult> {
  const { operationName, userId, jobId, variantIndex } = params;

  // Handle simulated / mock operations
  if (operationName.startsWith('sim_veo_')) {
    if (isLiveMode()) {
      return {
        status: 'failed',
        errorMessage: 'PROVIDER_UNAVAILABLE',
      };
    }
    // Complete after mock delay (DEMO ONLY)
    return {
      status: 'completed',
      outputUrl: '/samples/demo-video.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=80',
    };
  }

  const ai = getGemini();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!ai || !apiKey) {
    return {
      status: 'failed',
      errorMessage: 'PROVIDER_KEY_MISSING',
    };
  }

  try {
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated: any = await ai.operations.getVideosOperation({ operation: op });

    if (!updated.done) {
      return {
        providerJobId: operationName,
        status: 'processing',
      };
    }

    if (updated.error) {
      recordProviderFailure('google');
      return {
        status: 'failed',
        errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : (updated.error.message || 'Veo generation error'),
      };
    }

    // Video generation completed
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return {
        status: 'failed',
        errorMessage: 'Operation marked done but video URI was missing',
      };
    }

    // Download the video buffer with server-side API key
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download Veo MP4: HTTP ${videoRes.status}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to storage
    const outputUrl = await saveGenerationAsset({
      userId,
      jobId,
      variantIndex,
      extension: 'mp4',
      contentType: 'video/mp4',
      data: buffer,
    });

    recordProviderSuccess('google');
    return {
      status: 'completed',
      outputUrl,
      storagePath: `${userId}/${jobId}/${variantIndex}.mp4`,
    };
  } catch (err: any) {
    console.error('[Veo Poller] Error checking operation:', err);
    recordProviderFailure('google');
    return {
      status: 'failed',
      errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : (err?.message || 'Failed to poll or download Veo video'),
    };
  }
}
