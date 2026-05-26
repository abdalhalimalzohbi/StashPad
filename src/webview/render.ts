import type { Card, Folder } from '../state/types';
import { state } from './state';

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ESCAPE_MAP[m]);
}

function matchesFilter(c: Card): boolean {
  const { tags, query } = state.filters;
  if (tags.size > 0) {
    for (const t of tags) {
      if (!c.tags.includes(t)) return false;
    }
  }
  if (query) {
    const needle = query.toLowerCase();
    if (!c.text.toLowerCase().includes(needle)) return false;
  }
  return true;
}

function tagPillsHTML(c: Card): string {
  if (c.tags.length === 0) return '';
  const sysSet = new Set(c.systemTags);
  const pills = c.tags
    .map((t) => {
      const isSystem = sysSet.has(t);
      const isActive = state.filters.tags.has(t);
      const cls = `tag-pill${isSystem ? ' is-system' : ''}${isActive ? ' is-active' : ''}`;
      const remove = isSystem
        ? ''
        : `<span class="tag-pill-x" data-act="remove-tag" data-id="${c.id}" data-tag="${escapeAttr(t)}" title="remove tag">×</span>`;
      return `<span class="${cls}" data-act="filter-tag" data-tag="${escapeAttr(t)}" title="filter by ${escapeAttr(t)}"><span class="tag-pill-label">${escapeHTML(t)}</span>${remove}</span>`;
    })
    .join('');
  const addBtn = `<button class="tag-pill tag-pill-add" data-act="add-tag" data-id="${c.id}" title="add tag">+</button>`;
  return `<div class="card-tags">${pills}${addBtn}</div>`;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

export function cardHTML(c: Card): string {
  const move = c.zone === 'parked'
    ? `<button class="act" data-act="promote" data-id="${c.id}" title="promote to Next Up">↑</button>`
    : `<button class="act" data-act="demote" data-id="${c.id}" title="back to Parked">↓</button>`;
  const tagLabel = c.type === 'sticky' ? 'sticky' : 'one-shot';
  return `
    <div class="card is-${c.type}" data-id="${c.id}" data-folder="${escapeAttr(c.folderId)}" draggable="true">
      <div class="card-top">
        <span class="dot ${c.type}" data-act="toggle" data-id="${c.id}" title="toggle one-shot / sticky"></span>
        <div class="card-text">${escapeHTML(c.text)}</div>
        <span class="card-type tag-${c.type}" data-act="toggle" data-id="${c.id}" title="toggle one-shot / sticky">${tagLabel}</span>
      </div>
      ${tagPillsHTML(c)}
      <div class="card-actions">
        ${move}
        <button class="act" data-act="edit" data-id="${c.id}" title="edit">✎</button>
        <button class="act" data-act="delete" data-id="${c.id}" title="delete">✕</button>
      </div>
    </div>`;
}

function sortByOrder<T extends { order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.order - b.order);
}

function folderHTML(folder: Folder, cards: Card[], totalInFolder: number): string {
  const caret = folder.collapsed ? '▸' : '▾';
  const collapsedCls = folder.collapsed ? ' is-collapsed' : '';
  const isInbox = folder.id === 'inbox';
  const renameLabel = isInbox
    ? ''
    : `<button class="folder-act" data-act="rename-folder" data-id="${folder.id}" title="rename">✎</button>`;
  const deleteLabel = isInbox
    ? ''
    : `<button class="folder-act" data-act="delete-folder" data-id="${folder.id}" title="delete (cards return to inbox)">✕</button>`;
  const filtered = state.filters.tags.size > 0 || state.filters.query
    ? ` (${cards.length} of ${totalInFolder})`
    : ` (${totalInFolder})`;
  const body = folder.collapsed
    ? ''
    : `<div class="folder-body" data-folder="${folder.id}">${cards.map(cardHTML).join('') || '<div class="folder-empty">drop a card here</div>'}</div>`;
  return `
    <div class="folder${collapsedCls}" data-folder-id="${folder.id}">
      <div class="folder-head" data-act="toggle-folder" data-id="${folder.id}">
        <span class="folder-caret">${caret}</span>
        <span class="folder-name">${escapeHTML(folder.name)}</span>
        <span class="folder-count">${filtered}</span>
        <span class="folder-actions">${renameLabel}${deleteLabel}</span>
      </div>
      ${body}
    </div>`;
}

function filterChipsHTML(): string {
  const active = Array.from(state.filters.tags);
  if (active.length === 0 && !state.filters.query) return '';
  const chips = active
    .map(
      (t) =>
        `<span class="filter-chip" data-act="clear-tag" data-tag="${escapeAttr(t)}" title="remove filter"><span>${escapeHTML(t)}</span><span class="filter-chip-x">×</span></span>`,
    )
    .join('');
  const queryChip = state.filters.query
    ? `<span class="filter-chip is-query" data-act="clear-query" title="clear search"><span>"${escapeHTML(state.filters.query)}"</span><span class="filter-chip-x">×</span></span>`
    : '';
  const clearAll = `<button class="filter-clear" data-act="clear-filters">clear all</button>`;
  return `<div class="filter-chips">${chips}${queryChip}${clearAll}</div>`;
}

export function render(freshIds?: ReadonlySet<string>): void {
  const allNext = sortByOrder(state.cards.filter((c) => c.zone === 'next'));
  const allParked = state.cards.filter((c) => c.zone === 'parked');
  const visibleNext = allNext.filter(matchesFilter);
  const visibleParked = allParked.filter(matchesFilter);

  const nextUp = document.getElementById('nextUp');
  const parkedEl = document.getElementById('parked');
  const nextEmpty = document.getElementById('nextEmpty');
  const parkedHint = document.getElementById('parkedHint');
  const parkedCount = document.getElementById('parkedCount');
  const filterChipsEl = document.getElementById('filterChips');

  if (nextUp) nextUp.innerHTML = visibleNext.map(cardHTML).join('');
  if (nextEmpty) nextEmpty.style.display = visibleNext.length ? 'none' : 'block';

  if (parkedEl) {
    const folders = state.folders.length > 0
      ? [...state.folders].sort((a, b) => a.order - b.order)
      : [{ id: 'inbox', name: 'Inbox', order: 0, collapsed: false }];
    const visibleByFolder = new Map<string, Card[]>();
    const totalByFolder = new Map<string, number>();
    for (const f of folders) {
      visibleByFolder.set(f.id, []);
      totalByFolder.set(f.id, 0);
    }
    for (const c of allParked) {
      const fId = visibleByFolder.has(c.folderId) ? c.folderId : 'inbox';
      totalByFolder.set(fId, (totalByFolder.get(fId) ?? 0) + 1);
      if (matchesFilter(c)) {
        visibleByFolder.get(fId)?.push(c);
      }
    }
    for (const [fId, list] of visibleByFolder) {
      visibleByFolder.set(fId, sortByOrder(list));
    }
    parkedEl.innerHTML = folders
      .map((f) => folderHTML(f, visibleByFolder.get(f.id) ?? [], totalByFolder.get(f.id) ?? 0))
      .join('');
  }

  if (parkedHint) parkedHint.style.display = allParked.length === 0 ? 'block' : 'none';

  if (parkedCount) {
    const filtering = state.filters.tags.size > 0 || state.filters.query;
    parkedCount.textContent = filtering
      ? `${visibleParked.length}/${allParked.length}`
      : String(allParked.length);
  }

  const nextCount = document.getElementById('nextCount');
  if (nextCount) {
    nextCount.textContent = String(visibleNext.length);
    nextCount.style.display = visibleNext.length ? 'inline-block' : 'none';
  }

  if (filterChipsEl) filterChipsEl.innerHTML = filterChipsHTML();

  const footerStats = document.getElementById('footerStats');
  if (footerStats) {
    const total = state.cards.length;
    const stickyN = state.cards.filter((c) => c.type === 'sticky').length;
    footerStats.textContent = total === 0
      ? 'empty'
      : `${total} card${total === 1 ? '' : 's'} · ${stickyN} sticky`;
  }

  if (freshIds && freshIds.size > 0) {
    for (const id of freshIds) {
      const el = document.querySelector(`.card[data-id="${id}"]`);
      el?.classList.add('fresh');
    }
  }
}
