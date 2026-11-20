Dashboard starter with metric cards and optional chart and map regions.

## Purpose

Complete the task, intended users, and reuse conditions before presenting this AGUI as ready.

## Data flow

Prepared metrics, chart records/series, and locations come from inline `DATA` JSON in the saved HTML. Metrics render through native Itemize. The starter does not calculate totals, aggregate records, or contact external data sources. Update these prepared values through the existing AGUI workflow.

The sidebar controls mount chart and map regions on demand. Disabled regions have no widget instance and do not start dependency loading. User map movement publishes `UI/mapView`. Map tiles are disabled by default; explicitly configured public tile providers receive browser requests when the map is enabled.

UI choices and map movement remain local; reload restores authored defaults. No automatic saving, database connection, or external synchronization is configured. Record actual data sources, the source of truth, saving rules, and any tile provider here when connecting them. Verify feedback for the current conversation, or obtain acceptance of the existing fallback workflow.

## Customization

Replace the owned `overview.html` asset to rearrange the existing widgets. Metric records use `id`, `label`, and a prepared `value`. Chart records use `id` and `label`, with numeric fields referenced by native series definitions. Location records use `id`, `label`, `latitude`, and `longitude`.
