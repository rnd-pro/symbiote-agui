export let MAX_ACTION_VALUE_CHARS = 2048;

export let CONTROL_ATTRIBUTES = Object.freeze([
  'name',
  'autocomplete',
  'form',
  'aria-label',
  'aria-labelledby',
]);

export let FIELD_ATTRIBUTES = Object.freeze([
  'placeholder',
  'min',
  'max',
  'step',
  'minlength',
  'maxlength',
  'pattern',
  'size',
  'rows',
  'cols',
  'wrap',
  'inputmode',
  'enterkeyhint',
  'spellcheck',
  'autocapitalize',
]);

export let CONTROL_ATTRIBUTE_BINDINGS = Object.freeze(Object.fromEntries([
  ...CONTROL_ATTRIBUTES,
  'aria-describedby',
  'required-mark',
  'label',
  'hint',
  'error',
  'disabled',
  'readonly',
  'required',
  'value',
].map((name) => [name, `attribute-${name}`])));

export let FIELD_INPUT_TYPES = Object.freeze([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'number',
  'date',
  'checkbox',
  'radio',
]);
