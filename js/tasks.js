import { el, escapeHtml, closeModal, openModal, formatDateShort, labelChipHTML, todayISO } from './ui.js';

function isOverdue(task) {
  return Boolean(task.dueDate) && !task.done && task.dueDate < todayISO();
}

export function sortTasks(tasks, sortMode, labels) {
  const labelName = (id) => (labels.find((l) => l.id === id)?.name ?? '￿');
  const copy = tasks.slice();

  switch (sortMode) {
    case 'label':
      copy.sort((a, b) => {
        const an = labelName(a.labelIds[0]);
        const bn = labelName(b.labelIds[0]);
        return an.localeCompare(bn, 'de') || a.title.localeCompare(b.title, 'de');
      });
      break;
    case 'status':
      copy.sort((a, b) => (a.done === b.done ? cmpDate(a, b) : a.done ? 1 : -1));
      break;
    case 'alpha':
      copy.sort((a, b) => a.title.localeCompare(b.title, 'de'));
      break;
    case 'date':
    default:
      copy.sort(cmpDate);
      break;
  }
  return copy;
}

function cmpDate(a, b) {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

export function filterTasks(tasks, filterLabelId) {
  if (!filterLabelId) return tasks;
  return tasks.filter((t) => t.labelIds.includes(filterLabelId));
}

export function renderSortSeg(container, state, actions) {
  container.querySelectorAll('.seg-opt').forEach((opt) => {
    const input = opt.querySelector('input');
    const active = input.value === state.sort;
    opt.classList.toggle('active', active);
    input.checked = active;
  });
}

export function renderFilterChips(container, state, actions) {
  container.innerHTML = '';
  if (state.labels.length === 0) return;

  const allChip = el(`<button type="button" class="filter-chip${state.filterLabelId ? '' : ' active'}" aria-pressed="${state.filterLabelId ? 'false' : 'true'}">Alle</button>`);
  allChip.addEventListener('click', () => actions.setFilterLabel(null));
  container.appendChild(allChip);

  state.labels.forEach((label) => {
    const active = state.filterLabelId === label.id;
    const chip = el(`<button type="button" class="filter-chip${active ? ' active' : ''}" aria-pressed="${active ? 'true' : 'false'}" style="${active ? `border-color:${label.color};color:${label.color}` : ''}">${escapeHtml(label.name)}</button>`);
    chip.addEventListener('click', () => actions.setFilterLabel(label.id));
    container.appendChild(chip);
  });
}

export function renderTaskList(container, state, actions) {
  const filtered = filterTasks(state.tasks, state.filterLabelId);
  const sorted = sortTasks(filtered, state.sort, state.labels);

  container.innerHTML = '';
  document.getElementById('task-empty').classList.toggle('hidden', sorted.length > 0);

  sorted.forEach((task) => {
    const labels = task.labelIds.map((id) => state.labels.find((l) => l.id === id)).filter(Boolean);
    const item = el(`
      <li class="task-item${task.done ? ' done' : ''}">
        <button type="button" class="task-check${task.done ? ' checked' : ''}" aria-label="Erledigt umschalten">${task.done ? '✓' : ''}</button>
        <button type="button" class="task-body">
          <p class="task-title">${escapeHtml(task.title)}</p>
          ${task.notes ? `<p class="task-notes-preview">${escapeHtml(task.notes)}</p>` : ''}
          <div class="task-meta">
            ${task.dueDate ? `<span class="task-date${isOverdue(task) ? ' overdue' : ''}">${formatDateShort(task.dueDate)}</span>` : ''}
            ${labels.map(labelChipHTML).join('')}
          </div>
        </button>
      </li>
    `);
    item.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      actions.toggleTaskDone(task);
    });
    item.querySelector('.task-body').addEventListener('click', () => actions.openTaskForm(task));
    container.appendChild(item);
  });
}

export function openTaskFormModal({ task, presetDate, labels, onSave, onDelete }) {
  const selectedLabelIds = new Set(task ? task.labelIds : []);
  let done = task ? task.done : false;

  const node = el(`
    <div>
      <h2 class="dialog-title">${task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
      <div class="field">
        <label for="task-title-input">Titel</label>
        <input type="text" class="input" id="task-title-input" maxlength="120" value="${task ? escapeHtml(task.title) : ''}" placeholder="Was ist zu tun?">
      </div>
      <div class="field">
        <label for="task-notes-input">Notizen</label>
        <textarea class="input" id="task-notes-input" placeholder="Notizen...">${task ? escapeHtml(task.notes || '') : ''}</textarea>
      </div>
      <div class="field">
        <label for="task-date-input">Fälligkeitsdatum</label>
        <input type="date" class="input" id="task-date-input" value="${task ? (task.dueDate || '') : (presetDate || '')}">
      </div>
      <div class="field">
        <label>Labels</label>
        <div class="label-picker" id="task-label-picker">
          ${labels.length === 0 ? '<span style="color:var(--color-neutral-500);font-size:13px;">Noch keine Labels angelegt (Tab "Labels")</span>' : ''}
        </div>
      </div>
      <div class="toggle-row">
        <button type="button" class="toggle${done ? ' on' : ''}" id="task-done-toggle" aria-label="Als erledigt markieren"><span class="knob"></span></button>
        <span style="font-size:13px;opacity:0.8">Als erledigt markieren</span>
      </div>
      <div class="dialog-actions">
        ${task ? '<button type="button" class="btn btn-ghost" style="color:var(--color-neutral-400)" data-action="delete">Löschen</button>' : '<span></span>'}
        <div class="dialog-actions-right">
          <button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button>
          <button type="button" class="btn btn-primary" data-action="save">Speichern</button>
        </div>
      </div>
    </div>
  `);

  const picker = node.querySelector('#task-label-picker');
  labels.forEach((label) => {
    const active = selectedLabelIds.has(label.id);
    const chip = el(`<button type="button" class="tag ${active ? '' : 'tag-outline'}" style="${active ? `background:color-mix(in srgb, ${label.color} 30%, var(--color-surface-2));color:${label.color};border:1px solid ${label.color}` : `color:${label.color};border-color:${label.color}`}">${escapeHtml(label.name)}</button>`);
    chip.addEventListener('click', () => {
      if (selectedLabelIds.has(label.id)) {
        selectedLabelIds.delete(label.id);
      } else {
        selectedLabelIds.add(label.id);
      }
      const nowActive = selectedLabelIds.has(label.id);
      chip.className = `tag ${nowActive ? '' : 'tag-outline'}`;
      chip.style.cssText = nowActive
        ? `background:color-mix(in srgb, ${label.color} 30%, var(--color-surface-2));color:${label.color};border:1px solid ${label.color}`
        : `color:${label.color};border-color:${label.color}`;
    });
    picker.appendChild(chip);
  });

  node.querySelector('#task-done-toggle').addEventListener('click', (e) => {
    done = !done;
    e.currentTarget.classList.toggle('on', done);
  });

  node.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
  if (task) {
    node.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(task));
  }

  node.querySelector('[data-action="save"]').addEventListener('click', () => {
    const titleInput = node.querySelector('#task-title-input');
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    const dueDate = node.querySelector('#task-date-input').value || null;
    const notes = node.querySelector('#task-notes-input').value.trim();
    closeModal();
    onSave({
      title,
      dueDate,
      notes,
      done,
      labelIds: Array.from(selectedLabelIds),
    });
  });

  openModal(node);
  node.querySelector('#task-title-input').focus();
}
