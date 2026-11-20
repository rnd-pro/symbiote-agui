let depth = 0;

export function feedbackSuppressed() { return depth > 0; }

/**
 * @template T
 * @param {() => T} task
 * @returns {T}
 */
export function withoutFeedback(task) {
  depth += 1;
  let deferred = false;
  try {
    let result = task();
    if (result instanceof Promise) {
      deferred = true;
      return /** @type {T} */ (result.finally(() => { depth -= 1; }));
    }
    return result;
  } finally {
    if (!deferred) { depth -= 1; }
  }
}
