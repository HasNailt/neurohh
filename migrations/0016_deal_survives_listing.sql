alter table deals add column if not exists listing_title text;

update deals d
set listing_title = l.title
from listings l
where d.listing_id = l.id
  and (d.listing_title is null or d.listing_title = '');

alter table deals alter column listing_id drop not null;

do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'deals'
      and con.contype = 'f'
      and pg_get_constraintdef(con.oid) ilike '%listing_id%'
  loop
    execute format('alter table deals drop constraint %I', cname);
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'deals_listing_id_fkey') then
    alter table deals
      add constraint deals_listing_id_fkey
      foreign key (listing_id) references listings (id) on delete set null;
  end if;
end $$;
