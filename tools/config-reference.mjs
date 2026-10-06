import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { definition, toSchema } from "../lib/config.js";

export const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "rift-bar TOML configuration",
  ...toSchema(),
};
export function reference() {
  const lines = [
    "# Configuration fields",
    "",
    "Generated from `lib/config.js`. All fields are optional overrides. Omitted fields inherit builtin defaults. `Unset` means a theme-derived value or an unselected location, not a TOML value to write.",
    "",
    "| Field | Type | Default | Meaning |",
    "|---|---|---|---|",
  ];
  function visit(node, path = "") {
    for (const [key, child] of Object.entries(node.properties)) {
      const name = path ? `${path}.${key}` : key;
      if (child.type === "object") visit(child, name);
      else {
        const type = child.enum
          ? child.enum.map((value) => `\`${value}\``).join(", ")
          : child.integer
            ? "integer"
            : child.type;
        const value =
          child.default === undefined ? "Unset" : `\`${JSON.stringify(child.default)}\``;
        lines.push(`| \`${name}\` | ${type} | ${value} | ${child.label} |`);
      }
    }
  }
  visit(definition);
  return lines.join("\n") + "\n";
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(
    new URL("../lib/schemas/config.json", import.meta.url),
    JSON.stringify(schema, null, 2) + "\n",
  );
  await writeFile(new URL("../docs/config-fields.md", import.meta.url), reference());
}
