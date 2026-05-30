export const DEALER_ACCESS_KEY = 'autoai_dealer_access_v1';

export function getDealerAccess() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(DEALER_ACCESS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function unlockDealerAccess() {
  if (typeof window === 'undefined') {
    return null;
  }

  const payload = {
    tier: 'starter',
    unlockedAt: Date.now(),
    paymentReference: 'demo-' + Math.random().toString(36).slice(2, 10)
  };

  window.localStorage.setItem(DEALER_ACCESS_KEY, JSON.stringify(payload));
  return payload;
}

export function clearDealerAccess() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DEALER_ACCESS_KEY);
}