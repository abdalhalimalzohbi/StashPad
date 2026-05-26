# Contributing to StashPad

Thanks for taking the time to contribute. This document covers everything you need to get going.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you agree to uphold its terms.

## Prerequisites

- Node.js **≥ 20.x**
- npm **≥ 10.x**
- VS Code **≥ 1.85** (or any fork: Cursor, Windsurf, VSCodium)

## Getting started

```bash
git clone https://github.com/abdalhalimalzohbi/StashPad.git
cd stashpad
npm install
```

## Common commands

| Command | What it does |
|---|---|
| `npm run build` | One-off build of host + webview bundles. |
| `npm run watch` | Rebuild on change. |
| `npm run typecheck` | Type-check both host and webview without emitting. |
| `npm run lint` | Lint the source with ESLint. |
| `npm run format` | Format files with Prettier. |
| `npm run package` | Build for production and produce a `.vsix`. |

## Running the extension locally

1. Open the repo in VS Code.
2. Press `F5` (or **Run → Start Debugging**) to launch a new **Extension Development Host** window with StashPad loaded.
3. In the host window, open the StashPad icon in the Activity Bar.
4. Any source change → either `npm run watch` rebuilds automatically, or rebuild manually and reload the host window (`Developer: Reload Window`).

## Project layout

```
src/
├── extension.ts             Activation, commands, lifecycle.
├── stashpadViewProvider.ts  WebviewViewProvider + host message router.
├── terminalInject.ts        The sole sendText call site.
├── projectTag.ts            Workspace-name → system tag derivation.
├── webviewHtml.ts           HTML shell template (CSP, asWebviewUri).
├── messaging/protocol.ts    Shared discriminated unions across the host ↔ webview bus.
├── state/
│   ├── types.ts             Card and Folder interfaces.
│   ├── cardStore.ts         workspaceState-backed CRUD + migration + template seeding.
│   └── templateLibrary.ts   Starter card seeds.
└── webview/
    ├── main.ts              Webview entry; subscribes to host messages.
    ├── api.ts               acquireVsCodeApi wrapper.
    ├── state.ts             Webview-local state (cards, folders, filters).
    ├── render.ts            Pure DOM rendering of state.
    ├── events.ts            Click / drag / keyboard bindings.
    ├── toast.ts             Bottom-of-pad transient notifications.
    └── styles.css           All component styling.
```

## Architecture rules

- **One inject site.** `vscode.window.activeTerminal.sendText(text, false)` lives exclusively in `src/terminalInject.ts`. Every code path that delivers text to the terminal must go through it. Do not add additional call sites.
- **No trailing newline on inject.** The product premise is that text lands *editable*, never auto-submitted. `sendText(text, false)` is the only signature we use.
- **Host owns state.** The webview never persists; it requests state from the host on `ready` and re-renders on every state push.
- **Single message envelope.** Host ↔ webview messages all share the `{ type, payload }` discriminated-union shape defined in `src/messaging/protocol.ts`.
- **Strict webview CSP.** `default-src 'none'`, script via nonce only, no remote resources. Don't add `unsafe-eval` or external CDNs.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add per-folder card filter
fix(events): debounce reorder drops
docs: clarify drag-to-inject semantics
```

Common prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`.

## Pull requests

1. Fork → branch → push → open PR against `main`.
2. Keep PRs scoped — one concern per PR.
3. Update `CHANGELOG.md` under `## [Unreleased]` for any user-visible change.
4. Make sure `npm run typecheck` and `npm run lint` pass.
5. Manually verify the affected behavior in the Extension Development Host before submitting.

## Reporting bugs / requesting features

Use the GitHub issue templates under [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE).

## Security

See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.
