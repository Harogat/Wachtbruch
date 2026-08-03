const DEFAULT_STORAGE_KEY = 'wachtbruch-developer-mode-v1';

function readInitialState(storageKey, queryParameter) {
  const requested = new URLSearchParams(window.location.search).get(queryParameter);
  if (requested === '1') return true;
  if (requested === '0') return false;
  try {
    return window.sessionStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function persistState(storageKey, enabled) {
  try {
    window.sessionStorage.setItem(storageKey, String(enabled));
  } catch {
    // Developer mode still works when session storage is unavailable.
  }
}

export function createDeveloperModeController({
  toggleButton,
  controlledElements = [],
  storageKey = DEFAULT_STORAGE_KEY,
  queryParameter = 'dev',
  onChange = () => {}
} = {}) {
  if (!toggleButton) throw new Error('Der Dev-Schalter fehlt.');
  const elements = [...controlledElements].filter(Boolean);
  let enabled = readInitialState(storageKey, queryParameter);

  function syncView() {
    elements.forEach((element) => {
      element.hidden = !enabled;
    });
    toggleButton.setAttribute('aria-pressed', String(enabled));
    toggleButton.setAttribute('aria-label', enabled
      ? 'Entwicklerwerkzeuge schliessen'
      : 'Entwicklerwerkzeuge oeffnen');
    toggleButton.dataset.tip = enabled ? 'Dev-Werkzeuge schliessen' : 'Dev-Werkzeuge';
  }

  function setEnabled(nextEnabled, { persist = true, notify = true } = {}) {
    const changed = enabled !== Boolean(nextEnabled);
    enabled = Boolean(nextEnabled);
    if (persist) persistState(storageKey, enabled);
    syncView();
    if (notify && changed) onChange(enabled);
  }

  function toggle() {
    setEnabled(!enabled);
  }

  toggleButton.addEventListener('click', toggle);
  syncView();

  return Object.freeze({
    get enabled() {
      return enabled;
    },
    setEnabled,
    toggle
  });
}
