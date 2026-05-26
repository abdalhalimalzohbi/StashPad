import * as vscode from 'vscode';
import { renderHtml } from './webviewHtml';
import type { CardStore } from './state/cardStore';
import { injectText } from './terminalInject';
import { projectTag } from './projectTag';
import type { HostToWebview, WebviewToHost } from './messaging/protocol';

const CONSUME_DELAY_MS = 380;

export class StashpadViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stashpad.pad';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly store: CardStore,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = renderHtml({
      webview: webviewView.webview,
      extensionUri: this.extensionUri,
      nonce: getNonce(),
    });
    webviewView.webview.onDidReceiveMessage((msg: WebviewToHost) => {
      void this.handle(msg);
    });
  }

  public postState(): void {
    this.post({
      type: 'state',
      payload: {
        cards: this.store.getAll(),
        folders: this.store.getFolders(),
        projectTag: projectTag(),
      },
    });
  }

  public postFocus(): void {
    this.post({ type: 'focus-capture' });
  }

  public flashCard(id: string): void {
    this.post({ type: 'flash-card', payload: { id } });
  }

  private async handle(msg: WebviewToHost): Promise<void> {
    switch (msg.type) {
      case 'ready':
        this.postState();
        return;
      case 'create': {
        const text = msg.payload.text.trim();
        if (text) {
          await this.store.create({
            text,
            tags: msg.payload.tags,
            folderId: msg.payload.folderId,
          });
          this.postState();
        }
        return;
      }
      case 'update':
        await this.store.update(msg.payload.id, {
          text: msg.payload.text,
          type: msg.payload.type,
          folderId: msg.payload.folderId,
        });
        this.postState();
        return;
      case 'move':
        await this.store.move(msg.payload.id, msg.payload.zone);
        this.postState();
        return;
      case 'delete':
        await this.store.delete(msg.payload.id);
        this.postState();
        return;
      case 'reorder':
        await this.store.reorder(msg.payload.zone, msg.payload.ids);
        this.postState();
        return;
      case 'inject':
        await this.handleInject(msg.payload.id);
        return;
      case 'create-folder':
        await this.store.createFolder(msg.payload.name);
        this.postState();
        return;
      case 'rename-folder':
        await this.store.renameFolder(msg.payload.id, msg.payload.name);
        this.postState();
        return;
      case 'delete-folder':
        await this.store.deleteFolder(msg.payload.id);
        this.postState();
        return;
      case 'toggle-folder':
        await this.store.toggleFolder(msg.payload.id);
        this.postState();
        return;
      case 'move-folder':
        await this.store.moveCardToFolder(msg.payload.cardId, msg.payload.folderId);
        this.postState();
        return;
      case 'add-tag':
        await this.store.addTag(msg.payload.cardId, msg.payload.tag);
        this.postState();
        return;
      case 'remove-tag':
        await this.store.removeTag(msg.payload.cardId, msg.payload.tag);
        this.postState();
        return;
    }
  }

  private async handleInject(id: string): Promise<void> {
    const card = this.store.get(id);
    if (!card) return;
    const result = injectText(card.text);
    if (!result.ok) {
      this.post({
        type: 'inject-result',
        payload: { id, ok: false, reason: result.reason },
      });
      return;
    }
    await this.store.incrementInject(id);
    this.post({ type: 'inject-result', payload: { id, ok: true } });
    if (card.type === 'consumable') {
      setTimeout(() => {
        void (async () => {
          await this.store.delete(id);
          this.postState();
        })();
      }, CONSUME_DELAY_MS);
    } else {
      this.postState();
    }
  }

  private post(msg: HostToWebview): void {
    this.view?.webview.postMessage(msg);
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
