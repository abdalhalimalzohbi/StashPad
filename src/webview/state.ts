import type { Card, Folder } from '../state/types';

export interface ActiveFilters {
  tags: Set<string>;
  query: string;
}

export const state: {
  cards: Card[];
  folders: Folder[];
  projectTag: string;
  filters: ActiveFilters;
} = {
  cards: [],
  folders: [],
  projectTag: '',
  filters: { tags: new Set(), query: '' },
};
