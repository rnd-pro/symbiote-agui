/** @param {unknown} input */
function canonical(input) {
  return JSON.stringify(input, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([
        left,
      ], [
        right,
      ]) => left.localeCompare(right)));
    }
    return value;
  });
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
export function sameData(left, right) {
  return canonical(left) === canonical(right);
}
