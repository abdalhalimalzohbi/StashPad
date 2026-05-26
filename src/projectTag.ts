import * as vscode from 'vscode';

export function projectTag(): string {
  return vscode.workspace.name
    ?? vscode.workspace.workspaceFolders?.[0]?.name
    ?? 'no-workspace';
}
