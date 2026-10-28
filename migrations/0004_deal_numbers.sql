-- Public deal numbers (#1001, #1002, …) for participants and moderators.

create sequence if not exists deal_public_no_seq start with 1001;

alter table deals add column if not exists public_no integer;

update deals
set public_no = nextval('deal_public_no_seq')
where public_no is null;

alter table deals alter column public_no set default nextval('deal_public_no_seq');

alter table deals alter column public_no set not null;

create unique index if not exists deals_public_no_idx on deals (public_no);
