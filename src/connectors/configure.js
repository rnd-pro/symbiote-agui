import { core } from './core.js';
import { saveConnectorPolicy, saveConnectorPrivate, connectorScope } from './store.js';
import { CommandError } from '../shared/command-error.js';
import { CONNECTOR_ACTION } from './constants.js';

/**
 * @param {import('./session.js').SessionConnectors} service
 * @param {import('../../types/connectors.js').ConnectorRequirement} requirement
 */
async function registryForRequirement(service, requirement) {
  let root = service.settings.routes[requirement.registryId];
  if (!root) {
    let sources = Object.values((await core.readConnections(service.coreRoot)).sources)
      .filter((source) => source.registryId === requirement.registryId);
    let roots = [
      ...new Set(sources.map((source) => source.root)),
    ];
    if (roots.length !== 1) { throw new CommandError('Connect exactly one local registry matching this requirement before use.'); }
    root = roots[0];
  }
  return core.FileRegistry.open(root, service.coreRoot);
}

/**
 * @param {import('./session.js').SessionConnectors} service
 * @param {import('../../types/connectors.js').ConnectorRequirement} requirement
 */
export async function resolveRequirement(service, requirement) {
  let registry = await registryForRequirement(service, requirement);
  let resolved = await registry.show(requirement.address);
  if (resolved.registryId !== requirement.registryId || resolved.script.id !== requirement.scriptId
    || resolved.binding.revision !== requirement.revision || resolved.manifest.effect !== requirement.effect) {
    throw new CommandError('Connector registry identity or pinned revision changed. Review and explicitly update the attachment.');
  }
  return {
    registry,
    resolved,
  };
}

/**
 * @param {import('./session.js').SessionConnectors} service
 * @param {string} action
 */
export async function revokeAction(service, action) {
  let scope = connectorScope(service.sessionId, service.settings, action);
  for (let grant of (await core.readAuthority(service.coreRoot)).grants) {
    if (!grant.revoked && grant.scope === scope) { await core.revokeGrant(service.coreRoot, grant.id); }
  }
  for (let entry of service.pending.values()) { if (entry.action === action) { entry.controller.abort(); } }
}

/**
 * @param {import('./session.js').SessionConnectors} service
 * @param {import('../../types/connectors.js').ConnectorChange} change
 */
export async function configureConnectors(service, change) {
  if (!('action' in change)) { return change.command === 'status' ? inspectConnectors(service) : service.status(); }
  let action = change.action;
  if (!CONNECTOR_ACTION.test(action)) { throw new CommandError('Invalid connector action.'); }
  let requirement = service.policy.actions.find((entry) => entry.name === action);
  if (change.command === 'attach' || change.command === 'update') {
    if (change.command === 'attach' && requirement) { throw new CommandError('This action already exists. Use update to change its pinned revision.'); }
    if (change.command === 'update' && !requirement) { throw new CommandError('Unknown connector action.'); }
    let registry = change.command === 'attach' || change.registry
      ? await core.FileRegistry.open(await core.findRegistry(change.registry, service.coreRoot, change.cwd), service.coreRoot)
      : (await resolveRegistryForUpdate(service, /** @type {import('../../types/connectors.js').ConnectorRequirement} */ (requirement)));
    let resolved = await registry.show(change.command === 'attach' ? change.address : /** @type {import('../../types/connectors.js').ConnectorRequirement} */ (requirement).address);
    let next = {
      name: action,
      registryId: resolved.registryId,
      address: resolved.binding.address,
      scriptId: resolved.script.id,
      revision: resolved.binding.revision,
      effect: resolved.manifest.effect,
    };
    if (requirement && requirement.registryId !== next.registryId) { throw new CommandError('Updating cannot replace registry identity. Detach and attach explicitly.'); }
    if (requirement && JSON.stringify(next) === JSON.stringify(requirement) && service.settings.routes[next.registryId] === registry.root) { return service.status(); }
    if (requirement) { await revokeAction(service, action); }
    service.settings.routes[next.registryId] = registry.root;
    await saveConnectorPrivate(service.sessionId, service.settings);
    let policy = {
      version: /** @type {const} */ (1),
      actions: service.policy.actions.filter((entry) => entry.name !== action).concat(next),
    };
    await saveConnectorPolicy(service.sessionId, policy);
    service.policy = policy;
    return service.status();
  }
  if (!requirement) { throw new CommandError('Unknown connector action.'); }
  if (change.command === 'detach' || change.command === 'revoke') {
    await revokeAction(service, action);
    if (change.command === 'detach') {
      let policy = {
        version: /** @type {const} */ (1),
        actions: service.policy.actions.filter((entry) => entry.name !== action),
      };
      await saveConnectorPolicy(service.sessionId, policy);
      service.policy = policy;
    }
    return service.status();
  }
  let {
    registry,
    resolved,
  } = await resolveRequirement(service, requirement);
  if (change.command === 'grant') {
    if (change.revision !== requirement.revision) { throw new CommandError('Grant revision differs from the attached requirement. Review it again.'); }
    service.settings.routes[requirement.registryId] = registry.root;
    await saveConnectorPrivate(service.sessionId, service.settings);
    let grant = await core.grantCapability(registry, requirement.address, {
      scope: connectorScope(service.sessionId, service.settings, action),
      revision: requirement.revision,
      effect: requirement.effect,
      source: change.source,
      profile: change.profile,
      timeoutMs: change.timeoutMs,
      resultBytes: change.resultBytes,
    });
    return {
      ...service.status(),
      grant,
    };
  }
  let description = await registry.describe(requirement.address);
  let review = {
    requirement,
    description: 'description' in description ? description.description : '',
  };
  return change.command === 'describe' ? review : {
    ...review,
    manifest: resolved.manifest,
    files: resolved.files,
    prepared: resolved.prepared,
    source: (await registry.source(requirement.address, change.command === 'review' ? change.path : undefined)).source,
  };
}

/**
 * @param {import('./session.js').SessionConnectors} service
 * @param {import('../../types/connectors.js').ConnectorRequirement} requirement
 */
async function resolveRegistryForUpdate(service, requirement) {
  let registry = await registryForRequirement(service, requirement);
  let resolved = await registry.show(requirement.address);
  if (resolved.registryId !== requirement.registryId) { throw new CommandError('The connected folder now contains a different registry.'); }
  return registry;
}

/** @param {import('./session.js').SessionConnectors} service */
async function inspectConnectors(service) {
  let grants = service.policy.actions.length ? (await core.readAuthority(service.coreRoot)).grants : [];
  let inspection = [];
  for (let requirement of service.policy.actions) {
    try {
      let {
        registry,
        resolved,
      } = await resolveRequirement(service, requirement);
      let scope = connectorScope(service.sessionId, service.settings, requirement.name);
      inspection.push({
        name: requirement.name,
        resolved: true,
        prepared: resolved.prepared,
        configuredSources: grants.filter((entry) => !entry.revoked && entry.scope === scope
          && entry.registryRoot === registry.root && entry.registryId === requirement.registryId
          && entry.scriptId === requirement.scriptId && entry.revision === requirement.revision).map((entry) => entry.source),
      });
    } catch {
      inspection.push({
        name: requirement.name,
        resolved: false,
        prepared: false,
        configuredSources: [],
        code: 'SOURCE_UNAVAILABLE_OR_STALE',
      });
    }
  }
  return {
    ...service.status(),
    inspection,
  };
}
