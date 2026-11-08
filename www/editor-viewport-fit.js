export function computeEditorViewportFit({ navHeight, sceneGap = 8 } = {}) {
  const resolvedNavHeight = Math.max(56, Math.ceil(Number(navHeight) || 72));
  const resolvedGap = Math.max(4, Math.ceil(Number(sceneGap) || 8));
  return {
    navHeight: resolvedNavHeight,
    sceneGap: resolvedGap,
    workspaceReserve: resolvedNavHeight + resolvedGap
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let frame = 0;
  const schedule = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const nav = document.querySelector('body > .app > .nav');
      if (!nav) return;
      const metrics = computeEditorViewportFit({
        navHeight: nav.getBoundingClientRect().height || nav.offsetHeight || 72,
        sceneGap: 8
      });
      const style = document.documentElement.style;
      // MainActivity already applies WindowInsets to the WebView host. Never offset a second time.
      style.setProperty('--mg30-system-nav-bottom', '0px');
      style.setProperty('--editor-nav-height', metrics.navHeight + 'px');
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
