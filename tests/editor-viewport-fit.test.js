import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEditorViewportFit } from '../www/editor-viewport-fit.js';

test('Three-button navigation moves app tabs above the 48dp system bar and reserves the Scene dock', () => {
  const fit = computeEditorViewportFit({ navHeight: 78, systemBottomInset: 48, sceneGap: 8 });
  assert.deepEqual(fit, { navHeight: 78, systemBottomInset: 48, sceneGap: 8, workspaceReserve: 134 });
});

test('Gesture navigation uses the smaller 24dp system inset without changing Scene dock placement', () => {
  const fit = computeEditorViewportFit({ navHeight: 78, systemBottomInset: 24, sceneGap: 8 });
  assert.deepEqual(fit, { navHeight: 78, systemBottomInset: 24, sceneGap: 8, workspaceReserve: 110 });
});

test('Browser fallback remains finite when the native inset bridge is not present', () => {
  const fit = computeEditorViewportFit({ navHeight: 0, systemBottomInset: 0 });
  assert.equal(fit.workspaceReserve, 86);
  assert.ok(Number.isFinite(fit.workspaceReserve));
});
