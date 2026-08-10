import { el, escapeHtml, closeModal, openModal } from './ui.js';

export const PRESET_COLORS = [
  '#9184d9', '#7fc9bd', '#d9c374', '#d98fae', '#9bb37d',
];

export function renderLabelsView(container, state, actions) {
  const { labels } = state;
  container.innerHTML = '';

  document.getElementById('label-empty').classList.toggle('hidden', labels.length > 0);

  labels
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .forEach((label) => {
      const item = el(`
        <li class="label-item">
          <span class="label-dot" style="background:${label.color}"></span>
          <span class="label-name">${escapeHtml(label.name)}</span>
          <button type="button" class="btn btn-ghost" data-action="edit" style="font-size:12px;">Bearbeiten</button>
          <button type="button" class="btn btn-ghost" data-action="delete" style="font-size:12px;color:var(--color-neutral-500);">Löschen</button>
        </li>
      `);
      item.querySelector('[data-action="edit"]').addEventListener('click', () => actions.openLabelForm(label));
      item.querySelector('[data-action="delete"]').addEventListener('click', () => actions.deleteLabel(label));
      container.appendChild(item);
    });
}

export function openLabelFormModal(existingLabel, existingLabels, onSave) {
  let selectedColor = existingLabel ? existingLabel.color : PRESET_COLORS[0];

  const node = el(`
    <div>
      <h2 class="dialog-title">${existingLabel ? 'Label bearbeiten' : 'Neues Label'}</h2>
      <div class="field">
        <label for="label-name-input">Name</label>
        <input type="text" class="input" id="label-name-input" maxlength="30" value="${existingLabel ? escapeHtml(existingLabel.name) : ''}" placeholder="z. B. Zuhause">
        <p class="field-error hidden" id="label-name-error">Dieser Name wird schon verwendet.</p>
      </div>
      <div class="field">
        <label>Farbe</label>
        <div class="color-picker" id="color-picker"></div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button>
        <button type="button" class="btn btn-primary" data-action="save">Speichern</button>
      </div>
    </div>
  `);

  const picker = node.querySelector('#color-picker');
  PRESET_COLORS.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (color === selectedColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.addEventListener('click', () => {
      selectedColor = color;
      picker.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    picker.appendChild(swatch);
  });

  node.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);

  node.querySelector('#label-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      node.querySelector('[data-action="save"]').click();
    }
  });

  node.querySelector('[data-action="save"]').addEventListener('click', () => {
    const nameInput = node.querySelector('#label-name-input');
    const errorEl = node.querySelector('#label-name-error');
    const name = nameInput.value.trim();
    errorEl.classList.add('hidden');
    if (!name) {
      nameInput.focus();
      return;
    }
    const isDuplicate = existingLabels.some((l) => (
      l.id !== existingLabel?.id && l.name.trim().toLowerCase() === name.toLowerCase()
    ));
    if (isDuplicate) {
      errorEl.classList.remove('hidden');
      nameInput.focus();
      return;
    }
    closeModal();
    onSave({ name, color: selectedColor });
  });

  openModal(node);
}
