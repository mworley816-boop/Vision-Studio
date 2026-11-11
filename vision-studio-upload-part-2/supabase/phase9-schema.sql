-- Phase 9 schema template. Apply to a NEW, dedicated Vision Studio Supabase project.
-- Owner bootstrap: create your Auth account, then as database administrator run:
-- INSERT INTO public.studio_owners (user_id) VALUES ('YOUR_AUTH_USER_UUID');
-- Do not expose a client-side owner registration endpoint.
create extension if not exists pgcrypto;
create table if not exists public.studio_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.studio_owners(user_id),
  title text not null check (char_length(title) between 1 and 160),
  kind text not null check (kind in ('music','series')),
  visual_bible jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.studio_productions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  owner_id uuid not null references public.studio_owners(user_id),
  title text not null check (char_length(title) between 1 and 160),
  kind text not null check (kind in ('music','episode')),
  mode text not null default 'approval' check (mode in ('approval','auto')),
  storyboard jsonb not null default '[]'::jsonb,
  budget_cents integer not null check (budget_cents in (500,2000)),
  created_at timestamptz not null default now(),
  unique(id,owner_id)
);
create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.studio_owners(user_id),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  production_id uuid references public.studio_productions(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null,
  created_at timestamptz not null default now()
);
-- Phase 9 does not expose a paid-job ledger; paid jobs stay disabled until atomic RPCs exist.
alter table public.studio_owners enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_productions enable row level security;
alter table public.studio_assets enable row level security;
revoke all on public.studio_owners from anon, authenticated;
grant select on public.studio_owners to authenticated;
grant select, insert, update, delete on public.studio_projects, public.studio_productions, public.studio_assets to authenticated;
create policy "owner reads own enrollment" on public.studio_owners for select to authenticated using (user_id = (select auth.uid()));
create policy "owner reads projects" on public.studio_projects for select to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid())));
create policy "owner creates projects" on public.studio_projects for insert to authenticated with check (owner_id = (select auth.uid()) and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid())));
create policy "owner updates projects" on public.studio_projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner deletes projects" on public.studio_projects for delete to authenticated using (owner_id = (select auth.uid()));
create policy "owner reads productions" on public.studio_productions for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner creates productions" on public.studio_productions for insert to authenticated with check (owner_id = (select auth.uid()) and exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_id = (select auth.uid()) and ((p.kind = 'music' and kind = 'music' and budget_cents = 500) or (p.kind = 'series' and kind = 'episode' and budget_cents = 2000))));
create policy "owner updates productions" on public.studio_productions for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_id = (select auth.uid()) and ((p.kind = 'music' and kind = 'music' and budget_cents = 500) or (p.kind = 'series' and kind = 'episode' and budget_cents = 2000))));
create policy "owner deletes productions" on public.studio_productions for delete to authenticated using (owner_id = (select auth.uid()));
create policy "owner reads assets" on public.studio_assets for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner creates assets" on public.studio_assets for insert to authenticated with check (owner_id = (select auth.uid()) and storage_path like (select auth.uid())::text || '/%' and exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_id = (select auth.uid())) and (production_id is null or exists (select 1 from public.studio_productions p where p.id = production_id and p.project_id = studio_assets.project_id and p.owner_id = (select auth.uid()))));
create policy "owner deletes assets" on public.studio_assets for delete to authenticated using (owner_id = (select auth.uid()));
-- Storage bucket is private. SQL setup requires privileges in the target Supabase project.
insert into storage.buckets (id,name,public,file_size_limit) values ('vision-private','vision-private',false,104857600) on conflict (id) do update set public = false;
create policy "owner reads own files" on storage.objects for select to authenticated using (bucket_id = 'vision-private' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid())));
create policy "owner uploads own files" on storage.objects for insert to authenticated with check (bucket_id = 'vision-private' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.studio_owners o where o.user_id = (select auth.uid())));
create policy "owner deletes own files" on storage.objects for delete to authenticated using (bucket_id = 'vision-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
