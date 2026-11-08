import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEditorViewportFit } from '../www/editor-viewport-fit.js';

test('Three-button mode reserves actual bottom navigation clearance for the Scene dock', () => {
  const fit = computeEditorViewportFit({ viewportHeight: 760, navTop: 682, sceneHeight: 78, sceneGap: 8 });
  assert.deepEqual(fit, { navClearance: 78, sceneHeight: 78, sceneGap: 8, sceneBottom: 86, workspaceReserve: 172 });
  const sceneTop = 760 - fit.sceneBottom - fit.sceneHeight;
  assert.equal(sceneTop - (760 - fit.workspaceReserve), fit.sceneGap);
});

test('Gesture mode uses the same measured navigation geometry without assuming a 3-button inset', () => {
  const fit = computeEditorViewportFit({ viewportHeight: 820, navTop: 744, sceneHeight: 78, sceneGap: 8 });
  assert.equal(fit.navClearance, 76);
  assert.equal(fit.sceneBottom, 84);
  assert.equal(fit.workspaceReserve, 170);
});

test('Short, narrow and standard viewports yield finite non-negative layout reservations', () => {
  for (const scenario of [
    { viewportHeight: 690, navTop: 620, sceneHeight: 68, sceneGap: 8 },
    { viewportHeight: 740, navTop: 668, sceneHeight: 78, sceneGap: 8 },
    { viewportHeight: 860, navTop: 782, sceneHeight: 78, sceneGap: 8 }
  ]) {
    const fit = computeEditorViewportFit(scenario);
    assert.ok(Number.isFinite(fit.workspaceReserve));
    assert.ok(fit.navClearance >= 0);
    assert.ok(fit.sceneBottom >= 0);
    assert.ok(fit.workspaceReserve > fit.sceneBottom + fit.sceneHeight);
  }
});
