-- One-time bridge when Google's OAuth callback is accepted on the Vercel
-- alias but the session cookie must be set on neurohh.ru (__Host- is host-only).
create table if not exists auth_handoff (
  code text primary key,
  cookie_headers text not null,
  expires_at timestamptz not null
);
