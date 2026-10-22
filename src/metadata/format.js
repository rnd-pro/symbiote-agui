/** @param {import('../../types/metadata.js').DataEndpoint} endpoint */
function endpointText(endpoint) {
  return `${endpoint.kind}${endpoint.reference ? ` (${endpoint.reference})` : ''}: ${endpoint.description}`;
}

/** @param {import('../../types/metadata.js').DataFlow} flow */
export function dataFlowSummary(flow) {
  return `${flow.description} Source: ${endpointText(flow.initialSource)} Targets: ${flow.targets.map(endpointText).join('; ')}`;
}

/** @param {import('../../types/metadata.js').DataFlow | undefined} flow */
export function formatDataFlow(flow) {
  return flow ? [
    'Data flow', flow.description,
    `Initial source: ${endpointText(flow.initialSource)}`,
    `Bindings: ${flow.bindings.map(({ provider, keys }) => `${provider}: ${keys.join(', ')}`).join('; ')}`,
    'Targets:', ...flow.targets.map((target) => `- ${endpointText(target)}`),
  ].join('\n') : '';
}
