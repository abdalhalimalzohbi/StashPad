import type { Card, CardType, Folder, Zone } from '../state/types';

export type HostToWebview =
  | {
      type: 'state';
      payload: { cards: Card[]; folders: Folder[]; projectTag: string };
    }
  | {
      type: 'inject-result';
      payload: {
        id: string;
        ok: boolean;
        reason?: 'no-terminal';
      };
    }
  | { type: 'focus-capture' }
  | { type: 'flash-card'; payload: { id: string } };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'create'; payload: { text: string; tags?: string[]; folderId?: string } }
  | {
      type: 'update';
      payload: { id: string; text?: string; type?: CardType; folderId?: string };
    }
  | { type: 'move'; payload: { id: string; zone: Zone } }
  | { type: 'delete'; payload: { id: string } }
  | { type: 'reorder'; payload: { zone: Zone; ids: string[] } }
  | { type: 'inject'; payload: { id: string } }
  | { type: 'create-folder'; payload: { name: string } }
  | { type: 'rename-folder'; payload: { id: string; name: string } }
  | { type: 'delete-folder'; payload: { id: string } }
  | { type: 'toggle-folder'; payload: { id: string } }
  | { type: 'move-folder'; payload: { cardId: string; folderId: string } }
  | { type: 'add-tag'; payload: { cardId: string; tag: string } }
  | { type: 'remove-tag'; payload: { cardId: string; tag: string } };
