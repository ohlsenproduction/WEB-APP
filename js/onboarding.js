import { el, openModal, closeModal } from './ui.js';

const STORAGE_KEY = 'onboarding-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function maybeShowOnboarding() {
  if (isStandalone()) return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  openOnboardingModal();
}

export function openOnboardingModal() {
  const node = el(`
    <div class="onboarding">
      <div class="onboarding-icon">
        <svg width="30" height="30" viewBox="0 0 30 30"><path d="M6 16l7 7 11-14" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <h2>Installiere die App</h2>
        <p>Für Vollbildmodus und Offline-Nutzung zum Home-Bildschirm hinzufügen.</p>
      </div>
      <div class="onboarding-steps">
        <div class="onboarding-step">
          <span class="onboarding-step-num">1</span>
          <span>Teilen-Symbol in Safari antippen</span>
        </div>
        <div class="onboarding-step">
          <span class="onboarding-step-num">2</span>
          <span>„Zum Home-Bildschirm" auswählen</span>
        </div>
        <div class="onboarding-step">
          <span class="onboarding-step-num">3</span>
          <span>Mit „Hinzufügen" bestätigen</span>
        </div>
      </div>
      <div class="onboarding-actions">
        <button type="button" class="btn btn-primary btn-block" data-action="ok">Verstanden</button>
        <button type="button" class="btn btn-ghost" style="color:var(--color-neutral-500);align-self:center" data-action="later">Später</button>
      </div>
    </div>
  `);

  node.querySelector('[data-action="ok"]').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    closeModal();
  });
  node.querySelector('[data-action="later"]').addEventListener('click', closeModal);

  openModal(node);
}
