/**
 * @template T
 * @param {Promise<T>} operation
 * @param {number} milliseconds
 * @param {string} message
 * @returns {Promise<T>}
 */
export async function withTimeout(operation, milliseconds, message) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;

  try {
    return await Promise.race([
      operation,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
