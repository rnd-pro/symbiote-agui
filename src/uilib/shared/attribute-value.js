/** @param {unknown} value */
export function attributeValue(value) {
  if (value === 'true') { return true; }
  if (value === 'false') { return false; }
  return value;
}
