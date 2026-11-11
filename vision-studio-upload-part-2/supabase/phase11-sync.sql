-- Apply only after phase9-schema.sql in a dedicated Vision Studio project.
-- Revision checks avoid silently overwriting another browser session's changes.
alter table public.studio_projects add column if not exists revision integer not null default 0 check (revision >= 0);
alter table public.studio_productions add column if not exists revision integer not null default 0 check (revision >= 0);
-- Prevent client-side changes to protected production budget, owner, and kind fields.
-- Existing phase9 RLS policies still apply; no service-role key is exposed.
revoke update on public.studio_productions from authenticated;
grant update (storyboard, revision, title, mode) on public.studio_productions to authenticated;
revoke update on public.studio_projects from authenticated;
grant update (visual_bible, revision, title) on public.studio_projects to authenticated;
