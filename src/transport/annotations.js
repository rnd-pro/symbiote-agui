import { ANNOTATION_LIMITS } from './constants.js';

let fields = {
  cursor: [
    'point',
  ],
  stroke: [
    'phase',
    'points',
  ],
  sync: [],
};

/**
 * @param {unknown} value
 * @returns {value is import('../../types/transport.js').AnnotationPoint}
 */
function validPoint(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { return false; }
  let point = /** @type {Record<string, unknown>} */ (value);
  return Object.keys(point).length === 3 && Object.keys(point).every((key) => [
    'anchor',
    'x',
    'y',
  ].includes(key)) && typeof point.anchor === 'string'
    && /^[a-zA-Z0-9_-]{1,64}$/.test(point.anchor)
    && typeof point.x === 'number' && Number.isFinite(point.x) && point.x >= 0 && point.x <= 1
    && typeof point.y === 'number' && Number.isFinite(point.y) && point.y >= 0 && point.y <= 1;
}

/**
 * @param {unknown} value
 * @param {number} bytes
 * @returns {import('../../types/transport.js').AnnotationPageMessage}
 */
export function validateAnnotation(value, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > ANNOTATION_LIMITS.messageBytes
    || !value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid annotation packet.');
  }
  let packet = /** @type {Record<string, unknown>} */ (value);
  if (packet.type !== 'annotation' || typeof packet.action !== 'string' || !Object.hasOwn(fields, packet.action)
    || !Number.isSafeInteger(packet.revision) || Number(packet.revision) < 0
    || !Number.isSafeInteger(packet.sequence) || Number(packet.sequence) < 1) {
    throw new Error('Invalid annotation header.');
  }
  let allowed = [
    'type',
    'revision',
    'sequence',
    'action',
    ...fields[/** @type {keyof typeof fields} */ (packet.action)],
  ];
  if (Object.keys(packet).length !== allowed.length || Object.keys(packet).some((key) => !allowed.includes(key))) {
    throw new Error('Unsupported annotation properties.');
  }
  if (packet.action === 'cursor' && packet.point !== null && !validPoint(packet.point)) {
    throw new Error('Invalid annotation position.');
  }
  if (packet.action === 'stroke') {
    if (typeof packet.phase !== 'string' || ![
      'start',
      'append',
      'end',
    ].includes(packet.phase) || !Array.isArray(packet.points)
      || packet.points.length > ANNOTATION_LIMITS.pointsPerMessage
      || (!packet.points.length && packet.phase !== 'end') || !packet.points.every(validPoint)) {
      throw new Error('Invalid annotation stroke.');
    }
  }
  return /** @type {import('../../types/transport.js').AnnotationPageMessage} */ (value);
}
