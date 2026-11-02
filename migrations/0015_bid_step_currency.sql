alter table listings add column if not exists bid_step integer not null default 1;
alter table listings add column if not exists currency text not null default 'rub';

alter table listings drop constraint if exists listings_bid_step_chk;
alter table listings add constraint listings_bid_step_chk check (bid_step > 0);

alter table listings drop constraint if exists listings_currency_chk;
alter table listings add constraint listings_currency_chk check (currency in ('rub', 'sw'));

alter table deals add column if not exists currency text not null default 'rub';
alter table deals drop constraint if exists deals_currency_chk;
alter table deals add constraint deals_currency_chk check (currency in ('rub', 'sw'));
