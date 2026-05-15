-- Interstellar Radar 360 production schema.
-- Run this in Supabase SQL editor, then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel.

create extension if not exists pgcrypto;

create table if not exists lead_pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  platform text,
  country text,
  language text,
  source_type text,
  search_fingerprint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  total_leads_count integer not null default 0,
  available_leads_count integer not null default 0,
  revealed_leads_count integer not null default 0,
  last_scraped_at timestamptz,
  status text not null default 'active'
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  platform text not null,
  platform_user_id text,
  username text,
  display_name text,
  profile_url text,
  bio text,
  avatar_url text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  engagement_estimate numeric,
  country_estimate text,
  language_estimate text,
  is_private boolean,
  is_verified boolean,
  is_business_account boolean,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists leads_platform_username_idx
  on leads (platform, username)
  where username is not null;

create table if not exists lead_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  platform text,
  source_type text,
  source_value text,
  source_url text,
  niche text,
  country text,
  language text,
  discovered_by text,
  discovered_at timestamptz not null default now(),
  last_scraped_at timestamptz,
  source_score numeric,
  status text not null default 'ready_to_mine'
);

create table if not exists lead_pool_members (
  id uuid primary key default gen_random_uuid(),
  member_key text not null unique,
  pool_id uuid not null references lead_pools(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  source_id uuid references lead_sources(id) on delete set null,
  source_type text,
  source_value text,
  relevance_score numeric,
  engagement_score numeric,
  quality_score numeric,
  commercial_fit_score numeric,
  total_score numeric,
  tags jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  extracted_at timestamptz not null default now(),
  last_scored_at timestamptz not null default now()
);

create index if not exists lead_pool_members_pool_score_idx
  on lead_pool_members (pool_id, total_score desc);

create table if not exists lead_reveals (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id text,
  pool_id uuid not null references lead_pools(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  cooldown_until numeric,
  reveal_context text,
  search_id uuid,
  credits_charged integer not null default 0
);

create unique index if not exists lead_reveals_workspace_lead_once_idx
  on lead_reveals (workspace_id, lead_id);

create index if not exists lead_reveals_pool_idx
  on lead_reveals (pool_id, lead_id);

create table if not exists radar_searches (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id text,
  niche text,
  platform text,
  country text,
  language text,
  requested_visible_leads integer,
  internal_target_leads integer,
  pool_id uuid references lead_pools(id) on delete set null,
  status text not null default 'running',
  credits_spent integer not null default 0,
  provider_cost_estimate numeric,
  provider_cost_real numeric,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lead_reveals_search_fk'
  ) then
    alter table lead_reveals
      add constraint lead_reveals_search_fk
      foreign key (search_id) references radar_searches(id) on delete set null;
  end if;
end $$;

create index if not exists radar_searches_workspace_created_idx
  on radar_searches (workspace_id, created_at desc);
