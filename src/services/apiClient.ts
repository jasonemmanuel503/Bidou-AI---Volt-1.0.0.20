import { getAuthHeaders as getAuthHeadersFromToken } from './authToken';

export interface WalletResponse {
  balance: number;
  updated_at: string;
  plan_tier: string;
  lifetime_spend_fcfa?: number;
  mode?: 'live' | 'demo';
}

export interface CheckoutResponse {
  referenceId: string;
  status: string;
  amount: number;
  currency: string;
  credits: number;
  checkoutUrl?: string | null;
  mode: 'live' | 'demo';
}

export interface PaymentStatusResponse {
  referenceId: string;
  status: string;
  packageId?: string;
  amount?: number;
  credits?: number;
  mode: 'live' | 'demo';
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  return getAuthHeadersFromToken();
}

export async function fetchWallet(): Promise<WalletResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/credits/wallet', { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch wallet (${res.status})`);
  }
  return res.json();
}

export async function createCheckout(params: {
  packageId: string;
  channel: string;
  phoneNumber?: string;
}): Promise<CheckoutResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.detail || `Checkout failed (${res.status})`);
  }
  return res.json();
}

export async function checkPaymentStatus(referenceId: string): Promise<PaymentStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/payments/${encodeURIComponent(referenceId)}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Payment lookup failed (${res.status})`);
  }
  return res.json();
}

export async function simulatePaymentSuccess(referenceId: string): Promise<{ success: boolean; balance: number; plan_tier: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/payments/simulate-success', {
    method: 'POST',
    headers,
    body: JSON.stringify({ referenceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Payment simulation failed (${res.status})`);
  }
  return res.json();
}

export async function apiRewriteLyrics(currentLyrics: string, targetVibe?: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/rewrite-lyrics', {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentLyrics, targetVibe }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
      const err: any = new Error('INSUFFICIENT_CREDITS');
      err.status = 402;
      err.required = data.required;
      err.available = data.available;
      throw err;
    }
    throw new Error(data.error || 'Failed to rewrite lyrics');
  }
  const data = await res.json();
  return data.rewrittenLyrics || currentLyrics;
}

export async function apiGenerateCoverArt(params: {
  title: string;
  genre?: string;
  aspectRatio?: string;
}): Promise<{ coverUrl: string; title: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/generate-cover-art', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
      const err: any = new Error('INSUFFICIENT_CREDITS');
      err.status = 402;
      err.required = data.required;
      err.available = data.available;
      throw err;
    }
    throw new Error(data.error || 'Failed to generate cover art');
  }
  return res.json();
}
