# Icons

The collection follows the [JSDA template](https://github.com/rnd-pro/jsda-template/tree/main/src/icons) and uses [Material Symbols Outlined](https://developers.google.com/fonts/docs/material_symbols), licensed under Apache-2.0 in `LICENSE.txt`.

`registerUiLibComponents()` connects the Google Fonts stylesheet once per document. The request uses the sorted, deduplicated glyph names from `collection.js`, supports the existing variable axes, and requests `display=block`. No font binary is included in the library JavaScript. Add supported Material Symbols names to the collection in alphabetical order, then update the skill catalogue and review the gallery.

The entry exports `ICON_FONT_STYLESHEET` for hosts that supply the link themselves, and `loadIconFont(document)` for explicit loading. An existing stylesheet with the same URL is reused. The returned promise reports whether the stylesheet and font loaded; it does not block component registration or control actions. Inert AGUI viewers load the font in their own document through the parent page.

Icons require access to `https://fonts.googleapis.com` for CSS and `https://fonts.gstatic.com` for font files. Allow these origins in `style-src` and `font-src` respectively when setting a Content Security Policy. While loading, or if either request fails, the glyph stays hidden and its space is retained. The control and its caller-provided accessible name remain available; raw ligature names are never used as visible fallback labels. Reload after restoring font access to retry a failed load.

Use `name` for a static icon, `bind="$.name: APP/iconName"` for dynamic selection, or a native `$` object merge. Unknown names render empty. Icons are decorative unless the caller supplies `aria-label` or `aria-labelledby`; label icon-only buttons on the button itself. Icons inherit text color. The glyph size defaults to `1.4em`, with a `1em` surrounding box. Use Tailwind utilities or `--agui-icon-size`, `--agui-icon-fill`, `--agui-icon-weight`, `--agui-icon-grade`, and `--agui-icon-optical-size` to customize presentation.
