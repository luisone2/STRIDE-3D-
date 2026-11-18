export function flyBarsToCart(
  sourceEls: HTMLElement[],
  basketEl: HTMLElement | null,
  reducedMotion: boolean,
  onEachLand: () => void,
  onAllComplete: () => void
) {
  if (!basketEl || sourceEls.length === 0 || reducedMotion) {
    onAllComplete();
    return;
  }

  const basketRect = basketEl.getBoundingClientRect();
  const bx = basketRect.left + basketRect.width / 2;
  const by = basketRect.top + basketRect.height / 2;

  let completed = 0;
  const total = sourceEls.length;

  sourceEls.forEach((src, i) => {
    const rect = src.getBoundingClientRect();
    const cs = window.getComputedStyle(src);

    const copy = document.createElement('div');
    copy.className = 'spr';
    copy.style.position = 'fixed';
    copy.style.left = `${rect.left}px`;
    copy.style.top = `${rect.top}px`;
    copy.style.width = `${rect.width}px`;
    copy.style.height = `${rect.height}px`;
    copy.style.backgroundSize = cs.backgroundSize;
    copy.style.backgroundPosition = cs.backgroundPosition;
    copy.style.zIndex = '70';
    copy.style.pointerEvents = 'none';
    copy.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,.25))';
    copy.style.transformOrigin = 'center center';
    document.body.appendChild(copy);

    const sx = rect.left + rect.width / 2;
    const sy = rect.top + rect.height / 2;
    const dx = bx - sx;
    const dy = by - sy;
    const lift = Math.min(160, 0.35 * Math.abs(dy) + 60);
    const k = Math.min(0.2, 30 / Math.max(1, rect.height));

    const anim = copy.animate(
      [
        {
          transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(${0.45 + k}) rotate(-10deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-18deg)`,
          opacity: 0.15,
          offset: 1,
        },
      ],
      {
        duration: 900,
        delay: i * 120,
        easing: 'cubic-bezier(.5,0,.2,1)',
        fill: 'both',
      }
    );

    anim.onfinish = () => {
      copy.remove();
      onEachLand();
      completed++;
      if (completed === total) {
        onAllComplete();
      }
    };
  });
}
