/**
 * Runs inside the session page through Puppeteer.
 * @param {string} html
 * @returns {string[]}
 */
export function collectClassNames(html) {
  let template = document.createElement('template');
  template.innerHTML = html;
  /** @type {Set<string>} */
  let candidates = new Set();

  /** @param {DocumentFragment} fragment */
  function collect(fragment) {
    for (let element of fragment.querySelectorAll('[class]')) {
      for (let name of element.classList) {
        candidates.add(name);
      }
    }
    for (let nested of fragment.querySelectorAll('template')) {
      collect(nested.content);
    }
  }

  collect(template.content);
  return [...candidates];
}

/**
 * Runs inside the session page through Puppeteer.
 * @param {import('../../types/markup.js').MarkupUpdate} update
 */
export async function applyMarkup(update) {
  let current = new URL(location.href);
  current.hash = '';

  if (current.href !== update.pageUrl) {
    throw new Error('The session page navigated away. Stop and start the session again.');
  }

  let root = document.getElementById(update.contentRootId);
  let previous = document.getElementById(update.stylesheetId);

  if (!root || root.parentElement !== document.body || !(previous instanceof HTMLLinkElement) || previous.parentElement !== document.head) {
    throw new Error('The AGUI page shell is missing. Stop and start the session again.');
  }

  let template = document.createElement('template');
  template.innerHTML = update.html;
  let next = document.createElement('link');
  next.rel = 'stylesheet';
  next.href = update.stylesheetUrl;

  try {
    await new Promise((resolve, reject) => {
      let timer = window.setTimeout(() => reject(new Error('Timed out loading generated styles.')), update.stylesheetTimeout);
      next.onload = () => {
        clearTimeout(timer);
        resolve(undefined);
      };
      next.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Could not load generated styles.'));
      };
      document.head.append(next);
    });

    if (!root.isConnected || !previous.isConnected) {
      throw new Error('The AGUI page shell changed during insertion.');
    }

    root.replaceChildren(template.content);
    previous.remove();
    next.id = update.stylesheetId;
  } catch (error) {
    next.remove();
    throw error;
  } finally {
    next.onload = null;
    next.onerror = null;
  }
}
