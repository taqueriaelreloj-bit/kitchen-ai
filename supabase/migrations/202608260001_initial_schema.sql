-- Kitchen AI: esquema mínimo, privado por defecto y preparado para trabajos IA.
create extension if not exists pgcrypto;

create type public.project_status as enum ('draft', 'scanned', 'designing', 'ready', 'archived');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mi cocina' check (char_length(name) between 1 and 100),
  status public.project_status not null default 'draft',
  locale text not null default 'es-US',
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  source text not null check (source in ('guided-camera', 'roomplan', 'arcore-depth')),
  model jsonb not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_model_id uuid not null references public.room_models(id) on delete restrict,
  prompt_version text not null,
  provider_model text not null,
  specification jsonb not null,
  preview_path text,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  design_id uuid not null references public.designs(id) on delete restrict,
  pricing_version text not null,
  currency char(3) not null,
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  low_cents bigint not null check (low_cents >= 0),
  high_cents bigint not null check (high_cents >= low_cents),
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.job_status not null default 'queued',
  idempotency_key text not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
create index room_models_project_idx on public.room_models(project_id, created_at desc);
create index designs_project_idx on public.designs(project_id, created_at desc);
create index generation_jobs_owner_status_idx on public.generation_jobs(owner_id, status);

alter table public.projects enable row level security;
alter table public.room_models enable row level security;
alter table public.designs enable row level security;
alter table public.estimates enable row level security;
alter table public.generation_jobs enable row level security;

revoke all on public.projects, public.room_models, public.designs, public.estimates, public.generation_jobs from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.room_models, public.designs, public.estimates to authenticated;
grant select, insert on public.generation_jobs to authenticated;

create policy projects_select_own on public.projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy projects_insert_own on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy projects_update_own on public.projects for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy projects_delete_own on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);

create policy room_models_select_own on public.room_models for select to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy room_models_insert_own on public.room_models for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy room_models_update_own on public.room_models for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy room_models_delete_own on public.room_models for delete to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy designs_select_own on public.designs for select to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy designs_insert_own on public.designs for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy designs_update_own on public.designs for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy designs_delete_own on public.designs for delete to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy estimates_select_own on public.estimates for select to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy estimates_insert_own on public.estimates for insert to authenticated with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy estimates_update_own on public.estimates for update to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy estimates_delete_own on public.estimates for delete to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

create policy generation_jobs_select_own on public.generation_jobs for select to authenticated using ((select auth.uid()) = owner_id);
create policy generation_jobs_insert_own on public.generation_jobs for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
