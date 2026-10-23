# Icons

The collection follows the [JSDA template](https://github.com/rnd-pro/jsda-template/tree/main/src/icons) and uses [Material Symbols Outlined](https://developers.google.com/fonts/docs/material_symbols), licensed under Apache-2.0 in `LICENSE.txt`.

`font-data.js` embeds the WOFF2 subset so the default JSDA bundle and inert shared views need no font requests. Keep it synchronized with `collection.js`:

1. Add supported Material Symbols names to the collection in alphabetical order.
2. Run `node scripts/update-icon-font.js` from the repository root. Internet access is needed only for this maintenance command.
3. Update the icon catalogue in the shared skill and review the gallery.

Use `name` for a static icon, `bind="$.name: APP/iconName"` for dynamic selection, or the standard `state` binding. Unknown names render empty. Icons are decorative unless the caller supplies `aria-label` or `aria-labelledby`; label icon-only buttons on the button itself. Icons inherit text color and match the surrounding font size by default (`1em`). Use Tailwind utilities or `--agui-icon-size`, `--agui-icon-fill`, `--agui-icon-weight`, `--agui-icon-grade`, and `--agui-icon-optical-size` to customize presentation.
