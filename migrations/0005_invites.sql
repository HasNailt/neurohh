-- Invite codes and the switch that makes them mandatory for new accounts.

create table if not exists site_settings (
  key text primary key,
  value text not null
);

insert into site_settings (key, value)
values ('require_invite', 'false')
on conflict (key) do nothing;

create table if not exists invite_codes (
  id text primary key,
  code text not null unique,
  created_by text not null references profiles (user_id),
  note text not null default '',
  max_uses integer not null default 1,
  uses integer not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint invite_max_chk check (max_uses between 1 and 100),
  constraint invite_uses_chk check (uses >= 0 and uses <= max_uses)
);

create table if not exists invite_redemptions (
  id text primary key,
  code_id text not null references invite_codes (id),
  user_id text not null unique,
  created_at timestamptz not null default now()
);
