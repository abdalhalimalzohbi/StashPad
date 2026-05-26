import * as vscode from 'vscode';
import { injectText } from './terminalInject';
import { StashpadViewProvider } from './stashpadViewProvider';
import { CardStore } from './state/cardStore';
import { projectTag } from './projectTag';

const FOCUS_REVEAL_DELAY_MS = 60;
const FLASH_DELAY_MS = 120;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new CardStore(context.workspaceState);
  await store.init();
  const provider = new StashpadViewProvider(context.extensionUri, store);

  const revealAndFlash = async (cardId?: string): Promise<void> => {
    await vscode.commands.executeCommand('stashpad.pad.focus');
    if (cardId) {
      setTimeout(() => provider.flashCard(cardId), FLASH_DELAY_MS);
    }
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(StashpadViewProvider.viewType, provider),

    vscode.commands.registerCommand('stashpad.test', () => {
      const result = injectText('hello from stashpad');
      if (!result.ok && result.reason === 'no-terminal') {
        vscode.window.showWarningMessage('StashPad: open a terminal first');
      }
    }),

    vscode.commands.registerCommand('stashpad.focusCapture', async () => {
      await vscode.commands.executeCommand('stashpad.pad.focus');
      setTimeout(() => provider.postFocus(), FOCUS_REVEAL_DELAY_MS);
    }),

    vscode.commands.registerCommand('stashpad.parkSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('StashPad: no active editor');
        return;
      }
      const text = editor.document.getText(editor.selection);
      if (!text.trim()) {
        vscode.window.showInformationMessage('StashPad: nothing selected');
        return;
      }
      const languageId = editor.document.languageId;
      const card = await store.create({
        text,
        languageId,
        tags: [projectTag(), languageId],
      });
      provider.postState();
      await revealAndFlash(card.id);
    }),

    vscode.commands.registerCommand('stashpad.parkClipboard', async () => {
      const text = await vscode.env.clipboard.readText();
      if (!text.trim()) {
        vscode.window.showInformationMessage('StashPad: clipboard is empty');
        return;
      }
      const card = await store.create({ text, tags: [projectTag()] });
      provider.postState();
      await revealAndFlash(card.id);
    }),
  );
}

export function deactivate(): void {}
