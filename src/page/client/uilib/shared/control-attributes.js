/**
 * @param {import('./component.js').UiComponent} component
 * @param {string} name
 * @param {(value: string | null) => void} handler
 */
export function watchAttribute(component, name, handler) {
  let property = `@${name}`;
  if (!component.has(property)) { component.add(property, component.getAttribute(name)); }
  component.initAttributeObserver();
  component.sub(property, (value) => handler(value == null ? null : String(value)));
}

/**
 * @param {import('./component.js').UiComponent} component
 * @param {import('../../../../../types/uilib.js').UiControl} control
 * @param {readonly string[]} attributes
 */
export function bindControlAttributes(component, control, attributes) {
  for (let name of attributes) {
    watchAttribute(component, name, (value) => {
      if (value === null) { control.removeAttribute(name); }
      else { control.setAttribute(name, value); }
    });
  }
}
