import { fileURLToPath } from 'node:url';

export default {
  '/': fileURLToPath(new URL('./index.html.js', import.meta.url)),
};
