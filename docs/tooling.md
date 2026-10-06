# Tooling

The development tools are pnpm, Oxlint, Oxfmt, Espree, and Node's test runner. Übersicht still supplies React and compiles the widget. There is no Vite build or separate frontend runtime.

## Versions and installs

`.node-version` pins the Node LTS used by CI. `package.json` pins pnpm and the direct development dependencies; `pnpm-lock.yaml` records the resolved dependency graph. Use `pnpm install --frozen-lockfile` for reproducible installs. Espree remains a direct dependency because the JSX test helpers use it independently of the linter.

## Lint migration audit

`.oxlintrc.json` explicitly ports the supported active rules from the previous ESLint configuration. It does not substitute Oxlint's default recommended rules. The React plugin is enabled explicitly with React 18 settings because this project gets React from `uebersicht`, not a local `react` dependency. Native React hook rules use the `react/` prefix rather than ESLint's `react-hooks/` prefix.

Warning-level rules are retained and `--deny-warnings` makes them fail verification. Hook ordering, effect dependencies, rendering purity, and other supported React checks remain enabled. `tests/tooling.test.mjs` invokes the pinned linter on valid and invalid fixtures using the actual Übersicht React binding.

The eight active ESLint rules without a direct Oxlint entry are accounted for below. This is not a claim of complete semantic equivalence between the two linters.

| Previous rule | Handling |
| --- | --- |
| `no-dupe-args` | Duplicate parameters are parser errors in strict ES modules. A fixture checks this. |
| `no-octal` | Legacy octal literals are parser errors in strict ES modules. A fixture checks this. |
| `react/jsx-uses-react` | Oxlint's modern JSX analysis does not count the explicit React binding as a use. Only the name `React` is exempted from unused-variable diagnostics because the element-tree test transform uses it. |
| `react/jsx-uses-vars` | JSX component references are handled by Oxlint's variable-use analysis. |
| `react/no-deprecated` | No native equivalent in the pinned version. Deprecated React API usage is not checked by this rule. |
| `react-hooks/component-hook-factories` | No direct native equivalent. The React Compiler-specific factory check is not retained. |
| `react-hooks/config` | No direct native equivalent. This project does not configure or run React Compiler. |
| `react-hooks/gating` | No direct native equivalent. This project does not configure React Compiler gating. |

The existing disabled rules stay disabled. Browser globals apply to widget code. Test and tool scripts use Node globals; the latency script also gets browser globals because it contains code serialized into the browser page. Inline lint suppression comments use Oxlint's directive spelling.

Oxlint's purity check detects the clock's old render-time date sampling. The collector now samples time and day progress together, and the view renders that snapshot without creating dates. This has a deterministic collector regression test.

## Formatting

Oxfmt formats source, tests, JSON, Markdown, and workflow YAML. `proseWrap: never` preserves one-line Markdown paragraphs. Import sorting and package-field sorting are disabled. Embedded formatting is disabled so this migration does not rewrite CSS string contents. The generated pnpm lockfile is excluded from formatting and remains owned by pnpm.

## Failure-only output

`tools/failures-only.mjs` is a Node test reporter, not a new test runner. Node retains responsibility for test discovery and failure exit codes. Passing tests and their logs are silent. Failures include names, locations, assertion details, stacks, and buffered output from the failing file. Buffered logs are bounded and truncation is indicated. Module-load errors, syntax errors, process crashes, cancellations, and timeouts cannot be turned into success by the reporter.

`test:verbose` and `test:host:verbose` select Node's standard spec reporter. No process-wide warning suppression is enabled. Successful child-test warnings stay in the buffer; failure output includes them. Parent-process failures still reach stderr normally.

`tools/quiet-command.mjs` suppresses successful lint and format-check chatter. On failure it replays stdout and stderr, preserves the exit code, and reports launch errors and termination signals. It does not use `--quiet` to hide lint warnings.

Use `pnpm run --reporter=silent <script>` to suppress pnpm's own lifecycle headers as well. The pinned pnpm 12 uses `-s` for sequential script execution, not silent execution.
