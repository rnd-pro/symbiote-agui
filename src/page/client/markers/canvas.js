import { TRAIL_STYLE } from './constants.js';
import { trailFade } from './trails.js';

/**
 * @param {CanvasRenderingContext2D} context
 * @param {({ x: number, y: number } | undefined)[]} points
 */
function path(context, points) {
  context.beginPath();
  let active = false;
  let previous;
  for (let point of points) {
    if (!point) {
      if (previous) { context.lineTo(previous.x, previous.y); }
      active = false;
      previous = undefined;
      continue;
    }
    if (!active) {
      context.moveTo(point.x, point.y);
      context.lineTo(point.x + 0.01, point.y);
      active = true;
    } else if (previous) {
      context.quadraticCurveTo(previous.x, previous.y, (point.x + previous.x) / 2, (point.y + previous.y) / 2);
    }
    previous = point;
  }
  if (previous) { context.lineTo(previous.x, previous.y); }
  context.stroke();
}

export class TrailCanvas {
  version = -1;
  /** @type {import('./geometry.js').MarkerGeometry | undefined} */
  geometry;
  width = 0;
  height = 0;
  scale = 1;
  reduced = false;

  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    // Applying opacity to the complete surface keeps intersections translucent.
    canvas.style.opacity = String(TRAIL_STYLE.opacity);
  }

  /**
   * @param {import('./trails.js').TrailStore} store
   * @param {import('./geometry.js').MarkerGeometry} geometry
   * @param {boolean} reduced
   */
  paint(store, geometry, reduced) {
    let strokes = store.visible();
    let width = window.innerWidth;
    let height = window.innerHeight;
    let scale = Math.min(window.devicePixelRatio || 1, TRAIL_STYLE.deviceScale, Math.sqrt(TRAIL_STYLE.canvasPixels / Math.max(1, width * height)));
    if (width !== this.width || height !== this.height || scale !== this.scale) {
      this.width = width;
      this.height = height;
      this.scale = scale;
      this.canvas.width = Math.max(1, Math.floor(width * scale));
      this.canvas.height = Math.max(1, Math.floor(height * scale));
      this.version = -1;
    }
    let now = store.now();
    let fading = !reduced && strokes.some((stroke) => trailFade(stroke, now) < 1);
    if (this.version === store.version && this.geometry === geometry && this.reduced === reduced && !fading) { return !!strokes.length; }
    this.version = store.version;
    this.geometry = geometry;
    this.reduced = reduced;
    let context = this.canvas.getContext('2d');
    if (!context) { return false; }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    let project = geometry.projector();
    context.lineWidth = TRAIL_STYLE.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let stroke of strokes) {
      context.strokeStyle = stroke.color;
      context.globalAlpha = trailFade(stroke, now, reduced);
      path(context, stroke.points.map(project));
    }
    return !!strokes.length;
  }

  dispose() {
    this.canvas.width = this.canvas.height = 0;
  }
}
