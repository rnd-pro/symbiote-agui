/**
 * Keep the invoking button busy through the action's complete promise, including
 * its status refresh. Disabled state remains owned by the manager controllers.
 * @param {(event: Event) => unknown} action
 */
export function busyAction(action) {
  return async (/** @type {Event} */ event) => {
    let target = event instanceof SubmitEvent ? event.submitter : event.currentTarget;
    let button = /** @type {import('../../uilib/controls/button/button.js').Button | null} */ (
      target instanceof Element ? target.closest('agui-button') : null
    );
    if (!button) { return action(event); }
    if (button.$.loading) { event.preventDefault(); return; }
    button.$.loading = true;
    try {
      return await action(event);
    } finally {
      button.$.loading = false;
    }
  };
}
