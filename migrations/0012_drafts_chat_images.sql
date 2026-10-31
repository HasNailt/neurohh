-- Unpublished lots stay out of the feed until a cover exists.
alter table listings drop constraint if exists listings_status_chk;
alter table listings add constraint listings_status_chk
  check (status in ('active', 'sold', 'ended', 'removed', 'draft'));

-- Original chat pictures. No thumbnail: buyers download the file as uploaded.
create table if not exists message_images (
  id text primary key,
  message_id text not null references messages (id) on delete cascade,
  filename text not null,
  mime text not null,
  data_b64 text not null,
  width integer,
  height integer,
  size_bytes integer not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_images_msg_idx on message_images (message_id, sort);
