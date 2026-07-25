-- Phase 6: push subscriptions, notification deliveries, and support payments.

create table public.push_subscriptions (
  installation_id text primary key,
  expo_push_token text not null,
  platform text not null,
  notification_prefs jsonb not null default '{}'::jsonb,
  opted_out_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_subscriptions_platform_check check (
    platform in ('ios', 'android', 'web', 'unknown')
  )
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null references public.push_subscriptions (installation_id) on delete cascade,
  campaign_type text not null,
  idempotency_key text not null,
  title text not null,
  body text not null,
  status text not null,
  error_message text,
  sent_at timestamptz not null default timezone('utc', now()),
  constraint notification_deliveries_status_check check (
    status in ('sent', 'failed', 'skipped')
  ),
  constraint notification_deliveries_idempotency_unique unique (idempotency_key)
);

create index notification_deliveries_installation_sent_idx
  on public.notification_deliveries (installation_id, sent_at desc);

create table public.support_payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  installation_id text,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null,
  platform text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint support_payments_provider_check check (provider in ('stripe')),
  constraint support_payments_status_check check (
    status in ('pending', 'completed', 'failed', 'refunded')
  ),
  constraint support_payments_platform_check check (platform in ('mobile', 'web')),
  constraint support_payments_provider_external_unique unique (provider, external_id),
  constraint support_payments_amount_positive check (amount_cents > 0)
);

create index support_payments_installation_created_idx
  on public.support_payments (installation_id, created_at desc);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_updated_at();

create trigger support_payments_set_updated_at
  before update on public.support_payments
  for each row
  execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.support_payments enable row level security;

create policy push_subscriptions_admin_select
  on public.push_subscriptions
  for select
  to authenticated
  using (public.is_admin());

create policy notification_deliveries_admin_select
  on public.notification_deliveries
  for select
  to authenticated
  using (public.is_admin());

create policy support_payments_admin_select
  on public.support_payments
  for select
  to authenticated
  using (public.is_admin());

grant select on public.push_subscriptions to authenticated;
grant select on public.notification_deliveries to authenticated;
grant select on public.support_payments to authenticated;

grant select, insert, update, delete on public.push_subscriptions to service_role;
grant select, insert, update, delete on public.notification_deliveries to service_role;
grant select, insert, update, delete on public.support_payments to service_role;
