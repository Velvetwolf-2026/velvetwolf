// Drag-to-turn on a transparent surface over the 3D stage. Keyboard: arrow keys turn it too.
export function bindDrag(el, engine, key) {
  if (!el || !engine) return () => {};
  let lastX = 0, lastT = 0, active = false;

  const onPointerDown = (e) => {
    active = true;
    lastX = e.clientX;
    lastT = performance.now();
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    engine.dragStart(key);
    el.classList.add('is-dragging');
  };

  const onPointerMove = (e) => {
    if (!active) return;
    const now = performance.now();
    engine.dragMove(key, e.clientX - lastX, (now - lastT) / 1000);
    lastX = e.clientX;
    lastT = now;
  };

  const end = () => {
    if (!active) return;
    active = false;
    engine.dragEnd(key);
    el.classList.remove('is-dragging');
  };

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    engine.dragStart(key);
    engine.dragMove(key, e.key === 'ArrowLeft' ? -40 : 40, 0);
    engine.dragEnd(key);
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', onKeyDown);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
    el.removeEventListener('keydown', onKeyDown);
  };
}
