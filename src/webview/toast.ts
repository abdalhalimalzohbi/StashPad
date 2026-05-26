let toastTimer: number | undefined;

export function showToast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 1400);
}
