import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { loadModule, root, React } from "./helpers/modules.mjs";

async function sources(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sources(path)));
    else if (/\.(js|jsx)$/.test(entry.name)) result.push(relative(root, path));
  }
  return result;
}

for (const path of ["index.jsx", ...(await sources(join(root, "lib")))]) {
  test(`real local module exports link: ${path}`, async () => {
    await loadModule(path, {
      evaluate: false,
      mocks: { uebersicht: { React, run: async () => "" } },
    });
  });
}
