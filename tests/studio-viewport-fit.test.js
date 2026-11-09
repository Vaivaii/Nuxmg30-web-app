import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStudioViewportFit } from '../www/studio-viewport-fit.js';

const sharedGeometry = {
  dockHeight: 148,
  pageTop: 50,
  timelinePanelTop: 260,
  pageScrollTop: 0,
  minTimelineHeight: 320,
  maxTimelineHeight: 720,
  dockGap: 12
};

test('Gesture navigation sizes the timeline from the measured WebView and dock geometry', () => {
  const fit = computeStudioViewportFit({
    ...sharedGeometry,
    viewportHeight: 874,
    navTop: 802
  });
  assert.equal(fit.dockBottom, 80);
  assert.equal(fit.dockTop, 646);
  assert.equal(fit.availableTimelineHeight, 374);
  assert.equal(fit.timelinePanelHeight, 374);
  assert.equal(fit.timelineOverflow, 0);
  assert.equal(fit.workspaceBottomReserve, 240);
});

test('Three-button navigation uses its shorter inset-adjusted WebView viewport', () => {
  const fit = computeStudioViewportFit({
    ...sharedGeometry,
    viewportHeight: 820,
    navTop: 748
  });
  assert.equal(fit.dockBottom, 80);
  assert.equal(fit.dockTop, 592);
  assert.equal(fit.availableTimelineHeight, 320);
  assert.equal(fit.timelinePanelHeight, 320);
  assert.equal(fit.timelineOverflow, 0);
  assert.equal(fit.workspaceBottomReserve, 240);
});

test('A compact viewport keeps the four-track minimum and exposes overflow for safe scrolling', () => {
  const fit = computeStudioViewportFit({
    ...sharedGeometry,
    viewportHeight: 760,
    navTop: 688
  });
  assert.equal(fit.timelinePanelHeight, 320);
  assert.ok(fit.timelineOverflow > 0);
  assert.ok(fit.workspaceBottomReserve > fit.dockBottom);
});

test('Timeline sizing is invariant when Studio has been vertically scrolled', () => {
  const atTop = computeStudioViewportFit({
    ...sharedGeometry, viewportHeight: 874, navTop: 802
  });
  const scrolled = computeStudioViewportFit({
    ...sharedGeometry,
    viewportHeight: 874,
    navTop: 802,
    pageScrollTop: 100,
    timelinePanelTop: 160
  });
  assert.equal(scrolled.timelinePanelHeight, atTop.timelinePanelHeight);
  assert.equal(scrolled.workspaceBottomReserve, atTop.workspaceBottomReserve);
});

test('Missing navigation geometry falls back safely without negative layout dimensions', () => {
  const fit = computeStudioViewportFit({
    viewportHeight: 720,
    dockHeight: 120,
    pageTop: 40,
    timelinePanelTop: 240
  });
  assert.ok(fit.dockBottom >= 0);
  assert.ok(fit.dockTop >= 0);
  assert.ok(fit.timelinePanelHeight >= 320);
  assert.ok(fit.workspaceBottomReserve >= 0);
});
