import './styles.css';
import type { Card, Folder } from '../state/types';
import type { HostToWebview } from '../messaging/protocol';
import { post } from './api';
import { state } from './state';
import { render } from './render';
import { bindEvents } from './events';
import { showToast } from './toast';

const FLASH_DURATION_MS = 900;

let initialized = false;

function applyState(payload: { cards: Card[]; folders: Folder[]; projectTag: string }): void {
  const previousIds = new Set(state.cards.map((c) => c.id));
  state.cards = payload.cards;
  state.folders = payload.folders;
  state.projectTag = payload.projectTag;
  const freshIds = !initialized
    ? undefined
    : new Set(payload.cards.filter((c) => !previousIds.has(c.id)).map((c) => c.id));
  initialized = true;
  render(freshIds);
  bindEvents();
}

function handleInjectResult(payload: { id: string; ok: boolean; reason?: string }): void {
  if (!payload.ok) {
    if (payload.reason === 'no-terminal') {
      showToast('open a terminal first');
    }
    return;
  }
  const card = state.cards.find((c) => c.id === payload.id);
  const cardEl = document.querySelector<HTMLElement>(`.card[data-id="${payload.id}"]`);
  if (card?.type === 'consumable' && cardEl) {
    cardEl.classList.add('consuming');
    showToast('landed');
  } else if (card?.type === 'sticky') {
    showToast('landed (sticky stays)');
  } else {
    showToast('landed');
  }
}

function flashCard(id: string): void {
  const el = document.querySelector<HTMLElement>(`.card[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('fresh', 'flashed');
  setTimeout(() => el.classList.remove('flashed'), FLASH_DURATION_MS);
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function isTypingTarget(el: Element | null): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

window.addEventListener('message', (e: MessageEvent<HostToWebview>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'state':
      applyState(msg.payload);
      return;
    case 'inject-result':
      handleInjectResult(msg.payload);
      return;
    case 'focus-capture':
      (document.getElementById('captureInput') as HTMLInputElement | null)?.focus();
      return;
    case 'flash-card':
      flashCard(msg.payload.id);
      return;
  }
});

const captureInput = document.getElementById('captureInput') as HTMLInputElement | null;
captureInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = captureInput.value.trim();
    if (!text) return;
    post({ type: 'create', payload: { text } });
    captureInput.value = '';
  }
});

const newFolderBtn = document.getElementById('newFolderBtn');
newFolderBtn?.setAttribute('data-act', 'new-folder');

document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(document.activeElement)) return;
  e.preventDefault();
  (document.getElementById('searchInput') as HTMLInputElement | null)?.focus();
});

post({ type: 'ready' });
