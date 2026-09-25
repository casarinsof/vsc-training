create table if not exists public.athlete_invites (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_email text not null,
  athlete_name text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  athlete_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_email, status)
);

create index if not exists athlete_invites_coach_idx
  on public.athlete_invites (coach_id, created_at desc);

alter table public.athlete_invites enable row level security;

create policy "inviti leggibili al coach"
  on public.athlete_invites for select
  using (auth.uid() = coach_id);

create policy "inviti gestibili al coach"
  on public.athlete_invites for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);
