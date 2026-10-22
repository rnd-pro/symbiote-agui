import { DATA_LIMITS } from '../../../../../data/constants.js';
import { DOWNLOAD_RELEASE_MS, transferError } from './constants.js';

/** @param {string} [value] */
export function fileLabel(value = '') {
  let label = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 120) || '';
  return label;
}

/** @param {File} file */
export async function readJsonFile(file) {
  if (file.size > DATA_LIMITS.bytes) { throw transferError('TOO_LARGE'); }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
  catch { throw transferError('READ_FAILED'); }
}

/**
 * @param {string} text
 * @param {string} name
 * @param {Document} document
 */
export function downloadJson(text, name, document) {
  let url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  let link = document.createElement('a');
  link.href = url;
  link.download = name.toLowerCase().endsWith('.json') ? name : `${name}.json`;
  link.hidden = true;
  try { document.body.append(link); link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_RELEASE_MS);
  }
  return link.download;
}
