create extension if not exists "pgcrypto";

create type public.user_role as enum ('coach', 'atleta', 'admin');
create type public.assignment_status as enum ('invitato', 'attivo', 'in_pausa', 'concluso');
create type public.workout_status as enum ('programmato', 'in_corso', 'completato', 'saltato');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  avatar_url text,
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  status public.assignment_status not null default 'invitato',
  goal text,
  started_at date,
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_id),
  check (coach_id <> athlete_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  equipment text,
  instructions text,
  video_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  duration_weeks integer not null check (duration_weeks > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title text not null,
  description text,
  week_number integer not null check (week_number > 0),
  day_number integer not null check (day_number between 1 and 7),
  estimated_minutes integer check (estimated_minutes > 0),
  sort_order integer not null default 0
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sets integer not null check (sets > 0),
  reps text not null,
  load_instruction text,
  rest_seconds integer check (rest_seconds >= 0),
  tempo text,
  notes text,
  sort_order integer not null default 0
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for date not null,
  status public.workout_status not null default 'programmato',
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer,
  athlete_feedback text,
  session_rpe numeric(3,1) check (session_rpe between 0 and 10),
  unique (workout_id, athlete_id, scheduled_for)
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id),
  set_number integer not null check (set_number > 0),
  reps numeric(6,2),
  load_kg numeric(7,2),
  rpe numeric(3,1) check (rpe between 0 and 10),
  completed boolean not null default false,
  notes text,
  unique (workout_log_id, workout_exercise_id, set_number)
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric(6,2),
  body_fat_percentage numeric(5,2),
  waist_cm numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index coach_athletes_coach_idx on public.coach_athletes(coach_id);
create index coach_athletes_athlete_idx on public.coach_athletes(athlete_id);
create index workout_logs_athlete_date_idx on public.workout_logs(athlete_id, scheduled_for);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index measurements_athlete_date_idx on public.measurements(athlete_id, recorded_on desc);

alter table public.profiles enable row level security;
alter table public.coach_athletes enable row level security;
alter table public.exercises enable row level security;
alter table public.programs enable row level security;
alter table public.program_assignments enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Il profilo è leggibile dal proprietario" on public.profiles for select using (auth.uid() = id);
create policy "Il profilo è aggiornabile dal proprietario" on public.profiles for update using (auth.uid() = id);
create policy "Le relazioni sono visibili ai partecipanti" on public.coach_athletes for select using (auth.uid() in (coach_id, athlete_id));
create policy "Il coach gestisce le proprie relazioni" on public.coach_athletes for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
create policy "Il coach gestisce i propri esercizi" on public.exercises for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
create policy "Gli esercizi pubblici sono leggibili" on public.exercises for select using (is_public or auth.uid() = coach_id);
create policy "Il coach gestisce i propri programmi" on public.programs for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
create policy "I partecipanti leggono le conversazioni" on public.conversations for select using (auth.uid() in (coach_id, athlete_id));
create policy "I partecipanti leggono i messaggi" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.coach_id, c.athlete_id)));
create policy "I partecipanti inviano messaggi" on public.messages for insert with check (auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.coach_id, c.athlete_id)));

comment on schema public is 'Schema MVP di VSC Training; completare le policy delle tabelle di programmazione prima della produzione.';