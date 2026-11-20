Workspace starter with declarative navigation and working notes.

## Purpose

Complete the task, intended users, and reuse conditions before presenting this AGUI as ready.

## Data flow

Initial app settings, UI state, routing, and task values come from inline JSON in the saved HTML. The imported content editor publishes to `DATA/note`; sidebar controls update the same state. Section navigation retains these edits. Reload restores the authored initial values.

The starter has no automatic saving, database connection, or external synchronization. Document actual data sources, the source of truth, and saving rules here when connecting them. Configure and verify feedback for the current conversation before agent-driven work, or obtain acceptance of the existing fallback workflow.

## Customization

Replace the owned `content.html` and `inspector.html` assets with reviewed feature markup. The route map controls navigation and imported content. Record any changes to data access or saving behavior in this description.
