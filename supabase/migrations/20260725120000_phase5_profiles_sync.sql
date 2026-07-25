-- Phase 5: optional user accounts + catalog sync (favorites, discover, visited)

create type public.user_catalog_list as enum ('favorite', 'discover', 'visited');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company text not null default 'couple',
  interests text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.user_catalog_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  list_type public.user_catalog_list not null,
  entity_type text not null check (entity_type in ('event', 'place')),
  entity_id uuid not null,
  slug text not null,
  title text not null,
  subtitle text,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, list_type, entity_type, entity_id)
);

create index user_catalog_items_user_list_idx
  on public.user_catalog_items (user_id, list_type, updated_at desc);

alter table public.profiles enable row level security;
alter table public.user_catalog_items enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy user_catalog_select_own on public.user_catalog_items
  for select using (auth.uid() = user_id);

create policy user_catalog_insert_own on public.user_catalog_items
  for insert with check (auth.uid() = user_id);

create policy user_catalog_update_own on public.user_catalog_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_catalog_delete_own on public.user_catalog_items
  for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.list_user_catalog_items()
returns table (
  list_type public.user_catalog_list,
  entity_type text,
  entity_id uuid,
  slug text,
  title text,
  subtitle text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    list_type,
    entity_type,
    entity_id,
    slug,
    title,
    subtitle,
    updated_at
  from public.user_catalog_items
  where user_id = auth.uid()
  order by updated_at desc;
$$;

revoke all on function public.list_user_catalog_items() from public;
grant execute on function public.list_user_catalog_items() to authenticated;

create or replace function public.merge_user_catalog(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_uuid uuid := auth.uid();
  item jsonb;
  list_key text;
  list_values text[];
begin
  if user_uuid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id)
  values (user_uuid)
  on conflict (id) do nothing;

  if payload ? 'company' then
    update public.profiles
    set company = coalesce(payload ->> 'company', company)
    where id = user_uuid;
  end if;

  if payload ? 'interests' then
    update public.profiles
    set interests = coalesce(
      array(select jsonb_array_elements_text(payload -> 'interests')),
      interests
    )
    where id = user_uuid;
  end if;

  foreach list_key in array array['favorite', 'discover', 'visited']
  loop
    if payload ? list_key then
      delete from public.user_catalog_items
      where user_id = user_uuid
        and list_type = list_key::public.user_catalog_list;

      for item in
        select value
        from jsonb_array_elements(payload -> list_key)
      loop
        insert into public.user_catalog_items (
          user_id,
          list_type,
          entity_type,
          entity_id,
          slug,
          title,
          subtitle,
          updated_at
        )
        values (
          user_uuid,
          list_key::public.user_catalog_list,
          item ->> 'entity_type',
          (item ->> 'entity_id')::uuid,
          item ->> 'slug',
          item ->> 'title',
          item ->> 'subtitle',
          coalesce((item ->> 'updated_at')::timestamptz, timezone('utc', now()))
        )
        on conflict (user_id, list_type, entity_type, entity_id) do update
        set
          slug = excluded.slug,
          title = excluded.title,
          subtitle = excluded.subtitle,
          updated_at = excluded.updated_at;
      end loop;
    end if;
  end loop;

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'list_type', list_type,
          'entity_type', entity_type,
          'entity_id', entity_id,
          'slug', slug,
          'title', title,
          'subtitle', subtitle,
          'updated_at', updated_at
        )
        order by updated_at desc
      ),
      '[]'::jsonb
    )
    from public.user_catalog_items
    where user_id = user_uuid
  );
end;
$$;

revoke all on function public.merge_user_catalog(jsonb) from public;
grant execute on function public.merge_user_catalog(jsonb) to authenticated;
