-- One row per person and place, so editing the same text does not notify twice.
create table if not exists mentions (
  id text primary key,
  user_id text not null references profiles (user_id) on delete cascade,
  actor_id text not null references profiles (user_id) on delete cascade,
  source text not null,
  href text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source)
);

create index if not exists mentions_source_idx on mentions (source);
