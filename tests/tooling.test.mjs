import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const executable = resolve("node_modules/.bin/oxlint");
const config = resolve(".oxlintrc.json");
const prefix = `import * as Uebersicht from 'uebersicht'; const {React} = Uebersicht;\n`;

async function lint(source) {
  const directory = await mkdtemp(join(tmpdir(), "rift-lint-"));
  try {
    const file = join(directory, "fixture.jsx");
    await writeFile(file, source);
    const result = spawnSync(executable, ["--config", config, "--deny-warnings", file], {
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.error, undefined);
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("Oxlint recognizes valid React hooks supplied by Übersicht", async () => {
  const result = await lint(
    prefix +
      `export function Widget({value}) {
    React.useEffect(()=>{document.title = String(value)},[value]); return <span>{value}</span>;
  }`,
  );
  assert.equal(result.status, 0, result.output);
});

test("Oxlint rejects conditional hooks with the project's React binding", async () => {
  const result = await lint(
    prefix +
      `export function Widget({enabled}) {
    if(enabled) React.useState(0); return <span>Widget</span>;
  }`,
  );
  assert.notEqual(result.status, 0);
  assert.match(result.output, /rules-of-hooks/);
});

test("missing hook dependencies remain CI failures", async () => {
  const result = await lint(
    prefix +
      `export function Widget({value}) {
    React.useEffect(()=>{document.title = String(value)},[]); return <span>{value}</span>;
  }`,
  );
  assert.notEqual(result.status, 0);
  assert.match(result.output, /exhaustive-deps/);
});

test("render impurity is checked rather than disabled during migration", async () => {
  const result = await lint(
    prefix +
      `export function Widget() {
    const now = Date.now(); return <span>{now}</span>;
  }`,
  );
  assert.notEqual(result.status, 0);
  assert.match(result.output, /purity/);
});

test("warning-level lint rules fail checks", async () => {
  const result = await lint("console.log('warning');");
  assert.notEqual(result.status, 0);
  assert.match(result.output, /no-console/);
});

for (const source of ["export function bad(value,value) {}", "export const value = 012;"]) {
  test(`the parser replaces strict-module syntax checks: ${source}`, async () => {
    const result = await lint(source);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /declared|duplicate|octal|strict/i);
  });
}
