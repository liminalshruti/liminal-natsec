import { existsSync } from "node:fs";

export const repoRoot = new URL("../../", import.meta.url);

export function repoUrl(relativePath: string): URL {
  return new URL(relativePath, repoRoot);
}

export function hasRepoFile(relativePath: string): boolean {
  return existsSync(repoUrl(relativePath));
}

export function skipIfMissing(
  t: { skip: (message?: string) => void },
  relativePaths: string[],
  label: string
): boolean {
  const missing = relativePaths.filter((path) => !hasRepoFile(path));

  if (missing.length === 0) {
    return false;
  }

  t.skip(`${label} not present yet: ${missing.join(", ")}`);
  return true;
}

export async function importIfPresent<T>(
  t: { skip: (message?: string) => void },
  relativePath: string,
  label: string
): Promise<T | null> {
  if (skipIfMissing(t, [relativePath], label)) {
    return null;
  }

  return import(repoUrl(relativePath).href) as Promise<T>;
}
