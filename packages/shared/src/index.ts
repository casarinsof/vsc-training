export * from "./programs";
export * from "./media";

export type AthleteStatus = "attivo" | "attenzione" | "in pausa";

export interface Athlete {
  id: string;
  name: string;
  initials: string;
  goal: string;
  adherence: number;
  status: AthleteStatus;
  nextWorkout: string;
}

/** Scheda sintetica mostrata nella dashboard e nell'app atleta. */
export interface WorkoutSummary {
  id: string;
  title: string;
  focus: string;
  duration: number;
  completedExercises: number;
  totalExercises: number;
  exercises: Array<{ name: string; prescription: string; rest: string }>;
}

export const athletes: Athlete[] = [
  { id: "a1", name: "Giulia Rossi", initials: "GR", goal: "Forza", adherence: 92, status: "attivo", nextWorkout: "Oggi, 18:30" },
  { id: "a2", name: "Marco Bianchi", initials: "MB", goal: "Ipertrofia", adherence: 78, status: "attenzione", nextWorkout: "Domani, 07:00" },
  { id: "a3", name: "Elena Conti", initials: "EC", goal: "Performance", adherence: 96, status: "attivo", nextWorkout: "Oggi, 12:00" },
  { id: "a4", name: "Luca Romano", initials: "LR", goal: "Dimagrimento", adherence: 85, status: "attivo", nextWorkout: "Mercoledì" }
];

export const todayWorkout: WorkoutSummary = {
  id: "w1",
  title: "Lower Body Strength",
  focus: "Forza · Settimana 4",
  duration: 58,
  completedExercises: 2,
  totalExercises: 5,
  exercises: [
    { name: "Back Squat", prescription: "4 × 5 · RPE 8", rest: "3 min" },
    { name: "Romanian Deadlift", prescription: "3 × 8 · 70 kg", rest: "2 min" },
    { name: "Bulgarian Split Squat", prescription: "3 × 10 per lato", rest: "90 sec" },
    { name: "Leg Curl", prescription: "3 × 12", rest: "75 sec" },
    { name: "Standing Calf Raise", prescription: "4 × 15", rest: "60 sec" }
  ]
};

export function completionPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}