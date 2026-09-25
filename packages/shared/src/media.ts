/** Media e commenti scambiati tra coach e atleta su un allenamento. */

export type MediaKind = "image" | "video";

export interface MediaAttachment {
  id: string;
  kind: MediaKind;
  url: string;
  /** Anteprima usata nelle liste: per i video è il fotogramma di copertina. */
  thumbnailUrl: string;
  caption: string;
  sizeBytes: number;
  createdAt: string;
}

export type AuthorRole = "coach" | "atleta";

export interface WorkoutComment {
  id: string;
  workoutId: string;
  authorId: string;
  authorName: string;
  authorRole: AuthorRole;
  text: string;
  attachments: MediaAttachment[];
  createdAt: string;
}

/** Estensioni accettate dall'uploader, allineate ai bucket Supabase Storage. */
export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const acceptedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"] as const;

export const maxImageBytes = 10 * 1024 * 1024;
export const maxVideoBytes = 200 * 1024 * 1024;

export interface UploadCheck {
  ok: boolean;
  kind: MediaKind | null;
  error: string | null;
}

/** Valida tipo e peso del file prima di avviare l'upload. */
export function checkUpload(mimeType: string, sizeBytes: number): UploadCheck {
  if ((acceptedImageTypes as readonly string[]).includes(mimeType)) {
    return sizeBytes <= maxImageBytes
      ? { ok: true, kind: "image", error: null }
      : { ok: false, kind: "image", error: "L'immagine supera i 10 MB" };
  }

  if ((acceptedVideoTypes as readonly string[]).includes(mimeType)) {
    return sizeBytes <= maxVideoBytes
      ? { ok: true, kind: "video", error: null }
      : { ok: false, kind: "video", error: "Il video supera i 200 MB" };
  }

  return { ok: false, kind: null, error: "Formato non supportato" };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Percorso dell'oggetto dentro il bucket Supabase Storage. */
export function storagePath(athleteId: string, workoutId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "-").toLowerCase();
  return `${athleteId}/${workoutId}/${Date.now()}-${safeName}`;
}

export const workoutComments: WorkoutComment[] = [
  {
    id: "c1",
    workoutId: "wo-demo",
    authorId: "a1",
    authorName: "Giulia Rossi",
    authorRole: "atleta",
    text: "Terzo set un po' pesante, come ti sembra la risalita?",
    attachments: [
      {
        id: "m1",
        kind: "video",
        url: "https://cdn.vsctraining.app/media/a1/squat-set3.mp4",
        thumbnailUrl: "https://cdn.vsctraining.app/media/a1/squat-set3.jpg",
        caption: "Back Squat · serie 3",
        sizeBytes: 18_400_000,
        createdAt: "2026-09-19T17:42:00Z"
      }
    ],
    createdAt: "2026-09-19T17:42:00Z"
  },
  {
    id: "c2",
    workoutId: "wo-demo",
    authorId: "coach",
    authorName: "Coach",
    authorRole: "coach",
    text: "Ottima spinta! Tieni il petto più alto in uscita dalla buca.",
    attachments: [],
    createdAt: "2026-09-19T18:05:00Z"
  }
];
