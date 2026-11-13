alter table listing_comments
  add column if not exists parent_id text references listing_comments (id) on delete cascade;

create index if not exists listing_comments_parent_idx on listing_comments (parent_id);
