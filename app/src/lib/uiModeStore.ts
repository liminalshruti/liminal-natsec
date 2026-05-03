// Persist the operator's UI-mode preference to localStorage. "demo" is the
// pitch register (handwritten phase prompts, ink coastline, four-layer empty
// stencil, named-operator card, stipple backdrop). "live" strips the editorial
// scaffolding while preserving every functional surface (proof chain, map
// data layers, command line, replay controls, banners).
//
// Default is "demo" so the timed pitch path is unchanged on first load. The
// preference survives page reload but is independent of the demo state cleared
// by /reset — uiMode is operator preference, not scenario state.

const STORAGE_KEY = "liminal:ui-mode:v1";
const CHANGE_EVENT = "liminal:ui-mode-changed";

export type UiMode = "demo" | "live";

const DEFAULT_MODE: UiMode = "demo";

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isUiMode(value: unknown): value is UiMode {
  return value === "demo" || value === "live";
}

export function loadUiMode(): UiMode {
  const storage = safeStorage();
  if (!storage) return DEFAULT_MODE;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return isUiMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveUiMode(mode: UiMode): UiMode {
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, mode);
    } catch {
      // best-effort; storage may be full or unavailable
    }
  }
  notifyUiModeChanged();
  return mode;
}

export function onUiModeChanged(callback: () => void): () => void {
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

function notifyUiModeChanged(): void {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }
  } catch {
    // ignore
  }
}
