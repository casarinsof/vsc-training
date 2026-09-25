import {
  createEmptyDay,
  trainingPrograms,
  type BlockKind,
  type ProgramDay,
  type ProgramWeek,
  type TrainingProgram,
  type Workout,
  type WorkoutBlock
} from "@vsc-training/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
}

interface AssignmentRow {
  program_id: string;
  athlete_id: string;
}

interface WorkoutRow {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  week_number: number;
  day_number: number;
  sort_order: number;
}

interface BlockRow {
  id: string;
  workout_id: string;
  title: string | null;
  kind: string | null;
  instructions: string | null;
  rpe: number | null;
  notes: string | null;
  video_url: string | null;
  position: number;
}

interface WeekLabelRow {
  program_id: string;
  week_number: number;
  label: string;
}

interface PositionedBlock {
  position: number;
  block: WorkoutBlock;
}

interface RepositoryContext {
  supabase: SupabaseClient;
  coachId: string;
}

function toBlockKind(kind: string | null): BlockKind {
  if (kind === "superset" || kind === "circuit") return kind;
  return "single";
}

function buildProgramFromRows(
  program: ProgramRow,
  workoutRows: WorkoutRow[],
  blockRows: BlockRow[],
  assignedAthleteIds: string[],
  weekLabelRows: WeekLabelRow[]
): TrainingProgram {
  const maxWeek = Math.max(1, ...workoutRows.map((item) => item.week_number));
  const labelsByWeek = new Map(
    weekLabelRows.map((item) => [item.week_number, item.label])
  );

  const weeks: ProgramWeek[] = Array.from({ length: maxWeek }, (_, index) => {
    const weekNumber = index + 1;
    const days: ProgramDay[] = Array.from({ length: 7 }, (_, dayIndex) =>
      createEmptyDay(dayIndex + 1)
    ).map((day) => ({
      ...day,
      id: `${program.id}-w${weekNumber}-d${day.dayNumber}`
    }));

    return {
      id: `${program.id}-w${weekNumber}`,
      weekNumber,
      label: labelsByWeek.get(weekNumber) ?? `Week ${weekNumber}`,
      days
    };
  });

  const blocksByWorkout = new Map<string, PositionedBlock[]>();
  for (const row of blockRows) {
    const list = blocksByWorkout.get(row.workout_id) ?? [];
    list.push({
      position: row.position,
      block: {
        id: row.id,
        title: row.title ?? "",
        kind: toBlockKind(row.kind),
        instructions: row.instructions ?? "",
        rpe: row.rpe ?? null,
        notes: row.notes ?? "",
        videoUrl: row.video_url ?? ""
      }
    });
    blocksByWorkout.set(row.workout_id, list);
  }

  for (const [workoutId, list] of blocksByWorkout.entries()) {
    blocksByWorkout.set(
      workoutId,
      list.sort((a, b) => a.position - b.position)
    );
  }

  for (const row of workoutRows) {
    const week = weeks.find((item) => item.weekNumber === row.week_number);
    const day = week?.days.find((item) => item.dayNumber === row.day_number);
    if (!week || !day) continue;

    const workout: Workout = {
      id: row.id,
      name: row.title,
      notes: row.description ?? "",
      blocks: (blocksByWorkout.get(row.id) ?? []).map((item) => item.block)
    };

    day.workouts.push(workout);
  }

  return {
    id: program.id,
    name: program.name,
    description: program.description ?? "",
    goal: "Performance",
    isTemplate: false,
    assignedAthleteIds,
    weeks
  };
}

export async function loadProgramsForEditor(context?: RepositoryContext): Promise<TrainingProgram[]> {
  if (!context) return trainingPrograms;
  const { supabase, coachId } = context;

  const { data: programsData, error: programsError } = await supabase
    .from("programs")
    .select("id,name,description")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: true })
    .returns<ProgramRow[]>();

  if (programsError || !programsData || programsData.length === 0) return trainingPrograms;

  const programIds = programsData.map((item) => item.id);

  const [{ data: assignments }, { data: workouts }, { data: weekLabels }] = await Promise.all([
    supabase
      .from("program_assignments")
      .select("program_id,athlete_id")
      .in("program_id", programIds)
      .returns<AssignmentRow[]>(),
    supabase
      .from("workouts")
      .select("id,program_id,title,description,week_number,day_number,sort_order")
      .in("program_id", programIds)
      .order("week_number", { ascending: true })
      .order("day_number", { ascending: true })
      .order("sort_order", { ascending: true })
      .returns<WorkoutRow[]>(),
    supabase
      .from("program_weeks")
      .select("program_id,week_number,label")
      .in("program_id", programIds)
      .returns<WeekLabelRow[]>()
  ]);

  const workoutIds = (workouts ?? []).map((item) => item.id);
  const workoutProgramById = new Map((workouts ?? []).map((item) => [item.id, item.program_id]));
  const { data: blocks } = workoutIds.length
    ? await supabase
        .from("workout_blocks")
        .select("id,workout_id,title,kind,instructions,rpe,notes,video_url,position")
        .in("workout_id", workoutIds)
        .order("position", { ascending: true })
        .returns<BlockRow[]>()
    : { data: [] as BlockRow[] };

  return programsData.map((program) =>
    buildProgramFromRows(
      program,
      (workouts ?? []).filter((item) => item.program_id === program.id),
      (blocks ?? []).filter((item) => {
        return workoutProgramById.get(item.workout_id) === program.id;
      }),
      (assignments ?? [])
        .filter((item) => item.program_id === program.id)
        .map((item) => item.athlete_id),
      (weekLabels ?? []).filter((item) => item.program_id === program.id)
    )
  );
}

export async function saveProgramFromEditor(
  program: TrainingProgram,
  context?: RepositoryContext
): Promise<void> {
  if (!context) return;
  const { supabase, coachId } = context;

  const weekCount = Math.max(1, ...program.weeks.map((item) => item.weekNumber));

  await supabase.from("programs").upsert(
    {
      id: program.id,
      coach_id: coachId,
      name: program.name,
      description: program.description,
      duration_weeks: weekCount
    },
    { onConflict: "id" }
  );

  await supabase
    .from("program_weeks")
    .delete()
    .eq("program_id", program.id);

  const weekRows = program.weeks.map((week) => ({
    program_id: program.id,
    week_number: week.weekNumber,
    label: week.label
  }));

  if (weekRows.length) {
    await supabase.from("program_weeks").upsert(weekRows, { onConflict: "program_id,week_number" });
  }

  const serializedWorkouts = program.weeks.flatMap((week) =>
    week.days.flatMap((day) =>
      day.workouts.map((workout, workoutIndex) => ({
        id: workout.id,
        program_id: program.id,
        title: workout.name,
        description: workout.notes,
        week_number: week.weekNumber,
        day_number: day.dayNumber,
        sort_order: workoutIndex
      }))
    )
  );

  const { data: existingWorkouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("program_id", program.id)
    .returns<Array<{ id: string }>>();

  const payloadWorkoutIds = new Set(serializedWorkouts.map((item) => item.id));
  const workoutIdsToDelete = (existingWorkouts ?? [])
    .map((item) => item.id)
    .filter((id) => !payloadWorkoutIds.has(id));

  if (workoutIdsToDelete.length) {
    await supabase.from("workouts").delete().in("id", workoutIdsToDelete);
  }

  if (serializedWorkouts.length) {
    await supabase.from("workouts").upsert(serializedWorkouts, { onConflict: "id" });
  }

  const serializedBlocks = program.weeks.flatMap((week) =>
    week.days.flatMap((day) =>
      day.workouts.flatMap((workout) =>
        workout.blocks.map((block, blockIndex) => ({
          id: block.id,
          workout_id: workout.id,
          position: blockIndex,
          title: block.title,
          kind: block.kind,
          instructions: block.instructions,
          rpe: block.rpe,
          notes: block.notes,
          video_url: block.videoUrl || null
        }))
      )
    )
  );

  const workoutIds = serializedWorkouts.map((item) => item.id);
  const { data: existingBlocks } = workoutIds.length
    ? await supabase
        .from("workout_blocks")
        .select("id")
        .in("workout_id", workoutIds)
        .returns<Array<{ id: string }>>()
    : { data: [] as Array<{ id: string }> };

  const payloadBlockIds = new Set(serializedBlocks.map((item) => item.id));
  const blockIdsToDelete = (existingBlocks ?? [])
    .map((item) => item.id)
    .filter((id) => !payloadBlockIds.has(id));

  if (blockIdsToDelete.length) {
    await supabase.from("workout_blocks").delete().in("id", blockIdsToDelete);
  }

  if (serializedBlocks.length) {
    await supabase.from("workout_blocks").upsert(serializedBlocks, { onConflict: "id" });
  }
}
