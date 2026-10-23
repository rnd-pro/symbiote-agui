import * as L from 'leaflet';
import { sameData } from '../../../shared/data/equal.js';
import { MAP_LIMITS } from '../constants.js';

/**
 * @param {HTMLElement} container
 * @param {{ select: (id: string) => void; view: (view: import('../../../../../../../types/uilib-map.js').UiMapView) => void; tileError: (failed: boolean) => void }} callbacks
 * @returns {import('../../../../../../../types/uilib-map.js').UiMapRenderer}
 */
export function createMapRenderer(container, callbacks) {
  let animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    zoomAnimation: animate,
    fadeAnimation: false,
    markerZoomAnimation: animate,
    inertia: false,
    minZoom: 0,
    maxZoom: MAP_LIMITS.zoom,
  });
  let applying = false;
  /** @type {import('../../../../../../../types/uilib-map.js').UiMapModel | undefined} */
  let current;
  /** @type {import('../../../../../../../types/uilib-map.js').UiMapView | undefined} */
  let appliedView;
  /** @type {import('../../../../../../../types/uilib-map.js').UiMapTiles | null | undefined} */
  let tiles;
  /** @type {L.TileLayer | undefined} */
  let layer;
  /** @type {Map<string, L.Marker>} */
  let markers = new Map();
  let view = () => {
    let center = map.getCenter();
    if (Math.abs(center.lng) > 180) { center = center.wrap(); }
    return {
      center: /** @type {[number, number]} */ ([
        Math.max(-MAP_LIMITS.latitude, Math.min(MAP_LIMITS.latitude, center.lat)),
        center.lng,
      ]),
      zoom: map.getZoom(),
    };
  };
  map.on('moveend', () => {
    if (applying || !current) { return; }
    callbacks.view(view());
  });
  return {
    view,
    zoom(amount) {
      map.setZoom(map.getZoom() + amount);
    },
    render(model, unavailable) {
      current = model;
      applying = true;
      try {
        let size = map.getSize();
        if (size.x !== container.clientWidth || size.y !== container.clientHeight) {
          map.invalidateSize({
            pan: false,
            animate: false,
          });
        }
        if (!sameData(tiles, model.state.tiles)) {
          layer?.off();
          layer?.remove();
          tiles = model.state.tiles ? structuredClone(model.state.tiles) : null;
          callbacks.tileError(false);
          if (tiles) {
            layer = L.tileLayer(tiles.url, {
              minNativeZoom: tiles.minZoom ?? 0,
              maxNativeZoom: tiles.maxZoom ?? 19,
              minZoom: 0,
              maxZoom: MAP_LIMITS.zoom,
              noWrap: true,
              keepBuffer: 0,
              updateWhenIdle: true,
              referrerPolicy: 'origin',
            });
            layer.on('loading', () => callbacks.tileError(false));
            layer.on('tileerror', () => callbacks.tileError(true));
            layer.addTo(map);
          } else { layer = undefined; }
        }
        if (!sameData(appliedView, model.state.view)) {
          map.setView(model.state.view.center, model.state.view.zoom, {
            animate: false,
          });
          appliedView = structuredClone(model.state.view);
        }
        for (let handler of [
          map.dragging,
          map.touchZoom,
          map.doubleClickZoom,
          map.scrollWheelZoom,
          map.boxZoom,
          map.keyboard,
        ]) {
          if (unavailable) { handler.disable(); } else { handler.enable(); }
        }
        container.tabIndex = unavailable ? -1 : 0;
        let ids = new Set(model.points.map((point) => point.id));
        for (let [
          id,
          marker,
        ] of markers) {
          if (!ids.has(id)) { marker.off(); marker.remove(); markers.delete(id); }
        }
        for (let point of model.points) {
          let marker = markers.get(point.id);
          if (!marker) {
            marker = L.marker([
              point.latitude,
              point.longitude,
            ], {
              title: point.label,
              alt: point.label,
              icon: L.divIcon({
                className: 'agui-map-marker',
                html: '',
                iconSize: [
                  32,
                  32,
                ],
                iconAnchor: [
                  16,
                  16,
                ],
              }),
            }).addTo(map);
            marker.bindPopup(document.createElement('div'), {
              closeButton: false,
              autoPan: false,
            });
            marker.on('click', () => callbacks.select(point.id));
            markers.set(point.id, marker);
          }
          marker.setLatLng([
            point.latitude,
            point.longitude,
          ]);
          let text = document.createElement('div');
          text.textContent = point.label;
          marker.setPopupContent(text);
          let element = marker.getElement();
          if (element) {
            element.title = point.label;
            element.setAttribute('aria-label', point.label);
            element.setAttribute('aria-pressed', String(model.selected.includes(point.id)));
            element.setAttribute('data-record-id', point.id);
            element.setAttribute('aria-disabled', String(unavailable || model.state.selection === 'none'));
            element.tabIndex = unavailable ? -1 : 0;
          }
        }
      } finally { applying = false; }
    },
    fitView() {
      if (!current?.points.length) { return; }
      let bounds = L.latLngBounds(current.points.map((point) => [
        point.latitude,
        point.longitude,
      ]));
      let center = bounds.getCenter();
      return {
        center: [
          center.lat,
          center.lng,
        ],
        zoom: Math.max(0, Math.min(16, map.getBoundsZoom(bounds, false, L.point(48, 48)))),
      };
    },
    visibleIds() {
      let bounds = map.getBounds();
      return current?.points.filter((point) => bounds.contains([
        point.latitude,
        point.longitude,
      ])).map((point) => point.id) ?? [];
    },
    dispose() {
      layer?.off();
      for (let marker of markers.values()) { marker.off(); }
      markers.clear();
      map.off();
      map.remove();
    },
  };
}
