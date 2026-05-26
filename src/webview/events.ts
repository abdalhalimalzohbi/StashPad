import type { Zone } from '../state/types';
import { post } from './api';
import { state } from './state';
import { render } from './render';

const INJECT_PULSE_MS = 220;
const CONSUME_DELAY_MS = 380;
const MAX_EDIT_ROWS = 8;
const MAX_TAG_LENGTH = 24;
const MAX_FOLDER_NAME_LENGTH = 40;

function rebind(): void {
  render();
  bindEvents();
}

function beginInlineEdit(cardEl: HTMLElement, id: string, currentText: string): void {
  if (cardEl.classList.contains('editing')) return;
  const textEl = cardEl.querySelector<HTMLElement>('.card-text');
  if (!textEl) return;

  cardEl.classList.add('editing');
  cardEl.removeAttribute('draggable');

  const ta = document.createElement('textarea');
  ta.className = 'card-edit';
  ta.value = currentText;
  ta.rows = Math.max(1, Math.min(MAX_EDIT_ROWS, currentText.split('\n').length));
  textEl.replaceWith(ta);

  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  let done = false;
  const commit = (): void => {
    if (done) return;
    done = true;
    const next = ta.value.trim();
    if (next && next !== currentText) {
      post({ type: 'update', payload: { id, text: next } });
    } else {
      rebind();
    }
  };
  const cancel = (): void => {
    if (done) return;
    done = true;
    rebind();
  };

  ta.addEventListener('click', (e) => e.stopPropagation());
  ta.addEventListener('mousedown', (e) => e.stopPropagation());
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  ta.addEventListener('blur', commit);
}

function beginAddTag(cardEl: HTMLElement, cardId: string): void {
  const tagsEl = cardEl.querySelector<HTMLElement>('.card-tags');
  if (!tagsEl) return;
  const addBtn = tagsEl.querySelector<HTMLElement>('.tag-pill-add');
  if (!addBtn || addBtn.classList.contains('is-editing')) return;
  addBtn.classList.add('is-editing');

  const input = document.createElement('input');
  input.className = 'tag-input';
  input.type = 'text';
  input.placeholder = 'tag';
  input.maxLength = MAX_TAG_LENGTH;
  addBtn.replaceWith(input);
  input.focus();

  let done = false;
  const commit = (): void => {
    if (done) return;
    done = true;
    const tag = input.value.trim();
    if (tag) {
      post({ type: 'add-tag', payload: { cardId, tag } });
    } else {
      rebind();
    }
  };
  const cancel = (): void => {
    if (done) return;
    done = true;
    rebind();
  };

  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function beginRenameFolder(headEl: HTMLElement, folderId: string): void {
  const nameEl = headEl.querySelector<HTMLElement>('.folder-name');
  if (!nameEl) return;
  const current = nameEl.textContent ?? '';
  const input = document.createElement('input');
  input.className = 'folder-rename';
  input.type = 'text';
  input.value = current;
  input.maxLength = MAX_FOLDER_NAME_LENGTH;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const commit = (): void => {
    if (done) return;
    done = true;
    const name = input.value.trim();
    if (name && name !== current) {
      post({ type: 'rename-folder', payload: { id: folderId, name } });
    } else {
      rebind();
    }
  };
  const cancel = (): void => {
    if (done) return;
    done = true;
    rebind();
  };

  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function beginNewFolder(): void {
  const btn = document.getElementById('newFolderBtn');
  if (!btn || btn.classList.contains('is-editing')) return;
  btn.classList.add('is-editing');
  const input = document.createElement('input');
  input.className = 'new-folder-input';
  input.type = 'text';
  input.placeholder = 'folder name';
  input.maxLength = MAX_FOLDER_NAME_LENGTH;
  btn.replaceWith(input);
  input.focus();

  let done = false;
  const commit = (): void => {
    if (done) return;
    done = true;
    const name = input.value.trim();
    if (name) {
      post({ type: 'create-folder', payload: { name } });
    } else {
      rebind();
    }
  };
  const cancel = (): void => {
    if (done) return;
    done = true;
    rebind();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function toggleTagFilter(tag: string): void {
  if (state.filters.tags.has(tag)) state.filters.tags.delete(tag);
  else state.filters.tags.add(tag);
  rebind();
}

function clearTagFilter(tag: string): void {
  state.filters.tags.delete(tag);
  rebind();
}

function clearAllFilters(): void {
  state.filters.tags.clear();
  state.filters.query = '';
  const search = document.getElementById('searchInput') as HTMLInputElement | null;
  if (search) search.value = '';
  rebind();
}

function bindCardListeners(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach((cardEl) => {
    cardEl.addEventListener('click', (e) => {
      if (cardEl.classList.contains('editing')) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-act]')) return;
      if (target.closest('.card-edit') || target.closest('.card-tags') || target.closest('.tag-input')) return;
      const id = cardEl.dataset.id;
      if (!id) return;
      cardEl.classList.add('injecting');
      window.setTimeout(() => cardEl.classList.remove('injecting'), INJECT_PULSE_MS);
      post({ type: 'inject', payload: { id } });
    });

    cardEl.addEventListener('dragstart', (e) => {
      cardEl.classList.add('dragging');
      const id = cardEl.dataset.id ?? '';
      const card = state.cards.find((c) => c.id === id);
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', card?.text ?? '');
        e.dataTransfer.setData('application/x-stashpad-card-id', id);
        e.dataTransfer.effectAllowed = 'copyMove';
      }
    });

    cardEl.addEventListener('dragend', (e) => {
      cardEl.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.dropEffect !== 'none') return;
      const outside =
        e.clientX < 0 ||
        e.clientY < 0 ||
        e.clientX > window.innerWidth ||
        e.clientY > window.innerHeight;
      if (!outside) return;
      const id = cardEl.dataset.id;
      if (id) post({ type: 'inject', payload: { id } });
    });

    cardEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const draggingEl = document.querySelector<HTMLElement>('.card.dragging');
      if (!draggingEl || draggingEl === cardEl) return;
      if (draggingEl.parentElement !== cardEl.parentElement) return;
      const rect = cardEl.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const parent = cardEl.parentElement;
      if (!parent) return;
      if (e.clientY < midpoint) {
        parent.insertBefore(draggingEl, cardEl);
      } else {
        parent.insertBefore(draggingEl, cardEl.nextSibling);
      }
    });

    cardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      handleCardDrop();
    });
  });
}

function bindFolderDropTargets(): void {
  document.querySelectorAll<HTMLElement>('.folder-body, .folder-empty').forEach((target) => {
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => {
      target.classList.remove('drag-over');
    });
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      target.classList.remove('drag-over');
      const draggingEl = document.querySelector<HTMLElement>('.card.dragging');
      if (!draggingEl) return;
      const cardId = draggingEl.dataset.id ?? '';
      const folderBody = target.classList.contains('folder-body')
        ? target
        : target.closest<HTMLElement>('.folder');
      const newFolderId = folderBody?.dataset.folder ?? folderBody?.dataset.folderId;
      const currentFolderId = draggingEl.dataset.folder;
      if (!cardId || !newFolderId) return;
      if (newFolderId === currentFolderId) {
        handleCardDrop();
      } else {
        post({ type: 'move-folder', payload: { cardId, folderId: newFolderId } });
      }
    });
  });
}

function handleCardDrop(): void {
  const draggingEl = document.querySelector<HTMLElement>('.card.dragging');
  if (!draggingEl) return;
  const zoneEl = draggingEl.parentElement;
  if (!zoneEl) return;
  if (!zoneEl.classList.contains('cards') && !zoneEl.classList.contains('folder-body')) return;
  const zone: Zone = zoneEl.id === 'nextUp' ? 'next' : 'parked';
  const ids = Array.from(zoneEl.querySelectorAll<HTMLElement>('.card'))
    .map((c) => c.dataset.id ?? '')
    .filter((id) => id.length > 0);
  post({ type: 'reorder', payload: { zone, ids } });
}

function bindActions(): void {
  document.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = el.dataset.act;
      if (!act) return;
      const id = el.dataset.id;
      const tag = el.dataset.tag;
      const card = id ? state.cards.find((c) => c.id === id) : undefined;

      switch (act) {
        case 'toggle': {
          if (!card) return;
          const newType = card.type === 'consumable' ? 'sticky' : 'consumable';
          post({ type: 'update', payload: { id: card.id, type: newType } });
          return;
        }
        case 'promote':
          if (id) post({ type: 'move', payload: { id, zone: 'next' } });
          return;
        case 'demote':
          if (id) post({ type: 'move', payload: { id, zone: 'parked' } });
          return;
        case 'edit': {
          if (!card) return;
          const cardEl = document.querySelector<HTMLElement>(`.card[data-id="${card.id}"]`);
          if (!cardEl) return;
          beginInlineEdit(cardEl, card.id, card.text);
          return;
        }
        case 'delete': {
          if (!id) return;
          const cardEl = document.querySelector<HTMLElement>(`.card[data-id="${id}"]`);
          if (cardEl) {
            cardEl.classList.add('consuming');
            window.setTimeout(() => post({ type: 'delete', payload: { id } }), CONSUME_DELAY_MS);
          } else {
            post({ type: 'delete', payload: { id } });
          }
          return;
        }
        case 'add-tag': {
          if (!id) return;
          const cardEl = document.querySelector<HTMLElement>(`.card[data-id="${id}"]`);
          if (cardEl) beginAddTag(cardEl, id);
          return;
        }
        case 'remove-tag': {
          if (!id || !tag) return;
          post({ type: 'remove-tag', payload: { cardId: id, tag } });
          return;
        }
        case 'filter-tag': {
          if (tag) toggleTagFilter(tag);
          return;
        }
        case 'clear-tag': {
          if (tag) clearTagFilter(tag);
          return;
        }
        case 'clear-query': {
          state.filters.query = '';
          const search = document.getElementById('searchInput') as HTMLInputElement | null;
          if (search) search.value = '';
          rebind();
          return;
        }
        case 'clear-filters':
          clearAllFilters();
          return;
        case 'toggle-folder':
          if (id) post({ type: 'toggle-folder', payload: { id } });
          return;
        case 'rename-folder': {
          if (!id) return;
          const headEl = el.closest<HTMLElement>('.folder-head');
          if (headEl) beginRenameFolder(headEl, id);
          return;
        }
        case 'delete-folder':
          if (id) post({ type: 'delete-folder', payload: { id } });
          return;
        case 'new-folder':
          beginNewFolder();
          return;
      }
    });
  });
}

function bindSearch(): void {
  const search = document.getElementById('searchInput') as HTMLInputElement | null;
  if (!search) return;
  search.value = state.filters.query;
  search.oninput = () => {
    state.filters.query = search.value;
    rebind();
    const refocus = document.getElementById('searchInput') as HTMLInputElement | null;
    if (refocus) {
      refocus.focus();
      refocus.setSelectionRange(refocus.value.length, refocus.value.length);
    }
  };
  search.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      state.filters.query = '';
      search.value = '';
      rebind();
    }
  };
}

export function bindEvents(): void {
  bindCardListeners();
  bindFolderDropTargets();
  bindActions();
  bindSearch();
}
