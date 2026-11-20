# Notes workspace

Keep working notes in a local browser interface.

## Data flow

The note starts empty in inline JSON. The editor and Clear action update `DATA/note` locally. Reload restores the empty note. Appearance and sidebar choices are transient. No external source, database, automatic saving, or feedback handler is configured for this comparison.
