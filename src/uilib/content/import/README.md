# HTML imports

`agui-import` fetches a trusted HTML fragment and replaces its own children with that markup. It adds no content wrapper, slots or presentation styles; its host uses `display: contents`.

```html
<agui-import src="./_assets/fragments/details.html"></agui-import>
```

Both `.html` and `.htm` files work. Relative and absolute HTTP(S) URLs are supported, including endpoints without a file extension. Cross-origin sources must permit CORS; the existing session proxy can forward explicitly allowed public sources. Requests omit credentials and referrers, time out after 15 seconds, and accept at most 1 MiB of UTF-8 content.

Bind `$.src` to change the imported fragment declaratively:

```html
<agui-import bind="$.src: APP/fragmentUrl"
  pub-map="APP/importLoading: loading; APP/importError: error"></agui-import>
```

A defined state `src` takes precedence over the attribute. Changing it cancels pending work and clears the old chunk before loading its replacement. An empty source clears the content. Removing and restoring the source retries a failed request. Disconnecting aborts pending work; reconnecting reloads the current source.

`loading` is a boolean output mirrored by `aria-busy`. `error` is an empty string or a machine-readable code: `invalidSrc`, `fetchFailed`, or `inputTooLarge`. The component adds no messages; compose application-owned feedback with existing state/preloader components and native bindings.

## Bindings and assets

Imported markup supports native Symbiote bindings, Itemize, and registered AGUI components. Nested context providers own their own bindings. Replacing a chunk removes its subscriptions and lets native component/tool cleanup release its children. Set `process-inner-html="false"` before initialization to leave the host's text tokens and bindings unprocessed; nested custom elements still initialize normally.

Keep persisted providers and their initial JSON in the main saved AGUI definition, and bind imported fragments to those named contexts. Imported markup is fetched in the browser and does not extend the server's declared persistence targets or Tailwind class scan. Reuse compiled utilities and component defaults, or supply the fragment's stylesheet as an asset. Relative links, images, and nested import sources resolve against the page's base URL, as with ordinary `innerHTML`; use absolute or session-relative asset URLs when needed.

## Source trust

Use reviewed application fragments. This is a template loader, not a document sanitizer: HTML, binding attributes, event attributes, and component behavior are retained. Script elements inserted through `innerHTML` do not execute automatically, but this does not make arbitrary HTML safe. Use `agui-markdown` for external document content requiring sanitization. Markdown cannot activate an `agui-import` wrapper.
