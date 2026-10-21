let storageKey = 'agui-manager-theme';

/**
 * @param {unknown} value
 * @returns {import('../../../types/manager.js').ManagerTheme}
 */
function normalizeTheme(value) {
  return value === 'light' || value === 'dark' ? value : 'system';
}

let preference = normalizeTheme(null);
try { preference = normalizeTheme(localStorage.getItem(storageKey)); } catch { /* Use the system theme when storage is unavailable. */ }
document.documentElement.dataset.theme = preference;

export function getTheme() { return preference; }

/** @param {string} value */
export function setTheme(value) {
  preference = normalizeTheme(value);
  document.documentElement.dataset.theme = preference;
  try {
    if (preference === 'system') { localStorage.removeItem(storageKey); }
    else { localStorage.setItem(storageKey, preference); }
  } catch { /* The selection still applies to this page. */ }
}

/** @param {(theme: import('../../../types/manager.js').ManagerTheme) => void} changed */
export function watchTheme(changed) {
  let listener = (/** @type {StorageEvent} */ event) => {
    if (event.key !== storageKey && event.key !== null) { return; }
    preference = normalizeTheme(event.newValue);
    document.documentElement.dataset.theme = preference;
    changed(preference);
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
