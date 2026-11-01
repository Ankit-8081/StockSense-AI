import { useState, useEffect } from "react";

// Colors resolve through CSS variables, so charts follow the active theme.
export const theme = {
  ink: "var(--ink)",
  panel: "var(--panel)",
  rule: "var(--rule)",
  ruleSoft: "var(--rule-soft)",
  text: "var(--text)",
  mute: "var(--mute)",
  saffron: "var(--saffron)",
  up: "var(--up)",
  down: "var(--down)",
};

const KEY = "stocksense-theme"; // "system" | "light" | "dark"

export function getPreference() {
  try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
}

const systemIsLight = () => window.matchMedia?.("(prefers-color-scheme: light)").matches;
export const resolveTheme = (pref) => (pref === "system" ? (systemIsLight() ? "light" : "dark") : pref);

export function applyTheme(pref) {
  document.documentElement.dataset.theme = resolveTheme(pref);
}

export function useTheme() {
  const [pref, setPref] = useState(getPreference);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const set = (next) => {
    try { localStorage.setItem(KEY, next); } catch {}
    setPref(next);
  };
  return [pref, set, resolveTheme(pref)];
}
