import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveExplorer } from '../../src/uilib/widgets/explorer/model.js';
import { sessionExplorerItems } from '../../src/manager/page/explorer-items.js';

test('explorer hierarchy preserves sibling order and hidden selections while rejecting broken parents and cycles', () => {
  let items = [
    {
      id: 'group',
      label: 'Group',
      branch: true,
    },
    {
      id: 'file',
      parentId: 'group',
      label: 'File',
    },
  ];
  assert.deepEqual(deriveExplorer(items, []).filter((row) => row.visible).map((row) => row.id), [
    'group',
  ]);
  assert.deepEqual(deriveExplorer(items, [
    'group',
  ]).map((row) => row.depth), [
    0,
    1,
  ]);
  for (let broken of [
    [
      items[0],
      items[0],
    ],
    [
      {
        id: 'a',
        label: 'A',
        parentId: 'missing',
      },
    ],
    [
      {
        id: 'a',
        label: 'A',
        parentId: 'a',
        branch: true,
      },
    ],
    [
      {
        id: 'a',
        label: 'A',
        parentId: 'b',
        branch: true,
      },
      {
        id: 'b',
        label: 'B',
        parentId: 'a',
        branch: true,
      },
    ],
  ]) { assert.throws(() => deriveExplorer(broken, []), /invalidRows/); }
});

test('manager explorer starts with session groups and keeps only their public artifacts under each root', () => {
  /** @type {Map<string, import('../../src/manager/page/explorer.js').DirectoryNode>} */
  let directories = new Map([
    [
      '',
      {
        path: '',
        loaded: true,
        loading: false,
        error: '',
        nextOffset: undefined,
        entries: [
          {
            name: 'desk.assets',
            path: 'desk.assets',
            kind: 'directory',
          },
          {
            name: 'desk.html',
            path: 'desk.html',
            kind: 'file',
          },
          {
            name: 'desk.md',
            path: 'desk.md',
            kind: 'file',
          },
          {
            name: 'desk.proxy.json',
            path: 'desk.proxy.json',
            kind: 'file',
          },
          {
            name: 'notes.json',
            path: 'notes.json',
            kind: 'file',
          },
          {
            name: 'shared',
            path: 'shared',
            kind: 'directory',
          },
          {
            name: 'README.md',
            path: 'README.md',
            kind: 'file',
          },
        ],
      },
    ],
  ]);
  let items = sessionExplorerItems(directories, (path) => path);
  assert.deepEqual(items.filter((node) => !node.parentId).map((node) => node.label), [
    'desk',
  ]);
  assert.deepEqual(items.filter((node) => node.parentId).map((node) => node.path), [
    'desk.assets',
    'desk.html',
    'desk.md',
    'desk.proxy.json',
  ]);
  assert.equal(items[1].loaded, false);
});
