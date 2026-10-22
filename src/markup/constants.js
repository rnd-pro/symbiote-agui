import { DATA_CONTEXT } from '../data/constants.js';
import { FEEDBACK_CONTEXT } from '../feedback/constants.js';
import { SESSION_CONTEXT } from '../transport/constants.js';

export let PAGE_TEXT_CONTEXT = 'AGUI_TEXT';
export let RESERVED_PROVIDER_NAMES = Object.freeze([DATA_CONTEXT, FEEDBACK_CONTEXT, SESSION_CONTEXT, PAGE_TEXT_CONTEXT]);

export let MAX_HTML_BYTES = 1024 * 1024;
export let INSERT_TIMEOUT_MS = 20_000;
export let STYLESHEET_TIMEOUT_MS = 5_000;
export let STYLESHEET_PATH = '/styles.css.js';
export let CLIENT_SCRIPT_PATH = '/client/index.js';
export let CONTENT_ROOT_ID = 'agui-content';
export let STYLESHEET_ID = 'agui-styles';
export let COMPONENT_TAG = 'agui-component';
export let PROVIDER_TAG = 'context-provider';
export let DATA_SELECTOR = ':scope > script[type="text/json"], :scope > script[type="application/json"]';
