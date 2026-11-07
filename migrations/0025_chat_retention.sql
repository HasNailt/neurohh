create index if not exists message_images_created_idx on message_images (created_at);
create index if not exists dm_message_images_created_idx on dm_message_images (created_at);
create index if not exists deals_completed_idx on deals (completed_at) where status = 'completed';
