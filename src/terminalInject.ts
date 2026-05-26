import * as vscode from 'vscode';

export type InjectResult = { ok: true } | { ok: false; reason: 'no-terminal' };

export function injectText(text: string): InjectResult {
  const term = vscode.window.activeTerminal;
  if (!term) {
    return { ok: false, reason: 'no-terminal' };
  }
  term.sendText(text, false);
  return { ok: true };
}
