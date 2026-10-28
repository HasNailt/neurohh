-- Profiles, likes, listing comments, pins, direct chats.

alter table profiles add column if not exists status text not null default 'open';
alter table profiles add column if not exists links jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists badges text[] not null default '{}';

alter table profiles drop constraint if exists profiles_status_chk;
alter table profiles add constraint profiles_status_chk
  check (status in ('open', 'busy', 'closed', 'away'));

create table if not exists profile_images (
  user_id text not null references profiles (user_id) on delete cascade,
  kind text not null,
  mime text not null,
  data_b64 text not null,
  primary key (user_id, kind),
  constraint profile_images_kind_chk check (kind in ('avatar', 'banner', 'background'))
);

alter table listings add column if not exists pinned boolean not null default false;

create table if not exists listing_likes (
  listing_id text not null references listings (id) on delete cascade,
  user_id text not null references profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create index if not exists listing_likes_listing_idx on listing_likes (listing_id);

create table if not exists listing_comments (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  author_id text not null references profiles (user_id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint listing_comments_body_chk check (char_length(body) between 1 and 500)
);

create index if not exists listing_comments_listing_idx on listing_comments (listing_id, created_at desc);

create table if not exists dm_threads (
  id text primary key,
  low_id text not null references profiles (user_id),
  high_id text not null references profiles (user_id),
  created_at timestamptz not null default now(),
  unique (low_id, high_id),
  constraint dm_threads_order_chk check (low_id < high_id)
);

create table if not exists dm_messages (
  id text primary key,
  thread_id text not null references dm_threads (id) on delete cascade,
  sender_id text not null references profiles (user_id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint dm_messages_body_chk check (char_length(body) between 1 and 2000)
);

create index if not exists dm_messages_thread_idx on dm_messages (thread_id, created_at);
