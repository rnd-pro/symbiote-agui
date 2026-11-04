import { core } from './core.js';
import { connectorPrivatePath, connectorScope, publicConnectorScope, readConnectorPrivate } from './store.js';
import { getStateRoot } from '../sessions/store.js';
import { readOptional } from '../library/files.js';
import { CONNECTOR_LIMITS } from './constants.js';

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
export async function invalidateConnectorAuthority(sessionId, root = getStateRoot()) {
  let raw = await readOptional(connectorPrivatePath(sessionId, root), CONNECTOR_LIMITS.privateBytes);
  if (!raw) { return; }
  // Transfer callers can target another storage namespace without changing globals.
  let settings = await readConnectorPrivate(sessionId, root);
  let scopes = new Set(Object.keys(settings.accepted ?? {}).map((action) => connectorScope(sessionId, settings, action, root)));
  for (let exposure of settings.exposures ?? []) { scopes.add(publicConnectorScope(sessionId, settings, exposure, root)); }
  if (!scopes.size) { return; }
  for (let grant of (await core.readAuthority(core.defaultStateRoot())).grants) {
    if (!grant.revoked && scopes.has(grant.scope)) { await core.revokeGrant(core.defaultStateRoot(), grant.id); }
  }
}
