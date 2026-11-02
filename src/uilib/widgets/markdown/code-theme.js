// Adapt the jsda-template theme generator's hue progression to AGUI colors.
let tokens = [
  'string',
  'comment',
  'attr',
  'attribute',
  'function',
  'variable',
  'title',
  'property',
  'selector-class',
  'keyword',
  'tag',
  'name',
  'number',
  'params',
  'literal',
  'type',
  'built_in',
  'meta',
  'regexp',
  'symbol',
];

export let codeTheme = tokens.map((token, index) => `
  .agui-markdown-content pre code .hljs-${token} {
    color: var(--agui-code-${token}, light-dark(hsl(${index * 150}deg 85% 34%), hsl(${index * 150}deg 85% 74%)));
  }
`).join('\n');
