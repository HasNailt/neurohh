-- Sign-in looks up the lowercased email. Older rows stored the typed case,
-- so the same address then failed as "invalid email or password".
update "user" as u
set email = lower(u.email)
where u.email <> lower(u.email)
  and not exists (
    select 1 from "user" other
    where other.id <> u.id and lower(other.email) = lower(u.email)
  );
