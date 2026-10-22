/** @returns {import('../../types/metadata.js').SessionMetadata} */
export function sampleMetadata() {
  return { dataFlow: {
    description: 'Edit fictional inventory records.',
    initialSource: { kind: 'json-file', reference: 'sample-inventory.json', description: 'Manually imported inventory.' },
    bindings: [{ provider: 'INVENTORY', keys: ['records'] }],
    targets: [
      { kind: 'agui-cache', description: 'Local committed snapshot.' },
      { kind: 'database', reference: 'demo.inventory', description: 'Agent-verified inventory updates.' },
    ],
  } };
}
