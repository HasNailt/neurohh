create table if not exists listing_items (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  position integer not null,
  title text not null,
  price integer not null,
  status text not null default 'open',
  buyer_id text,
  created_at timestamptz not null default now(),
  constraint listing_items_status_chk check (status in ('open', 'sold')),
  constraint listing_items_price_chk check (price > 0),
  unique (listing_id, position)
);

create index if not exists listing_items_listing_idx on listing_items (listing_id, position);

alter table deals add column if not exists item_id text;

alter table deals drop constraint if exists deals_listing_id_key;
drop index if exists deals_listing_id_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deals_item_id_fkey') then
    alter table deals
      add constraint deals_item_id_fkey
      foreign key (item_id) references listing_items (id) on delete set null;
  end if;
end $$;

create unique index if not exists deals_item_id_idx on deals (item_id) where item_id is not null;
create unique index if not exists deals_one_plain_listing_idx on deals (listing_id) where item_id is null;
