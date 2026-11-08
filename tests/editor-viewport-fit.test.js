import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEditorViewportFit } from '../www/editor-viewport-fit.js';

test('Three-button system navigation reserves only app tabs and the Scene-to-tab gap', () => {
  assert.deepEqual(computeEditorViewportFit({ navHeight: 72, sceneGap: 8 }), {
    navHeight: 72, sceneGap: 8, workspaceReserve: 80
  });
});

test('Gesture navigation uses the same already-inset WebView viewport without a second bottom offset', () => {
  const fit = computeEditorViewportFit({ navHeight: 72, sceneGap: 8 });
  assert.equal(fit.workspaceReserve, 80);
});

test('A resized application tab bar is measured dynamically', () => {
  assert.deepEqual(computeEditorViewportFit({ navHeight: 64, sceneGap: 8 }), {
    navHeight: 64, sceneGap: 8, workspaceReserve: 72
  });
});

test('Fallback dimensions remain finite and non-negative', () => {
  assert.equal(computeEditorViewportFit({ navHeight: 0, sceneGap: 0 }).workspaceReserve, 80);
});
