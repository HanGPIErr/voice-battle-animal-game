-- Cri Animaux Arena - Supabase/Postgres schema
-- Run this in Supabase Dashboard > SQL Editor.

create extension if not exists citext;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id bigint generated always as identity primary key,
  username citext not null unique,
  email citext not null unique,
  password_hash text not null,
  salt text not null,
  display_name text not null,
  bio text not null default '',
  main_animal text not null default 'dog',
  accent text not null default '#23b7a4',
  avatar_style text not null default 'spark',
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at bigint not null
);

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id bigint not null references public.users(id) on delete cascade,
  addressee_id bigint not null references public.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.lobbies (
  id text primary key,
  code citext not null unique,
  owner_id bigint not null references public.users(id) on delete cascade,
  settings_json jsonb not null,
  status text not null default 'open' check (status in ('open', 'in_game', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lobby_players (
  lobby_id text not null references public.lobbies(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  animal text not null default 'dog',
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create table if not exists public.matches (
  id text primary key,
  lobby_id text not null references public.lobbies(id) on delete cascade,
  settings_json jsonb not null,
  state_json jsonb not null,
  status text not null default 'playing' check (status in ('playing', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_friendships_users on public.friendships(requester_id, addressee_id);
create index if not exists idx_lobby_players_user on public.lobby_players(user_id);
create index if not exists idx_lobbies_status on public.lobbies(status);
create index if not exists idx_matches_lobby on public.matches(lobby_id, created_at desc);

drop trigger if exists touch_friendships_updated_at on public.friendships;
create trigger touch_friendships_updated_at
before update on public.friendships
for each row execute function public.touch_updated_at();

drop trigger if exists touch_lobbies_updated_at on public.lobbies;
create trigger touch_lobbies_updated_at
before update on public.lobbies
for each row execute function public.touch_updated_at();

drop trigger if exists touch_matches_updated_at on public.matches;
create trigger touch_matches_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

-- Keep these tables private for now. The game server should access them through
-- the Postgres connection string stored in Vercel environment variables.
alter table public.users disable row level security;
alter table public.sessions disable row level security;
alter table public.friendships disable row level security;
alter table public.lobbies disable row level security;
alter table public.lobby_players disable row level security;
alter table public.matches disable row level security;
