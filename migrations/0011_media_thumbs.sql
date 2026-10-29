-- Small display copies so listing cards never download the original upload.

alter table media add column if not exists card_b64 text;
alter table media add column if not exists view_b64 text;

alter table profile_images add column if not exists view_b64 text;
