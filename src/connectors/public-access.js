import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { CommandError } from '../shared/command-error.js';
import { object } from '../feedback/validate-shape.js';
import { CONNECTOR_PUBLIC_LIMITS } from './constants.js';
import { core } from './core.js';
import { publicConnectorScope, saveConnectorPrivate } from './store.js';
import { resolveRequirement } from './configure.js';

/** @param {string} token */
function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }

export class PublicConnectorAccess {
  /** @type {Map<string, { start: number; count: number }>} */
  rates = new Map();

  /** @param {import('./session.js').SessionConnectors} service */
  constructor(service) { this.service = service; }

  /**
   * @param {string} id
   * @param {string} action
   */
  get(id, action) {
    let entry = this.service.settings.exposures?.find((entry) => entry.id === id && entry.action === action);
    if (this.service.closing || !entry || entry.expiresAt <= Date.now()
      || this.service.policy.actions.find((item) => item.name === action)?.revision !== entry.revision) {
      throw new CommandError('Public capability is unavailable.');
    }
    return entry;
  }

  /**
   * @param {string} token
   * @param {string} action
   * @param {string} origin
   */
  authenticate(token, action, origin) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { throw new CommandError('Invalid capability.'); }
    let digest = Buffer.from(tokenHash(token), 'hex');
    let entry = this.service.settings.exposures?.find((entry) => timingSafeEqual(digest, Buffer.from(entry.tokenHash, 'hex')));
    if (!entry || entry.origin !== origin) { throw new CommandError('Invalid capability.'); }
    return this.get(entry.id, action);
  }

  /**
   * @param {string} id
   * @param {string} action
   * @param {unknown} [input]
   * @param {boolean} [call]
   */
  admit(id, action, input, call = false) {
    let entry = this.get(id, action);
    // One worker owns a session. Count across sockets, including reconnects and reads.
    for (let key of this.rates.keys()) {
      if (!this.service.settings.exposures?.some((entry) => entry.id === key)) { this.rates.delete(key); }
    }
    let window = this.rates.get(id);
    if (!window || Date.now() - window.start >= 60000) {
      window = {
        start: Date.now(),
        count: 0,
      };
      this.rates.set(id, window);
    }
    if (++window.count > entry.requestsPerMinute) { throw new CommandError('Public connector rate limit exceeded.'); }
    if (call) {
      object(input);
      for (let [
        key,
        expected,
      ] of Object.entries(entry.resources)) {
        if (!Object.hasOwn(input, key) || input[key] !== expected) { throw new CommandError('Input is outside the public resource scope.'); }
      }
    }
    return entry;
  }

  /**
   * @param {import('../../types/connectors.js').ConnectorRequirement} requirement
   * @param {import('../../types/connectors.js').ConnectorExposureOptions} policy
   */
  async expose(requirement, policy) {
    if (policy.revision !== requirement.revision) { throw new CommandError('Review the exact attached revision before exposing it.'); }
    let exposures = this.service.settings.exposures ?? [];
    if (exposures.length >= CONNECTOR_PUBLIC_LIMITS.capabilities) { throw new CommandError('Revoke old public capabilities before adding more.'); }
    let {
      registry,
      resolved,
    } = await resolveRequirement(this.service, requirement);
    // Freeze the same reviewed resolution used by local grants and invocation.
    let pinned = /** @type {import('../../types/connectors.js').CoreRegistry} */ (Object.create(registry));
    pinned.show = async () => structuredClone(resolved);
    let token = randomBytes(32).toString('base64url');
    let entry = {
      id: randomUUID(),
      action: requirement.name,
      actor: policy.actor,
      origin: policy.origin,
      revision: policy.revision,
      resources: structuredClone(policy.resources),
      expiresAt: Date.now() + policy.expiresInSeconds * 1000,
      requestsPerMinute: policy.requestsPerMinute,
      tokenHash: tokenHash(token),
    };
    let grant = await core.grantCapability(pinned, requirement.address, {
      scope: publicConnectorScope(this.service.sessionId, this.service.settings, entry),
      revision: requirement.revision,
      effect: requirement.effect,
      source: 'agui',
      profile: policy.profile,
      timeoutMs: Math.min(policy.timeoutMs ?? 300000, policy.expiresInSeconds * 1000),
      resultBytes: policy.resultBytes,
    });
    this.service.settings.exposures = exposures.concat(entry);
    try { await saveConnectorPrivate(this.service.sessionId, this.service.settings); }
    catch (error) {
      this.service.settings.exposures = exposures;
      await core.revokeGrant(this.service.coreRoot, grant.id);
      throw error;
    }
    return {
      id: entry.id,
      action: entry.action,
      actor: entry.actor,
      expiresAt: entry.expiresAt,
      token,
    };
  }

  /** @param {string} action */
  async revoke(action) {
    let scopes = new Set((this.service.settings.exposures ?? []).filter((entry) => entry.action === action)
      .map((entry) => publicConnectorScope(this.service.sessionId, this.service.settings, entry)));
    // Remove admission first; a failed disk/core save must not leave live access.
    this.service.settings.exposures = this.service.settings.exposures?.filter((entry) => entry.action !== action) ?? [];
    for (let entry of this.service.pending.values()) {
      if (entry.action === action && entry.exposureId) { entry.controller.abort(); }
    }
    // Attempt both durable boundaries even if one fails. Admission stays removed
    // in this worker; an operator can retry revoke after a storage failure.
    let results = await Promise.allSettled([
      saveConnectorPrivate(this.service.sessionId, this.service.settings),
      (async () => {
        for (let grant of (await core.readAuthority(this.service.coreRoot)).grants) {
          if (!grant.revoked && scopes.has(grant.scope)) { await core.revokeGrant(this.service.coreRoot, grant.id); }
        }
      })(),
    ]);
    for (let result of results) { if (result.status === 'rejected') { throw result.reason; } }
  }
}
