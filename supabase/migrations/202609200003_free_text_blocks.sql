-- Blocchi di allenamento a testo libero, in sostituzione degli esercizi strutturati.

create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  position int not null default 0,
  title text not null default '',
  kind text not null default 'single' check (kind in ('single', 'superset', 'circuit')),
  -- Testo scritto dal coach così com'è, a capo compresi.
  instructions text not null default '',
  rpe smallint check (rpe between 1 and 10),
  notes text not null default '',
  video_url text,
  created_at timestamptz not null default now()
);

create index if not exists workout_blocks_workout_idx
  on public.workout_blocks (workout_id, position);

alter table public.workout_blocks enable row level security;

create policy "blocchi visibili ai partecipanti"
  on public.workout_blocks for select
  using (
    exists (
      select 1
      from public.workouts w
      join public.program_assignments pa on pa.program_id = w.program_id
      join public.coach_athletes ca on ca.athlete_id = pa.athlete_id
      where w.id = workout_blocks.workout_id
        and (auth.uid() = pa.athlete_id or auth.uid() = ca.coach_id)
    )
  );

create policy "blocchi gestiti dal coach"
  on public.workout_blocks for all
  using (
    exists (
      select 1
      from public.workouts w
      join public.programs p on p.id = w.program_id
      where w.id = workout_blocks.workout_id and p.coach_id = auth.uid()
    )
  );

-- I risultati che l'atleta inserisce sono anch'essi testo libero.
create table if not exists public.block_results (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.workout_blocks(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  result text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (block_id, athlete_id)
);

alter table public.block_results enable row level security;

create policy "risultati gestiti dall'atleta"
  on public.block_results for all
  using (auth.uid() = athlete_id)
  with check (auth.uid() = athlete_id);

create policy "risultati visibili al coach"
  on public.block_results for select
  using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid() and ca.athlete_id = block_results.athlete_id
    )
  );

-- Il vecchio modello a esercizi strutturati non è più usato.
drop table if exists public.set_logs;
drop table if exists public.workout_exercises;
