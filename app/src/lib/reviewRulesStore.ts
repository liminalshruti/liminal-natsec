// Persist user-authored review rules to localStorage. The fixture seed rule
// (R-001) is hard-baked into the spine; this store layers user-saved rules on
// top so the "next case changed" beat can reflect either source.

const STORAGE_KEY = "seaforge:review-rules:v1";
const CHANGE_EVENT = "liminal:review-rules-changed";

export interface SavedReviewRule {
  id: string;
  title: string;
  dsl_text: string;
  saved_at: string;
  active: boolean;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSavedRules(): SavedReviewRule[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedReviewRule[]) : [];
  } catch {
    return [];
  }
}

export function saveRule(rule: SavedReviewRule): SavedReviewRule[] {
  const storage = safeStorage();
  if (!storage) return [rule];
  const existing = loadSavedRules().filter((entry) => entry.id !== rule.id);
  const next = [rule, ...existing];
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort; storage may be full
  }
  notifyReviewRulesChanged();
  return next;
}

export function clearSavedRules(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  notifyReviewRulesChanged();
}

export function onSavedRulesChanged(callback: () => void): () => void {
  const storageListener = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  const localListener = () => callback();

  window.addEventListener("storage", storageListener);
  window.addEventListener(CHANGE_EVENT, localListener);
  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(CHANGE_EVENT, localListener);
  };
}

function notifyReviewRulesChanged(): void {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }
  } catch {
    // ignore
  }
}
