export function computeEditorViewportFit({ navHeight, systemBottomInset = 0, sceneGap = 8 } = {}) {
  const resolvedNavHeight = Math.max(56, Math.ceil(Number(navHeight) || 78));
  const resolvedSystemInset = Math.max(0, Math.ceil(Number(systemBottomInset) || 0));
  const resolvedGap = Math.max(4, Math.ceil(Number(sceneGap) || 8));
  return {
    navHeight: resolvedNavHeight,
    systemBottomInset: resolvedSystemInset,
    sceneGap: resolvedGap,
    workspaceReserve: resolvedNavHeight + resolvedSystemInset + resolvedGap
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let frame = 0;
  const readSystemBottomInset = () => {
    try {
      const nativeValue = Number(window.MG30AndroidInsets?.getNavigationBottomInsetDp?.());
      if (Number.isFinite(nativeValue) && nativeValue >= 0) return nativeValue;
    } catch (_) {}
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--mg30-system-nav-bottom').trim();
    const parsed = Number.parseFloat(cssValue);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const schedule = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const nav = document.querySelector('body > .app > .nav');
      if (!nav) return;
      const nativeInset = readSystemBottomInset();
      const metrics = computeEditorViewportFit({
        navHeight: nav.getBoundingClientRect().height || nav.offsetHeight || 78,
        systemBottomInset: nativeInset,
        sceneGap: 8
      });
      const style = document.documentElement.style;
      style.setProperty('--mg30-system-nav-bottom', metrics.systemBottomInset + 'px');
      style.setProperty('--editor-nav-height', metrics.navHeight + 'px');
      style.setProperty('--editor-workspace-reserve', metrics.workspaceReserve + 'px');
    });
  };

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(schedule);
    const observeLayout = () => {
      const nav = document.querySelector('body > .app > .nav');
      const scene = document.getElementById('editorSceneDock');
      const top = document.querySelector('body > .app > .top');
      [nav, scene, top].filter(Boolean).forEach(element => observer.observe(element));
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
  window.addEventListener('mg30androidinsets', schedule);
  document.addEventListener('visibilitychange', schedule);
}
