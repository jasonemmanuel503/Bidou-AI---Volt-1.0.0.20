// Bidou AI Provider Catalog
/**
 * BIDOU AI - Provider Catalog (SINGLE SOURCE OF TRUTH for what we actually call and what Google bills us)
 *
 * Shared by the browser (quote preview) and the server (real provider calls + authoritative quote).
 * Pure data + pure functions only: no `process.env`, no Node APIs, safe to bundle for the client.
 *
 * RULES
 *  1. The tier a customer pays for MUST be the tier that is actually called. Never silently swap models.
 *  2. Prices below are Google's published API prices (verify at https://ai.google.dev/gemini-api/docs/pricing
 *     before launch and whenever Google changes them). They are the basis of every credit price.
 *  3. Model IDs can be overridden on the server through env vars (see server/providers/*.ts) without a redeploy of code.
 */

export type VideoResolution = '720p' | '1080p';
export type VeoDuration = 4 | 6 | 8;

export interface VeoRoute {
  /** Exact Gemini API model id for this tier. */
  googleModelId: string;
  /** Google's price per generated second (audio included) by resolution, USD. */
  ratePerSecondUsd: Record<VideoResolution, number>;
}

/** Keyed by AiModelConfig.model_name */
export const VEO_ROUTES: Record<string, VeoRoute> = {
  veo_3_1_lite: {
    googleModelId: 'veo-3.1-lite-generate-preview',
    ratePerSecondUsd: { '720p': 0.05, '1080p': 0.08 },
  },
  veo_3_1_fast: {
    googleModelId: 'veo-3.1-fast-generate-preview',
    ratePerSecondUsd: { '720p': 0.1, '1080p': 0.12 },
  },
  veo_3_1_standard: {
    googleModelId: 'veo-3.1-generate-preview',
    ratePerSecondUsd: { '720p': 0.4, '1080p': 0.4 },
  },
};

/** Multiplier applied to the 720p rate for an UNKNOWN video model at 1080p (conservative). */
export const UNKNOWN_VIDEO_1080P_MULTIPLIER = 1.6;

export interface ImageRoute {
  googleModelId: string;
  imageSize: '1K' | '2K';
  /** Google's price per generated image at that size, USD. */
  providerCostUsd: number;
}

/** Keyed by AiModelConfig.model_name */
export const IMAGE_ROUTES: Record<string, ImageRoute> = {
  nano_banana_2_lite: { googleModelId: 'gemini-3.1-flash-lite-image', imageSize: '1K', providerCostUsd: 0.0336 },
  nano_banana_2: { googleModelId: 'gemini-3.1-flash-image', imageSize: '1K', providerCostUsd: 0.067 },
  nano_banana_pro: { googleModelId: 'gemini-3-pro-image', imageSize: '2K', providerCostUsd: 0.134 },
};

/** Model used for the paid "cover art" add-on (cheapest verified image model). */
export const COVER_ART_ROUTE_KEY = 'nano_banana_2_lite';

/** Music providers bill per TASK (2 takes returned per task), never per take. USD per task. */
export const MUSIC_PROVIDER_COST_USD: Record<string, number> = {
  lyria_3_pro: 0.11,
  suno_sonic_v5: 0.12,
};

/**
 * Google Veo 3.1 only accepts 4, 6 or 8 second clips, and 1080p is 8s ONLY.
 * Anything else the client sends is snapped to the nearest valid value that is >= the request
 * (so a customer never gets more seconds than they were quoted, and never fewer than they asked for).
 * This function is the ONLY place duration/resolution are interpreted: the quote, the DB row and the
 * Google request must all use its output.
 */
export function normalizeVideoParams(
  resolution: unknown,
  durationSeconds: unknown
): { resolution: VideoResolution; durationSeconds: VeoDuration } {
  const res: VideoResolution = resolution === '1080p' ? '1080p' : '720p';
  if (res === '1080p') return { resolution: res, durationSeconds: 8 };

  const requested = Number(durationSeconds);
  if (!Number.isFinite(requested) || requested <= 0) return { resolution: res, durationSeconds: 8 };
  const allowed: VeoDuration[] = [4, 6, 8];
  const snapped = allowed.find((d) => d >= requested) ?? 8;
  return { resolution: res, durationSeconds: snapped };
}

/** Google's USD cost for one clip. Uses the tier's real per-resolution rate when known. */
export function veoProviderCostUsd(
  modelName: string | undefined,
  baseRatePerSecondUsd: number,
  durationSeconds: number,
  resolution: VideoResolution
): number {
  const route = modelName ? VEO_ROUTES[modelName] : undefined;
  const rate = route
    ? route.ratePerSecondUsd[resolution]
    : baseRatePerSecondUsd * (resolution === '1080p' ? UNKNOWN_VIDEO_1080P_MULTIPLIER : 1);
  return rate * durationSeconds;
}
