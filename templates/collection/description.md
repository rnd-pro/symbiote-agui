Collection starter with shared table/card selection, filtering, and a details dialog.

## Purpose

Complete the task, intended users, and reuse conditions before presenting this AGUI as ready.

## Data flow

Initial records and field definitions come from inline `DATA` JSON in the saved HTML. The sidebar filter publishes matching IDs to both views. Table and card selection share `UI/selectedIds`; the table publishes the effective selected count used by the controls sidebar. Details display selected records in a dialog. Filtering and changing views preserve selection, including selections outside the current filter.

Records are not edited or saved by this starter. UI choices remain local and reload restores authored defaults. No database or external synchronization is configured. Describe actual sources, the source of truth, and saving rules here when connecting them. Verify feedback for the current conversation, or obtain acceptance of the existing fallback workflow.

## Customization

Records need a unique `id` and `title`; optional `status` and `description` supply card and details text. Other fields can drive table columns and filters. Replace the owned `records.html` asset to extend the views and controls through existing components and native bindings.
