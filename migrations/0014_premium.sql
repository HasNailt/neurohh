alter table profiles add column if not exists premium_until timestamptz;
alter table profiles add column if not exists premium_forever boolean not null default false;
alter table profiles add column if not exists theme text not null default 'classic';
alter table profiles add column if not exists accent text not null default 'wine';
alter table profiles add column if not exists avatar_frame text not null default 'thin';
alter table profiles add column if not exists banner_overlay text not null default 'gradient';

alter table listings add column if not exists boosted_until timestamptz;

alter table posts add column if not exists pinned boolean not null default false;
