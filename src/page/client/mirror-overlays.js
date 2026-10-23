export let MIRROR_OVERLAY_STYLES = `
  .agui-mirror-modal,
  .agui-mirror-popup-backdrop {
    position: fixed;
    inset: 0;
    backdrop-filter: blur(var(--agui-backdrop-blur));
  }
  .agui-mirror-modal {
    display: grid;
    place-items: center;
    overflow: auto;
    padding: 1rem;
    background: rgb(0 0 0 / .5);
  }
`;

/**
 * Native top-layer state is not cloned. Hoist visible surfaces out of clipping
 * ancestors as inert presentation; viewers never enter the browser's top layer.
 * @param {HTMLElement} root
 * @param {HTMLElement} copy
 */
export function mirrorOverlays(root, copy) {
  let originals = root.querySelectorAll('dialog, [popover]');
  let copies = copy.querySelectorAll('dialog, [popover]');
  originals.forEach((element, index) => {
    let target = /** @type {HTMLElement} */ (copies[index]);
    let modal = element instanceof HTMLDialogElement && element.matches(':modal');
    let popover = element.hasAttribute('popover');
    let visiblePopover = popover && 'showPopover' in HTMLElement.prototype && element.matches(':popover-open');
    if (popover) {
      target.removeAttribute('popover');
      if (!visiblePopover && !modal) { target.hidden = true; }
    }
    if (!modal && !visiblePopover) { return; }
    if (element instanceof HTMLDialogElement) {
      let presentation = document.createElement('div');
      for (let attribute of [...target.attributes]) { presentation.setAttribute(attribute.name, attribute.value); }
      presentation.append(...target.childNodes);
      target.replaceWith(presentation);
      target = presentation;
    }
    target.removeAttribute('aria-modal');
    target.setAttribute('role', 'group');
    target.dataset.aguiMirrorSurface = modal ? 'dialog' : 'popover';
    target.style.position = modal ? 'relative' : 'fixed';
    target.style.inset = 'auto';
    target.style.margin = '0';
    target.style.maxWidth = 'calc(100vw - 2rem)';
    target.style.maxHeight = 'calc(100dvh - 2rem)';
    target.style.overflow = 'auto';
    target.style.display = getComputedStyle(element).display;
    target.style.setProperty('position-area', 'none');
    target.style.setProperty('position-anchor', 'none');
    if (modal) {
      let backdrop = document.createElement('div');
      backdrop.className = 'agui-mirror-modal';
      backdrop.style.zIndex = String(1000 + index);
      backdrop.append(target);
      copy.append(backdrop);
    } else {
      let rect = element.getBoundingClientRect();
      if (element.classList.contains('agui-popover')) {
        let backdrop = document.createElement('div');
        backdrop.className = 'agui-mirror-popup-backdrop';
        backdrop.style.zIndex = String(1000 + index);
        copy.append(backdrop);
      }
      target.style.left = `clamp(1rem, ${rect.left}px, max(1rem, calc(100vw - ${rect.width}px - 1rem)))`;
      target.style.top = `clamp(1rem, ${rect.top}px, max(1rem, calc(100dvh - ${rect.height}px - 1rem)))`;
      target.style.width = `${rect.width}px`;
      target.style.zIndex = String(1000 + index);
      copy.append(target);
    }
  });
}
