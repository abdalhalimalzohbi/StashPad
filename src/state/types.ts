export type CardType = 'consumable' | 'sticky';
export type Zone = 'next' | 'parked';

export interface Card {
  id: string;
  text: string;
  type: CardType;
  zone: Zone;
  order: number;
  folderId: string;
  tags: string[];
  systemTags: string[];
  createdAt: number;
  languageId?: string;
  injectCount: number;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
}
