import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TONE3000_WORKSPACE_KEY,
  normalizeToneCatalogue,
  parseToneCatalogue,
  readToneCatalogue,
  writeToneCatalogue,
  selectToneModel,
} from '../www/tone3000-workspace.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('TONE3000 catalogue normalizes and preserves the complete model list', () => {
  const snapshot = normalizeToneCatalogue('106431', {
    name: 'Bogner Ecstasy 101B',
    creator: { username: 'signaltheoryaudio' },
    description: 'Test tone',
  }, [
    { id: 51, name: 'Model One.nam', model_url: 'https://cdn.example/one.nam', architecture: 'A2' },
    { uuid: 'model-two', title: 'Model Two', modelUrl: 'https://cdn.example/two.nam', size: 2048 },
    { name: 'No URL model' },
  ]);
  assert.equal(snapshot.toneId, '106431');
  assert.equal(snapshot.tone.name, 'Bogner Ecstasy 101B');
  assert.equal(snapshot.tone.creator, 'signaltheoryaudio');
  assert.equal(snapshot.models.length, 2);
  assert.equal(snapshot.models[0].id, '51');
  assert.equal(snapshot.models[1].id, 'model-two');
  assert.equal(snapshot.models[1].model_url, 'https://cdn.example/two.nam');
  assert.equal(snapshot.selectedModelId, '51');
});

test('the workspace persists every model and the last selected model', () => {
  const storage = memoryStorage();
  const initial = normalizeToneCatalogue('106431', { name: 'Bogner Ecstasy 101B' }, [
    { id: 1, name: 'A2-Lite One', model_url: 'https://cdn.example/one.nam' },
    { id: 2, name: 'A2-Lite Two', model_url: 'https://cdn.example/two.nam' },
  ]);
  const selected = selectToneModel(initial, '2');
  assert.equal(writeToneCatalogue(storage, selected), true);
  assert.equal(storage.getItem(TONE3000_WORKSPACE_KEY) !== null, true);
  const restored = readToneCatalogue(storage);
  assert.equal(restored.models.length, 2);
  assert.equal(restored.selectedModelId, '2');
  assert.equal(restored.models[1].name, 'A2-Lite Two');
});

test('invalid catalogue payloads are rejected without throwing', () => {
  assert.equal(parseToneCatalogue('{not json'), null);
  assert.equal(parseToneCatalogue({ version: 2, toneId: '123', tone: {}, models: [] }), null);
  assert.equal(selectToneModel(null, '1'), null);
});

test('selection only changes to a model present in the persisted list', () => {
  const catalogue = normalizeToneCatalogue('123', { title: 'Test' }, [
    { id: 'a', name: 'A', model_url: 'https://cdn.example/a' },
    { id: 'b', name: 'B', model_url: 'https://cdn.example/b' },
  ]);
  assert.equal(selectToneModel(catalogue, 'missing'), null);
  assert.equal(selectToneModel(catalogue, 'b').selectedModelId, 'b');
});

test('storage errors are handled without crashing the TONE3000 screen', () => {
  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
  };
  assert.equal(readToneCatalogue(broken), null);
  assert.equal(writeToneCatalogue(broken, normalizeToneCatalogue('1', {}, [])), false);
});
