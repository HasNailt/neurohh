-- Lotteries, profile showcase order, and the homepage news block.

alter table listings drop constraint if exists listings_kind_chk;
alter table listings add constraint listings_kind_chk check (kind in ('fixed', 'auction', 'lottery'));

alter table listings drop constraint if exists listings_price_chk;
alter table listings add constraint listings_price_chk check (
  (kind = 'lottery' and price >= 0) or (kind in ('fixed', 'auction') and price > 0)
);

alter table listings add column if not exists winner_count integer;
alter table listings add column if not exists rules text not null default '';
alter table listings add column if not exists require_follow boolean not null default false;
alter table listings add column if not exists require_like boolean not null default false;
alter table listings add column if not exists require_comment boolean not null default false;
alter table listings add column if not exists drawn_at timestamptz;

alter table listings drop constraint if exists listings_winner_count_chk;
alter table listings add constraint listings_winner_count_chk
  check (winner_count is null or (winner_count between 1 and 20));

create index if not exists listings_lottery_due_idx
  on listings (ends_at)
  where kind = 'lottery' and status = 'active';

create table if not exists lottery_entries (
  listing_id text not null references listings (id) on delete cascade,
  user_id text not null references profiles (user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  won boolean not null default false,
  primary key (listing_id, user_id)
);

create index if not exists lottery_entries_open_idx
  on lottery_entries (listing_id)
  where removed_at is null;

alter table profiles add column if not exists showcase text not null default 'lots';
alter table profiles drop constraint if exists profiles_showcase_chk;
alter table profiles add constraint profiles_showcase_chk check (showcase in ('lots', 'lotteries', 'posts'));

create table if not exists news_posts (
  id text primary key,
  author_id text not null references profiles (user_id),
  title text not null,
  body text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists news_posts_live_idx on news_posts (created_at desc) where published;

create table if not exists news_images (
  id text primary key,
  news_id text not null references news_posts (id) on delete cascade,
  card_b64 text not null,
  sort integer not null default 0
);

create index if not exists news_images_news_idx on news_images (news_id, sort);
