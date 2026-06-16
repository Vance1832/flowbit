// Plain (non-"use client") module so the value can be imported by both the
// server layout and the client ThemeProvider. Constants exported from a
// "use client" file become client references on the server, not their value.
export type Theme = "light" | "dark";

export const THEME_COOKIE = "flowbit_theme";
