/** Modello di dominio per la programmazione degli allenamenti di VSC Training. */

/** Modalità di esecuzione mostrata come badge sul blocco. */
export type BlockKind = "single" | "superset" | "circuit";

export const blockKindLabels: Record<BlockKind, string> = {
  single: "SINGOLO",
  superset: "SUPERSET",
  circuit: "CIRCUITO"
};

/**
 * Blocco di allenamento scritto liberamente dal coach.
 * Il corpo è testo libero multilinea: nessun campo serie/ripetizioni imposto.
 */
export interface WorkoutBlock {
  id: string;
  title: string;
  kind: BlockKind;
  /** Testo libero mostrato all'atleta sotto "Istruzioni". */
  instructions: string;
  rpe: number | null;
  notes: string;
  /** Link al video dimostrativo caricato o incorporato dal coach. */
  videoUrl: string;
}

/** Sessione nominata: più sessioni possono convivere nello stesso giorno. */
export interface Workout {
  id: string;
  name: string;
  notes: string;
  blocks: WorkoutBlock[];
}

export interface ProgramDay {
  id: string;
  dayNumber: number;
  workouts: Workout[];
}

export interface ProgramWeek {
  id: string;
  weekNumber: number;
  label: string;
  days: ProgramDay[];
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  goal: string;
  isTemplate: boolean;
  assignedAthleteIds: string[];
  weeks: ProgramWeek[];
}

export interface BlockLocation {
  workoutId: string;
  index: number;
}

export const dayNames = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica"
] as const;

export const dayShortNames = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;

let idCounter = 0;

/** Genera un identificativo univoco lato client per gli elementi appena creati. */
export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Restituisce la lettera progressiva del blocco: A, B, … Z, AA, AB. */
export function blockLetter(index: number): string {
  let value = index;
  let letter = "";
  do {
    letter = String.fromCharCode(65 + (value % 26)) + letter;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return letter;
}

/** Prima riga non vuota delle istruzioni, usata come anteprima nell'editor. */
export function blockSummary(block: WorkoutBlock): string {
  const line = block.instructions
    .split("\n")
    .map((row) => row.trim())
    .find((row) => row.length > 0);
  return line ?? "Nessuna istruzione";
}

/** Numero di righe scritte nel blocco, utile per stimare la densità della sessione. */
export function countBlockLines(block: WorkoutBlock): number {
  return block.instructions.split("\n").filter((row) => row.trim().length > 0).length;
}

/** Riconosce i link YouTube e Vimeo e restituisce l'URL da usare in un iframe. */
export function toEmbedUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null;

  const youtube = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

/** Indica se il link punta a un file video caricato direttamente. */
export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.trim());
}

export function hasVideo(block: WorkoutBlock): boolean {
  return block.videoUrl.trim().length > 0;
}

/** Crea un blocco vuoto pronto per essere scritto liberamente. */
export function createBlock(title = ""): WorkoutBlock {
  return {
    id: createId("blk"),
    title: title.trim(),
    kind: "single",
    instructions: "",
    rpe: null,
    notes: "",
    videoUrl: ""
  };
}

export function createWorkout(name: string): Workout {
  return { id: createId("wo"), name, notes: "", blocks: [] };
}

/** Propone il nome successivo disponibile per una nuova sessione del giorno. */
export function nextWorkoutName(day: ProgramDay): string {
  return `Workout ${blockLetter(day.workouts.length)}`;
}

export function createEmptyDay(dayNumber: number): ProgramDay {
  return { id: createId("day"), dayNumber, workouts: [] };
}

export function createEmptyWeek(weekNumber: number): ProgramWeek {
  return {
    id: createId("week"),
    weekNumber,
    label: `Settimana ${weekNumber}`,
    days: Array.from({ length: 7 }, (_, index) => createEmptyDay(index + 1))
  };
}

export function createEmptyProgram(name: string): TrainingProgram {
  return {
    id: createId("prog"),
    name,
    description: "",
    goal: "Forza",
    isTemplate: false,
    assignedAthleteIds: [],
    weeks: [createEmptyWeek(1)]
  };
}

export function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    id: createId("wo"),
    blocks: workout.blocks.map((block) => ({ ...block, id: createId("blk") }))
  };
}

/** Clona una settimana assegnando nuovi identificativi a giorni, sessioni e blocchi. */
export function duplicateWeek(week: ProgramWeek, weekNumber: number): ProgramWeek {
  return {
    id: createId("week"),
    weekNumber,
    label: `${week.label} (copia)`,
    days: week.days.map((day) => ({
      ...day,
      id: createId("day"),
      workouts: day.workouts.map(cloneWorkout)
    }))
  };
}

export function renumberWeeks(weeks: ProgramWeek[]): ProgramWeek[] {
  return weeks.map((week, index) => ({ ...week, weekNumber: index + 1 }));
}

function mapDay(
  week: ProgramWeek,
  dayId: string,
  updater: (day: ProgramDay) => ProgramDay
): ProgramWeek {
  return { ...week, days: week.days.map((day) => (day.id === dayId ? updater(day) : day)) };
}

function mapWorkout(
  week: ProgramWeek,
  workoutId: string,
  updater: (workout: Workout) => Workout
): ProgramWeek {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      workouts: day.workouts.map((workout) =>
        workout.id === workoutId ? updater(workout) : workout
      )
    }))
  };
}

export function findWorkout(week: ProgramWeek, workoutId: string): Workout | undefined {
  for (const day of week.days) {
    const found = day.workouts.find((workout) => workout.id === workoutId);
    if (found) return found;
  }
  return undefined;
}

export function addWorkoutToDay(week: ProgramWeek, dayId: string, workout?: Workout): ProgramWeek {
  return mapDay(week, dayId, (day) => ({
    ...day,
    workouts: [...day.workouts, workout ?? createWorkout(nextWorkoutName(day))]
  }));
}

/** Incolla una o più copie di sessioni nel giorno indicato. */
export function pasteWorkoutsIntoDay(
  week: ProgramWeek,
  dayId: string,
  workouts: Workout[]
): ProgramWeek {
  return mapDay(week, dayId, (day) => ({
    ...day,
    workouts: [...day.workouts, ...workouts.map(cloneWorkout)]
  }));
}

export function updateWorkout(
  week: ProgramWeek,
  workoutId: string,
  changes: Partial<Pick<Workout, "name" | "notes">>
): ProgramWeek {
  return mapWorkout(week, workoutId, (workout) => ({ ...workout, ...changes }));
}

export function removeWorkout(week: ProgramWeek, dayId: string, workoutId: string): ProgramWeek {
  return mapDay(week, dayId, (day) => ({
    ...day,
    workouts: day.workouts.filter((workout) => workout.id !== workoutId)
  }));
}

export function addBlockToWorkout(
  week: ProgramWeek,
  workoutId: string,
  block: WorkoutBlock,
  index?: number
): ProgramWeek {
  return mapWorkout(week, workoutId, (workout) => {
    const blocks = [...workout.blocks];
    const position = index === undefined ? blocks.length : Math.max(0, Math.min(index, blocks.length));
    blocks.splice(position, 0, block);
    return { ...workout, blocks };
  });
}

export function updateBlockInWorkout(
  week: ProgramWeek,
  workoutId: string,
  blockId: string,
  changes: Partial<WorkoutBlock>
): ProgramWeek {
  return mapWorkout(week, workoutId, (workout) => ({
    ...workout,
    blocks: workout.blocks.map((block) => (block.id === blockId ? { ...block, ...changes } : block))
  }));
}

export function removeBlockFromWorkout(
  week: ProgramWeek,
  workoutId: string,
  blockId: string
): ProgramWeek {
  return mapWorkout(week, workoutId, (workout) => ({
    ...workout,
    blocks: workout.blocks.filter((block) => block.id !== blockId)
  }));
}

/** Sposta un blocco tra sessioni diverse o lo riordina all'interno della stessa. */
export function moveBlock(
  week: ProgramWeek,
  source: BlockLocation,
  target: BlockLocation
): ProgramWeek {
  const sourceWorkout = findWorkout(week, source.workoutId);
  const block = sourceWorkout?.blocks[source.index];
  if (!block) return week;

  const withoutSource = mapWorkout(week, source.workoutId, (workout) => ({
    ...workout,
    blocks: workout.blocks.filter((_, index) => index !== source.index)
  }));

  return mapWorkout(withoutSource, target.workoutId, (workout) => {
    const blocks = [...workout.blocks];
    const position = Math.max(0, Math.min(target.index, blocks.length));
    blocks.splice(position, 0, block);
    return { ...workout, blocks };
  });
}

export function duplicateDay(
  week: ProgramWeek,
  sourceDayId: string,
  targetDayId: string
): ProgramWeek {
  const source = week.days.find((day) => day.id === sourceDayId);
  if (!source) return week;
  return mapDay(week, targetDayId, (day) => ({
    ...day,
    workouts: source.workouts.map(cloneWorkout)
  }));
}

export function clearDay(week: ProgramWeek, dayId: string): ProgramWeek {
  return mapDay(week, dayId, (day) => ({ ...day, workouts: [] }));
}

export function isRestDay(day: ProgramDay): boolean {
  return day.workouts.length === 0;
}

export function countDayBlocks(day: ProgramDay): number {
  return day.workouts.reduce((total, workout) => total + workout.blocks.length, 0);
}

export function countWeekWorkouts(week: ProgramWeek): number {
  return week.days.reduce((total, day) => total + day.workouts.length, 0);
}

export function countWeekBlocks(week: ProgramWeek): number {
  return week.days.reduce((total, day) => total + countDayBlocks(day), 0);
}

function buildBlock(
  title: string,
  instructions: string,
  values: Partial<WorkoutBlock> = {}
): WorkoutBlock {
  return {
    id: createId("blk"),
    title,
    kind: "single",
    instructions,
    rpe: null,
    notes: "",
    videoUrl: "",
    ...values
  };
}

function buildWorkout(name: string, notes: string, blocks: WorkoutBlock[]): Workout {
  return { id: createId("wo"), name, notes, blocks };
}

function buildDay(dayNumber: number, workouts: Workout[]): ProgramDay {
  return { id: createId("day"), dayNumber, workouts };
}

export const trainingPrograms: TrainingProgram[] = [
  {
    id: "prog-preseason",
    name: "Pre Season · Fase 1",
    description: "Ciclo di preparazione con conditioning aerobico, weightlifting e forza.",
    goal: "Performance",
    isTemplate: false,
    assignedAthleteIds: ["a1", "a3"],
    weeks: [
      {
        id: createId("week"),
        weekNumber: 1,
        label: "Week 1",
        days: [
          buildDay(1, [
            buildWorkout("PRE SEASON _ FASE 1 _ WEEK 1", "", [
              buildBlock(
                "AEROBIC CONDITIONING _ Mix modality",
                `New Set Every 4' x 4 set
36/24 cal row
18 burpees lateral row

Target sub 3'
time cap 3:30

iniziamo questo nuovo ciclo con dei conditioning aerobici mixed modality per aumentare il vostro motore, e migliorare la work capacity

VERSIONE SCALATA
New Set Every 4' x 4 set
24/18 cal row
15 burpees lateral row

Target sub 3'
time cap 3:30`,
                { rpe: 7 }
              ),
              buildBlock(
                "WEIGHTLIFTING _ SNATCH",
                `New Set Every 2' x 4 set
1 Power Snatch
2 Hang Squat snatch

Build up heavy complex,

then
New set every 3 set
85% del complex trovato

Cominciamo a costruire la resistenza al bilanciere`,
                { videoUrl: "https://www.youtube.com/watch?v=9xQp2sldyts" }
              ),
              buildBlock(
                "STRENGTH _ OHS",
                `New Set every 2' x 5 set
4 rep 75/80% 1 rm snatch

Mantieni il torso verticale e il bilanciere sulla verticale del mesopiede.`,
                { rpe: 8 }
              ),
              buildBlock(
                "CONDITIONING _ sport specific",
                `For time
24/18 cal assoult bike
30-20-10 toes to bar
9-7-5 clean jerk 90/60

Target sub 12'
time cap 15'

Metcon sport specific con dominio di tempo classico dei crossfit metcon.
Aggressivi sull'assault bike e fate la giusta strategia sui toes to bar, per arrivare sicuri al bilanciere ma attenzione perché avrete il core tassato.

VERSIONE SCALATA
For time
24/18 cal assoult bike
30-20-10 toes to bar
9-7-5 clean jerk 70/50

Target sub 12'
time cap 15'`,
                { kind: "circuit", rpe: 9 }
              )
            ])
          ]),
          buildDay(2, [
            buildWorkout("PRE SEASON _ FASE 1 _ WEEK 1", "Giornata di scarico attivo.", [
              buildBlock(
                "AEROBIC _ Zona 2",
                `40' di corsa continua in zona 2
Mantieni la frequenza sotto i 150 bpm.

Chiudi con 10' di mobilità anche e caviglie.`
              )
            ])
          ]),
          buildDay(3, []),
          buildDay(4, [
            buildWorkout("PRE SEASON _ FASE 1 _ WEEK 1", "", [
              buildBlock(
                "STRENGTH _ BACK SQUAT",
                `New set every 3' x 5 set
5 rep @ 80% 1rm

Fermati se la velocità del bilanciere cala molto.`,
                {
                  rpe: 8,
                  videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8"
                }
              ),
              buildBlock(
                "ACCESSORY _ Core",
                `3 round non a tempo
12 pallof press per lato
40 metri farmer walk pesante
45'' hollow hold`,
                { kind: "circuit" }
              )
            ]),
            buildWorkout("EXTRA _ Sera", "Facoltativo, solo se ti senti fresco.", [
              buildBlock(
                "SKILL _ Double under",
                `10' EMOM
30'' double under
30'' rest`
              )
            ])
          ]),
          buildDay(5, [
            buildWorkout("PRE SEASON _ FASE 1 _ WEEK 1", "", [
              buildBlock(
                "WEIGHTLIFTING _ CLEAN & JERK",
                `New Set Every 2' x 5 set
1 Power Clean
1 Front Squat
1 Split Jerk

Build up fino a un complex pesante ma tecnico.`,
                { videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" }
              ),
              buildBlock(
                "CONDITIONING _ Intervalli",
                `5 round
500m row
1' rest

Target: tutti i round entro 2 secondi l'uno dall'altro.`,
                { kind: "circuit", rpe: 8 }
              )
            ])
          ]),
          buildDay(6, [
            buildWorkout("PRE SEASON _ FASE 1 _ WEEK 1", "", [
              buildBlock(
                "LONG _ Endurance",
                `Per 45' a ritmo costante
400m corsa
15 wall ball
10 burpees

Ritmo conversazionale, niente sprint.`,
                { kind: "circuit" }
              )
            ])
          ]),
          buildDay(7, [])
        ]
      }
    ]
  },
  {
    id: "prog-forza",
    name: "Forza Base · 8 settimane",
    description: "Blocco di forza con progressione lineare su squat, panca e stacco.",
    goal: "Forza",
    isTemplate: false,
    assignedAthleteIds: ["a2"],
    weeks: [
      {
        id: createId("week"),
        weekNumber: 1,
        label: "Accumulo",
        days: [
          buildDay(1, [
            buildWorkout("FORZA _ Lower", "", [
              buildBlock(
                "A _ BACK SQUAT",
                `4 x 5 @ 80 kg
recupero 3'

Serie a salire, l'ultima deve restare tecnica.`,
                { rpe: 7, videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8" }
              ),
              buildBlock(
                "B _ ACCESSORI",
                `3 x 8 stacco rumeno @ 70 kg
3 x 10 affondi bulgari per lato
3 x 12 leg curl`,
                { kind: "superset" }
              )
            ])
          ]),
          buildDay(2, [
            buildWorkout("FORZA _ Upper", "", [
              buildBlock(
                "A _ PANCA PIANA",
                `4 x 5 @ 75 kg
recupero 3'`,
                { rpe: 7 }
              ),
              buildBlock(
                "B _ SUPERSET TIRATA",
                `4 round
6 trazioni alla sbarra
8 military press
15 face pull`,
                { kind: "superset" }
              )
            ])
          ]),
          buildDay(3, []),
          buildDay(4, [
            buildWorkout("FORZA _ Stacco", "", [
              buildBlock(
                "A _ STACCO DA TERRA",
                `5 x 3 @ 110 kg
recupero 3'`,
                { rpe: 8, videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" }
              )
            ])
          ]),
          buildDay(5, []),
          buildDay(6, []),
          buildDay(7, [])
        ]
      }
    ]
  },
  {
    id: "prog-template-full",
    name: "Template · Full Body 3x",
    description: "Modello riutilizzabile per principianti con tre sedute full body.",
    goal: "Ricomposizione",
    isTemplate: true,
    assignedAthleteIds: [],
    weeks: [
      {
        id: createId("week"),
        weekNumber: 1,
        label: "Settimana tipo",
        days: [
          buildDay(1, [
            buildWorkout("FULL BODY _ A", "Tecnica prima del carico.", [
              buildBlock(
                "A _ FULL BODY",
                `3 x 8 back squat
3 x 8 panca piana
3 x 12 pulley basso

recupero 2' tra le serie`
              )
            ])
          ]),
          buildDay(2, []),
          buildDay(3, [
            buildWorkout("FULL BODY _ B", "", [
              buildBlock(
                "A _ FULL BODY",
                `3 x 5 stacco da terra
3 x 10 military press
3 x 45'' plank frontale`
              )
            ])
          ]),
          buildDay(4, []),
          buildDay(5, [
            buildWorkout("FULL BODY _ C", "", [
              buildBlock(
                "A _ FULL BODY",
                `3 x 8 front squat
3 x 6 trazioni alla sbarra
10' assault bike easy`
              )
            ])
          ]),
          buildDay(6, []),
          buildDay(7, [])
        ]
      }
    ]
  }
];
