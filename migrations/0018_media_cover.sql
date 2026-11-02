alter table media add column if not exists is_cover boolean not null default false;

update media m
set is_cover = true
where m.kind = 'preview'
  and not exists (
    select 1 from media c
    where c.listing_id = m.listing_id and c.kind = 'preview' and c.is_cover
  )
  and m.id = (
    select m2.id from media m2
    where m2.listing_id = m.listing_id and m2.kind = 'preview'
    order by m2.created_at asc, m2.id asc
    limit 1
  );

create unique index if not exists media_one_cover_idx
  on media (listing_id)
  where kind = 'preview' and is_cover;
