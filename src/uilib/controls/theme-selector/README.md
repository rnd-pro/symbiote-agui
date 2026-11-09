# App theme selector

`agui-theme-selector` opens a native popover from a round palette-icon button. Graphite retains the default colors; Ocean, Forest, and Desert supply alternative basic color tokens. Every palette supports light, dark, and system color schemes through the existing `agui-theme-toggle`. Palettes change no typography, sizing, spacing, radii, or component styles.

Declare a persisted palette property, bind it into `value`, and publish back to the same property:

```html
<context-provider ctx="APP" persist="palette theme">
  <script type="application/json">{"palette":"graphite","theme":"system"}</script>
  <agui-theme-selector label="App theme" pub-to="APP/palette"
    bind="$.value: APP/palette; $: AGUI_TEXT/themeSelector"></agui-theme-selector>
  <agui-theme-toggle ctx="APP" light-label="Day" dark-label="Night"
    bind="$: AGUI_TEXT/themeToggle"></agui-theme-toggle>
</context-provider>
```

Values are `graphite` (default), `ocean`, `forest`, and `desert`. Supply the accessible name with `label`, a native `$.label` binding, or `aria-label`. `disabled` and `readonly` protect edits. Standard palette names and saving copy come from `AGUI_TEXT/themeSelector`; bind caller-owned `texts` to replace them. Missing copy stays empty. Shared popover styling provides animation, native dismissal, and positioning; previews follow the current color scheme.

Trusted user option clicks apply immediately and save only the `pub-to` property through AGUI's data commit API. Its provider/key must be declared with `persist`. This does not commit other drafts, submit feedback, or write to external storage. Reloads and worker restarts restore the committed palette through its provider. Palette and day/night mode are separate properties: palette clicks save the palette; toggle clicks save `<ctx>/theme` when `theme` is declared with `persist`.

The day/night toggle saves trusted mouse and keyboard activations only. It stays transient without a declared persisted `theme`. Initialization, system-preference changes, bindings, and tool edits never save automatically. Bind `$: AGUI_TEXT/themeToggle` for standard failure notifications, or provide caller-owned `texts` keys `rejected`, `unknown`, and `closeMessage`. The toggle shows the shared preloader while saving; failures use `agui-message`. Its `saveState` is `idle`, `saving`, `committed`, `rejected`, or `unknown`. Unknown outcomes block further activation until reload reconciles saved data, without automatic retries. The manager keeps its existing independent preference storage.

`saveState` reports `idle`, `saving`, `committed`, `rejected`, `unknown`, or `invalidTarget`. The popover shows caller-owned status text, including failures. Unknown outcomes block further selection until reload reconciles saved data; saving is never automatically retried. A missing persistence declaration leaves the selection unsaved and reports `invalidTarget`.

Set `auto-save="false"` or bind `$.autoSave` to a false-valued state property when the host owns preference storage. The selector then works without a session data connection, applies choices, and publishes through `pub-to` without committing AGUI data. The manager uses this mode with its own browser preference store, retaining choices across reloads and synchronizing tabs at the same manager URL. The host controls any persistence performed by its bindings.

The selector itself never saves during initialization, incoming bindings, or `set_value` tools. `set_value` accepts `{ value }`; `read_value` returns `{ value, saveState }`, excluding unrelated state. Viewer snapshots receive the selected palette without executing the selector. Rendered charts repaint when the palette changes.
