alter table profiles add column if not exists side_left_shape text not null default 'rect';
alter table profiles add column if not exists side_right_shape text not null default 'rect';

alter table profiles drop constraint if exists profiles_side_left_shape_chk;
alter table profiles add constraint profiles_side_left_shape_chk
  check (side_left_shape in ('rect', 'wide', 'square-top', 'square-bottom', 'none'));
alter table profiles drop constraint if exists profiles_side_right_shape_chk;
alter table profiles add constraint profiles_side_right_shape_chk
  check (side_right_shape in ('rect', 'wide', 'square-top', 'square-bottom', 'none'));
