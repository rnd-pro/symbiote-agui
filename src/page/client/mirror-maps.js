/**
 * @param {HTMLElement} root
 * @param {HTMLElement} copy
 */
export function mirrorMaps(root, copy) {
  let originals = root.querySelectorAll('.agui-map-canvas');
  let copies = copy.querySelectorAll('.agui-map-canvas');
  originals.forEach((original, index) => {
    let target = copies[index];
    let width = original.clientWidth;
    let height = original.clientHeight;
    if (!target || !width || !height || original.hasAttribute('hidden')) { return; }
    // Leaflet positions tiles/markers in pixels. Freeze that coordinate space
    // and scale the entire viewport together in narrower inert viewers.
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('agui-map-snapshot');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', original.getAttribute('aria-label') ?? '');
    let content = document.createElementNS(svg.namespaceURI, 'foreignObject');
    content.setAttribute('width', String(width));
    content.setAttribute('height', String(height));
    target.setAttribute('style', `
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
    `);
    target.removeAttribute('tabindex');
    target.replaceWith(svg);
    content.append(target);
    svg.append(content);
  });
}
