# Extensible Markdown

Bind a string to `agui-markdown` with `bind="$.value: APP/document"`, or set `src` to load an external Markdown file. The common `state` binding accepts `{ value?, src?, label, texts, extensions?, loading?, error? }`. Supply a caller-owned accessible `label`. Provider updates rerender automatically. In initial provider JSON, encode `<` as `\u003c` when source contains script-closing tags, preserving the enclosing JSON script element. Set the native `extensions` property to `false` for document-only rendering: custom-element wrappers are unwrapped before insertion, preserving their fallback content without constructing registered components. The default is `true`. Use this setting when displaying documents inside privileged application interfaces. The component does not publish edits, save data, or expose mutation tools. Use ordinary provider reads to inspect bound source data.

## External sources

Use `<agui-markdown src="https://example.com/notes.md" label="Notes" bind="$.texts: APP/documentTexts"></agui-markdown>`, or bind `$.src` to a provider property. A nonempty `src` takes precedence over `value`; clearing it restores the bound value. Absolute HTTP(S) URLs and relative URLs resolved against the page are supported. URL credentials and other protocols are rejected.

The browser fetches with credentials omitted and no referrer. Direct cross-origin sources must permit browser CORS access and follow normal mixed-content restrictions. For a source configured in the session proxy policy, set `src` to `./_proxy?url=<percent-encoded-absolute-source-url>`. A verified same-origin proxy response supplies the final upstream URL for resolving relative document links and media. Headers from other origins or paths cannot override that base. Nested assets are not automatically proxied.

Loads time out after 15 seconds and enforce the 64 KiB source limit while streaming, including responses without Content-Length. Changing the URL or removing the widget aborts the request. Repeated rendering of the same URL reuses the loaded source; clear/change `src` or reload the page to fetch again. Fetching never overwrites the bound `value`, and viewers display rendered content without requesting the source file.

## Supported content

The renderer calls JSDA-Kit's `md2html()` directly. It supports GFM document formatting, images, native HTML, and custom-element wrappers. HTML is preserved rather than escaped: use `details`/`summary`, `figure`/`figcaption`, responsive `picture`/`source`/`img`, and native audio/video where appropriate. Task-list checkboxes remain disabled document content. Fenced code uses JSDA's Highlight.js integration; name the language after the opening fence. Omitted or unsupported languages remain plain text.

Follow the [Extensible Markdown approach](https://rnd-pro.com/pulse/ext-md/): put ordinary Markdown and fenced JSON inside custom wrappers, with blank lines separating wrapper tags and inner blocks. Already registered implementations can enhance those elements; unknown wrappers retain readable content and data without loading arbitrary code. Each extension defines and validates its own JSON contract, reading the normal `code.language-json` element's text. Uilib components retain their existing attribute/state contracts. Markdown does not import or register component implementations.

JSDA heading IDs and authored HTML IDs receive a component-specific prefix and duplicate suffixes. Fragment links stay within that document. HTTP, HTTPS, and `mailto:` links are allowed. Relative links and media URLs resolve against the final external Markdown URL after redirects, or the page URL for bound text. Image source sets support up to 16 URL candidates with width/density descriptors. URL credentials and executable protocols are rejected. Web links open in a new tab with `noopener noreferrer`. Viewer links are inert.

## Rendering boundary

Generated HTML is sanitized in an inert document before any component upgrades, using native safe HTML parsing or dynamically loaded DOMPurify. Native document/media elements, wrapper tags, classes, and declared attributes of registered components are retained. Scripts, inline event handlers, inline styles, embedded executable documents, and source-provided RAT bindings/context attributes are excluded. Highlight.js classes stay scoped to fenced code. Links, media URLs, and task checkboxes receive additional validation.

Sanitized nodes are imported before connection so registered implementations can enhance them. Symbiote wrappers do not process document text as RAT; their own component templates work normally. Recursive `agui-markdown` and context-provider wrappers are unwrapped, retaining their fallback content. This keeps document content separate from application setup and avoids recursive source fetching.

- Source: at most 64 KiB in UTF-8.
- Generated HTML: at most 256 KiB in UTF-8, before insertion.
- Parsed output: at most 5,000 nodes and 32 nested levels.

Rejected content clears the previous document and shows caller-supplied status. Bounds apply per widget; complete shared interfaces must still fit the existing 1 MiB snapshot limit. Stale asynchronous renders and completions after removal are ignored.

## Loading and presentation

The first initialized Markdown element loads its separate packaged parser/highlighter runtime; concurrent instances share the load. DOMPurify has a separate asset requested only by browsers without native safe HTML parsing. Pages without Markdown elements fetch neither dependency. Read-only mirrors do not initialize document widgets or request their dependencies; the parent viewer toolbar can initialize Markdown for its own Description popup. Reload the page to retry a dependency load failure.

Supply `texts` keys `loading`, `empty`, `loadFailed`, `renderFailed`, `invalidValue`, `inputTooLarge`, and `outputTooLarge`; external sources also use `invalidSrc` and `fetchFailed`. Missing copy renders empty. Optional `loading` and `error` attributes or property bindings supply external states; `error` contains its own message. Empty or whitespace-only source shows `empty`. Labels and statuses remain outside parsed document content.

Typography uses shared colors, spacing, and radii. Code token colors adapt the [jsda-template generator](https://github.com/rnd-pro/jsda-template/blob/main/src/common-styles/code.css.js) hue progression for light/dark themes; individual colors can be overridden through `--agui-code-TOKEN` properties such as `--agui-code-string`. Code blocks and wrapped tables scroll horizontally. Viewers receive enhanced HTML and shared styles without parser/component execution or active links; displayed images/media may fetch their resources normally. Review typography, media, wrappers, long tables/code, and light/dark themes manually.
