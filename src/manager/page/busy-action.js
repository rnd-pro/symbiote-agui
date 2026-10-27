/**
 * Keep the invoking button busy through the action's complete promise, including
 * its status refresh. Disabled state remains owned by the manager controllers.
 * @param {(event: Event) => unknown} action
 */
export function busyAction(action) {
  return async (/** @type {Event} */ event) => {
    let button = event instanceof SubmitEvent ? event.submitter : event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) { return action(event); }
    if (button.getAttribute('aria-busy') === 'true') { event.preventDefault(); return; }
    button.setAttribute('aria-busy', 'true');
    try {
      return await action(event);
    } finally {
      button.removeAttribute('aria-busy');
    }
  };
}
