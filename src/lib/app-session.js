import { clearDealerAccess, getDealerAccess, unlockDealerAccess } from '@/lib/dealer-access';

export const APP_SESSION_KEY = 'autoai_app_session_v1';
export const TRAINING_TOKENS_KEY = 'autoai_training_tokens_v1';
export const APP_SESSION_EVENT = 'autoai:session-changed';
export const TRAINING_TOKENS_EVENT = 'autoai:tokens-changed';

export const TRAINING_TOKEN_COSTS = [
  { id: 'odhad-ceny', label: 'Odhad ceny', cost: 1 },
  { id: 'popisky', label: 'Popisky', cost: 1 },
  { id: 'monitoring', label: 'Monitoring', cost: 1 },
  { id: 'skaut', label: 'Skaut', cost: 1 }
];

const DEFAULT_SESSION = {
  role: 'guest',
  updatedAt: 0
};

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function emitBrowserEvent(eventName) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName));
}

function parseStoredValue(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

function buildSeedWallet(balance = 24) {
  return {
    balance,
    updatedAt: Date.now(),
    mode: 'training'
  };
}

export function getAppSession() {
  if (!canUseBrowserStorage()) {
    return DEFAULT_SESSION;
  }

  const parsed = parseStoredValue(window.localStorage.getItem(APP_SESSION_KEY), null);
  if (parsed && (parsed.role === 'guest' || parsed.role === 'person' || parsed.role === 'dealer')) {
    return parsed;
  }

  if (getDealerAccess()) {
    return {
      role: 'dealer',
      updatedAt: Date.now(),
      source: 'legacy-demo'
    };
  }

  return DEFAULT_SESSION;
}

export function setAppRole(role) {
  if (!canUseBrowserStorage()) {
    return DEFAULT_SESSION;
  }

  const nextRole = role === 'dealer' || role === 'person' ? role : 'guest';
  const session = {
    role: nextRole,
    updatedAt: Date.now()
  };

  window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify(session));
  if (nextRole === 'dealer') {
    unlockDealerAccess();
  } else {
    clearDealerAccess();
  }

  ensureTrainingTokens();
  emitBrowserEvent(APP_SESSION_EVENT);
  return session;
}

export function clearAppSession() {
  if (!canUseBrowserStorage()) {
    return DEFAULT_SESSION;
  }

  window.localStorage.removeItem(APP_SESSION_KEY);
  clearDealerAccess();
  emitBrowserEvent(APP_SESSION_EVENT);
  return DEFAULT_SESSION;
}

export function ensureTrainingTokens() {
  if (!canUseBrowserStorage()) {
    return buildSeedWallet();
  }

  const existing = parseStoredValue(window.localStorage.getItem(TRAINING_TOKENS_KEY), null);
  if (existing && typeof existing.balance === 'number') {
    return existing;
  }

  const seeded = buildSeedWallet();
  window.localStorage.setItem(TRAINING_TOKENS_KEY, JSON.stringify(seeded));
  emitBrowserEvent(TRAINING_TOKENS_EVENT);
  return seeded;
}

export function getTrainingTokens() {
  if (!canUseBrowserStorage()) {
    return buildSeedWallet();
  }

  return ensureTrainingTokens();
}

export function addTrainingTokens(amount = 12) {
  if (!canUseBrowserStorage()) {
    return buildSeedWallet();
  }

  const current = ensureTrainingTokens();
  const next = {
    ...current,
    balance: current.balance + amount,
    updatedAt: Date.now()
  };

  window.localStorage.setItem(TRAINING_TOKENS_KEY, JSON.stringify(next));
  emitBrowserEvent(TRAINING_TOKENS_EVENT);
  return next;
}

export function resetTrainingTokens(balance = 24) {
  if (!canUseBrowserStorage()) {
    return buildSeedWallet(balance);
  }

  const next = buildSeedWallet(balance);
  window.localStorage.setItem(TRAINING_TOKENS_KEY, JSON.stringify(next));
  emitBrowserEvent(TRAINING_TOKENS_EVENT);
  return next;
}