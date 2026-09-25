import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@vsc-training/design-tokens";
import {
  blockKindLabels,
  blockLetter,
  hasVideo,
  trainingPrograms,
  type WorkoutBlock
} from "@vsc-training/shared";
import { fetchAthleteWorkoutFromSupabase, type SyncedWorkoutView } from "../../lib/program-sync";
import { hasSupabaseConfig } from "../../lib/supabase";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkoutMedia } from "../../components/WorkoutMedia";

const dateLabel = new Date().toLocaleDateString("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

export default function TodayScreen() {
  const fallbackProgram = trainingPrograms[0];
  const localWeekNumbers = fallbackProgram.weeks.map((item) => item.weekNumber);
  const [activeWeekNumber, setActiveWeekNumber] = useState(localWeekNumbers[0] ?? 1);
  const [syncedView, setSyncedView] = useState<SyncedWorkoutView | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const athleteId = process.env.EXPO_PUBLIC_DEMO_ATHLETE_ID ?? "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasSupabaseConfig || !athleteId) {
        setSyncedView(null);
        return;
      }

      setLoadingSync(true);
      const synced = await fetchAthleteWorkoutFromSupabase(athleteId, activeWeekNumber);
      if (!cancelled) {
        setSyncedView(synced);
        setLoadingSync(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeWeekNumber, athleteId]);

  useEffect(() => {
    if (syncedView && syncedView.weekNumber !== activeWeekNumber) {
      setActiveWeekNumber(syncedView.weekNumber);
    }
  }, [activeWeekNumber, syncedView]);

  const localWeek =
    fallbackProgram.weeks.find((item) => item.weekNumber === activeWeekNumber) ??
    fallbackProgram.weeks[0];
  const localWorkout = localWeek?.days[0]?.workouts[0] ?? null;

  const weekNumbers = syncedView?.weekNumbers.length ? syncedView.weekNumbers : localWeekNumbers;
  const workout = syncedView?.workout ?? localWorkout;
  const programName = syncedView?.programName ?? fallbackProgram.name;
  const weekLabel = syncedView?.weekLabel ?? localWeek?.label ?? `Week ${activeWeekNumber}`;

  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    setDoneIds([]);
  }, [workout?.id]);

  const title = useMemo(
    () => `${programName.toUpperCase()} _ ${weekLabel.toUpperCase()}`,
    [programName, weekLabel]
  );

  function toggleDone(blockId: string) {
    setDoneIds((current) =>
      current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{dateLabel}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="timer-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="chatbubble-outline" size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerMeta}>{workout ? `${workout.blocks.length} blocchi` : "Nessun workout"}</Text>
        <Text style={styles.headerSync}>
          {hasSupabaseConfig && athleteId
            ? loadingSync
              ? "Sincronizzazione dati..."
              : "Dati sincronizzati"
            : "Modalità demo locale"}
        </Text>
        <View style={styles.weekTabs}>
          {weekNumbers.map((weekNumber) => (
            <TouchableOpacity
              key={weekNumber}
              style={[styles.weekTab, weekNumber === activeWeekNumber && styles.weekTabActive]}
              onPress={() => setActiveWeekNumber(weekNumber)}
            >
              <Text
                style={[
                  styles.weekTabText,
                  weekNumber === activeWeekNumber && styles.weekTabTextActive
                ]}
              >
                S{weekNumber}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {workout?.notes ? (
          <View style={styles.coachNote}>
            <Text style={styles.coachNoteLabel}>NOTA DEL COACH</Text>
            <Text style={styles.coachNoteText}>{workout.notes}</Text>
          </View>
        ) : null}

        {workout ? (
          workout.blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            block={block}
            letter={blockLetter(index)}
            done={doneIds.includes(block.id)}
            onToggle={() => toggleDone(block.id)}
          />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nessun workout nel primo giorno di questa settimana.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.complete} disabled={!workout}>
          <Ionicons name="checkmark" size={19} color={colors.background} />
          <Text style={styles.completeText}>Completa allenamento</Text>
        </TouchableOpacity>

        {workout ? <WorkoutMedia workoutId={workout.id} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface BlockCardProps {
  block: WorkoutBlock;
  letter: string;
  done: boolean;
  onToggle: () => void;
}

/** Riproduce il blocco così come l'ha scritto il coach, senza riformattarlo. */
function BlockCard({ block, letter, done, onToggle }: BlockCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.kindBadge}>
          <Text style={styles.kindText}>{blockKindLabels[block.kind]}</Text>
        </View>
        <Text style={styles.cardLetter}>{letter}</Text>
        <TouchableOpacity onPress={onToggle} style={[styles.check, done && styles.checkDone]}>
          <Ionicons
            name="checkmark"
            size={15}
            color={done ? colors.background : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{block.title || "Blocco"}</Text>

        <Text style={styles.instructionsLabel}>Istruzioni</Text>
        <Text style={styles.instructions}>{block.instructions}</Text>

        {block.rpe !== null ? (
          <View style={styles.rpe}>
            <Ionicons name="speedometer-outline" size={13} color={colors.primary} />
            <Text style={styles.rpeText}>RPE target {block.rpe}</Text>
          </View>
        ) : null}

        {hasVideo(block) ? (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => Linking.openURL(block.videoUrl)}
          >
            <Ionicons name="play-circle-outline" size={17} color={colors.primary} />
            <Text style={styles.videoText}>Guarda il video dimostrativo</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.results}>
          <Text style={styles.resultsText}>Aggiungi risultati per {letter}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.history}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.historyText}>Storico del blocco</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row" },
  headerDate: { color: colors.text, fontSize: 17, fontWeight: "800" },
  headerTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 2
  },
  headerMeta: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 3 },
  headerSync: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 4 },
  weekTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap"
  },
  weekTab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface
  },
  weekTabActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  weekTabText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  weekTabTextActive: { color: colors.primary },
  scroll: { padding: spacing.md, paddingBottom: 42 },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md
  },
  emptyStateText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  coachNote: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  coachNoteLabel: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  coachNoteText: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 5 },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden"
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 11
  },
  kindBadge: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  kindText: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  cardLetter: { color: colors.text, fontSize: 15, fontWeight: "900" },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardBody: { backgroundColor: colors.surface, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 19, fontWeight: "800", lineHeight: 26 },
  instructionsLabel: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 16 },
  instructions: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 12
  },
  rpe: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  rpeText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  videoButton: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  videoText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  results: {
    marginTop: 22,
    height: 50,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  resultsText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  history: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14
  },
  historyText: { color: colors.textMuted, fontSize: 12 },
  complete: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6
  },
  completeText: { color: colors.background, fontSize: 15, fontWeight: "800" }
});
