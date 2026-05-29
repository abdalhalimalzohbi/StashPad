# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-05-29

### Fixed

- Drag-to-inject now reliably fires when a card is dropped onto the terminal or editor. The old `dragend` heuristic relied on cursor coordinates that browsers report as `0,0` across the webview iframe boundary, so external drops silently did nothing. Drops are now detected by whether they landed on an in-sidebar target, and the redundant `text/plain` drag payload was removed to prevent double-insertion.

## [0.1.1]

### Added

- Hero screenshot in the README so the marketplace listing has a visual preview.
- "Why not just use Claude's queue?" section in the README articulating the staging-vs-queue positioning.

### Changed

- Marketplace description reframed around the staging metaphor: "Stage prompts and ideas while Claude Code works the terminal."

### Removed

- Seeded starter cards. Fresh installs now open with an empty Inbox so users build their own pad from the first thought.
- `StashPad: Restore Template Library` command (no library to restore).

## [0.1.0] - 2026-05-26

First public release.

### Added

- Sidebar webview that hosts a stack of prompt cards.
- Capture input with one-keystroke parking (`Enter`).
- One-shot and sticky card types; click the dot or type pill to toggle.
- Two zones: **Next Up** (on-deck) and **Parked** (scratch tray).
- Single-level folders inside Parked with collapse, rename, delete, drag-between, and inline new-folder input. **Inbox** folder always exists.
- Free-form tags on every card; click a pill to filter, `+` to add inline.
- System project tag — the workspace name is auto-applied to every card and cannot be removed.
- Filter bar with `/` shortcut and clickable filter chips. Counts switch to `visible/total` when filtering.
- Click-to-inject lands the card text in the active terminal via a single `sendText(text, false)` call site — no newline, no auto-send.
- Drag-to-inject — drop a card outside the sidebar and the text routes through the same host inject path into the active terminal.
- Inline card editing with `Enter` to save, `Esc` to cancel.
- Quick-capture commands: `StashPad: Park Selection` (`Cmd/Ctrl+Alt+S`) and `StashPad: Park Clipboard` (`Cmd/Ctrl+Alt+V`).
- Seeded template library of 17 starter cards (10 sticky house rules / templates, 7 one-shot reactive prompts). `StashPad: Restore Template Library` re-adds any deleted ones without duplicates.
- Per-workspace persistence via `vscode.Memento`.

### Security

- Strict Content-Security-Policy on the webview (nonce on scripts, `default-src 'none'`, no external resources).

[Unreleased]: https://github.com/abdalhalimalzohbi/StashPad/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/abdalhalimalzohbi/StashPad/compare/v0.1.1...v0.1.2
[0.1.0]: https://github.com/abdalhalimalzohbi/StashPad/releases/tag/v0.1.0
