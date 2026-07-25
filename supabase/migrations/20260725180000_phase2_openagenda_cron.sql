-- Phase 2 follow-up: scheduled OpenAgenda imports, health checks, and alerts.

create schema if not exists private;

create table if not exists private.cron_runtime (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table private.cron_runtime is
  'Runtime config for pg_cron HTTP triggers (anon key, function base URL, import secret). Populated by scripts/sync-cron-runtime.mjs locally.';

revoke all on schema private from public;
revoke all on table private.cron_runtime from public;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.cron_runtime to service_role;

create table public.import_alerts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  alert_type text not null,
  severity text not null default 'warning',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_alerts_type_check check (
    alert_type in ('import_failed', 'import_stale', 'import_partial')
  ),
  constraint import_alerts_severity_check check (
    severity in ('info', 'warning', 'error')
  )
);

create index import_alerts_source_created_idx
  on public.import_alerts (source_id, created_at desc);

alter table public.import_alerts enable row level security;

create policy import_alerts_admin_select
  on public.import_alerts
  for select
  to authenticated
  using (public.is_admin());

grant select on public.import_alerts to authenticated;
grant select, insert, update, delete on public.import_alerts to service_role;

create or replace function public.get_openagenda_import_health(
  stale_after_hours integer default 6
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  openagenda_source_id constant uuid := '22222222-2222-2222-2222-222222222201';
  last_run public.import_runs%rowtype;
  hours_since_success numeric;
  open_alerts integer;
begin
  if not public.is_admin() and not public.is_service_role() then
    raise exception 'admin required' using errcode = '42501';
  end if;

  select *
  into last_run
  from public.import_runs
  where source_id = openagenda_source_id
  order by started_at desc
  limit 1;

  if last_run.id is null then
    return jsonb_build_object(
      'status', 'missing',
      'is_stale', true,
      'last_run', null,
      'hours_since_success', null,
      'open_alerts', 0
    );
  end if;

  if last_run.status = 'succeeded' then
    hours_since_success :=
      extract(epoch from (timezone('utc', now()) - coalesce(last_run.finished_at, last_run.started_at)))
      / 3600.0;
  else
    hours_since_success := null;
  end if;

  select count(*)::integer
  into open_alerts
  from public.import_alerts
  where source_id = openagenda_source_id
    and acknowledged_at is null;

  return jsonb_build_object(
    'status', last_run.status,
    'is_stale',
      last_run.status <> 'succeeded'
      or hours_since_success is null
      or hours_since_success > stale_after_hours,
    'last_run', jsonb_build_object(
      'id', last_run.id,
      'status', last_run.status,
      'started_at', last_run.started_at,
      'finished_at', last_run.finished_at,
      'fetched_count', last_run.fetched_count,
      'error_count', last_run.error_count,
      'message', last_run.message
    ),
    'hours_since_success', hours_since_success,
    'open_alerts', open_alerts,
    'stale_after_hours', stale_after_hours
  );
end;
$$;

revoke all on function public.get_openagenda_import_health(integer) from public;
grant execute on function public.get_openagenda_import_health(integer) to authenticated, service_role;

create or replace function private.trigger_openagenda_import()
returns void
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  functions_base_url text;
  anon_key text;
  import_secret text;
  request_id bigint;
begin
  select value into functions_base_url from private.cron_runtime where key = 'functions_base_url';
  select value into anon_key from private.cron_runtime where key = 'anon_key';
  select value into import_secret from private.cron_runtime where key = 'import_cron_secret';

  if functions_base_url is null or anon_key is null or import_secret is null then
    raise notice 'openagenda cron: cron_runtime not configured, skipping HTTP trigger';
    return;
  end if;

  select net.http_post(
    url := functions_base_url || '/functions/v1/import-openagenda',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'x-tourose-import-secret', import_secret
    ),
    body := '{"trigger":"pg_cron"}'::jsonb
  )
  into request_id;
end;
$$;

create or replace function private.trigger_import_health_check()
returns void
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  functions_base_url text;
  anon_key text;
  import_secret text;
  request_id bigint;
begin
  select value into functions_base_url from private.cron_runtime where key = 'functions_base_url';
  select value into anon_key from private.cron_runtime where key = 'anon_key';
  select value into import_secret from private.cron_runtime where key = 'import_cron_secret';

  if functions_base_url is null or anon_key is null or import_secret is null then
    raise notice 'import health cron: cron_runtime not configured, skipping HTTP trigger';
    return;
  end if;

  select net.http_post(
    url := functions_base_url || '/functions/v1/import-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'x-tourose-import-secret', import_secret
    ),
    body := '{"trigger":"pg_cron"}'::jsonb
  )
  into request_id;
end;
$$;

revoke all on function private.trigger_openagenda_import() from public;
revoke all on function private.trigger_import_health_check() from public;
grant execute on function private.trigger_openagenda_import() to service_role;
grant execute on function private.trigger_import_health_check() to service_role;

do $$
begin
  create extension if not exists pg_net with schema extensions;
exception
  when others then
    raise notice 'pg_net unavailable in this environment: %', sqlerrm;
end
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in ('tourose-openagenda-import', 'tourose-import-health');

    perform cron.schedule(
      'tourose-openagenda-import',
      '0 */4 * * *',
      $cron$select private.trigger_openagenda_import();$cron$
    );

    perform cron.schedule(
      'tourose-import-health',
      '15 */4 * * *',
      $cron$select private.trigger_import_health_check();$cron$
    );
  else
    raise notice 'pg_cron unavailable — use scripts/cron-tick.mjs or GitHub Actions instead';
  end if;
exception
  when others then
    raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end
$$;
