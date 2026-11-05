# Local assets

The CLI manages one `<session-id>.assets/` directory beside each saved definition. Default-cache directory names use the same encoded ID as the HTML definition. Only explicitly imported or manually placed files belong here; original source files remain separate.

Operations share the session storage lock. Imports read bounded, stable regular files and reuse atomic file publication. Inventory checks enforce supported MIME types, portable paths, case collisions, file/tree limits, and link restrictions. Removal permits oversized or unsupported regular files so an owner can repair a manually edited tree. Original import sources, markup, descriptions, and committed application data are left intact.

The directory is intended for publishable resources, including reviewed browser code. Importing a module never executes it on the host. The CLI currently manages files only: HTTP asset serving and integration with session transfers, rename, cache import, and clear are not implemented. Relative URLs in command results describe the asset route; they are not evidence of HTTP availability.
