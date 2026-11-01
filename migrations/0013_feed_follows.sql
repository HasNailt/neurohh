-- Follows, author posts, and threaded comments under those posts.

create table if not exists follows (
  follower_id text not null references profiles (user_id) on delete cascade,
  following_id text not null references profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on follows (following_id);

create table if not exists posts (
  id text primary key,
  author_id text not null references profiles (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint posts_body_chk check (char_length(body) between 1 and 2000)
);

create index if not exists posts_author_idx on posts (author_id, created_at desc);

create table if not exists post_images (
  id text primary key,
  post_id text not null references posts (id) on delete cascade,
  card_b64 text not null,
  sort integer not null default 0
);

create index if not exists post_images_post_idx on post_images (post_id, sort);

create table if not exists post_comments (
  id text primary key,
  post_id text not null references posts (id) on delete cascade,
  author_id text not null references profiles (user_id),
  parent_id text references post_comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_chk check (char_length(body) between 1 and 500)
);

create index if not exists post_comments_post_idx on post_comments (post_id, created_at);
