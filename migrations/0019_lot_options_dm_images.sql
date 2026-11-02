alter table listings add column if not exists price2 integer;
alter table listings add column if not exists price2_label text;
alter table listings add column if not exists engine text;
alter table listings add column if not exists buy_now_currency text;

alter table listings drop constraint if exists listings_buynow_chk;
alter table listings add constraint listings_buynow_chk check (buy_now is null or buy_now > 0);
alter table listings drop constraint if exists listings_price2_chk;
alter table listings add constraint listings_price2_chk check (price2 is null or price2 > 0);
alter table listings drop constraint if exists listings_engine_chk;
alter table listings add constraint listings_engine_chk
  check (engine is null or engine in ('niji', 'stable_waifu', 'stable_diffusion', 'neurochan'));
alter table listings drop constraint if exists listings_buy_now_currency_chk;
alter table listings add constraint listings_buy_now_currency_chk
  check (buy_now_currency is null or buy_now_currency in ('rub', 'sw'));

alter table dm_messages drop constraint if exists dm_messages_body_chk;
alter table dm_messages add constraint dm_messages_body_chk check (char_length(body) between 0 and 2000);

create table if not exists dm_message_images (
  id text primary key,
  message_id text not null references dm_messages (id) on delete cascade,
  filename text not null,
  mime text not null,
  data_b64 text not null,
  width integer,
  height integer,
  size_bytes integer not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists dm_message_images_msg_idx on dm_message_images (message_id, sort);
