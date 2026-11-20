import { render, PeleError } from 'pele';
import { DIAGRAM_LIMITS } from '../constants.js';
import { diagramSourceIssue } from '../source.js';

/**
 * @param {string} source
 * @param {string} idPrefix
 */
export function diagramSvg(source, idPrefix) {
  let issue = diagramSourceIssue(source);
  if (issue) { throw new Error(issue); }
  let svg;
  try {
    svg = render(source, {
      idPrefix,
      links: false,
      images: false,
      fontFamily: 'sans-serif',
      fontFamilyMono: 'monospace',
      responsive: true,
      limit: DIAGRAM_LIMITS.inputBytes,
      outputLimit: DIAGRAM_LIMITS.outputBytes,
      maxEdges: DIAGRAM_LIMITS.edges,
    }).svg;
  } catch (error) {
    if (error instanceof PeleError) {
      let issues = {
        'unsupported-diagram': 'unsupported',
        syntax: 'invalidSource',
        semantic: 'invalidSource',
        limit: 'limitExceeded',
      };
      throw new Error(issues[error.code]);
    }
    throw new Error('renderFailed');
  }
  if (new TextEncoder().encode(svg).byteLength > DIAGRAM_LIMITS.outputBytes) { throw new Error('outputTooLarge'); }
  return svg;
}
