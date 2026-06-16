-- Tracks processed Stripe webhook event IDs to prevent double token grants.
create table if not exists stripe_webhook_events (
  event_id   text primary key,
  processed_at timestamptz not null default now()
);

-- Auto-clean events older than 30 days (Stripe only retries for ~3 days)
create index if not exists stripe_webhook_events_processed_at
  on stripe_webhook_events (processed_at);
