export function computeEditorViewportFit({ viewportHeight, navTop, sceneHeight = 78, sceneGap = 8 } = {}) {
  const viewport = Math.max(1, Math.ceil(Number(viewportHeight) || 1));
  const rawTop = Number.isFinite(Number(navTop)) ? Number(navTop) : viewport;
  const top = Math.max(0, Math.min(viewport, rawTop));
  const navClearance = Math.max(0, Math.ceil(viewport - top));
  const resolvedSceneHeight = Math.max(54, Math.ceil(Number(sceneHeight) || 78));
  const resolvedSceneGap = Math.max(4, Math.ceil(Number(sceneGap) || 8));
  return {
    navClearance,
    sceneHeight: resolvedSceneHeight,
    sceneGap: resolvedSceneGap,
    sceneBottom: navClearance + resolvedSceneGap,
    workspaceReserve: navClearance + resolvedSceneHeight + (resolvedSceneGap * 2)
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let frame = 0;
  const schedule = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const nav = document.querySelector('body > .app > .nav');
      const scene = document.getElementById('editorSceneDock');
      if (!nav || !scene) return;
      const viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
      const navRect = nav.getBoundingClientRect();
      const metrics = computeEditorViewportFit({
        viewportHeight,
        navTop: navRect.top,
        sceneHeight: scene.offsetHeight || 78,
        sceneGap: 8
      });
      const style = document.documentElement.style;
      style.setProperty('--editor-nav-clearance', metrics.navClearance + 'px');
      style.setProperty('--editor-scene-height', metrics.sceneHeight + 'px');
      style.setProperty('--editor-scene-gap', metrics.sceneGap + 'px');
      style.setProperty('--editor-scene-bottom', metrics.sceneBottom + 'px');
      style.setProperty('--editor-workspace-reserve', metrics.workspaceReserve + 'px');
    });
  };
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(schedule);
    const observeLayout = () => {
      [document.querySelector('body > .app > .nav'), document.getElementById('editorSceneDock'), document.querySelector('body > .app > .top')]
        .filter(Boolean).forEach(element => observer.observe(element));
      schedule();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeLayout, { once: true });
    else observeLayout();
  } else schedule();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.addEventListener('pageshow', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
}
