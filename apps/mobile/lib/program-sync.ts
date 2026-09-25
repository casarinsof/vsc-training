import type { BlockKind, WorkoutBlock } from "@vsc-training/shared";
import { supabase } from "./supabase";

interface AssignmentRow {
  program_id: string;
}

interface ProgramRow {
  name: string;
}

interface WorkoutWeekRow {
  week_number: number;
}

interface WorkoutRow {
  id: string;
  title: string;
  description: string | null;
}

interface WorkoutBlockRow {
  id: string;
  title: string | null;
  kind: string | null;
  instructions: string | null;
  rpe: number | null;
  notes: string | null;
  video_url: string | null;
}

const validKinds: BlockKind[] = ["single", "superset", "circuit"];

function toKind(value: string | null): BlockKind {
  return validKinds.includes((value ?? "single") as BlockKind)
    ? ((value ?? "single") as BlockKind)
    : "single";
}

export interface SyncedWorkoutView {
  programName: string;
  weekNumber: number;
  weekLabel: string;
  weekNumbers: number[];
  workout: {
    id: string;
    title: string;
    notes: string;
    blocks: WorkoutBlock[];
  } | null;
}

export async function fetchAthleteWorkoutFromSupabase(
  athleteId: string,
  weekNumber: number
): Promise<SyncedWorkoutView | null> {
  if (!supabase) return null;

  const { data: assignment, error: assignmentError } = await supabase
    .from("program_assignments")
    .select("program_id")
    .eq("athlete_id", athleteId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AssignmentRow>();

  if (assignmentError || !assignment) return null;

  const programId = assignment.program_id as string;

  const [{ data: program }, { data: weekRows }] = await Promise.all([
    supabase.from("programs").select("name").eq("id", programId).maybeSingle<ProgramRow>(),
    supabase
      .from("workouts")
      .select("week_number")
      .eq("program_id", programId)
      .order("week_number", { ascending: true })
      .returns<WorkoutWeekRow[]>()
  ]);

  const weekNumbers: number[] = Array.from(
    new Set((weekRows ?? []).map((item: WorkoutWeekRow) => item.week_number).filter(Boolean))
  );

  const targetWeek = weekNumbers.includes(weekNumber)
    ? weekNumber
    : (weekNumbers[0] ?? weekNumber);

  const { data: workout } = await supabase
    .from("workouts")
    .select("id,title,description")
    .eq("program_id", programId)
    .eq("week_number", targetWeek)
    .eq("day_number", 1)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle<WorkoutRow>();

  if (!workout) {
    return {
      programName: (program?.name as string) ?? "Programma",
      weekNumber: targetWeek,
      weekLabel: `Week ${targetWeek}`,
      weekNumbers,
      workout: null
    };
  }

  const { data: blocks } = await supabase
    .from("workout_blocks")
    .select("id,title,kind,instructions,rpe,notes,video_url,position")
    .eq("workout_id", workout.id)
    .order("position", { ascending: true })
    .returns<WorkoutBlockRow[]>();

  const mappedBlocks: WorkoutBlock[] = (blocks ?? []).map((block: WorkoutBlockRow) => ({
    id: block.id,
    title: block.title ?? "",
    kind: toKind(block.kind),
    instructions: block.instructions ?? "",
    rpe: block.rpe ?? null,
    notes: block.notes ?? "",
    videoUrl: block.video_url ?? ""
  }));

  return {
    programName: (program?.name as string) ?? "Programma",
    weekNumber: targetWeek,
    weekLabel: `Week ${targetWeek}`,
    weekNumbers,
    workout: {
      id: workout.id as string,
      title: (workout.title as string) ?? "Workout",
      notes: (workout.description as string) ?? "",
      blocks: mappedBlocks
    }
  };
}
