alter table profile_images add column if not exists updated_at timestamptz not null default now();

alter table profiles add column if not exists side_left_framed boolean not null default true;
alter table profiles add column if not exists side_right_framed boolean not null default true;

update profiles set side_left_framed = false where side_left_shape = 'none';
update profiles set side_right_framed = false where side_right_shape = 'none';
update profiles set side_left_shape = 'rect' where side_left_shape = 'none';
update profiles set side_right_shape = 'rect' where side_right_shape = 'none';

alter table profiles drop constraint if exists profiles_side_left_shape_chk;
alter table profiles add constraint profiles_side_left_shape_chk
  check (side_left_shape in ('rect', 'wide', 'square-top', 'square-bottom'));
alter table profiles drop constraint if exists profiles_side_right_shape_chk;
alter table profiles add constraint profiles_side_right_shape_chk
  check (side_right_shape in ('rect', 'wide', 'square-top', 'square-bottom'));
