/**
 * @param {import('./component.js').UiComponent} component
 * @param {import('../../../types/uilib.js').UiControl} control
 * @param {readonly string[]} attributes
 */
export function bindControlAttributes(component, control, attributes) {
  for (let name of attributes) {
    component.sub(`attribute-${name}`, () => {
      copyAttribute(component, control, name);
    });
  }
}

/**
 * @param {HTMLElement} source
 * @param {HTMLElement} control
 * @param {string} name
 */
function copyAttribute(source, control, name) {
  let value = Element.prototype.getAttribute.call(source, name);
  if (value === null) { control.removeAttribute(name); }
  else { control.setAttribute(name, value); }
}

/**
 * Transfer native attributes without leaving duplicate IDs, focus targets, or styles.
 * The wrapper routes later attribute API calls to its control.
 *
 * @param {HTMLElement} source
 * @param {HTMLElement} control
 * @param {ReadonlySet<string>} retained
 */
export function transferControlAttributes(source, control, retained) {
  let observer = new MutationObserver((records) => {
    transfer(new Set(records.map((record) => record.attributeName).filter((name) => name !== null)));
  });
  /** @param {Iterable<string>} names */
  let transfer = (names) => {
    observer.disconnect();
    for (let name of names) {
      if (retained.has(name)) { continue; }
      copyAttribute(source, control, name);
      Element.prototype.removeAttribute.call(source, name);
    }
    observer.observe(source, {
      attributes: true,
    });
  };
  transfer(source.getAttributeNames());
  return observer;
}
