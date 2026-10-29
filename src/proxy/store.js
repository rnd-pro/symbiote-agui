import { definitionPaths, assertPortableName } from '../library/paths.js';
import { prepareTextFile, readOptional, storageError } from '../library/files.js';
import { PROXY_LIMITS } from './constants.js';
import { emptyProxyPolicy, validateProxyPolicy, validateProxyChange } from './policy.js';
import { CommandError } from '../shared/command-error.js';

/** @param {string} sessionId */
export async function readProxySnapshot(sessionId) {
  let path = definitionPaths(sessionId).proxyPath;
  let raw = await readOptional(path, PROXY_LIMITS.policyBytes);
  try {
    let policy = validateProxyPolicy(raw === undefined ? emptyProxyPolicy() : JSON.parse(raw));
    return {
      raw,
      policy,
    };
  } catch { throw storageError(path, new Error('Invalid proxy policy. Correct the saved policy before continuing.')); }
}

/**
 * Called under the existing session lock by a stopped-session service or worker.
 * @param {string} sessionId
 * @param {import('../../types/proxy.js').ProxyChange} change
 */
export async function changeProxyPolicy(sessionId, change) {
  change = validateProxyChange(change);
  await assertPortableName(sessionId);
  let paths = definitionPaths(sessionId);
  if (await readOptional(paths.htmlPath) === undefined) { throw new CommandError(`No saved AGUI named ${sessionId}. Use save or insert first.`); }
  let snapshot = await readProxySnapshot(sessionId);
  let origins = new Set(snapshot.policy.allowedOrigins);
  if (change.command === 'allow') { origins.add(change.origin); }
  else { origins.delete(change.origin); }
  let policy = validateProxyPolicy({
    version: 1,
    allowedOrigins: [
      ...origins,
    ],
  });
  let raw = `${JSON.stringify(policy, null, 2)}\n`;
  let pending = await prepareTextFile(paths.proxyPath, raw, {
    text: snapshot.raw,
    maxBytes: PROXY_LIMITS.policyBytes,
  });
  try { await pending.commit(); }
  finally { await pending.discard(); }
  return {
    raw,
    policy,
  };
}
