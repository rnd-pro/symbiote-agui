import Symbiote from '/manager/vendor/core/index.js';

/** @extends {Symbiote<Record<string, unknown>>} */
export class SessionRow extends Symbiote {
  init$ = {
    sessionId: '', title: '', summary: '', status: '', statusKind: 'unknown', details: '', error: '', tunnel: '',
    url: '', userUrl: '', viewerUrl: '', noLocal: true, noPublic: true,
    startDisabled: true, stopDisabled: true, syncDisabled: true, clearDisabled: true,
    shareDisabled: true, tunnelDisabled: true, describeDisabled: true,
    shareLabel: 'Attach tunnel', shareHint: 'Start this session to attach a public tunnel.',
    start: () => {}, stop: () => {}, sync: () => {}, clear: () => {},
    share: () => {}, check: () => {}, renew: () => {}, describe: () => {},
  };
}

SessionRow.template = `
  <article bind="@data-session: sessionId; @data-state: statusKind">
    <div class="session-heading">
      <div><h3>{{title}}</h3><code>/{{sessionId}}</code></div>
      <span class="badge">{{status}}</span>
    </div>
    <p class="summary">{{summary}}</p>
    <p class="muted">{{details}}</p>
    <p class="muted">{{tunnel}}</p>
    <p class="error">{{error}}</p>
    <div class="links">
      <a target="_blank" rel="noopener noreferrer" bind="href: url; hidden: noLocal">Open local page</a>
      <a target="_blank" rel="noopener noreferrer" bind="href: userUrl; hidden: noPublic">Public user page</a>
      <a target="_blank" rel="noopener noreferrer" bind="href: viewerUrl; hidden: noPublic">Viewer page</a>
    </div>
    <div class="actions">
      <button type="button" class="primary" bind="onclick: start; disabled: startDisabled">Start</button>
      <button type="button" bind="onclick: stop; disabled: stopDisabled">Stop</button>
      <button type="button" bind="onclick: sync; disabled: syncDisabled">Sync</button>
      <button type="button" class="primary" bind="onclick: share; disabled: shareDisabled; title: shareHint">{{shareLabel}}</button>
      <button type="button" bind="onclick: check; disabled: tunnelDisabled">Check tunnel</button>
      <button type="button" bind="onclick: renew; disabled: tunnelDisabled">Renew tunnel</button>
      <button type="button" bind="onclick: describe; disabled: describeDisabled">Description</button>
      <button type="button" class="danger" bind="onclick: clear; disabled: clearDisabled">Clear</button>
    </div>
  </article>
`;
SessionRow.reg('agui-session-row');

/**
 * @param {import('../../../types/manager.js').ManagerSession} row
 * @param {boolean} disabled
 * @param {(operation: import('../../../types/manager.js').ManagerOperation, sessionId: string) => void} act
 */
export function rowState(row, disabled, act) {
  let active = row.active === true;
  let unknown = row.active === null || !row.ok;
  let saved = !!row.definition;
  let tunnel = row.tunnel;
  let health = tunnel?.checkedAt
    ? `${tunnel.active ? 'reachable' : 'inactive'}; checked ${new Date(tunnel.checkedAt).toLocaleTimeString()}${Date.now() - Date.parse(tunnel.checkedAt) > 60_000 ? ' (stale)' : ''}`
    : 'reachability unchecked';
  return {
    sessionId: row.sessionId,
    title: row.definition?.title || row.sessionId,
    summary: row.definition?.summary || (saved ? 'Saved interface' : 'No saved definition'),
    status: unknown ? 'Unknown' : active ? `Running (${row.state})` : 'Stopped',
    statusKind: unknown ? 'unknown' : active ? 'running' : 'stopped',
    details: `${saved ? 'Saved' : 'Unsaved'} | ${row.clients ?? 0} browser connections${row.pid ? ` | PID ${row.pid}` : ''}`,
    error: (!row.ok ? row.error.message : '') || row.definitionError || tunnel?.checkError || tunnel?.error || '',
    tunnel: tunnel ? `Tunnel ${tunnel.state}: ${health}` : active ? 'Local only. Attach a tunnel to get public user and viewer links.' : 'Start this session to attach a public tunnel.',
    url: row.url || '', userUrl: row.publicUserUrl || row.publicUrl || '', viewerUrl: row.publicViewerUrl || '',
    noLocal: !row.url || !active, noPublic: !row.publicUrl || !active,
    startDisabled: disabled || active || unknown,
    stopDisabled: disabled || !active || unknown,
    syncDisabled: disabled || !active || !saved || unknown,
    clearDisabled: disabled || unknown,
    shareDisabled: disabled || !active || unknown || tunnel?.state === 'ready' || tunnel?.state === 'starting',
    shareLabel: tunnel?.state === 'ready' ? 'Tunnel attached' : tunnel?.state === 'starting' ? 'Attaching tunnel...' : tunnel ? 'Retry tunnel' : 'Attach tunnel',
    shareHint: !active ? 'Start this session to attach a public tunnel.' : tunnel?.state === 'ready' ? 'Use the public user or viewer links, or Renew tunnel to replace an inactive link.' : 'Create public user and read-only viewer links without restarting this session.',
    tunnelDisabled: disabled || !active || !tunnel || unknown,
    describeDisabled: disabled || !saved,
    start: () => act('start', row.sessionId), stop: () => act('stop', row.sessionId),
    sync: () => act('sync', row.sessionId), clear: () => act('clear', row.sessionId),
    share: () => act('share', row.sessionId), check: () => act('tunnel check', row.sessionId),
    renew: () => act('tunnel renew', row.sessionId), describe: () => act('describe', row.sessionId),
  };
}
