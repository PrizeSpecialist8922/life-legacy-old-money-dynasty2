import type { Character } from "./types";

const KEY = "life-legacy-save-v3";

export function saveGame(c: Character) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore quota errors */
  }
}

export function loadGame(): Character | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

export function clearSave() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
