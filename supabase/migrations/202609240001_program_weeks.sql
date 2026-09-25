create table if not exists public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (program_id, week_number)
);

create index if not exists program_weeks_program_idx
  on public.program_weeks (program_id, week_number);

alter table public.program_weeks enable row level security;

create policy "settimane leggibili ai partecipanti"
  on public.program_weeks for select
  using (
    exists (
      select 1
      from public.program_assignments pa
      where pa.program_id = program_weeks.program_id
        and auth.uid() = pa.athlete_id
    )
    or exists (
      select 1
      from public.programs p
      where p.id = program_weeks.program_id
        and p.coach_id = auth.uid()
    )
  );

create policy "settimane gestite dal coach"
  on public.program_weeks for all
  using (
    exists (
      select 1
      from public.programs p
      where p.id = program_weeks.program_id
        and p.coach_id = auth.uid()
    )
  );
