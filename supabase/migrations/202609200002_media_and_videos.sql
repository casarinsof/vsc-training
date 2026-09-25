-- Video dimostrativi sugli esercizi e media caricati dagli atleti.

-- 1. Link al video demo direttamente sull'esercizio prescritto.
alter table public.workout_exercises
  add column if not exists video_url text;

comment on column public.workout_exercises.video_url is
  'Link YouTube/Vimeo o path nel bucket exercise-videos.';

-- 2. Commenti su un allenamento, scritti da coach o atleta.
create table if not exists public.workout_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Allegati foto/video collegati a un commento.
create table if not exists public.media_attachments (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.workout_comments(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,
  thumbnail_path text,
  caption text not null default '',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_comments_workout_idx
  on public.workout_comments (workout_id, created_at);
create index if not exists media_attachments_comment_idx
  on public.media_attachments (comment_id);

alter table public.workout_comments enable row level security;
alter table public.media_attachments enable row level security;

-- Vedono il thread l'atleta proprietario dell'assegnazione e il suo coach.
create policy "commenti visibili ai partecipanti"
  on public.workout_comments for select
  using (
    exists (
      select 1
      from public.workouts w
      join public.program_assignments pa on pa.program_id = w.program_id
      join public.coach_athletes ca on ca.athlete_id = pa.athlete_id
      where w.id = workout_comments.workout_id
        and (auth.uid() = pa.athlete_id or auth.uid() = ca.coach_id)
    )
  );

create policy "commenti scritti dall'autore"
  on public.workout_comments for insert
  with check (auth.uid() = author_id);

create policy "commenti modificabili dall'autore"
  on public.workout_comments for update
  using (auth.uid() = author_id);

create policy "commenti eliminabili dall'autore"
  on public.workout_comments for delete
  using (auth.uid() = author_id);

create policy "allegati visibili ai partecipanti del commento"
  on public.media_attachments for select
  using (
    exists (
      select 1 from public.workout_comments c
      where c.id = media_attachments.comment_id
    )
  );

create policy "allegati caricati dal proprietario"
  on public.media_attachments for insert
  with check (auth.uid() = owner_id);

create policy "allegati eliminabili dal proprietario"
  on public.media_attachments for delete
  using (auth.uid() = owner_id);

-- 4. Bucket di storage: demo del coach (pubblici) e media atleta (privati).
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('exercise-videos', 'exercise-videos', true, 209715200),
  ('athlete-media', 'athlete-media', false, 209715200)
on conflict (id) do nothing;

create policy "video demo leggibili da tutti"
  on storage.objects for select
  using (bucket_id = 'exercise-videos');

create policy "video demo caricati dal coach"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-videos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

-- I media privati sono organizzati come <athlete_id>/<workout_id>/<file>.
create policy "media atleta leggibili dal proprietario"
  on storage.objects for select
  using (
    bucket_id = 'athlete-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.coach_athletes ca
        where ca.coach_id = auth.uid()
          and ca.athlete_id::text = (storage.foldername(name))[1]
      )
    )
  );

create policy "media atleta caricati dal proprietario"
  on storage.objects for insert
  with check (
    bucket_id = 'athlete-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "media atleta eliminabili dal proprietario"
  on storage.objects for delete
  using (
    bucket_id = 'athlete-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
