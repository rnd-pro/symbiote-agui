import { DICT } from '@symbiotejs/symbiote';
import { UiComponent } from '../../shared/component.js';

export let BUTTON_ATTRIBUTES = Object.freeze([
  'toggle',
  'set',
  'value',
  'loading',
]);

export let RETAINED_ATTRIBUTES = new Set([
  ...BUTTON_ATTRIBUTES,
  DICT.BIND_ATTR,
  DICT.CTX_NAME_ATTR,
  DICT.EL_REF_ATTR,
  DICT.USE_TPL_ATTR,
  'slot',
]);

export class AttributeHost extends UiComponent {
  /** @type {HTMLButtonElement | undefined} */
  control;

  /** @param {string} name */
  attributeTarget(name) {
    return RETAINED_ATTRIBUTES.has(name.toLowerCase()) ? undefined : this.control;
  }

  /** @param {string} name */
  getAttribute(name) {
    return this.attributeTarget(name)?.getAttribute(name) ?? super.getAttribute(name);
  }

  /** @param {string} name */
  hasAttribute(name) {
    return this.attributeTarget(name)?.hasAttribute(name) ?? super.hasAttribute(name);
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setAttribute(name, value) {
    let target = this.attributeTarget(name);
    if (target) { target.setAttribute(name, value); }
    else { super.setAttribute(name, value); }
  }

  /** @param {string} name */
  removeAttribute(name) {
    let target = this.attributeTarget(name);
    if (target) { target.removeAttribute(name); }
    else { super.removeAttribute(name); }
  }

  /**
   * @param {string} name
   * @param {boolean} [force]
   */
  toggleAttribute(name, force) {
    let target = this.attributeTarget(name);
    if (target) { return force === undefined ? target.toggleAttribute(name) : target.toggleAttribute(name, force); }
    return force === undefined ? super.toggleAttribute(name) : super.toggleAttribute(name, force);
  }
}
