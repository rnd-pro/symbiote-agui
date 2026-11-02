let dragType = 'application/x-symbiote-agui-kanban';

export class KanbanInteraction {
  /** @type {{ id: string; element: HTMLElement } | undefined} */
  drag;
  /** @type {HTMLElement | undefined} */
  target;

  /** @param {import('./kanban.js').Kanban} board */
  constructor(board) {
    this.board = board;
    this.handlers = {
      dragstart: this.onStart,
      dragover: this.onOver,
      dragleave: this.onLeave,
      drop: this.onDrop,
      dragend: this.cancel,
      keydown: this.onKey,
    };
    for (let [
      name,
      handler,
    ] of Object.entries(this.handlers)) { board.addEventListener(name, handler); }
  }

  /**
   * @param {Event} event
   * @param {string} selector
   */
  element(event, selector) {
    let element = event.target instanceof Element ? event.target.closest(selector) : null;
    return element instanceof HTMLElement && element.closest('agui-kanban') === this.board ? element : undefined;
  }

  /** @param {Event} event */
  onStart = (event) => {
    let card = this.element(event, '.agui-kanban-card');
    let transfer = /** @type {DragEvent} */ (event).dataTransfer;
    if (!card || this.board.$.unavailable || !transfer) { event.preventDefault(); return; }
    let id = card.dataset.recordId;
    if (!id) { event.preventDefault(); return; }
    this.cancel();
    this.drag = {
      id,
      element: card,
    };
    transfer.effectAllowed = 'move';
    transfer.setData(dragType, id);
    card.setAttribute('data-dragging', '');
    card.focus();
  };

  /** @param {Event} event */
  destination(event) {
    let column = this.element(event, '.agui-kanban-column');
    let status = column?.dataset.status;
    return column && status && this.board.model?.state.columns.some((item) => item.value === status && !item.disabled) ? column : undefined;
  }

  /** @param {Event} event */
  onOver = (event) => {
    if (!this.drag || this.board.$.unavailable) { return; }
    let column = this.destination(event);
    this.target?.removeAttribute('data-drop-target');
    this.target = column;
    let transfer = /** @type {DragEvent} */ (event).dataTransfer;
    if (transfer) { transfer.dropEffect = column ? 'move' : 'none'; }
    if (!column) { return; }
    event.preventDefault();
    column.setAttribute('data-drop-target', '');
  };

  /** @param {Event} event */
  onLeave = (event) => {
    if (!this.target) { return; }
    if (this.element(event, '.agui-kanban-column') !== this.target) { return; }
    let related = /** @type {DragEvent} */ (event).relatedTarget;
    if (related instanceof Node && this.target.contains(related)) { return; }
    this.target.removeAttribute('data-drop-target');
    this.target = undefined;
  };

  /** @param {Event} event */
  onDrop = (event) => {
    let drag = this.drag;
    let column = this.destination(event);
    let transfer = /** @type {DragEvent} */ (event).dataTransfer;
    let status = column?.dataset.status;
    let valid = drag && drag.element.isConnected && !this.board.$.unavailable && status && transfer?.getData(dragType) === drag.id;
    this.cancel();
    if (!valid || !drag || !status) { return; }
    event.preventDefault();
    this.board.moveItem(drag.id, status);
    this.board.focusItem(drag.id);
  };

  /** @param {Event} event */
  onKey = (event) => {
    let key = /** @type {KeyboardEvent} */ (event);
    if (key.key === 'Escape') { this.cancel(); return; }
    if (!key.altKey || key.ctrlKey || key.metaKey || key.shiftKey || key.key !== 'ArrowLeft' && key.key !== 'ArrowRight') { return; }
    let card = this.element(event, '.agui-kanban-card');
    if (!card || this.board.$.unavailable) { return; }
    event.preventDefault();
    let model = this.board.requireModel();
    let id = card.dataset.recordId;
    let columns = model.state.columns.filter((column) => !column.disabled);
    let row = model.state.value.find((row) => row[model.state.idKey] === id);
    if (!row) { return; }
    let index = columns.findIndex((column) => column.value === row?.[model.state.statusKey]);
    let direction = (key.key === 'ArrowRight' ? 1 : -1) * (getComputedStyle(this.board).direction === 'rtl' ? -1 : 1);
    let next = index < 0 ? direction > 0 ? columns[0] : columns.at(-1) : columns[index + direction];
    if (!next || !id) { return; }
    this.board.moveItem(id, next.value);
    this.board.focusItem(id);
  };

  cancel = () => {
    this.drag?.element.removeAttribute('data-dragging');
    this.target?.removeAttribute('data-drop-target');
    this.drag = undefined;
    this.target = undefined;
  };

  destroy() {
    this.cancel();
    for (let [
      name,
      handler,
    ] of Object.entries(this.handlers)) { this.board.removeEventListener(name, handler); }
  }
}
