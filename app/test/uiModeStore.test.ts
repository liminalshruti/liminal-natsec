import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

// The store reads window.localStorage and dispatches/listens to CustomEvents
// on `window`. Node has no DOM globals; we shim the minimum surface the
// store touches so the same module under test runs unmodified. The shim is
// reset between tests to keep cases independent.

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(_index: number): string | null {
    return null;
  }
  get length(): number {
    return this.store.size;
  }
}

let target: EventTarget;
let storage: MemoryStorage;

beforeEach(() => {
  target = new EventTarget();
  storage = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target)
  };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

async function importStoreFresh() {
  // Append a unique cache-buster query so each test gets a fresh module — the
  // store's safeStorage() captures `window` at call time, but importing fresh
  // makes intent obvious and isolates module-scope state.
  return import(`../src/lib/uiModeStore.ts?t=${Math.random()}`);
}

describe("uiModeStore", () => {
  it("returns the demo default when storage is empty", async () => {
    const { loadUiMode } = await importStoreFresh();
    assert.equal(loadUiMode(), "demo");
  });

  it("round-trips save and load for both modes", async () => {
    const { loadUiMode, saveUiMode } = await importStoreFresh();
    saveUiMode("live");
    assert.equal(loadUiMode(), "live");
    saveUiMode("demo");
    assert.equal(loadUiMode(), "demo");
  });

  it("ignores corrupted storage values and falls back to demo", async () => {
    storage.setItem("liminal:ui-mode:v1", "garbage-value");
    const { loadUiMode } = await importStoreFresh();
    assert.equal(loadUiMode(), "demo");
  });

  it("notifies subscribers when the mode changes", async () => {
    const { onUiModeChanged, saveUiMode } = await importStoreFresh();
    let calls = 0;
    const unsubscribe = onUiModeChanged(() => {
      calls += 1;
    });
    saveUiMode("live");
    saveUiMode("demo");
    unsubscribe();
    saveUiMode("live"); // no-op for our subscriber after unsubscribe
    assert.equal(calls, 2);
  });
});
