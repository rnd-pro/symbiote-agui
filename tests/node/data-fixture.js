import { randomUUID } from 'node:crypto';

export let dataHtml = '<context-provider id="editor" ctx="APP" persist="records"><script type="application/json">{"records":[],"theme":"system"}</script><template id="row"><p>{{name}}</p></template></context-provider><script type="module" data-agui>export default () => {};</script>';

/**
 * @param {import('../../types/data.js').DataStatus} status
 * @param {import('../../types/data.js').DataChange['values']} [values]
 * @returns {import('../../types/data.js').DataCommit}
 */
export function dataCommit(status, values = { records: [{ name: 'Example record' }] }) {
  return { commitId: randomUUID(), instanceId: status.instanceId, markupRevision: status.markupRevision,
    baseRevision: status.revision, changes: [{ provider: 'APP', values }] };
}
