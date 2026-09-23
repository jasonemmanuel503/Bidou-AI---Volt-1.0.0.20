import { GenerationTaskContext, VariantDispatchResult } from './types';
import { recordProviderFailure, recordProviderSuccess } from './health';
import { saveGenerationAsset } from '../storage';
import { isDemoMode, isLiveMode } from '../config/mode';
import crypto from 'crypto';

const MUSICAPI_BASE_URL = process.env.MUSICAPI_BASE_URL || 'https://api.musicapi.ai';

interface MusicTaskResult {
  taskId: string;
  clips?: Array<{ audio_url: string; image_url?: string; title?: string }>;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * MusicAPI.ai & Lyria Music Provider Adapter
 * Generates 2 takes (clips) per task and maps them onto variant indices 0 and 1.
 */
export async function startMusicTask(
  ctx: GenerationTaskContext
): Promise<VariantDispatchResult[]> {
  const { prompt, enhancedPrompt, genre = 'Afrobeats', lyrics } = ctx;
  const activePrompt = lyrics || enhancedPrompt || prompt;
  const apiKey = process.env.MUSICAPI_API_KEY;

  if (!apiKey && isLiveMode()) {
    return [
      { status: 'failed', errorMessage: 'PROVIDER_KEY_MISSING' },
      { status: 'failed', errorMessage: 'PROVIDER_KEY_MISSING' },
    ];
  }

  if (apiKey) {
    try {
      const response = await fetch(`${MUSICAPI_BASE_URL}/api/v1/sonic/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: activePrompt,
          tags: genre,
          title: prompt.slice(0, 50),
          mv: 'sonic-v3-5',
          make_instrumental: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`MusicAPI HTTP error: ${response.status} ${response.statusText}`);
      }

      const resJson: any = await response.json();
      const taskId = resJson?.task_id || resJson?.data?.task_id;
      if (!taskId) {
        throw new Error('MusicAPI responded without a task_id');
      }

      recordProviderSuccess('musicapi');

      // Return 2 processing variants linked to this single task ID
      return [
        { providerJobId: `${taskId}:0`, status: 'processing' },
        { providerJobId: `${taskId}:1`, status: 'processing' },
      ];
    } catch (err: any) {
      console.error('[MusicAPI Provider] Error starting task:', err);
      recordProviderFailure('musicapi');
      if (isLiveMode()) {
        return [
          { status: 'failed', errorMessage: 'PROVIDER_UNAVAILABLE' },
          { status: 'failed', errorMessage: 'PROVIDER_UNAVAILABLE' },
        ];
      }
    }
  }

  if (isLiveMode()) {
    return [
      { status: 'failed', errorMessage: 'PROVIDER_KEY_MISSING' },
      { status: 'failed', errorMessage: 'PROVIDER_KEY_MISSING' },
    ];
  }

  // Fallback high-fidelity musical takes for preview / demo environments (DEMO ONLY)
  const simBatchId = crypto.randomUUID();
  return [
    {
      providerJobId: `sim_music_${simBatchId}:0`,
      status: 'processing',
    },
    {
      providerJobId: `sim_music_${simBatchId}:1`,
      status: 'processing',
    },
  ];
}

/**
 * Polls a MusicAPI task or completes simulated takes.
 */
export async function pollMusicTask(params: {
  providerJobId: string;
  userId: string;
  jobId: string;
  variantIndex: number;
}): Promise<VariantDispatchResult> {
  const { providerJobId, userId, jobId, variantIndex } = params;
  const [taskId] = providerJobId.split(':');

  if (taskId.startsWith('sim_music_')) {
    if (isLiveMode()) {
      return {
        status: 'failed',
        errorMessage: 'PROVIDER_UNAVAILABLE',
      };
    }
    // Return curated authentic musical clips (DEMO ONLY)
    const sampleTakes = [
      '/samples/demo-track.mp3',
      '/samples/demo-track-2.mp3',
    ];
    const takeUrl = sampleTakes[variantIndex % sampleTakes.length];
    return {
      status: 'completed',
      outputUrl: takeUrl,
      thumbnailUrl: '/samples/demo-track.mp3',
    };
  }

  const apiKey = process.env.MUSICAPI_API_KEY;
  if (!apiKey) {
    return {
      status: 'failed',
      errorMessage: 'PROVIDER_KEY_MISSING',
    };
  }

  try {
    const res = await fetch(`${MUSICAPI_BASE_URL}/api/v1/sonic/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`MusicAPI poll failed with status ${res.status}`);
    }

    const resJson: any = await res.json();
    const data = resJson?.data || resJson;
    const taskStatus = (data?.status || '').toLowerCase();

    if (taskStatus === 'processing' || taskStatus === 'queued') {
      return {
        providerJobId,
        status: 'processing',
      };
    }

    if (taskStatus === 'failed' || taskStatus === 'error') {
      recordProviderFailure('musicapi');
      return {
        status: 'failed',
        errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : (data?.error_message || 'Music generation failed'),
      };
    }

    // Success: extract the corresponding take (0 or 1)
    const clips = data?.clips || data?.tracks || [];
    const clip = clips[variantIndex] || clips[0];

    if (!clip?.audio_url) {
      return {
        status: 'failed',
        errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : `Clip take #${variantIndex} audio was not returned by provider`,
      };
    }

    recordProviderSuccess('musicapi');
    return {
      status: 'completed',
      outputUrl: clip.audio_url,
      thumbnailUrl: clip.image_url || undefined,
    };
  } catch (err: any) {
    console.error('[MusicAPI Poller] Exception during task poll:', err);
    recordProviderFailure('musicapi');
    return {
      status: 'failed',
      errorMessage: isLiveMode() ? 'PROVIDER_UNAVAILABLE' : (err?.message || 'Music task polling exception'),
    };
  }
}
