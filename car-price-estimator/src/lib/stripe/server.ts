// Server-only Stripe SDK singleton. Never import from Client Components.
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns the shared Stripe instance. Initialised lazily so absence of
 * STRIPE_SECRET_KEY does NOT crash the build — the pricing page can still
 * render and tell the user the integration isn't configured.
 *
 * Throws a clear, localised error when called without a configured key.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY není nastaven. Doplňte ho do .env.local nebo Vercel env (sk_test_... pro testovací režim).',
    );
  }

  _stripe = new Stripe(secretKey, {
    // Pin to the SDK's expected API version (matches stripe@17.x).
    // Pinning avoids surprises after the account's default version rolls forward.
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    appInfo: {
      name: 'AutoAI (auto_ceny)',
      version: '1.0.0',
    },
  });

  return _stripe;
}
