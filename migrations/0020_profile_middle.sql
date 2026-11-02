alter table profile_images drop constraint if exists profile_images_kind_chk;
alter table profile_images add constraint profile_images_kind_chk
  check (kind in ('avatar', 'banner', 'background', 'side_left', 'side_right', 'middle'));
