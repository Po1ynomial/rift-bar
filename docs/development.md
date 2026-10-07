# Development

Working on rift-bar itself. For installation and usage, see the README.

## Setup

Use the Node LTS pinned in `.node-version` and pnpm pinned in `package.json`. The development dependencies are Oxlint, Oxfmt, and Espree. The runtime dependency `smol-toml` parses and serializes TOML. Übersicht still compiles the widget; no Vite build is involved.

```sh
pnpm install --frozen-lockfile
pnpm run --reporter=silent check
```

`check` verifies formatting, lint, and portable tests without changing files. Successful checks are silent; failures retain diagnostics and nonzero exit codes. Individual commands are `format:check`, `lint`, and `test`. Use `pnpm run format` to apply formatting. `test:verbose` selects the full Node test report. Use `--reporter=silent` to suppress pnpm's own lifecycle headers; the pinned pnpm 12 no longer uses `-s` for silent execution.

## CI

`.github/workflows/ci.yml` runs the portable checks on Ubuntu with the pinned Node LTS and frozen dependencies, and the host compatibility tests on macOS with Übersicht installed from its Homebrew cask. The live desktop latency regression remains local-only. The [tooling notes](tooling.md) record lint migration differences and output behavior.

## Test suites

Unit tests mock Rift responses, system commands, geolocation, and weather HTTP responses. Shell tests use temporary preferences and mock CLI executables; they do not change the running window manager or real preferences. Module-wiring tests replace JSX with `null` for linking. Widget-view tests separately compile JSX into element trees and exercise loading, success, stale, failure, and disabled states. These tests do not simulate browser layout or the React DOM renderer.

`pnpm run --reporter=silent test:host` is a macOS compatibility check, also run by CI. `test:host:verbose` retains its full report. It bundles the complete widget with Übersicht's installed Browserify/Babel, exercises the compiled TOML model, and tests compiled weather with mocked geolocation and HTTP. It also runs the real read-only sound collector and validates its AppleScript output. It requires Übersicht at `/Applications/Übersicht.app`; it does not change sound volume, preferences, or workspace focus. When `agent-browser` is installed, it also measures foreground and outer heights in an isolated browser across padding, border, floating, background, and process-centering combinations.

The optional live latency regression clicks workspace buttons, checks updates below 250ms and no idle snapshot polling, then restores the original workspaces and focused window from the host even if browser evaluation fails. It uses the configured CLI path, with an optional `RIFT_CLI` environment override, and identifies buttons by display UUID and workspace index rather than names. It skips when there are no visible displays with two usable workspaces. With all-display workspace rendering enabled, it also exercises cross-display clicks. It requires `agent-browser` and should run while the desktop is otherwise idle:

```sh
pnpm run test:latency
```

## Configuration fields

After changing configuration fields, run `pnpm run config:generate` to regenerate the schema and field reference.
