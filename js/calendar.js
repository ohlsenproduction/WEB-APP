import { el, escapeHtml, openModal, closeModal, monthLabel, formatDateShort, labelChipHTML } from './ui.js';

const WEEKDAYS_MON_FIRST = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function toISO(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function mondayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

export function renderCalendarWeekdayHeader(container) {
  container.innerHTML = WEEKDAYS_MON_FIRST.map((d) => `<span>${d}</span>`).join('');
}

export function renderCalendarGrid(container, state, actions) {
  const { calendarYear: year, calendarMonth: month, selectedDate, tasks, labels } = state;
  container.innerHTML = '';

  document.getElementById('cal-month-label').textContent = monthLabel(year, month);

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = mondayIndex(firstOfMonth.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const todayStr = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  const tasksByDate = new Map();
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    if (!tasksByDate.has(t.dueDate)) tasksByDate.set(t.dueDate, []);
    tasksByDate.get(t.dueDate).push(t);
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const day = daysInPrevMonth - startOffset + i + 1;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({ iso: toISO(prevYear, prevMonth, day), day, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISO(year, month, day), day, outside: false });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({ iso: toISO(nextYear, nextMonth, nextDay), day: nextDay, outside: true });
    nextDay += 1;
  }

  cells.forEach((cell) => {
    const dayTasks = tasksByDate.get(cell.iso) || [];
    const classes = ['calendar-day'];
    if (cell.outside) classes.push('outside');
    if (cell.iso === todayStr) classes.push('today');
    if (cell.iso === selectedDate) classes.push('selected');

    const dotColors = [];
    if (dayTasks.length > 0) {
      const seen = new Set();
      dayTasks.forEach((t) => {
        const label = labels.find((l) => l.id === t.labelIds[0]);
        const color = label ? label.color : 'var(--color-accent)';
        if (!seen.has(color)) {
          seen.add(color);
          dotColors.push(color);
        }
      });
    }
    const dotsHTML = dotColors.slice(0, 3)
      .map((color) => `<span class="calendar-day-dot" style="background:${color}"></span>`)
      .join('');

    const node = el(`
      <button type="button" class="${classes.join(' ')}">
        <span class="day-num">${cell.day}</span>
        <span class="calendar-day-dots">${dotsHTML}</span>
      </button>
    `);
    node.addEventListener('click', () => actions.selectCalendarDay(cell.iso));
    container.appendChild(node);
  });
}

export function openDayDetailModal(state, actions) {
  const { selectedDate, tasks, labels } = state;
  const dayTasks = tasks.filter((t) => t.dueDate === selectedDate);

  const node = el(`
    <div>
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3>${escapeHtml(formatDateShort(selectedDate))}</h3>
        <button type="button" class="icon-btn" id="day-detail-close" aria-label="Schließen">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ul class="task-list" id="day-detail-list"></ul>
      <button type="button" class="btn btn-secondary btn-block" id="day-detail-add">+ Aufgabe für diesen Tag</button>
    </div>
  `);

  const list = node.querySelector('#day-detail-list');
  if (dayTasks.length === 0) {
    list.appendChild(el('<li style="padding:16px 0;color:var(--color-neutral-500);font-size:13px;text-align:center;">Keine Aufgaben an diesem Tag.</li>'));
  }

  dayTasks.forEach((task) => {
    const taskLabels = task.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean);
    const item = el(`
      <li class="task-item${task.done ? ' done' : ''}">
        <button type="button" class="task-check${task.done ? ' checked' : ''}" aria-label="Erledigt umschalten">${task.done ? '✓' : ''}</button>
        <button type="button" class="task-body">
          <p class="task-title">${escapeHtml(task.title)}</p>
          <div class="task-meta">${taskLabels.map(labelChipHTML).join('')}</div>
        </button>
      </li>
    `);
    item.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      actions.toggleTaskDone(task);
    });
    item.querySelector('.task-body').addEventListener('click', () => {
      closeModal();
      actions.openTaskForm(task);
    });
    list.appendChild(item);
  });

  node.querySelector('#day-detail-close').addEventListener('click', closeModal);
  node.querySelector('#day-detail-add').addEventListener('click', () => {
    closeModal();
    actions.openTaskForm(null, selectedDate);
  });

  openModal(node);
}
