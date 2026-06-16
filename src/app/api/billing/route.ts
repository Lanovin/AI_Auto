import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { isStripeConfigured } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface BillingItem {
  id: string;
  date: string;        // ISO string
  amount: number;      // in CZK (haléře → Kč)
  currency: string;
  status: string;
  description: string;
  receiptUrl: string | null;
}

export async function GET() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ items: [] });
    }

    const stripe = getStripe();
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 20,
    });

    const items: BillingItem[] = charges.data.map((charge) => ({
      id: charge.id,
      date: new Date(charge.created * 1000).toISOString(),
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      description: charge.description ?? charge.metadata?.plan_key ?? 'Nákup tokenů',
      receiptUrl: charge.receipt_url ?? null,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[billing] error:', err);
    return NextResponse.json({ error: 'Nelze načíst historii plateb.' }, { status: 500 });
  }
}
