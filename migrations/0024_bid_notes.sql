alter table bids add column if not exists note text not null default '';
alter table bids add column if not exists seller_note text not null default '';
