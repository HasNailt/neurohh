-- The credential hash is saltHex:keyHex (~161 chars). Keep it as text so a
-- short varchar cannot truncate it into a password that never verifies.
alter table account alter column "password" type text;

-- An empty credential row is what sign-in finds first, so a real hash on a
-- second row never gets checked.
delete from account as empty
where empty."providerId" = 'credential'
  and (empty.password is null or length(empty.password) = 0)
  and exists (
    select 1 from account filled
    where filled."userId" = empty."userId"
      and filled."providerId" = 'credential'
      and filled.password is not null
      and length(filled.password) > 0
  );

-- Sign-in compares the lowercased address. Repeat the fold for rows that
-- appeared after 0007 (skipped when two casings collided).
update "user" as u
set email = lower(u.email)
where u.email <> lower(u.email)
  and not exists (
    select 1 from "user" other
    where other.id <> u.id and lower(other.email) = lower(u.email)
  );
