import { describe, expect, it } from "vitest";
import {
  addBlockToWorkout,
  addWorkoutToDay,
  blockLetter,
  blockSummary,
  clearDay,
  countBlockLines,
  countDayBlocks,
  countWeekBlocks,
  countWeekWorkouts,
  createBlock,
  createEmptyProgram,
  createEmptyWeek,
  createWorkout,
  duplicateDay,
  duplicateWeek,
  findWorkout,
  hasVideo,
  isDirectVideo,
  isRestDay,
  moveBlock,
  nextWorkoutName,
  pasteWorkoutsIntoDay,
  removeBlockFromWorkout,
  removeWorkout,
  renumberWeeks,
  toEmbedUrl,
  trainingPrograms,
  updateBlockInWorkout,
  updateWorkout
} from "./programs";

function weekWithWorkout() {
  const base = createEmptyWeek(1);
  const dayId = base.days[0].id;
  const week = addWorkoutToDay(base, dayId, createWorkout("Workout A"));
  const workoutId = week.days[0].workouts[0].id;
  return { week, dayId, workoutId };
}

describe("blockLetter", () => {
  it("genera la sequenza alfabetica progressiva", () => {
    expect(blockLetter(0)).toBe("A");
    expect(blockLetter(1)).toBe("B");
    expect(blockLetter(25)).toBe("Z");
    expect(blockLetter(26)).toBe("AA");
  });
});

describe("scrittura libera", () => {
  it("crea un blocco vuoto pronto da scrivere", () => {
    const block = createBlock("  CONDITIONING  ");
    expect(block.title).toBe("CONDITIONING");
    expect(block.instructions).toBe("");
    expect(block.kind).toBe("single");
    expect(block.rpe).toBeNull();
  });

  it("conserva il testo multilinea così com'è scritto", () => {
    const text = "For time\n24/18 cal assoult bike\n30-20-10 toes to bar";
    const { week, workoutId } = weekWithWorkout();
    const updated = addBlockToWorkout(week, workoutId, { ...createBlock("METCON"), instructions: text });
    expect(updated.days[0].workouts[0].blocks[0].instructions).toBe(text);
  });

  it("usa la prima riga utile come anteprima", () => {
    const block = { ...createBlock("METCON"), instructions: "\n\n  For time  \n21-15-9 thruster" };
    expect(blockSummary(block)).toBe("For time");
    expect(blockSummary(createBlock("Vuoto"))).toBe("Nessuna istruzione");
  });

  it("conta solo le righe non vuote", () => {
    const block = { ...createBlock("METCON"), instructions: "For time\n\n21-15-9\n   \nthruster" };
    expect(countBlockLines(block)).toBe(3);
  });

  it("aggiorna RPE e note senza toccare il testo", () => {
    const { week, workoutId } = weekWithWorkout();
    const withBlock = addBlockToWorkout(week, workoutId, createBlock("METCON"));
    const blockId = withBlock.days[0].workouts[0].blocks[0].id;
    const updated = updateBlockInWorkout(withBlock, workoutId, blockId, {
      rpe: 9,
      notes: "Attenzione al core"
    });
    const block = updated.days[0].workouts[0].blocks[0];
    expect(block.rpe).toBe(9);
    expect(block.notes).toBe("Attenzione al core");
  });

  it("rimuove un blocco", () => {
    const { week, workoutId } = weekWithWorkout();
    const withBlock = addBlockToWorkout(week, workoutId, createBlock("METCON"));
    const blockId = withBlock.days[0].workouts[0].blocks[0].id;
    expect(removeBlockFromWorkout(withBlock, workoutId, blockId).days[0].workouts[0].blocks)
      .toHaveLength(0);
  });
});

describe("workout nei giorni", () => {
  it("crea un giorno vuoto senza sessioni", () => {
    const week = createEmptyWeek(1);
    expect(week.days).toHaveLength(7);
    expect(isRestDay(week.days[0])).toBe(true);
  });

  it("aggiunge più sessioni allo stesso giorno con nomi progressivi", () => {
    const base = createEmptyWeek(1);
    const dayId = base.days[0].id;
    let week = addWorkoutToDay(base, dayId);
    week = addWorkoutToDay(week, dayId);
    expect(week.days[0].workouts.map((workout) => workout.name)).toEqual([
      "Workout A",
      "Workout B"
    ]);
    expect(nextWorkoutName(week.days[0])).toBe("Workout C");
  });

  it("aggiorna nome e note della sessione", () => {
    const { week, workoutId } = weekWithWorkout();
    const updated = updateWorkout(week, workoutId, { name: "Upper", notes: "Tecnica" });
    expect(findWorkout(updated, workoutId)?.name).toBe("Upper");
  });

  it("rimuove una sessione dal giorno", () => {
    const { week, dayId, workoutId } = weekWithWorkout();
    expect(removeWorkout(week, dayId, workoutId).days[0].workouts).toHaveLength(0);
  });
});

describe("spostamento blocchi", () => {
  it("sposta un blocco tra sessioni diverse", () => {
    const base = createEmptyWeek(1);
    let week = addWorkoutToDay(base, base.days[0].id, createWorkout("Workout A"));
    week = addWorkoutToDay(week, base.days[1].id, createWorkout("Workout A"));
    const sourceId = week.days[0].workouts[0].id;
    const targetId = week.days[1].workouts[0].id;
    week = addBlockToWorkout(week, sourceId, createBlock("METCON"));

    const moved = moveBlock(week, { workoutId: sourceId, index: 0 }, { workoutId: targetId, index: 0 });
    expect(moved.days[0].workouts[0].blocks).toHaveLength(0);
    expect(moved.days[1].workouts[0].blocks[0].title).toBe("METCON");
  });

  it("riordina i blocchi dentro la stessa sessione", () => {
    const { week, workoutId } = weekWithWorkout();
    let updated = addBlockToWorkout(week, workoutId, createBlock("Primo"));
    updated = addBlockToWorkout(updated, workoutId, createBlock("Secondo"));
    const moved = moveBlock(updated, { workoutId, index: 1 }, { workoutId, index: 0 });
    expect(moved.days[0].workouts[0].blocks.map((block) => block.title)).toEqual([
      "Secondo",
      "Primo"
    ]);
  });
});

describe("copia e incolla", () => {
  it("incolla una sessione in un altro giorno creando nuovi id", () => {
    const { week, workoutId } = weekWithWorkout();
    const withBlock = addBlockToWorkout(week, workoutId, createBlock("METCON"));
    const source = findWorkout(withBlock, workoutId)!;
    const pasted = pasteWorkoutsIntoDay(withBlock, withBlock.days[2].id, [source]);

    const copy = pasted.days[2].workouts[0];
    expect(copy.name).toBe("Workout A");
    expect(copy.id).not.toBe(workoutId);
    expect(copy.blocks[0].id).not.toBe(source.blocks[0].id);
    expect(copy.blocks[0].title).toBe("METCON");
  });

  it("duplica un giorno intero e lo svuota", () => {
    const { week, dayId, workoutId } = weekWithWorkout();
    const withBlock = addBlockToWorkout(week, workoutId, createBlock("METCON"));
    const duplicated = duplicateDay(withBlock, dayId, withBlock.days[3].id);
    expect(countDayBlocks(duplicated.days[3])).toBe(1);
    expect(isRestDay(clearDay(duplicated, dayId).days[0])).toBe(true);
  });

  it("duplica una settimana rigenerando gli identificativi", () => {
    const source = trainingPrograms[0].weeks[0];
    const copy = duplicateWeek(source, 4);
    expect(copy.weekNumber).toBe(4);
    expect(copy.days[0].workouts[0].id).not.toBe(source.days[0].workouts[0].id);
    expect(countWeekWorkouts(copy)).toBe(countWeekWorkouts(source));
  });

  it("rinumera le settimane dopo una modifica", () => {
    const program = createEmptyProgram("Test");
    const weeks = renumberWeeks([...program.weeks, createEmptyWeek(9)]);
    expect(weeks.map((item) => item.weekNumber)).toEqual([1, 2]);
  });
});

describe("statistiche", () => {
  it("conta sessioni e blocchi della settimana", () => {
    const week = trainingPrograms[0].weeks[0];
    expect(countWeekWorkouts(week)).toBe(6);
    expect(countWeekBlocks(week)).toBe(11);
  });
});

describe("video dimostrativi", () => {
  it("converte i link YouTube in tutte le forme", () => {
    const embed = "https://www.youtube.com/embed/ultWZbUMPL8";
    expect(toEmbedUrl("https://www.youtube.com/watch?v=ultWZbUMPL8")).toBe(embed);
    expect(toEmbedUrl("https://youtu.be/ultWZbUMPL8")).toBe(embed);
    expect(toEmbedUrl("https://www.youtube.com/shorts/ultWZbUMPL8")).toBe(embed);
  });

  it("converte i link Vimeo e ignora gli altri", () => {
    expect(toEmbedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl("https://cdn.vsctraining.app/demo.mp4")).toBeNull();
  });

  it("riconosce i file video caricati", () => {
    expect(isDirectVideo("https://cdn.vsctraining.app/demo.mp4")).toBe(true);
    expect(isDirectVideo("https://cdn.vsctraining.app/demo.MOV?token=abc")).toBe(true);
    expect(isDirectVideo("https://youtu.be/ultWZbUMPL8")).toBe(false);
  });

  it("segnala i blocchi con video", () => {
    const block = createBlock("Back Squat");
    expect(hasVideo(block)).toBe(false);
    expect(hasVideo({ ...block, videoUrl: "https://youtu.be/ultWZbUMPL8" })).toBe(true);
  });
});
