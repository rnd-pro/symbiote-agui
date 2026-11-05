# Local session assets

Publish original logos, images, fonts, styles, browser modules, Markdown, and JSON beside an interface. AGUI serves these files through the page's own server, so they work locally and through public tunnels without another host or base64 embedding. Use the [asset proxy](./reference.md#asset-proxy) instead for approved external public sources.

## Publish and use files

First save the interface, then import each reviewed file into that session's asset directory:

```sh
npx symbiote-agui save workspace --file ./workspace.html
npx symbiote-agui assets add workspace --file ./brand/logo.svg --as images/logo.svg
npx symbiote-agui assets add workspace --file ./brief.md --as documents/brief.md
npx symbiote-agui assets list workspace
npx symbiote-agui start workspace
```

Use session-relative URLs in the interface:

```html
<img src="./_assets/images/logo.svg" alt="Project logo">
<agui-markdown src="./_assets/documents/brief.md" label="Brief"></agui-markdown>
```

Supply the Markdown widget's caller-owned status texts as usual. Relative Markdown media resolve against the served document URL. CSS URLs and imports resolve against the CSS file; imports inside browser modules resolve against the module URL. Native `fetch(new URL('./_assets/data.json', document.baseURI))` reads JSON without a wrapper.

Marked AGUI modules remain inline. To load a reviewed asset module from one, resolve its URL against the page rather than the inline module's generated Blob URL:

```html
<script type="module" data-agui>
export default async (root) => {
  let module = await import(new URL('./_assets/panel.mjs', document.baseURI).href);
  return module.mount(root);
};
</script>
```

Return a cleanup function from `mount` when it installs listeners or other resources. Asset modules run in the browser; they are not Node.js backend modules and their package imports are not automatically resolved or bundled.

`--as` defaults to the source basename. Existing files fail unless `--replace` is explicit. List output contains relative paths, byte sizes, content types, and usable URLs; use `--offset` and `--limit` to paginate (20 by default, up to 100).

```sh
npx symbiote-agui assets add workspace --file ./brand/logo.svg --as images/logo.svg --replace
npx symbiote-agui assets list workspace --offset 20 --limit 20
npx symbiote-agui assets remove workspace --path images/logo.svg
```

Imports copy exact bytes and leave the source untouched. Removal deletes only the published copy. These commands work with stopped or running saved sessions without changing markup, descriptions, or committed application data.

## Files, Git, and lifecycle

A project library stores files in `<ID>.assets/` beside `<ID>.html` and `<ID>.md`. You can place reviewed supported files there manually and commit the directory with the interface. Default uses private encoded names; use CLI imports instead of guessing cache paths.

The complete directory is published, not just files referenced by the current markup. It does not mount the project folder or grant access to arbitrary filesystem paths. Keep source credentials and private configuration outside it.

- Stop/start and sync retain assets. File edits take effect on the next normal fetch or reload; there is no watcher or forced page replacement. Existing workers without asset support need a restart after preserving drafts.
- Imports are independent copies. Reimport with `--replace` to pick up changes to the original. Replacing the entire published root requires a worker restart; editing its files does not.
- Rename, Copy, Move, and explicit private-cache import include the complete validated tree, independently of optional saved data and metadata. Relative URLs remain unchanged. Existing asset directories are collisions, including empty ones; trees are never silently merged.
- Transfer recovery retains private backups and checks file digests and directory ownership before restoring or removing assets. Changed artifacts stop recovery for reconciliation. Review incomplete operations in the manager's Transfers view.
- Clear deletes the owned asset directory with the definition. Forgetting a connected project leaves its files intact. Neither removes original import sources.
- Project explorer discovers published files in projects and Default while keeping private runtime files out of Default's readable mapping.

`status` includes `assets.configured` for directory presence, `assets.available` for the running worker's route capability, and `assets.path` for its URL prefix. Stopped and older workers report unavailable; capability does not certify every file or mean a public tunnel is healthy.

The packaged gallery uses `src/uilib/gallery.assets/agui.png` and `documents/brief.md`. Publish both with `assets add`, preserving their relative paths, or copy that directory to the gallery session's `<ID>.assets/` folder. Its Design tokens tab demonstrates the original project image and Markdown media.

## Supported files and limits

- Raster images: PNG, JPEG, GIF, WebP, AVIF, BMP, and ICO; vector images: SVG.
- Fonts: WOFF, WOFF2, TTF, and OTF.
- CSS, JS/MJS browser modules, JSON, Markdown (`.md` and `.markdown`), and plain text.
- Up to 16 MiB per file, 128 MiB per tree, 512 files, and 2,048 total file/directory entries.
- Portable relative paths: up to 32 segments, 1,024 characters total, and 255 per segment. Use letters, digits, underscores, hyphens, dots, and spaces; segments must start with a letter, digit, or underscore and must not end with a dot or space. Case-only collisions, hidden/reserved names, encoded names, traversal, and links are rejected.
- GET and HEAD only, with eight concurrent responses and a 30-second deadline. No directory indexes, range streaming, HTML documents, arbitrary file downloads, recursive imports, or server-side module execution.

The Markdown widget has its own smaller source/render limits. Supported extensions do not guarantee valid image, font, or module contents; browsers still validate those formats. Invalid manually edited trees fail rather than silently skip files. `assets remove` can remove an oversized or unsupported regular file to repair a tree.

## Sharing and trust

A public tunnel exposes published assets to anyone with the link, including viewers and requests without a WebSocket role. Viewer mode restricts application interaction; it does not make files confidential. Review the whole asset tree with the session's intended audience before enabling sharing. Asset reads need no additional browser authorization.

Viewers receive rendered Markdown and module output without fetching the Markdown source or running application modules. Images, published stylesheet links, and their fonts load normally. Snapshot URLs for published media stay on the viewer's origin, including when the interactive user connects locally and the viewer uses a public tunnel.

Browser modules and CSS are active content and need the same review as inserted executable markup. SVG image rendering is supported; direct SVG documents use a sandbox policy that blocks scripts and same-origin document privileges. Regular-file, path, size, and identity checks reduce unintended reads; they are not an OS sandbox against a hostile local filesystem owner. Publishing files grants no connector, feedback, host-command, or external-write authority. Document text remains data, not agent instructions.
