import { css } from '@symbiotejs/symbiote';
import { codeTheme } from './code-theme.js';

export default css`
  @layer components {
    agui-markdown {
      display: block;
      min-inline-size: 0;
    }
    .agui-markdown-content {
      min-inline-size: 0;
      overflow-wrap: anywhere;
      line-height: 1.7;
    }
    .agui-markdown-content > * + * {
      margin-block-start: 1rem;
    }
    .agui-markdown-content :is(h1, h2, h3, h4, h5, h6) {
      font-weight: 400;
      line-height: 1.3;
      scroll-margin-block-start: 5rem;
    }
    .agui-markdown-content h1 {
      font-size: 1.75rem;
    }
    .agui-markdown-content h2 {
      font-size: 1.5rem;
    }
    .agui-markdown-content h3 {
      font-size: 1.25rem;
    }
    .agui-markdown-content :is(h4, h5, h6) {
      font-size: 1rem;
    }
    .agui-markdown-content :is(ul, ol) {
      padding-inline-start: 1.5rem;
    }
    .agui-markdown-content ul {
      list-style: disc;
    }
    .agui-markdown-content ol {
      list-style: decimal;
    }
    .agui-markdown-content li + li,
    .agui-markdown-content li > :is(ul, ol, p) {
      margin-block-start: .375rem;
    }
    .agui-markdown-content input[type="checkbox"] {
      margin-inline-end: .5rem;
      vertical-align: middle;
      accent-color: var(--agui-accent);
    }
    .agui-markdown-content blockquote {
      border-inline-start: 3px solid var(--agui-accent);
      padding-inline-start: 1rem;
      color: var(--agui-muted);
    }
    .agui-markdown-content code {
      padding: .125rem .375rem;
      border-radius: var(--agui-radius-control);
      background: var(--agui-raised);
      font-family: monospace;
      font-size: .875em;
    }
    .agui-markdown-content pre {
      overflow-x: auto;
      padding: 1rem;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
      background: var(--agui-bg);
      white-space: pre;
    }
    .agui-markdown-content pre code {
      display: block;
      padding: 0;
      background: transparent;
    }
    ${codeTheme}
    .agui-markdown-content pre code .hljs-comment {
      font-style: italic;
      opacity: .7;
    }
    .agui-markdown-content a {
      color: var(--agui-accent);
      text-decoration: underline;
      text-underline-offset: .2em;
    }
    .agui-markdown-content .agui-markdown-table {
      overflow-x: auto;
      border: 1px solid var(--agui-divider);
      border-radius: var(--agui-radius-inset);
    }
    .agui-markdown-content table {
      inline-size: 100%;
      border-collapse: collapse;
      font-size: .875rem;
    }
    .agui-markdown-content :is(th, td) {
      padding: .5rem .75rem;
      border-block-end: 1px solid var(--agui-divider);
      text-align: start;
    }
    .agui-markdown-content th {
      background: var(--agui-raised);
      font-weight: 400;
    }
    .agui-markdown-content hr {
      border: 0;
      border-block-start: 1px solid var(--agui-divider);
    }
  }
`;
