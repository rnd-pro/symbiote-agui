import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import { UiComponent } from '../../shared/component.js';
import { SIDEBAR_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextSidebarId = 0;

let SIDEBAR_ATTRIBUTES = Object.freeze({
  value: 'collapsed',
  label: 'label',
  expandLabel: 'expand-label',
  collapseLabel: 'collapse-label',
  collapseEmpty: 'collapse-empty',
  disabled: 'disabled',
  readonly: 'readonly',
});

export class Sidebar extends UiComponent {
  /** @type {MediaQueryList | undefined} */
  desktopQuery;
  /** @type {MutationObserver | undefined} */
  contentObserver;

  init$ = {
    value: undefined,
    label: undefined,
    expandLabel: undefined,
    collapseLabel: undefined,
    collapseEmpty: undefined,
    disabled: undefined,
    readonly: undefined,
    expanded: true,
    expandedText: 'true',
    sidebarLabel: '',
    toggleLabel: '',
    unavailable: false,
    contentId: '',
    set_value: new ToolDescriptor({
      description: 'Expand or collapse this sidebar. Returns its value and change flag.',
      inputSchema: {
        type: 'object',
        properties: {
          value: {
            type: 'boolean',
          },
        },
        required: [
          'value',
        ],
        additionalProperties: false,
      },
      execute: ({
        value,
      }) => this.commit(value),
    }),
    read_value: new ToolDescriptor({
      description: 'Read whether this sidebar is expanded.',
      execute: () => ({
        value: this.$.expanded,
      }),
    }),
    toggle: new ToolDescriptor({
      description: 'Toggle this sidebar between expanded and collapsed.',
      execute: () => this.commit(!this.$.expanded),
    }),
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }

  renderCallback() {
    this.desktopQuery = matchMedia('(width >= 64rem)');
    this.desktopQuery.addEventListener('change', this.refreshLayout);
    let semantics = this.attachInternals();
    semantics.role = 'complementary';
    if (!this.hasAttribute('tabindex')) { this.tabIndex = -1; }
    this.$.contentId = `agui-sidebar-content-${++nextSidebarId}`;
    for (let [
      key,
      attribute,
    ] of Object.entries(SIDEBAR_ATTRIBUTES)) {
      let refresh = () => {
        this.refresh();
        semantics.ariaLabel = String(this.$.sidebarLabel);
      };
      this.sub(key, refresh);
      this.sub(`attribute-${attribute}`, refresh);
    }
  }

  refreshLayout = () => this.refresh();

  /**
   * @param {Node} container
   * @returns {boolean}
   */
  hasContent(container) {
    return [...container.childNodes].some((node) => {
      if (node.nodeType === Node.TEXT_NODE) { return !!node.textContent?.trim(); }
      if (!(node instanceof Element) || node.matches('template, script, style')) { return false; }
      let style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') { return false; }
      if (node.matches('input, select, textarea, button, a[href], img, svg, canvas, video, audio, iframe, [contenteditable], [role="progressbar"]')) { return true; }
      return this.hasContent(node);
    });
  }

  refresh() {
    let collapseEmpty = !!(this.$.collapseEmpty ?? this.hasAttribute('collapse-empty'));
    if (collapseEmpty && !this.contentObserver) {
      this.contentObserver = new MutationObserver(() => this.refresh());
      this.contentObserver.observe(this.ref.content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'hidden',
          'class',
          'style',
        ],
      });
    }
    // Ignore the content wrapper's own collapsed visibility when inspecting its children.
    let empty = collapseEmpty && !this.hasContent(this.ref.content);
    let expanded = this.$.value ?? (!this.hasAttribute('collapsed') && !!this.desktopQuery?.matches);
    if (typeof expanded !== 'boolean') { throw new Error('Sidebar value must be a boolean.'); }
    expanded &&= !empty;
    let label = String(this.$.label ?? this.getAttribute('label') ?? '');
    let actionLabel = expanded
      ? this.$.collapseLabel ?? this.getAttribute('collapse-label')
      : this.$.expandLabel ?? this.getAttribute('expand-label');
    let unavailable = empty || !!(this.$.disabled ?? this.hasAttribute('disabled')) || !!(this.$.readonly ?? this.hasAttribute('readonly'));
    if (!expanded && this.ref.content.contains(document.activeElement)) {
      let target = unavailable || this.ref.toggle.matches(':disabled') ? this : this.ref.toggle;
      target.focus({
        preventScroll: true,
      });
    }
    this.set$({
      expanded,
      expandedText: String(expanded),
      sidebarLabel: label,
      toggleLabel: String(actionLabel ?? label),
      unavailable,
    });
    this.dataset.expanded = String(expanded);
  }

  /**
   * @param {unknown} value
   */
  commit(value) {
    if (this.$.unavailable || this.ref.toggle.matches(':disabled')) { throw new Error('This sidebar is disabled or read-only.'); }
    if (typeof value !== 'boolean') { throw new Error('Sidebar value must be a boolean.'); }
    let changed = !Object.is(this.$.expanded, value);
    if (changed) {
      this.$.value = value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target && !Object.is(this.$[target], value)) { this.$[target] = value; }
      this.announce('change', value);
    }
    return {
      value,
      changed,
    };
  }

  destroyCallback() {
    this.contentObserver?.disconnect();
    this.desktopQuery?.removeEventListener('change', this.refreshLayout);
  }
}

Sidebar.bindAttributes(Object.fromEntries(Object.values(SIDEBAR_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Sidebar.template = SIDEBAR_TEMPLATE;
Sidebar.rootStyles = styles;
