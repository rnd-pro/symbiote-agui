import { getDataState } from '../../../page/client/data.js';

/**
 * @param {string | null | undefined} path
 * @returns {import('../../../../types/data.js').DataTarget | undefined}
 */
export function declaredPreferenceTarget(path) {
  let parts = path?.trim().split('/');
  if (parts?.length !== 2) { return; }
  let [
    provider,
    key,
  ] = parts;
  let declaration = getDataState().current?.targets.find((target) => target.provider === provider);
  if (declaration?.keys.includes(key)) {
    return {
      provider,
      keys: [
        key,
      ],
    };
  }
}
