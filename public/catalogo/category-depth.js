(() => {
  const cards = [...document.querySelectorAll('.category-grid button')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!cards.length || reduceMotion.matches) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let queued = false;
  function updateScrollDepth() {
    queued = false;
    const viewportCenter = window.innerHeight / 2;
    for (const card of cards) {
      if (card.matches(':hover') && finePointer.matches) continue;
      const box = card.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) continue;
      const progress = clamp((box.top + box.height / 2 - viewportCenter) / viewportCenter, -1, 1);
      card.style.setProperty('--tilt-x', `${(-progress * 3).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--image-shift', `${(-progress * 5).toFixed(1)}px`);
    }
  }
  function queueScrollDepth() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateScrollDepth);
  }

  if (finePointer.matches) {
    for (const card of cards) {
      card.addEventListener('pointermove', (event) => {
        const box = card.getBoundingClientRect();
        const x = clamp((event.clientX - box.left) / box.width - .5, -.5, .5);
        const y = clamp((event.clientY - box.top) / box.height - .5, -.5, .5);
        card.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
        card.style.setProperty('--tilt-x', `${(-y * 6).toFixed(2)}deg`);
        card.style.setProperty('--image-shift', `${(-y * 8).toFixed(1)}px`);
      }, { passive: true });
      card.addEventListener('pointerleave', queueScrollDepth);
    }
  }
  window.addEventListener('scroll', queueScrollDepth, { passive: true });
  window.addEventListener('resize', queueScrollDepth, { passive: true });
  queueScrollDepth();
})();
