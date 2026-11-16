export let LIST_ATTRIBUTES = Object.freeze({
  label: 'label',
  idKey: 'id-key',
  selection: 'selection',
  itemTemplate: 'item-template',
  disabled: 'disabled',
  readonly: 'readonly',
  loading: 'loading',
  error: 'error',
});

export let LIST_ATTRIBUTE_BINDINGS = Object.fromEntries(Object.values(LIST_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
]));
