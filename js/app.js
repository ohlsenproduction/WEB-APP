import * as db from './db.js';
import { renderTaskList, renderFilterChips, renderSortSeg, openTaskFormModal } from './tasks.js';
import { renderLabelsView, openLabelFormModal } from './labels.js';
import { renderCalendarWeekdayHeader, renderCalendarGrid, openDayDetailModal } from './calendar.js';
import { confirmAction, todayISO } from './ui.js';
import { maybeShowOnboarding } from './onboarding.js';

const state = {
  tasks: [],
  labels: [],
  view: 'list',
  sort: 'date',
  filterLabelId: null,
  searchQuery: '',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDate: null,
};

const dom = {
  header: document.getElementById('header-title'),
  views: {
    list: document.getElementById('view-list'),
    calendar: document.getElementById('view-calendar'),
    labels: document.getElementById('view-labels'),
  },
  navButtons: Array.from(document.querySelectorAll('.nav-btn')),
  fab: document.getElementById('fab-add'),
  sortSeg: document.getElementById('sort-seg'),
  filterChips: document.getElementById('filter-chips'),
  searchInput: document.getElementById('task-search-input'),
  taskList: document.getElementById('task-list'),
  emptyAddBtn: document.getElementById('empty-add-btn'),
  labelList: document.getElementById('label-list'),
  calWeekdays: document.getElementById('cal-weekdays'),
  calGrid: document.getElementById('cal-grid'),
  calPrev: document.getElementById('cal-prev'),
  calNext: document.getElementById('cal-next'),
};

const HEADER_TITLES = { list: 'Aufgaben', calendar: 'Kalender', labels: 'Labels' };

async function loadData() {
  [state.tasks, state.labels] = await Promise.all([
    db.getAll(db.STORES.TASKS),
    db.getAll(db.STORES.LABELS),
  ]);
}

function render() {
  Object.entries(dom.views).forEach(([key, node]) => node.classList.toggle('hidden', key !== state.view));
  dom.navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.view));
  dom.header.textContent = HEADER_TITLES[state.view];

  if (state.view === 'list') {
    renderSortSeg(dom.sortSeg, state, actions);
    renderFilterChips(dom.filterChips, state, actions);
    renderTaskList(dom.taskList, state, actions);
  } else if (state.view === 'calendar') {
    renderCalendarWeekdayHeader(dom.calWeekdays);
    renderCalendarGrid(dom.calGrid, state, actions);
  } else if (state.view === 'labels') {
    renderLabelsView(dom.labelList, state, actions);
  }
}

const actions = {
  openTaskForm(task, presetDate) {
    openTaskFormModal({
      task,
      presetDate,
      labels: state.labels,
      onSave: (data) => saveTask(task, data),
      onDelete: (existingTask) => deleteTask(existingTask),
    });
  },

  async toggleTaskDone(task) {
    const updated = { ...task, done: !task.done, updatedAt: new Date().toISOString() };
    await db.put(db.STORES.TASKS, updated);
    state.tasks = state.tasks.map((t) => (t.id === task.id ? updated : t));
    render();
  },

  setSort(value) {
    state.sort = value;
    render();
  },

  setFilterLabel(labelId) {
    state.filterLabelId = labelId;
    render();
  },

  setSearchQuery(query) {
    state.searchQuery = query;
    render();
  },

  selectCalendarDay(iso) {
    state.selectedDate = iso;
    render();
    openDayDetailModal(state, actions);
  },

  changeCalendarMonth(delta) {
    let month = state.calendarMonth + delta;
    let year = state.calendarYear;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    state.calendarMonth = month;
    state.calendarYear = year;
    render();
  },

  openLabelForm(label) {
    openLabelFormModal(label, state.labels, (data) => saveLabel(label, data));
  },

  async deleteLabel(label) {
    const ok = await confirmAction({
      title: 'Label löschen?',
      message: `"${label.name}" wird von allen Aufgaben entfernt.`,
    });
    if (!ok) return;

    const affected = state.tasks.filter((t) => t.labelIds.includes(label.id));
    await Promise.all(affected.map((t) => {
      const updated = { ...t, labelIds: t.labelIds.filter((id) => id !== label.id) };
      return db.put(db.STORES.TASKS, updated);
    }));
    await db.remove(db.STORES.LABELS, label.id);
    if (state.filterLabelId === label.id) state.filterLabelId = null;
    await loadData();
    render();
  },
};

async function saveTask(existingTask, data) {
  const now = new Date().toISOString();
  const task = existingTask
    ? { ...existingTask, ...data, updatedAt: now }
    : { id: db.createId(), createdAt: now, updatedAt: now, ...data };
  await db.put(db.STORES.TASKS, task);
  await loadData();
  render();
}

async function deleteTask(task) {
  const ok = await confirmAction({
    title: 'Aufgabe löschen?',
    message: `"${task.title}" wird endgültig gelöscht.`,
  });
  if (!ok) return;
  await db.remove(db.STORES.TASKS, task.id);
  await loadData();
  render();
}

async function saveLabel(existingLabel, data) {
  const label = existingLabel ? { ...existingLabel, ...data } : { id: db.createId(), ...data };
  await db.put(db.STORES.LABELS, label);
  await loadData();
  render();
}

function switchView(view) {
  state.view = view;
  render();
}

dom.navButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

dom.fab.addEventListener('click', () => {
  if (state.view === 'list') {
    actions.openTaskForm(null);
  } else if (state.view === 'calendar') {
    actions.openTaskForm(null, state.selectedDate || todayISO());
  } else if (state.view === 'labels') {
    actions.openLabelForm(null);
  }
});

dom.emptyAddBtn.addEventListener('click', () => actions.openTaskForm(null));

dom.sortSeg.addEventListener('change', (e) => {
  if (e.target.name === 'sort') actions.setSort(e.target.value);
});

dom.searchInput.addEventListener('input', (e) => actions.setSearchQuery(e.target.value));

dom.calPrev.addEventListener('click', () => actions.changeCalendarMonth(-1));
dom.calNext.addEventListener('click', () => actions.changeCalendarMonth(1));

async function init() {
  await loadData();
  render();
  maybeShowOnboarding();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }
}

init();
