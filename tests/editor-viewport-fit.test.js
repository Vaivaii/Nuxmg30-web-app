import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEditorViewportFit } from '../www/editor-viewport-fit.js';

test('Gesture mode: dock follows the actual navigation top and scene gap stays small', () => {
  const fit = computeEditorViewportFit({
    viewportHeight: 874, navTop: 802, pageBottom: 874,
    navHeight: 72, sceneHeight: 54, sceneGap: 6
  });
  assert.deepEqual(fit, {
    navHeight: 72, sceneHeight: 54, sceneGap: 6,
    dockBottom: 78, workspaceReserve: 138
  });
});

test('Three-button mode: safe WebView bottom is measured, not guessed from the screen height', () => {
  const fit = computeEditorViewportFit({
    viewportHeight: 820, navTop: 748, pageBottom: 748,
    navHeight: 72, sceneHeight: 54, sceneGap: 6
  });
  assert.deepEqual(fit, {
    navHeight: 72, sceneHeight: 54, sceneGap: 6,
    dockBottom: 78, workspaceReserve: 66
  });
});

test('If the page extends to the viewport bottom, reserve includes nav, Scene dock and both gaps', () => {
  const fit = computeEditorViewportFit({
    viewportHeight: 874, navTop: 802, pageBottom: 874,
    navHeight: 72, sceneHeight: 54, sceneGap: 6
  });
  assert.equal(fit.workspaceReserve, 138);
});

test('Compact-height and narrower navigation bars are measured with non-negative geometry', () => {
  const fit = computeEditorViewportFit({
    viewportHeight: 740, navTop: 684, pageBottom: 740,
    navHeight: 56, sceneHeight: 52, sceneGap: 6
  });
  assert.deepEqual(fit, {
    navHeight: 56, sceneHeight: 52, sceneGap: 6,
    dockBottom: 62, workspaceReserve: 120
  });
});
