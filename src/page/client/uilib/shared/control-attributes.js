/**
 * @param {import('./component.js').UiComponent} component
 * @param {import('../../../../../types/uilib.js').UiControl} control
 * @param {readonly string[]} attributes
 */
export function bindControlAttributes(component, control, attributes) {
  for (let name of attributes) {
    component.sub(`attribute-${name}`, () => {
      let value = component.getAttribute(name);
      if (value === null) { control.removeAttribute(name); }
      else { control.setAttribute(name, value); }
    });
  }
}
