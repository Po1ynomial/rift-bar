#!/usr/bin/env node
// Read-only load and conflict-checked atomic save for the TOML configuration.
// The TOML file is authoritative. Reads never create directories or files.
// Dependency-free so it runs on any Node, including Übersicht's bundled runtime.
//
// Usage:
//   config-file.mjs read
//   config-file.mjs save PATH REVISION   (TOML document on stdin)
import {
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { paletteFileName } from "../palette.js";

const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
if (!isAbsolute(configHome)) {
  console.error("XDG_CONFIG_HOME must be absolute");
  process.exit(1);
}
const configPath = join(configHome, "rift-bar", "config.toml");

// Follow an existing symlink chain so saves replace the target, not the link.
async function resolveTarget(path) {
  let target = path;
  for (let links = 0; ; links++) {
    if (links > 40) throw new Error("Configuration symlink loop");
    let link;
    try {
      link = await readlink(target);
    } catch {
      return target;
    }
    target = isAbsolute(link) ? link : resolve(dirname(target), link);
  }
}

async function readContents(target) {
  let buffer;
  try {
    buffer = await readFile(target);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (target !== configPath) throw new Error("Configuration symlink target does not exist");
    return { contents: "", revision: "missing" };
  }
  return {
    contents: buffer.toString("utf8"),
    revision: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function save(path, expected) {
  if (path !== configPath) throw new Error("Configuration path changed; reload before saving");
  const target = await resolveTarget(configPath);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, ".rift-bar-config.lock");
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch {
    throw new Error("Another configuration save is in progress; retry");
  }
  // Stage beside the target so the rename stays on one filesystem.
  const staging = await mkdtemp(join(directory, ".rift-bar-save-"));
  try {
    let source = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) source += chunk;
    const temporary = join(staging, "config.toml");
    await writeFile(temporary, source, { mode: 0o600 });
    const { revision } = await readContents(target);
    if (revision !== expected)
      throw new Error("Configuration changed on disk; reload before saving");
    await rename(temporary, target);
    console.log("saved");
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rmdir(lock);
  }
}

async function read() {
  const target = await resolveTarget(configPath);
  let stats;
  try {
    stats = await stat(target);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (stats?.isDirectory()) throw new Error("Configuration path is a directory");
  const { contents, revision } = await readContents(target);
  // Wallust palettes live beside the TOML; unreadable or missing files mean
  // the Wallust themes fall back to their base colors.
  const palettes = {};
  for (const name of [paletteFileName("dark"), paletteFileName("light")]) {
    try {
      palettes[name] = await readFile(join(configHome, "rift-bar", name), "utf8");
    } catch {
      palettes[name] = "";
    }
  }
  console.log(JSON.stringify({ path: configPath, revision, text: contents, palettes }));
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "read" && !args.length) await read();
  else if (command === "save" && args.length === 2) await save(args[0], args[1]);
  else throw new Error("Usage: config-file.mjs read | save PATH REVISION");
} catch (error) {
  console.error(error?.message || String(error));
  process.exit(1);
}
