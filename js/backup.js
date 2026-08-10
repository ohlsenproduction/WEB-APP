import { el, closeModal, openModal, confirmAction } from './ui.js';
import * as db from './db.js';

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isValidBackup(data) {
  return data && Array.isArray(data.tasks) && Array.isArray(data.labels);
}

export function openBackupModal(state, onImported) {
  const node = el(`
    <div>
      <h2 class="dialog-title">Daten sichern</h2>
      <p style="color:var(--color-neutral-400);font-size:13px;margin:0 0 16px;">Sichere alle Aufgaben und Labels als Datei, oder stelle eine vorherige Sicherung wieder her.</p>
      <button type="button" class="btn btn-primary btn-block" id="backup-export-btn" style="margin-bottom:10px;">Exportieren</button>
      <button type="button" class="btn btn-secondary btn-block" id="backup-import-btn">Importieren</button>
      <input type="file" accept="application/json" id="backup-file-input" style="display:none">
      <p class="field-error hidden" id="backup-error"></p>
      <div class="dialog-actions" style="margin-top:16px;">
        <span></span>
        <div class="dialog-actions-right">
          <button type="button" class="btn btn-secondary" data-action="cancel">Schließen</button>
        </div>
      </div>
      <p style="color:var(--color-neutral-600);font-size:11px;text-align:center;margin:14px 0 0;">Version ${window.APP_VERSION || '?'}</p>
    </div>
  `);

  node.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);

  node.querySelector('#backup-export-btn').addEventListener('click', () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJSON({ tasks: state.tasks, labels: state.labels }, `aufgaben-backup-${stamp}.json`);
  });

  const fileInput = node.querySelector('#backup-file-input');
  const errorEl = node.querySelector('#backup-error');
  node.querySelector('#backup-import-btn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    errorEl.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        errorEl.textContent = 'Diese Datei ist keine gültige Sicherung.';
        errorEl.classList.remove('hidden');
        return;
      }
      if (!isValidBackup(data)) {
        errorEl.textContent = 'Diese Datei ist keine gültige Sicherung.';
        errorEl.classList.remove('hidden');
        return;
      }

      const ok = await confirmAction({
        title: 'Sicherung wiederherstellen?',
        message: `Alle aktuellen Aufgaben und Labels werden durch die ${data.tasks.length} Aufgabe(n) und ${data.labels.length} Label(s) aus der Datei ersetzt.`,
        confirmLabel: 'Wiederherstellen',
      });
      if (!ok) return;

      await db.clear(db.STORES.TASKS);
      await db.clear(db.STORES.LABELS);
      await Promise.all([
        ...data.labels.map((l) => db.put(db.STORES.LABELS, l)),
        ...data.tasks.map((t) => db.put(db.STORES.TASKS, t)),
      ]);
      onImported();
    };
    reader.readAsText(file);
  });

  openModal(node);
}
