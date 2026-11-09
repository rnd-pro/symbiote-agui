# Declarative diagrams

Use `agui-diagram` to render Mermaid source as inline SVG through [Pele](https://github.com/obsidianmd/pele). Supply source with native `value` bindings; syntax selects the diagram type. Pele targets Mermaid 12.1.0 syntax with its own layouts. No session modules, CDN imports, or engine configuration are required.

```html
<context-provider ctx="APP">
  <script type="application/json">
    {
      "diagram": "flowchart LR; Draft --> Review --> Publish",
      "diagramTexts": {
        "source": "Diagram source",
        "loading": "Loading diagram...",
        "empty": "No diagram yet.",
        "loadFailed": "The diagram library could not load. Reload to retry.",
        "invalidValue": "The source must be text.",
        "invalidSource": "Check the diagram syntax.",
        "unsupported": "Unsupported diagram type.",
        "inputTooLarge": "The source is too large.",
        "outputTooLarge": "The rendered diagram is too large.",
        "limitExceeded": "The diagram exceeds rendering limits.",
        "renderFailed": "The diagram could not be rendered."
      }
    }
  </script>
  <agui-diagram label="Publishing workflow"
    bind="$.value: APP/diagram; $.texts: APP/diagramTexts"></agui-diagram>
</context-provider>
```

## Inputs and behavior

- `value` is source text, initially empty. `label` and optional `description` accept host attributes or native property bindings. `loading` and `error` describe external availability; property bindings override attributes. `texts` supplies the keys shown above. Missing copy stays empty. Errors never insert parser messages as HTML.
- SVG colors, font, and corner radius inherit existing AGUI tokens, including palettes and light/dark mode. Source styles may customize individual diagram elements. Set `--agui-diagram-max-height` to change the scrollable plot limit (default `40rem`).
- A disclosure shows bounded source as plain text for inspection and as a rendering fallback. The source is not processed as a Symbiote template. Use an existing code textarea bound to the same provider for editing. Declare that provider's `persist` properties and use the normal saving workflow when source should survive reloads.
- This widget renders content; it adds no editor, node-selection controls, `pub-to`, source fetching, or custom tools. Existing provider/state APIs can change its inputs.

## Loading, safety, and sharing

The component initializes a separately served runtime through a dynamic URL import, following the chart widget pattern. The main client contains neither Pele nor the SVG sanitizer. Concurrent instances share one module load; pages without diagrams and inert viewers do not fetch it. Source changes use the latest value, and disconnected or superseded work cannot mount output. Reload to retry a dependency-load failure.

Inputs are limited to 32 KiB UTF-8, 300 edges, and 256 KiB rendered SVG. Sanitized output is limited to 5,000 elements and depth 64. Rendering is synchronous inside the lazy adapter; these bounds are not a CPU deadline. Multiple diagrams must also fit the page's existing aggregate snapshot limit.

The adapter controls engine options, disables links/images and executable extensions, and sanitizes generated SVG with DOMPurify. Scripts, HTML wrappers, images, animations, and external URL references are removed. No remote requests are made for diagram content. Local SVG references remain available for markers and clipping.

Viewer snapshots contain inert SVG, labels, source text, and shared styles. Viewers do not load Pele or run diagram code. Manually review layout, labels, typography, narrow screens, and theme appearance with representative source.
