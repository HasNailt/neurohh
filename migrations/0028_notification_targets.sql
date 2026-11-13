-- Point stored mention and comment signals at the post or comment, not just the profile.

update mentions m
set href = '/u/' || pr.handle || '#post-' || p.id
from posts p
join profiles pr on pr.user_id = p.author_id
where m.source = 'post:' || p.id;

update mentions m
set href = '/u/' || pr.handle || '#comment-' || c.id
from post_comments c
join posts p on p.id = c.post_id
join profiles pr on pr.user_id = p.author_id
where m.source = 'post-comment:' || c.id;

update mentions m
set href = '/u/' || pr.handle || '#comment-' || c.id
from profile_comments c
join profiles pr on pr.user_id = c.profile_id
where m.source = 'profile-comment:' || c.id;

update mentions m
set href = '/lot/' || c.listing_id || '#comment-' || c.id
from listing_comments c
where m.source = 'lot-comment:' || c.id;

update notifications n
set href = m.href
from mentions m
where n.kind = 'mention'
  and n.user_id = m.user_id
  and n.href <> m.href
  and position('#' in m.href) > 0
  and (n.href = split_part(m.href, '#', 1) or n.href = '/')
  and n.created_at between m.created_at - interval '5 seconds' and m.created_at + interval '5 seconds';

update notifications n
set href = '/u/' || pr.handle || '#comment-' || c.id
from post_comments c
join posts p on p.id = c.post_id
join profiles pr on pr.user_id = p.author_id
join profiles actor on actor.user_id = c.author_id
where n.kind = 'comment'
  and n.title = 'Комментарий к посту'
  and n.user_id = p.author_id
  and n.href = '/u/' || pr.handle
  and left(n.body, char_length(actor.handle) + 1) = actor.handle || ':'
  and n.created_at between c.created_at - interval '5 seconds' and c.created_at + interval '5 seconds';

update notifications n
set href = '/lot/' || c.listing_id || '#comment-' || c.id
from listing_comments c
join profiles actor on actor.user_id = c.author_id
where n.kind = 'comment'
  and n.title = 'Комментарий к лоту'
  and n.href = '/lot/' || c.listing_id
  and left(n.body, char_length(actor.handle) + 1) = actor.handle || ':'
  and n.created_at between c.created_at - interval '5 seconds' and c.created_at + interval '5 seconds';

update notifications n
set href = '/u/' || pr.handle || '#comment-' || c.id
from profile_comments c
join profiles pr on pr.user_id = c.profile_id
join profiles actor on actor.user_id = c.author_id
where n.kind = 'comment'
  and n.title = 'Новый комментарий'
  and n.user_id = c.profile_id
  and n.href = '/u/' || pr.handle
  and left(n.body, char_length(actor.handle) + 2) = '@' || actor.handle || ':'
  and n.created_at between c.created_at - interval '5 seconds' and c.created_at + interval '5 seconds';
