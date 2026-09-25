"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardPaste,
  Copy,
  Eraser,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Trash2,
  X
} from "lucide-react";
import {
  addBlockToWorkout,
  addWorkoutToDay,
  athletes,
  blockKindLabels,
  blockLetter,
  blockSummary,
  clearDay,
  countDayBlocks,
  countWeekBlocks,
  countWeekWorkouts,
  createBlock,
  createEmptyWeek,
  createWorkout,
  dayNames,
  dayShortNames,
  duplicateWeek,
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
  updateWorkout,
  type BlockKind,
  type ProgramWeek,
  type TrainingProgram,
  type Workout,
  type WorkoutBlock
} from "@vsc-training/shared";

type DragPayload = { workoutId: string; index: number };

const blockKinds: BlockKind[] = ["single", "superset", "circuit"];

interface ProgramEditorProps {
  initialPrograms?: TrainingProgram[];
  syncEnabled?: boolean;
}

export function ProgramEditor({ initialPrograms, syncEnabled = false }: ProgramEditorProps) {
  const seedPrograms = initialPrograms && initialPrograms.length > 0 ? initialPrograms : trainingPrograms;
  const [programs, setPrograms] = useState<TrainingProgram[]>(seedPrograms);
  const [activeProgramId, setActiveProgramId] = useState(seedPrograms[0]?.id ?? "");
  const [activeWeekId, setActiveWeekId] = useState(seedPrograms[0]?.weeks[0]?.id ?? "");
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [clipboard, setClipboard] = useState<Workout[] | null>(null);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydrated = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const program = useMemo(
    () => programs.find((item) => item.id === activeProgramId) ?? programs[0],
    [programs, activeProgramId]
  );
  const week = useMemo(
    () => program?.weeks.find((item) => item.id === activeWeekId) ?? program?.weeks[0],
    [program, activeWeekId]
  );

  useEffect(() => {
    if (!syncEnabled) return;
    if (!program) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }

    setSaveState("saving");
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      const toSave = programs.find((item) => item.id === activeProgramId);
      if (!toSave) return;

      try {
        const response = await fetch(`/api/programs/${toSave.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ program: toSave })
        });

        if (!response.ok) throw new Error("sync failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [programs, activeProgramId, program, syncEnabled]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function updateProgram(updater: (current: TrainingProgram) => TrainingProgram) {
    setPrograms((current) => current.map((item) => (item.id === program.id ? updater(item) : item)));
  }

  function updateWeek(updater: (current: ProgramWeek) => ProgramWeek) {
    updateProgram((current) => ({
      ...current,
      weeks: current.weeks.map((item) => (item.id === week.id ? updater(item) : item))
    }));
  }

  function selectProgram(id: string) {
    const next = programs.find((item) => item.id === id);
    if (!next) return;
    setActiveProgramId(id);
    setActiveWeekId(next.weeks[0]?.id ?? "");
    setOpenBlockId(null);
  }

  function handleAddWeek() {
    const created = createEmptyWeek(program.weeks.length + 1);
    updateProgram((current) => ({ ...current, weeks: renumberWeeks([...current.weeks, created]) }));
    setActiveWeekId(created.id);
    notify("Settimana aggiunta");
  }

  function handleDuplicateWeek() {
    const created = duplicateWeek(week, program.weeks.length + 1);
    updateProgram((current) => ({ ...current, weeks: renumberWeeks([...current.weeks, created]) }));
    setActiveWeekId(created.id);
    notify("Settimana duplicata");
  }

  function handleRemoveWeek() {
    if (program.weeks.length === 1) {
      notify("Serve almeno una settimana");
      return;
    }
    const remaining = renumberWeeks(program.weeks.filter((item) => item.id !== week.id));
    updateProgram((current) => ({ ...current, weeks: remaining }));
    setActiveWeekId(remaining[0].id);
    notify("Settimana eliminata");
  }

  function handleToggleAthlete(athleteId: string) {
    updateProgram((current) => ({
      ...current,
      assignedAthleteIds: current.assignedAthleteIds.includes(athleteId)
        ? current.assignedAthleteIds.filter((id) => id !== athleteId)
        : [...current.assignedAthleteIds, athleteId]
    }));
  }

  function handleDropOnWorkout(workoutId: string, index: number) {
    if (!drag) return;
    updateWeek((current) =>
      moveBlock(current, { workoutId: drag.workoutId, index: drag.index }, { workoutId, index })
    );
    setDrag(null);
  }

  function handleCopyWorkout(workout: Workout) {
    setClipboard([workout]);
    notify(`"${workout.name}" copiato`);
  }

  function handleCopyDay(dayId: string) {
    if (!week) return;
    const day = week.days.find((item) => item.id === dayId);
    if (!day || day.workouts.length === 0) return;
    setClipboard(day.workouts);
    notify(`${day.workouts.length} workout copiati`);
  }

  function handlePaste(dayId: string) {
    if (!clipboard) return;
    updateWeek((current) => pasteWorkoutsIntoDay(current, dayId, clipboard));
    notify(clipboard.length === 1 ? "Workout incollato" : "Workout incollati");
  }

  if (!program || !week) {
    return <div className="panel">Nessun programma disponibile.</div>;
  }

  return (
    <div className="editor">
      <header className="editor-top">
        <div className="editor-title">
          <p className="eyebrow">Editor programmi</p>
          <input
            className="program-title-input"
            value={program.name}
            placeholder="Nome del ciclo"
            aria-label="Nome del programma"
            onChange={(event) =>
              updateProgram((current) => ({ ...current, name: event.target.value }))
            }
          />
          <input
            className="program-desc-input"
            value={program.description}
            placeholder="Descrizione del ciclo"
            aria-label="Descrizione del programma"
            onChange={(event) =>
              updateProgram((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="editor-stats">
          <div>
            <strong>{program.weeks.length}</strong>
            <span>settimane</span>
          </div>
          <div>
            <strong>{countWeekWorkouts(week)}</strong>
            <span>workout</span>
          </div>
          <div>
            <strong>{countWeekBlocks(week)}</strong>
            <span>blocchi</span>
          </div>
          {syncEnabled ? (
            <div>
              <strong>
                {saveState === "saving"
                  ? "Sync…"
                  : saveState === "saved"
                    ? "Salvato"
                    : saveState === "error"
                      ? "Errore"
                      : "Pronto"}
              </strong>
              <span>supabase</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className={`editor-body${panelOpen ? "" : " panel-hidden"}`}>
        {panelOpen ? (
          <aside className="program-list">
            <div className="panel-head">
              <h2>Programmi</h2>
              <button
                type="button"
                className="panel-toggle"
                title="Nascondi pannello"
                onClick={() => setPanelOpen(false)}
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
            <ul>
              {programs.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === program.id ? "active" : ""}
                    onClick={() => selectProgram(item.id)}
                  >
                    <span className="program-name">{item.name}</span>
                    <span className="program-meta">
                      {item.isTemplate ? "Template" : `${item.assignedAthleteIds.length} atleti`} ·{" "}
                      {item.goal}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <h2>Assegnazione</h2>
            <ul className="assign-list">
              {athletes.map((athlete) => (
                <li key={athlete.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={program.assignedAthleteIds.includes(athlete.id)}
                      onChange={() => handleToggleAthlete(athlete.id)}
                    />
                    <span>{athlete.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </aside>
        ) : (
          <button
            type="button"
            className="panel-reopen"
            title="Mostra programmi"
            onClick={() => setPanelOpen(true)}
          >
            <PanelLeftOpen size={15} />
          </button>
        )}

        <section className="board">
          <div className="week-bar">
            <div className="week-tabs">
              {program.weeks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === week.id ? "active" : ""}
                  onClick={() => setActiveWeekId(item.id)}
                >
                  S{item.weekNumber}
                </button>
              ))}
              <button type="button" className="ghost" onClick={handleAddWeek}>
                <Plus size={14} /> Settimana
              </button>
            </div>
            <div className="week-actions">
              <input
                className="week-label-input"
                value={week.label}
                placeholder={`Titolo settimana ${week.weekNumber}`}
                aria-label="Titolo della settimana"
                onChange={(event) => {
                  const label = event.target.value;
                  updateWeek((current) => ({ ...current, label }));
                }}
              />
              {clipboard ? (
                <span className="clipboard-hint">
                  <ClipboardPaste size={14} /> {clipboard.length} negli appunti
                </span>
              ) : null}
              <button type="button" className="ghost" onClick={handleDuplicateWeek}>
                <Copy size={14} /> Duplica
              </button>
              <button type="button" className="ghost danger" onClick={handleRemoveWeek}>
                <Trash2 size={14} /> Elimina
              </button>
            </div>
          </div>

          <div className="days-grid">
            {week.days.map((day) => (
              <article key={day.id} className={`day${isRestDay(day) ? " rest" : ""}`}>
                <header className="day-head">
                  <div>
                    <span className="day-short">{dayShortNames[day.dayNumber - 1]}</span>
                    <span className="day-name">{dayNames[day.dayNumber - 1]}</span>
                  </div>
                  <div className="day-tools">
                    <button
                      type="button"
                      title="Copia giornata"
                      onClick={() => handleCopyDay(day.id)}
                      disabled={day.workouts.length === 0}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      title="Incolla workout"
                      onClick={() => handlePaste(day.id)}
                      disabled={!clipboard}
                    >
                      <ClipboardPaste size={13} />
                    </button>
                    <button
                      type="button"
                      title="Svuota giornata"
                      onClick={() => updateWeek((current) => clearDay(current, day.id))}
                      disabled={day.workouts.length === 0}
                    >
                      <Eraser size={13} />
                    </button>
                  </div>
                </header>

                <p className="day-meta">
                  {isRestDay(day) ? "Riposo" : `${countDayBlocks(day)} blocchi`}
                </p>

                <div className="workout-stack">
                  {day.workouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      dragging={drag !== null}
                      openBlockId={openBlockId}
                      onOpenBlock={setOpenBlockId}
                      onRename={(name) =>
                        updateWeek((current) => updateWorkout(current, workout.id, { name }))
                      }
                      onNotes={(notes) =>
                        updateWeek((current) => updateWorkout(current, workout.id, { notes }))
                      }
                      onCopy={() => handleCopyWorkout(workout)}
                      onDelete={() =>
                        updateWeek((current) => removeWorkout(current, day.id, workout.id))
                      }
                      onDragStartBlock={(index) => setDrag({ workoutId: workout.id, index })}
                      onDropAt={(index) => handleDropOnWorkout(workout.id, index)}
                      onAddBlock={() => {
                        const created = createBlock("");
                        updateWeek((current) => addBlockToWorkout(current, workout.id, created));
                        setOpenBlockId(created.id);
                      }}
                      onUpdateBlock={(blockId, changes) =>
                        updateWeek((current) =>
                          updateBlockInWorkout(current, workout.id, blockId, changes)
                        )
                      }
                      onRemoveBlock={(blockId) =>
                        updateWeek((current) =>
                          removeBlockFromWorkout(current, workout.id, blockId)
                        )
                      }
                    />
                  ))}
                </div>

                <div className="day-footer">
                  <button
                    type="button"
                    className="add-workout"
                    onClick={() => {
                      const created = createWorkout(nextWorkoutName(day));
                      updateWeek((current) => addWorkoutToDay(current, day.id, created));
                    }}
                  >
                    <Plus size={14} /> Aggiungi workout
                  </button>
                  {clipboard ? (
                    <button
                      type="button"
                      className="paste-target"
                      onClick={() => handlePaste(day.id)}
                    >
                      <ClipboardPaste size={13} /> Incolla
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

interface WorkoutCardProps {
  workout: Workout;
  dragging: boolean;
  openBlockId: string | null;
  onOpenBlock: (id: string | null) => void;
  onRename: (name: string) => void;
  onNotes: (notes: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onDragStartBlock: (index: number) => void;
  onDropAt: (index: number) => void;
  onAddBlock: () => void;
  onUpdateBlock: (blockId: string, changes: Partial<WorkoutBlock>) => void;
  onRemoveBlock: (blockId: string) => void;
}

function WorkoutCard({
  workout,
  dragging,
  openBlockId,
  onOpenBlock,
  onRename,
  onNotes,
  onCopy,
  onDelete,
  onDragStartBlock,
  onDropAt,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock
}: WorkoutCardProps) {
  const [showNotes, setShowNotes] = useState(workout.notes.length > 0);

  return (
    <section
      className={`workout${dragging ? " droppable" : ""}`}
      onDragOver={(event) => {
        if (dragging) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropAt(workout.blocks.length);
      }}
    >
      <header className="workout-head">
        <input
          className="workout-name"
          value={workout.name}
          onChange={(event) => onRename(event.target.value)}
          aria-label="Nome workout"
        />
        <div className="workout-tools">
          <button type="button" title="Copia workout" onClick={onCopy}>
            <Copy size={13} />
          </button>
          <button type="button" title="Elimina workout" onClick={onDelete}>
            <X size={13} />
          </button>
        </div>
      </header>

      {showNotes ? (
        <textarea
          className="workout-notes"
          placeholder="Note per l'atleta…"
          value={workout.notes}
          onChange={(event) => onNotes(event.target.value)}
        />
      ) : (
        <button type="button" className="notes-toggle" onClick={() => setShowNotes(true)}>
          + Note della sessione
        </button>
      )}

      <ol className="block-list">
        {workout.blocks.map((block, index) => (
          <li key={block.id}>
            <BlockCard
              block={block}
              letter={blockLetter(index)}
              open={openBlockId === block.id}
              dragging={dragging}
              onToggle={() => onOpenBlock(openBlockId === block.id ? null : block.id)}
              onDragStart={() => onDragStartBlock(index)}
              onDrop={() => onDropAt(index)}
              onUpdate={(changes) => onUpdateBlock(block.id, changes)}
              onRemove={() => onRemoveBlock(block.id)}
            />
          </li>
        ))}
      </ol>

      <button type="button" className="add-block" onClick={onAddBlock}>
        <Plus size={14} /> Scrivi un blocco
      </button>
    </section>
  );
}

interface BlockCardProps {
  block: WorkoutBlock;
  letter: string;
  open: boolean;
  dragging: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onUpdate: (changes: Partial<WorkoutBlock>) => void;
  onRemove: () => void;
}

function BlockCard({
  block,
  letter,
  open,
  dragging,
  onToggle,
  onDragStart,
  onDrop,
  onUpdate,
  onRemove
}: BlockCardProps) {
  return (
    <div className={`block${open ? " open" : ""}`}>
      <div
        className="block-head"
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => {
          if (dragging) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDrop();
        }}
        onClick={onToggle}
      >
        <span className="block-letter">{letter}</span>
        <div className="block-head-text">
          <strong>
            {block.title || "Blocco senza titolo"}
            {hasVideo(block) ? (
              <em className="video-badge" title="Video dimostrativo">
                <Play size={9} />
              </em>
            ) : null}
          </strong>
          <span>{blockSummary(block)}</span>
        </div>
        <button
          type="button"
          className="block-remove"
          title="Rimuovi blocco"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X size={12} />
        </button>
      </div>

      {open ? (
        <div className="block-form">
          <input
            className="block-title"
            value={block.title}
            placeholder="TITOLO DEL BLOCCO"
            onChange={(event) => onUpdate({ title: event.target.value })}
          />

          <div className="kind-chips">
            {blockKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className={block.kind === kind ? "active" : ""}
                onClick={() => onUpdate({ kind })}
              >
                {blockKindLabels[kind]}
              </button>
            ))}
          </div>

          <textarea
            className="block-instructions"
            value={block.instructions}
            placeholder={"Scrivi il workout come vuoi.\n\nFor time\n24/18 cal assault bike\n30-20-10 toes to bar\n\nTarget sub 12'"}
            rows={10}
            onChange={(event) => onUpdate({ instructions: event.target.value })}
          />

          <div className="block-extra">
            <label>
              RPE
              <input
                type="number"
                min={1}
                max={10}
                value={block.rpe ?? ""}
                placeholder="—"
                onChange={(event) =>
                  onUpdate({ rpe: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label>
              Video dimostrativo
              <input
                value={block.videoUrl}
                placeholder="Link YouTube, Vimeo o file .mp4"
                onChange={(event) => onUpdate({ videoUrl: event.target.value })}
              />
            </label>
            <label className="full">
              Note private
              <textarea
                value={block.notes}
                placeholder="Promemoria visibile solo a te…"
                rows={2}
                onChange={(event) => onUpdate({ notes: event.target.value })}
              />
            </label>
          </div>

          {hasVideo(block) ? <VideoPreview url={block.videoUrl} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Mostra il video dimostrativo: embed per YouTube/Vimeo, player nativo per i file. */
function VideoPreview({ url }: { url: string }) {
  const embed = toEmbedUrl(url);

  if (embed) {
    return (
      <div className="video-preview">
        <iframe
          src={embed}
          title="Video dimostrativo"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirectVideo(url)) {
    return (
      <div className="video-preview">
        <video src={url.trim()} controls preload="metadata" />
      </div>
    );
  }

  return (
    <a className="video-link" href={url.trim()} target="_blank" rel="noreferrer">
      <Play size={12} /> Apri il video
    </a>
  );
}
