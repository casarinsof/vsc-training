import { describe, expect, it } from "vitest";
import { checkUpload, formatFileSize, maxImageBytes, maxVideoBytes, storagePath } from "./media";

describe("checkUpload", () => {
  it("accetta immagini entro il limite", () => {
    expect(checkUpload("image/jpeg", 2_000_000)).toEqual({ ok: true, kind: "image", error: null });
  });

  it("rifiuta immagini troppo pesanti", () => {
    const result = checkUpload("image/png", maxImageBytes + 1);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("10 MB");
  });

  it("accetta video entro il limite", () => {
    expect(checkUpload("video/mp4", 50_000_000).ok).toBe(true);
  });

  it("rifiuta video troppo pesanti", () => {
    expect(checkUpload("video/mp4", maxVideoBytes + 1).ok).toBe(false);
  });

  it("rifiuta formati non supportati", () => {
    expect(checkUpload("application/pdf", 1000)).toEqual({
      ok: false,
      kind: null,
      error: "Formato non supportato"
    });
  });
});

describe("formatFileSize", () => {
  it("usa byte, KB e MB", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5_242_880)).toBe("5.0 MB");
  });
});

describe("storagePath", () => {
  it("normalizza il nome del file", () => {
    const path = storagePath("a1", "wo1", "Serie 3 Squat.MOV");
    expect(path.startsWith("a1/wo1/")).toBe(true);
    expect(path).toMatch(/serie-3-squat\.mov$/);
  });
});
