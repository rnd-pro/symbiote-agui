import type { UiDataRecord, UiDataSelection } from './uilib-data.js';
import type { UiTexts } from './uilib.js';

export interface UiMapView {
  center: [number, number];
  zoom: number;
}
export interface UiMapTiles {
  url: string;
  attribution: string;
  attributionUrl?: string;
  minZoom?: number;
  maxZoom?: number;
}
export interface UiMapState {
  rows: UiDataRecord[];
  value: string[];
  view: UiMapView;
  tiles: UiMapTiles | null;
  selection: UiDataSelection;
  idKey: string;
  latitudeKey: string;
  longitudeKey: string;
  labelKey: string;
  label: string;
  description: string;
  texts: UiTexts;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  error: string;
}
export interface UiMapPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}
export interface UiMapModel {
  state: UiMapState;
  points: UiMapPoint[];
  selected: string[];
  skippedCount: number;
}
export interface UiMapRenderer {
  render(model: UiMapModel, unavailable: boolean): void;
  view(): UiMapView;
  zoom(amount: number): void;
  fitView(): UiMapView | undefined;
  visibleIds(): string[];
  dispose(): void;
}
