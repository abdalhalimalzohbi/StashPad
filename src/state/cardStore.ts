import { randomUUID } from 'node:crypto';
import type * as vscode from 'vscode';
import type { Card, CardType, Folder, Zone } from './types';
import { projectTag } from '../projectTag';

const CARDS_KEY_V1 = 'stashpad.cards.v1';
const CARDS_KEY = 'stashpad.cards.v2';
const FOLDERS_KEY = 'stashpad.folders.v2';
const MIGRATED_KEY = 'stashpad.migrated.v2';
const PLACEHOLDERS_STRIPPED_KEY = 'stashpad.placeholders.stripped.v1';
export const INBOX_ID = 'inbox';

const PLACEHOLDER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\{\{selection\}\}/g, 'this code'],
  [/\{\{file\}\}/g, 'this file'],
  [/\{\{line\}\}/g, 'this line'],
  [/\{\{repo\}\}/g, 'this repo'],
  [/\{\{branch\}\}/g, 'this branch'],
];

export interface CreateOptions {
  text: string;
  type?: CardType;
  tags?: string[];
  languageId?: string;
  folderId?: string;
}

export class CardStore {
  constructor(private readonly memento: vscode.Memento) {}

  async init(): Promise<void> {
    if (this.memento.get<boolean>(MIGRATED_KEY, false)) {
      await this.ensureInbox();
      await this.stripPlaceholdersIfNeeded();
      return;
    }

    const v2Existing = this.memento.get<Card[]>(CARDS_KEY);
    if (!v2Existing || v2Existing.length === 0) {
      const v1 = this.memento.get<unknown[]>(CARDS_KEY_V1);
      if (v1 && v1.length > 0) {
        const tag = projectTag();
        const migrated: Card[] = v1.map((raw) => this.coerceV1(raw, tag));
        await this.memento.update(CARDS_KEY, migrated);
      }
    }

    await this.ensureInbox();
    await this.stripPlaceholdersIfNeeded();
    await this.memento.update(MIGRATED_KEY, true);
  }

  private async stripPlaceholdersIfNeeded(): Promise<void> {
    if (this.memento.get<boolean>(PLACEHOLDERS_STRIPPED_KEY, false)) return;
    const cards = this.getAll();
    let changed = false;
    for (const c of cards) {
      let next = c.text;
      for (const [re, replacement] of PLACEHOLDER_REPLACEMENTS) {
        next = next.replace(re, replacement);
      }
      if (next !== c.text) {
        c.text = next;
        changed = true;
      }
    }
    if (changed) await this.persistCards(cards);
    await this.memento.update(PLACEHOLDERS_STRIPPED_KEY, true);
  }

  private coerceV1(raw: unknown, tag: string): Card {
    const c = raw as Record<string, unknown>;
    return {
      id: typeof c.id === 'string' ? c.id : randomUUID(),
      text: typeof c.text === 'string' ? c.text : '',
      type: c.type === 'sticky' ? 'sticky' : 'consumable',
      zone: c.zone === 'next' ? 'next' : 'parked',
      order: typeof c.order === 'number' ? c.order : 0,
      folderId: INBOX_ID,
      tags: [tag],
      systemTags: [tag],
      createdAt: Date.now(),
      injectCount: 0,
    };
  }

  private async ensureInbox(): Promise<void> {
    const folders = this.memento.get<Folder[]>(FOLDERS_KEY) ?? [];
    if (folders.some((f) => f.id === INBOX_ID)) return;
    folders.unshift({ id: INBOX_ID, name: 'Inbox', order: 0, collapsed: false });
    await this.memento.update(FOLDERS_KEY, folders);
  }

  getAll(): Card[] {
    return this.memento.get<Card[]>(CARDS_KEY, []);
  }

  get(id: string): Card | undefined {
    return this.getAll().find((c) => c.id === id);
  }

  getFolders(): Folder[] {
    return [...this.memento.get<Folder[]>(FOLDERS_KEY, [])].sort((a, b) => a.order - b.order);
  }

  async create(options: CreateOptions): Promise<Card> {
    const cards = this.getAll();
    const minOrder = Math.min(0, ...cards.filter((c) => c.zone === 'parked').map((c) => c.order));
    const systemTag = projectTag();
    const userTags = (options.tags ?? [])
      .map((t) => t.trim())
      .filter((t, i, arr) => t && t !== systemTag && arr.indexOf(t) === i);
    const card: Card = {
      id: randomUUID(),
      text: options.text,
      type: options.type ?? 'consumable',
      zone: 'parked',
      order: minOrder - 1,
      folderId: options.folderId ?? INBOX_ID,
      tags: [systemTag, ...userTags],
      systemTags: [systemTag],
      createdAt: Date.now(),
      languageId: options.languageId,
      injectCount: 0,
    };
    cards.unshift(card);
    await this.persistCards(cards);
    return card;
  }

  async update(
    id: string,
    patch: { text?: string; type?: CardType; folderId?: string },
  ): Promise<void> {
    const cards = this.getAll();
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (patch.text !== undefined) card.text = patch.text;
    if (patch.type !== undefined) card.type = patch.type;
    if (patch.folderId !== undefined) card.folderId = patch.folderId;
    await this.persistCards(cards);
  }

  async move(id: string, zone: Zone): Promise<void> {
    const cards = this.getAll();
    const card = cards.find((c) => c.id === id);
    if (!card || card.zone === zone) return;
    card.zone = zone;
    const minOrder = Math.min(0, ...cards.filter((c) => c.zone === zone).map((c) => c.order));
    card.order = minOrder - 1;
    await this.persistCards(cards);
  }

  async delete(id: string): Promise<void> {
    const cards = this.getAll().filter((c) => c.id !== id);
    await this.persistCards(cards);
  }

  async reorder(zone: Zone, ids: string[]): Promise<void> {
    const cards = this.getAll();
    ids.forEach((id, idx) => {
      const card = cards.find((c) => c.id === id && c.zone === zone);
      if (card) card.order = idx;
    });
    await this.persistCards(cards);
  }

  async incrementInject(id: string): Promise<void> {
    const cards = this.getAll();
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    card.injectCount = (card.injectCount ?? 0) + 1;
    await this.persistCards(cards);
  }

  async createFolder(name: string): Promise<Folder | undefined> {
    const clean = name.trim();
    if (!clean) return undefined;
    const folders = this.memento.get<Folder[]>(FOLDERS_KEY, []);
    const maxOrder = Math.max(0, ...folders.map((f) => f.order));
    const folder: Folder = {
      id: randomUUID(),
      name: clean,
      order: maxOrder + 1,
      collapsed: false,
    };
    folders.push(folder);
    await this.memento.update(FOLDERS_KEY, folders);
    return folder;
  }

  async renameFolder(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) return;
    const folders = this.memento.get<Folder[]>(FOLDERS_KEY, []);
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    folder.name = clean;
    await this.memento.update(FOLDERS_KEY, folders);
  }

  async deleteFolder(id: string): Promise<void> {
    if (id === INBOX_ID) return;
    const folders = this.memento.get<Folder[]>(FOLDERS_KEY, []).filter((f) => f.id !== id);
    await this.memento.update(FOLDERS_KEY, folders);
    const cards = this.getAll();
    let changed = false;
    for (const c of cards) {
      if (c.folderId === id) {
        c.folderId = INBOX_ID;
        changed = true;
      }
    }
    if (changed) await this.persistCards(cards);
  }

  async toggleFolder(id: string): Promise<void> {
    const folders = this.memento.get<Folder[]>(FOLDERS_KEY, []);
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    folder.collapsed = !folder.collapsed;
    await this.memento.update(FOLDERS_KEY, folders);
  }

  async moveCardToFolder(cardId: string, folderId: string): Promise<void> {
    const cards = this.getAll();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    card.folderId = folderId;
    await this.persistCards(cards);
  }

  async addTag(cardId: string, tag: string): Promise<void> {
    const clean = tag.trim();
    if (!clean) return;
    const cards = this.getAll();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    if (card.tags.includes(clean)) return;
    card.tags.push(clean);
    await this.persistCards(cards);
  }

  async removeTag(cardId: string, tag: string): Promise<void> {
    const cards = this.getAll();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    if (card.systemTags.includes(tag)) return;
    card.tags = card.tags.filter((t) => t !== tag);
    await this.persistCards(cards);
  }

  private async persistCards(cards: Card[]): Promise<void> {
    await this.memento.update(CARDS_KEY, cards);
  }
}
