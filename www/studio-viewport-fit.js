export function computeStudioViewportFit({
  viewportHeight,
  navTop,
  dockHeight,
  pageTop,
  pageScrollTop = 0,
  timelinePanelTop,
  minTimelineHeight = 320,
  maxTimelineHeight = 720,
  dockGap = 12,
  fallbackNavHeight = 72
} = {}) {
  const resolvedViewportHeight = Math.max(1, Math.ceil(Number(viewportHeight) || 874));
  const resolvedFallbackNavHeight = Math.max(0, Math.ceil(Number(fallbackNavHeight) || 72));
  const resolvedNavTop = Number.isFinite(Number(navTop))
    ? Math.min(resolvedViewportHeight, Math.max(0, Number(navTop)))
    : Math.max(0, resolvedViewportHeight - resolvedFallbackNavHeight);
  const resolvedDockHeight = Math.max(0, Math.ceil(Number(dockHeight) || 0));
  const resolvedPageTop = Number.isFinite(Number(pageTop)) ? Number(pageTop) : 0;
  const resolvedPageScrollTop = Math.max(0, Number(pageScrollTop) || 0);
  const resolvedTimelinePanelTop = Number.isFinite(Number(timelinePanelTop))
    ? Number(timelinePanelTop)
    : resolvedPageTop;
  const resolvedMinTimelineHeight = Math.max(1, Math.ceil(Number(minTimelineHeight) || 320));
  const resolvedMaxTimelineHeight = Math.max(
    resolvedMinTimelineHeight,
    Math.ceil(Number(maxTimelineHeight) || 720)
  );
  const resolvedDockGap = Math.max(0, Math.ceil(Number(dockGap) || 12));

  // The Android WebView viewport already excludes native system-bar insets.
  // The application navigation is measured separately because it is a fixed overlay.
  const dockBottom = Math.max(0, Math.ceil(resolvedViewportHeight - resolvedNavTop + 8));
  const dockTop = Math.max(0, resolvedViewportHeight - dockBottom - resolvedDockHeight);

  // Recover the panel's unscrolled top inside the Studio scrollport. This keeps
  // the result stable when the user scrolls Studio but the viewport is unchanged.
  const panelTopAtScrollStart = resolvedPageTop
    + (resolvedTimelinePanelTop - resolvedPageTop + resolvedPageScrollTop);
  const availableTimelineHeight = Math.floor(dockTop - panelTopAtScrollStart - resolvedDockGap);
  const timelinePanelHeight = Math.max(
    resolvedMinTimelineHeight,
    Math.min(resolvedMaxTimelineHeight, availableTimelineHeight)
  );
  const timelineOverflow = Math.max(0, resolvedMinTimelineHeight - availableTimelineHeight);
  const workspaceBottomReserve = Math.ceil(dockBottom + resolvedDockHeight + resolvedDockGap);

  return {
    viewportHeight: resolvedViewportHeight,
    navTop: resolvedNavTop,
    dockHeight: resolvedDockHeight,
    dockTop,
    dockBottom,
    availableTimelineHeight,
    timelinePanelHeight,
    timelineOverflow,
    workspaceBottomReserve
  };
}
