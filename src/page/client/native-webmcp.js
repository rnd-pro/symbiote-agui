/** @type {WeakSet<object>} */
let guarded = new WeakSet();

/**
 * Symbiote 3.8.3 expects synchronous native registration. Chrome can instead
 * return a promise that rejects when a superseded registration is aborted.
 * Observe that promise without changing the native result for callers.
 * @param {object | undefined} context
 * @param {(error: unknown) => void} [report]
 */
export function guardNativeRegistrations(context, report = (error) => console.error(error)) {
  if (!context || guarded.has(context)) { return; }
  let register = Reflect.get(context, 'registerTool');
  if (typeof register !== 'function') { return; }
  /**
   * @this {unknown}
   * @param {unknown[]} args
   */
  function registerTool(...args) {
    let result = Reflect.apply(register, this, args);
    if (result && typeof result.then === 'function') {
      let options = /** @type {{ signal?: AbortSignal } | undefined} */ (args[1]);
      void Promise.resolve(result).catch((error) => {
        if (options?.signal?.aborted && error?.name === 'AbortError') { return; }
        report(error);
      });
    }
    return result;
  }
  if (Reflect.set(context, 'registerTool', registerTool)) { guarded.add(context); }
}
