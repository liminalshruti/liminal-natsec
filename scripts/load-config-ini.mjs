import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadConfigIniIntoEnv(path = "config.ini", env = process.env) {
  const configPath = resolve(path);
  if (!existsSync(configPath)) {
    return { loaded: false, path: configPath, keys: [] };
  }

  const keys = [];
  const text = readFileSync(configPath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#") || line.startsWith("[")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = stripInlineComment(line.slice(equalsIndex + 1).trim());
    if (!key || value === "") {
      continue;
    }

    if (env[key] === undefined) {
      env[key] = unquote(value);
      keys.push(key);
    }
  }

  return { loaded: true, path: configPath, keys };
}

function stripInlineComment(value) {
  let quote = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if ((char === '"' || char === "'") && (i === 0 || value[i - 1] !== "\\")) {
      quote = quote === char ? "" : char;
    }
    if (!quote && (char === ";" || char === "#")) {
      return value.slice(0, i).trim();
    }
  }
  return value;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
