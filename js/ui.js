const overlay = document.getElementById('modal-overlay');
const container = document.getElementById('modal-container');

let lastFocusedElement = null;

export function openModal(node) {
  lastFocusedElement = document.activeElement;
  container.innerHTML = '';
  container.appendChild(node);
  overlay.classList.remove('hidden');
}

export function closeModal() {
  overlay.classList.add('hidden');
  container.innerHTML = '';
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

overlay.addEventListener('click', (event) => {
  if (event.target === overlay) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
});

export function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_SHORT[date.getDay()]}, ${d}. ${MONTH_NAMES[m - 1].slice(0, 3)}`;
}

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function confirmAction({ title, message, confirmLabel = 'Löschen', danger = true }) {
  return new Promise((resolve) => {
    const node = el(`
      <div>
        <h2 class="dialog-title">${escapeHtml(title)}</h2>
        <p style="color:var(--color-neutral-400);font-size:14px;">${escapeHtml(message)}</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `);
    node.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      closeModal();
      resolve(false);
    });
    node.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    openModal(node);
  });
}

export function labelChipHTML(label) {
  const bg = `color-mix(in srgb, ${label.color} 28%, var(--color-surface-2))`;
  const fg = `color-mix(in srgb, ${label.color} 75%, white)`;
  return `<span class="tag" style="background:${bg};color:${fg}">${escapeHtml(label.name)}</span>`;
}
