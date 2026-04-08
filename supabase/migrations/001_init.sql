-- ig-setter: Initial schema
-- Run this in your Supabase project: SQL Editor → New Query → paste → Run

-- ─── dm_threads ──────────────────────────────────────────────────────────────
create table if not exists dm_threads (
  id              uuid primary key default gen_random_uuid(),
  ig_thread_id    text unique not null,
  ig_user_id      text not null,
  username        text not null,
  display_name    text not null,
  avatar_initial  text not null,
  avatar_color    text not null default '#7c3aed',
  status          text not null default 'active'
                    check (status in ('active', 'qualified', 'booked', 'closed')),
  last_message    text not null default '',
  last_timestamp  text not null default 'just now',
  pending_ai_draft text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── dm_messages ─────────────────────────────────────────────────────────────
create table if not exists dm_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references dm_threads(id) on delete cascade,
  ig_message_id   text,
  direction       text not null check (direction in ('inbound', 'outbound')),
  content         text not null,
  sent_at         timestamptz not null default now(),
  is_ai           boolean not null default false,
  override        boolean not null default false
);

create index if not exists dm_messages_thread_id_idx on dm_messages(thread_id);
create index if not exists dm_messages_sent_at_idx on dm_messages(sent_at);

-- ─── daily_stats ─────────────────────────────────────────────────────────────
create table if not exists daily_stats (
  id                uuid primary key default gen_random_uuid(),
  date              date unique not null default current_date,
  total_handled     integer not null default 0,
  qualified         integer not null default 0,
  booked            integer not null default 0,
  closed            integer not null default 0,
  revenue           integer not null default 0,
  replies_received  integer not null default 0,
  deals_progressed  integer not null default 0
);

-- ─── Enable Realtime ──────────────────────────────────────────────────────────
-- Supabase requires tables to be added to the realtime publication.
alter publication supabase_realtime add table dm_threads;
alter publication supabase_realtime add table dm_messages;
alter publication supabase_realtime add table daily_stats;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The dashboard uses the anon key (read-only).
-- The webhook API uses the service role key (full access, bypasses RLS).

alter table dm_threads enable row level security;
alter table dm_messages enable row level security;
alter table daily_stats enable row level security;

-- Allow anon (dashboard) to read all rows
create policy "anon read threads"  on dm_threads  for select using (true);
create policy "anon read messages" on dm_messages for select using (true);
create policy "anon read stats"    on daily_stats  for select using (true);
-- Service role (webhook API) bypasses RLS automatically — no extra policy needed.
