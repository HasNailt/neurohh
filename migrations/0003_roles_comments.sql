-- Roles (user / moderator / admin) and profile comments.

alter table profiles add column if not exists role text not null default 'user';

update profiles set role = 'admin' where is_admin = true and role = 'user';

alter table profiles drop constraint if exists profiles_role_chk;
alter table profiles add constraint profiles_role_chk check (role in ('user', 'moderator', 'admin'));

create table if not exists profile_comments (
  id text primary key,
  profile_id text not null references profiles (user_id) on delete cascade,
  author_id text not null references profiles (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint profile_comments_body_chk check (char_length(body) between 1 and 500)
);

create index if not exists profile_comments_profile_idx on profile_comments (profile_id, created_at desc);
