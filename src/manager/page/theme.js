import { THEME_PALETTES } from '../../uilib/controls/theme-selector/palettes.js';

/**
 * @template {string} T
 * @param {'theme' | 'palette'} name
 * @param {T} fallback
 * @param {(value: unknown) => T} normalize
 */
function createPreference(name, fallback, normalize) {
  let storageKey = `agui-manager-${name}`;
  let preference = fallback;
  try { preference = normalize(localStorage.getItem(storageKey)); } catch { /* Retain the default when storage is unavailable. */ }
  document.body.dataset[name] = preference;
  return {
    read: () => preference,
    /** @param {unknown} value */
    write(value) {
      preference = normalize(value);
      document.body.dataset[name] = preference;
      try {
        if (preference === fallback) { localStorage.removeItem(storageKey); }
        else { localStorage.setItem(storageKey, preference); }
      } catch { /* The selection still applies to this page. */ }
    },
    /** @param {(value: T) => void} changed */
    watch(changed) {
      let listener = (/** @type {StorageEvent} */ event) => {
        if (event.key !== storageKey && event.key !== null) { return; }
        preference = normalize(event.newValue);
        document.body.dataset[name] = preference;
        changed(preference);
      };
      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    },
  };
}

/**
 * @param {unknown} value
 * @returns {import('../../../types/manager.js').ManagerTheme}
 */
function normalizeTheme(value) {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** @param {unknown} value */
function normalizePalette(value) {
  return typeof value === 'string' && THEME_PALETTES.includes(value) ? value : 'graphite';
}

let theme = createPreference('theme', 'system', normalizeTheme);
let palette = createPreference('palette', 'graphite', normalizePalette);

export let getTheme = theme.read;
export let setTheme = theme.write;
export let watchTheme = theme.watch;
export let getPalette = palette.read;
export let setPalette = palette.write;
export let watchPalette = palette.watch;
