-- Phase 4: deterministic event recommendations (weights + impressions + RPC).

create table public.recommendation_weights (
  key text primary key,
  weight numeric not null check (weight >= 0),
  description text,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.recommendation_weights (key, weight, description) values
  ('time', 25, 'Proximité temporelle de la prochaine occurrence'),
  ('distance', 20, 'Distance au point utilisateur / centre Toulouse'),
  ('budget', 15, 'Boost gratuit / alignement budget'),
  ('preferences', 15, 'Match intérêts / catégories'),
  ('freshness', 10, 'Dernière vérification récente'),
  ('editorial', 10, 'Présence dans une collection publiée'),
  ('weather', 5, 'Alignement intérieur/extérieur vs météo')
on conflict (key) do nothing;

create table public.recommendation_impressions (
  id uuid primary key default gen_random_uuid(),
  event_ids uuid[] not null,
  reasons jsonb not null default '[]'::jsonb,
  session_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create index recommendation_impressions_created_at_idx
  on public.recommendation_impressions (created_at desc);

alter table public.recommendation_weights enable row level security;
alter table public.recommendation_impressions enable row level security;

create policy recommendation_weights_public_read
  on public.recommendation_weights
  for select
  to anon, authenticated
  using (true);

create policy recommendation_weights_admin_all
  on public.recommendation_weights
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy recommendation_impressions_public_insert
  on public.recommendation_impressions
  for insert
  to anon, authenticated
  with check (true);

create policy recommendation_impressions_admin_read
  on public.recommendation_impressions
  for select
  to authenticated
  using (public.is_admin());

grant select on public.recommendation_weights to anon, authenticated;
grant select, insert, update, delete on public.recommendation_weights to service_role;
grant insert on public.recommendation_impressions to anon, authenticated;
grant select, insert, update, delete on public.recommendation_impressions to service_role;

create or replace function public.score_public_event_recommendations(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  now_ts timestamptz := coalesce(nullif(payload ->> 'now', '')::timestamptz, timezone('utc', now()));
  user_lat double precision := coalesce((payload ->> 'latitude')::double precision, 43.6045);
  user_lng double precision := coalesce((payload ->> 'longitude')::double precision, 1.444);
  weather_code integer := coalesce((payload ->> 'weather_code')::integer, 0);
  price_pref text := coalesce(payload ->> 'price', 'all');
  interests text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(payload -> 'interests', '[]'::jsonb))),
    array[]::text[]
  );
  rainy boolean := weather_code >= 51;
  weight_time numeric := coalesce((select weight from public.recommendation_weights where key = 'time'), 25);
  weight_distance numeric := coalesce((select weight from public.recommendation_weights where key = 'distance'), 20);
  weight_budget numeric := coalesce((select weight from public.recommendation_weights where key = 'budget'), 15);
  weight_preferences numeric := coalesce((select weight from public.recommendation_weights where key = 'preferences'), 15);
  weight_freshness numeric := coalesce((select weight from public.recommendation_weights where key = 'freshness'), 10);
  weight_editorial numeric := coalesce((select weight from public.recommendation_weights where key = 'editorial'), 10);
  weight_weather numeric := coalesce((select weight from public.recommendation_weights where key = 'weather'), 5);
  result jsonb;
begin
  with ranked as (
    select
      event_row.id,
      event_row.slug,
      event_row.title,
      event_row.summary,
      event_row.place_id,
      event_row.latitude,
      event_row.longitude,
      event_row.price_type,
      event_row.indoor_outdoor,
      event_row.status,
      event_row.official_url,
      event_row.last_verified_at,
      event_row.next_starts_at,
      event_row.next_ends_at,
      event_row.image_url,
      event_row.image_alt,
      event_row.image_attribution,
      event_row.image_source_url,
      event_row.categories,
      coalesce(event_row.categories[1], 'other') as primary_category,
      (
        case
          when event_row.next_starts_at <= now_ts + interval '6 hours' then weight_time
          when event_row.next_starts_at <= now_ts + interval '24 hours' then weight_time * 0.8
          when event_row.next_starts_at <= now_ts + interval '3 days' then weight_time * 0.55
          when event_row.next_starts_at <= now_ts + interval '7 days' then weight_time * 0.35
          else weight_time * 0.15
        end
        + case
          when event_row.latitude is null or event_row.longitude is null then weight_distance * 0.4
          else greatest(
            0::numeric,
            weight_distance * (
              1 - least(
                1::numeric,
                (
                  extensions.st_distance(
                    extensions.st_setsrid(
                      extensions.st_makepoint(event_row.longitude, event_row.latitude),
                      4326
                    )::extensions.geography,
                    extensions.st_setsrid(
                      extensions.st_makepoint(user_lng, user_lat),
                      4326
                    )::extensions.geography
                  ) / 8000.0
                )::numeric
              )
            )
          )
        end
        + case
          when event_row.price_type = 'free' then weight_budget
          when price_pref = 'paid' and event_row.price_type = 'free' then weight_budget * 0.3
          else weight_budget * 0.45
        end
        + case
          when cardinality(interests) = 0 then weight_preferences * 0.4
          when exists (
            select 1
            from unnest(interests) as interest
            where (
              (interest ilike '%balade%' and (event_row.categories && array['visite'] or event_row.title ilike '%balade%'))
              or (interest ilike '%mus%' and (event_row.categories && array['exposition'] or event_row.title ilike '%mus%'))
              or (interest ilike '%concert%' and event_row.categories && array['spectacle'])
              or (interest ilike '%marché%' and event_row.categories && array['marche'])
              or (interest ilike '%nature%' and (event_row.indoor_outdoor in ('outdoor', 'mixed') or event_row.categories && array['visite']))
              or (interest ilike '%histoire%' and (event_row.categories && array['visite', 'exposition'] or event_row.title ilike '%histoire%'))
              or (interest ilike '%terrasse%' and event_row.indoor_outdoor in ('outdoor', 'mixed'))
            )
          ) then weight_preferences
          else weight_preferences * 0.2
        end
        + case
          when event_row.last_verified_at is null then weight_freshness * 0.3
          when event_row.last_verified_at >= now_ts - interval '14 days' then weight_freshness
          when event_row.last_verified_at >= now_ts - interval '60 days' then weight_freshness * 0.6
          else weight_freshness * 0.25
        end
        + case
          when exists (
            select 1
            from public.collection_items item_row
            join public.collections collection_row on collection_row.id = item_row.collection_id
            where item_row.entity_type = 'event'
              and item_row.entity_id = event_row.id
              and collection_row.status = 'published'
          ) then weight_editorial
          else weight_editorial * 0.2
        end
        + case
          when rainy and event_row.indoor_outdoor = 'indoor' then weight_weather
          when rainy and event_row.indoor_outdoor = 'outdoor' then 0
          when (not rainy) and event_row.indoor_outdoor in ('outdoor', 'mixed') then weight_weather
          else weight_weather * 0.4
        end
      ) as total_score
    from public.public_events event_row
    where event_row.next_starts_at is not null
      and (price_pref <> 'free' or event_row.price_type = 'free')
    order by event_row.next_starts_at asc
    limit 200
  ),
  with_reasons as (
    select
      ranked.*,
      jsonb_strip_nulls(
        jsonb_build_array(
          jsonb_build_object(
            'code', 'time',
            'label', case
              when ranked.next_starts_at <= now_ts + interval '6 hours' then 'Bientôt'
              when ranked.next_starts_at <= now_ts + interval '24 hours' then 'Dans la journée'
              else 'Prochainement'
            end,
            'weight', round(weight_time::numeric, 2)
          ),
          case when ranked.price_type = 'free' then
            jsonb_build_object('code', 'budget', 'label', 'Gratuit', 'weight', round(weight_budget::numeric, 2))
          end,
          case when ranked.total_score > 0 then
            jsonb_build_object('code', 'distance', 'label', 'À proximité', 'weight', round(weight_distance * 0.5, 2))
          end,
          case when cardinality(interests) > 0 then
            jsonb_build_object('code', 'preferences', 'label', 'Selon tes envies', 'weight', round(weight_preferences * 0.5, 2))
          end,
          case
            when rainy and ranked.indoor_outdoor = 'indoor' then
              jsonb_build_object('code', 'weather', 'label', 'À l''abri', 'weight', round(weight_weather::numeric, 2))
            when (not rainy) and ranked.indoor_outdoor in ('outdoor', 'mixed') then
              jsonb_build_object('code', 'weather', 'label', 'Adapté à la météo', 'weight', round(weight_weather::numeric, 2))
          end
        )
      ) as reasons
    from ranked
  ),
  best as (
    select * from with_reasons order by total_score desc, next_starts_at asc limit 1
  ),
  eco as (
    select with_reasons.*
    from with_reasons
    where with_reasons.price_type = 'free'
      and with_reasons.id not in (select best.id from best)
    order by with_reasons.total_score desc, with_reasons.next_starts_at asc
    limit 1
  ),
  unexpected as (
    select with_reasons.*
    from with_reasons
    where with_reasons.id not in (select best.id from best)
      and with_reasons.id not in (select eco.id from eco)
      and (
        not exists (select 1 from best)
        or with_reasons.primary_category is distinct from (select best.primary_category from best)
      )
    order by with_reasons.total_score desc, with_reasons.next_starts_at asc
    limit 1
  ),
  fill as (
    select with_reasons.*
    from with_reasons
    where with_reasons.id not in (select best.id from best)
      and with_reasons.id not in (select eco.id from eco)
      and with_reasons.id not in (select unexpected.id from unexpected)
    order by with_reasons.total_score desc, with_reasons.next_starts_at asc
    limit 3
  ),
  ordered_picks as (
    select 1 as slot_order, 'best'::text as slot, best.* from best
    union all
    select 2, 'eco', eco.* from eco
    union all
    select 3, 'unexpected', unexpected.* from unexpected
    union all
    select 10 + row_number() over (order by fill.total_score desc), 'fill', fill.* from fill
  ),
  limited as (
    select *
    from ordered_picks
    order by slot_order
    limit 3
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot', limited.slot,
        'score', round(limited.total_score::numeric, 2),
        'reasons', limited.reasons,
        'event', jsonb_build_object(
          'id', limited.id,
          'slug', limited.slug,
          'title', limited.title,
          'summary', limited.summary,
          'place_id', limited.place_id,
          'latitude', limited.latitude,
          'longitude', limited.longitude,
          'price_type', limited.price_type,
          'indoor_outdoor', limited.indoor_outdoor,
          'status', limited.status,
          'official_url', limited.official_url,
          'last_verified_at', limited.last_verified_at,
          'next_starts_at', limited.next_starts_at,
          'next_ends_at', limited.next_ends_at,
          'image_url', limited.image_url,
          'image_alt', limited.image_alt,
          'image_attribution', limited.image_attribution,
          'image_source_url', limited.image_source_url,
          'categories', limited.categories
        )
      )
      order by limited.slot_order
    ),
    '[]'::jsonb
  )
  into result
  from limited;

  return result;
end;
$$;

grant execute on function public.score_public_event_recommendations(jsonb) to anon, authenticated, service_role;

create or replace function public.log_recommendation_impression(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  impression_id uuid;
begin
  insert into public.recommendation_impressions (event_ids, reasons, session_hash)
  values (
    coalesce(
      array(
        select (jsonb_array_elements_text(coalesce(payload -> 'event_ids', '[]'::jsonb)))::uuid
      ),
      array[]::uuid[]
    ),
    coalesce(payload -> 'reasons', '[]'::jsonb),
    nullif(payload ->> 'session_hash', '')
  )
  returning id into impression_id;

  return impression_id;
end;
$$;

grant execute on function public.log_recommendation_impression(jsonb) to anon, authenticated, service_role;
