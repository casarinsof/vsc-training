import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, radii, spacing } from "@vsc-training/design-tokens";
import {
  checkUpload,
  formatFileSize,
  workoutComments,
  type MediaAttachment,
  type WorkoutComment
} from "@vsc-training/shared";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/** Feed di commenti con allegati foto/video tra atleta e coach. */
export function WorkoutMedia({ workoutId }: { workoutId: string }) {
  const [comments, setComments] = useState<WorkoutComment[]>(workoutComments);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<MediaAttachment[]>([]);

  async function pickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permesso negato", "Consenti l'accesso alla galleria per allegare foto o video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      videoMaxDuration: 120
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg");
    const check = checkUpload(mimeType, asset.fileSize ?? 0);

    if (!check.ok || !check.kind) {
      Alert.alert("File non valido", check.error ?? "Formato non supportato");
      return;
    }

    setPending((current) => [
      ...current,
      {
        id: `tmp-${Date.now()}`,
        kind: check.kind!,
        url: asset.uri,
        thumbnailUrl: asset.uri,
        caption: asset.fileName ?? "",
        sizeBytes: asset.fileSize ?? 0,
        createdAt: new Date().toISOString()
      }
    ]);
  }

  function send() {
    if (!text.trim() && pending.length === 0) return;
    setComments((current) => [
      ...current,
      {
        id: `c-${Date.now()}`,
        workoutId,
        authorId: "a1",
        authorName: "Giulia Rossi",
        authorRole: "atleta",
        text: text.trim(),
        attachments: pending,
        createdAt: new Date().toISOString()
      }
    ]);
    setText("");
    setPending([]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Commenti allenamento</Text>

      {comments.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <View style={[styles.avatar, comment.authorRole === "coach" && styles.avatarCoach]}>
            <Text style={styles.avatarText}>
              {comment.authorName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.bubble}>
            <View style={styles.bubbleHead}>
              <Text style={styles.author}>{comment.authorName}</Text>
              <Text style={styles.time}>{timeLabel(comment.createdAt)}</Text>
            </View>
            {comment.text ? <Text style={styles.text}>{comment.text}</Text> : null}
            {comment.attachments.map((media) => (
              <View key={media.id} style={styles.media}>
                <Image source={{ uri: media.thumbnailUrl }} style={styles.thumb} />
                {media.kind === "video" ? (
                  <View style={styles.play}>
                    <Ionicons name="play" size={20} color={colors.background} />
                  </View>
                ) : null}
                {media.sizeBytes ? (
                  <Text style={styles.size}>{formatFileSize(media.sizeBytes)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ))}

      {pending.length > 0 ? (
        <View style={styles.pendingRow}>
          {pending.map((media) => (
            <View key={media.id} style={styles.pendingItem}>
              <Image source={{ uri: media.thumbnailUrl }} style={styles.pendingThumb} />
              <TouchableOpacity
                style={styles.pendingRemove}
                onPress={() => setPending((current) => current.filter((item) => item.id !== media.id))}
              >
                <Ionicons name="close" size={12} color={colors.background} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.composer}>
        <TouchableOpacity style={styles.attach} onPress={pickMedia}>
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Scrivi un commento…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[styles.send, !text.trim() && pending.length === 0 && styles.sendOff]}
          onPress={send}
        >
          <Ionicons name="arrow-up" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  title: { color: colors.text, fontSize: 19, fontWeight: "800", marginBottom: 14 },
  comment: { flexDirection: "row", gap: 10, marginBottom: 14 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarCoach: { backgroundColor: colors.primary },
  avatarText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  bubbleHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  author: { color: colors.text, fontSize: 12, fontWeight: "800" },
  time: { color: colors.textMuted, fontSize: 10 },
  text: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 6 },
  media: { marginTop: 10, borderRadius: radii.sm, overflow: "hidden", position: "relative" },
  thumb: { width: "100%", height: 170, backgroundColor: colors.surfaceRaised },
  play: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  size: {
    position: "absolute",
    right: 8,
    bottom: 8,
    color: colors.text,
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  pendingRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pendingItem: { position: "relative" },
  pendingThumb: { width: 58, height: 58, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised },
  pendingRemove: {
    position: "absolute",
    right: -5,
    top: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 50
  },
  attach: { padding: 4 },
  input: { flex: 1, color: colors.text, fontSize: 13 },
  send: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  sendOff: { opacity: 0.4 }
});
