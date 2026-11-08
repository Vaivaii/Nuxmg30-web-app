export function computeEditorViewportFit({
  navTop,
  viewportHeight,
  pageBottom,
  navHeight,
  sceneHeight = 54,
  sceneGap = 6
} = {}) {
  const resolvedNavHeight = Math.max(56, Math.ceil(Number(navHeight) || 72));
  const resolvedSceneHeight = Math.max(48, Math.ceil(Number(sceneHeight) || 54));
  const resolvedGap = Math.max(4, Math.ceil(Number(sceneGap) || 6));
  const resolvedViewport = Math.max(1, Number(viewportHeight) || 874);
  const resolvedNavTop = Number.isFinite(Number(navTop))
    ? Number(navTop)
    : resolvedViewport - resolvedNavHeight;
  const resolvedPageBottom = Math.max(0, Number(pageBottom) || resolvedViewport);
  const sceneTop = resolvedNavTop - resolvedSceneHeight - resolvedGap;
  const contentBottom = sceneTop - resolvedGap;
  const dockBottom = Math.max(0, resolvedViewport - resolvedNavTop + resolvedGap);
  return {
    navHeight: resolvedNavHeight,
    sceneHeight: resolvedSceneHeight,
    sceneGap: resolvedGap,
    dockBottom,
    workspaceReserve: Math.max(0, Math.ceil(resolvedPageBottom - contentBottom))
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let frame = 0;
  const schedule = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const nav = document.querySelector('body > .app > .nav');
      const page = document.getElementById('page-editor');
      const scene = document.getElementById('editorSceneDock');
      if (!nav || !page || !scene) return;
      const navRect = nav.getBoundingClientRect();
      const pageRect = page.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 874;
      const metrics = computeEditorViewportFit({
        navTop: navRect.top,
        viewportHeight,
        pageBottom: pageRect.bottom,
        navHeight: navRect.height || nav.offsetHeight || 72,
        sceneHeight: sceneRect.height || scene.offsetHeight || 54,
        sceneGap: 6
      });
      const style = document.documentElement.style;
      style.setProperty('--editor-nav-height', metrics.navHeight + 'px');
      style.setProperty('--editor-scene-dock-height', metrics.sceneHeight + 'px');
      style.setProperty('--editor-scene-dock-bottom', metrics.dockBottom + 'px');
      style.setProperty('--editor-workspace-reserve', metrics.workspaceReserve + 'px');
    });
  };

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(schedule);
    const observeLayout = () => {
      const nav = document.querySelector('body > .app > .nav');
      const scene = document.getElementById('editorSceneDock');
      const top = document.querySelector('body > .app > .top');
      const page = document.getElementById('page-editor');
      [nav, scene, top, page].filter(Boolean).forEach(element => observer.observe(element));
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
