-- GLYPH adopt marketplace. Per-user rows key off Better Auth text ids.

create table if not exists profiles (
  user_id text primary key,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  is_admin boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id text primary key,
  seller_id text not null references profiles (user_id),
  title text not null,
  blurb text not null default '',
  private_description text not null default '',
  kind text not null,
  price integer not null,
  buy_now integer,
  anti_snipe_minutes integer not null default 3,
  ends_at timestamptz,
  status text not null,
  current_bid integer,
  current_bidder_id text,
  bid_count integer not null default 0,
  winner_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_kind_chk check (kind in ('fixed', 'auction')),
  constraint listings_status_chk check (status in ('active', 'sold', 'ended', 'removed')),
  constraint listings_price_chk check (price > 0),
  constraint listings_buynow_chk check (buy_now is null or buy_now > price)
);

create index if not exists listings_feed_idx on listings (status, created_at desc);
create index if not exists listings_seller_idx on listings (seller_id);

create table if not exists tags (
  id serial primary key,
  slug text not null unique,
  label text not null
);

create table if not exists listing_tags (
  listing_id text not null references listings (id) on delete cascade,
  tag_id integer not null references tags (id),
  primary key (listing_id, tag_id)
);

create index if not exists listing_tags_tag_idx on listing_tags (tag_id);

create table if not exists media (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  kind text not null,
  filename text not null,
  mime text not null,
  data_b64 text not null,
  width integer,
  height integer,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  constraint media_kind_chk check (kind in ('preview', 'file'))
);

create index if not exists media_listing_idx on media (listing_id, kind);

create table if not exists bids (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  bidder_id text not null references profiles (user_id),
  amount integer not null,
  created_at timestamptz not null default now()
);

create index if not exists bids_listing_idx on bids (listing_id, created_at desc);

create table if not exists deals (
  id text primary key,
  listing_id text not null unique references listings (id),
  seller_id text not null references profiles (user_id),
  buyer_id text not null references profiles (user_id),
  amount integer not null,
  status text not null,
  seller_confirmed_at timestamptz,
  buyer_confirmed_at timestamptz,
  files_released_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint deals_status_chk check (
    status in ('awaiting_payment', 'confirmed', 'files_released', 'completed')
  )
);

create index if not exists deals_seller_idx on deals (seller_id, created_at desc);
create index if not exists deals_buyer_idx on deals (buyer_id, created_at desc);

create table if not exists messages (
  id text primary key,
  deal_id text not null references deals (id) on delete cascade,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_deal_idx on messages (deal_id, created_at);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists reports (
  id text primary key,
  reporter_id text not null references profiles (user_id),
  listing_id text,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_status_chk check (status in ('open', 'dismissed', 'actioned'))
);

create index if not exists reports_status_idx on reports (status, created_at desc);
