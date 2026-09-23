// Bidou AI Provider Health Monitor
/**
 * Implements Section 2.5:
 * Maintain a module-level Map<string, { failures: number; lastFailureAt: number }>.
 * Increment on any provider 5xx/timeout.
 * A provider is unhealthy when it has >= 3 failures inside 60 seconds.
 * Resets after 5 minutes of inactivity or success.
 */

interface ProviderHealthRecord {
  failures: number;
  lastFailureAt: number;
  failureTimestamps: number[];
}

const healthMap = new Map<string, ProviderHealthRecord>();

const FAILURE_WINDOW_MS = 60 * 1000; // 60 seconds
const UNHEALTHY_THRESHOLD = 3;
const RESET_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function recordProviderFailure(provider: string) {
  const now = Date.now();
  let record = healthMap.get(provider);
  if (!record) {
    record = { failures: 0, lastFailureAt: 0, failureTimestamps: [] };
    healthMap.set(provider, record);
  }

  // Prune timestamps older than 60s
  record.failureTimestamps = record.failureTimestamps.filter((t) => now - t <= FAILURE_WINDOW_MS);
  record.failureTimestamps.push(now);
  record.failures = record.failureTimestamps.length;
  record.lastFailureAt = now;
}

export function recordProviderSuccess(provider: string) {
  const record = healthMap.get(provider);
  if (record) {
    // A clean success can decrement or reset failure counters
    record.failureTimestamps = [];
    record.failures = 0;
  }
}

export function isProviderHealthy(provider: string): boolean {
  const record = healthMap.get(provider);
  if (!record) return true;

  const now = Date.now();
  // Auto-reset after 5 minutes of no new failures
  if (now - record.lastFailureAt > RESET_WINDOW_MS) {
    record.failures = 0;
    record.failureTimestamps = [];
    return true;
  }

  // Prune old timestamps
  record.failureTimestamps = record.failureTimestamps.filter((t) => now - t <= FAILURE_WINDOW_MS);
  record.failures = record.failureTimestamps.length;

  return record.failures < UNHEALTHY_THRESHOLD;
}

export function getProviderHealthMap(): Record<string, boolean> {
  const result: Record<string, boolean> = {
    google: isProviderHealthy('google'),
    musicapi: isProviderHealthy('musicapi'),
    kuaishou: isProviderHealthy('kuaishou'),
    bytedance: isProviderHealthy('bytedance'),
    elevenlabs: isProviderHealthy('elevenlabs'),
  };

  for (const [provider] of healthMap.entries()) {
    result[provider] = isProviderHealthy(provider);
  }

  return result;
}

export function getProviderHealthReport(): Record<string, any> {
  const now = Date.now();
  const report: Record<string, any> = {};

  const knownProviders = ['google', 'musicapi', 'kuaishou', 'bytedance', 'elevenlabs'];
  for (const p of knownProviders) {
    const record = healthMap.get(p);
    const healthy = isProviderHealthy(p);
    report[p] = {
      healthy,
      status: healthy ? 'operational' : 'degraded',
      failuresLast60s: record ? record.failureTimestamps.filter((t) => now - t <= FAILURE_WINDOW_MS).length : 0,
      lastFailureAt: record && record.lastFailureAt > 0 ? new Date(record.lastFailureAt).toISOString() : null,
      configured: p === 'google' ? !!process.env.GEMINI_API_KEY : p === 'musicapi' ? !!process.env.MUSICAPI_API_KEY : false,
    };
  }

  return report;
}
