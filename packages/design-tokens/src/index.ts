export const colors = {
  background: "#080b09",
  surface: "#111612",
  surfaceRaised: "#182019",
  border: "#283329",
  primary: "#b9ff38",
  primaryMuted: "#263b12",
  text: "#f4f7f2",
  textMuted: "#97a398",
  success: "#55dd8a",
  warning: "#ffbc42",
  danger: "#ff6868"
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: "800" },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" }
} as const;