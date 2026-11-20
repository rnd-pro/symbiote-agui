import { ICON_NAMES } from './collection.js';

export let ICON_FONT_FAMILY = 'Material Symbols Outlined';
export let ICON_STYLESHEET_ORIGIN = 'https://fonts.googleapis.com';
export let ICON_FONT_ORIGIN = 'https://fonts.gstatic.com';

let source = new URL('/css2', ICON_STYLESHEET_ORIGIN);
source.searchParams.set('family', `${ICON_FONT_FAMILY}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`);
source.searchParams.set('icon_names', [
  ...new Set(Object.values(ICON_NAMES)),
].sort().join(','));
source.searchParams.set('display', 'block');

export let ICON_FONT_STYLESHEET = source.href;
