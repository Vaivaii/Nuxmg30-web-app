import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\\s\\S]*?)<\\/script>/g)];
const mainScript = scripts
  .filter(([, attributes]) => !/\\bsrc\\s*=/.test(attributes))
  .map(([, , source]) => source)
  .find(source => source.includes('async function connectMG30(options={})'));

assert.ok(mainScript, 'main MG-30 editor inline script must exist');

test('main inline application script parses as JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(mainScript));
});

test('Preset Manager initialization happens only after core editor render and USB-MIDI handler wiring', () => {
  const connectHandler = mainScript.indexOf("$('connectMidi').onclick=()=>connectMG30()");
  const initialRender = mainScript.indexOf('}}catch{}render();');
  const managerInit = mainScript.indexOf('try{\\n initPresetManagerList();');

  assert.notEqual(connectHandler, -1, 'USB-MIDI connect handler must be wired');
  assert.notEqual(initialRender, -1, 'core editor render call must exist');
  assert.notEqual(managerInit, -1, 'Preset Manager initialization must be guarded');
  assert.ok(connectHandler < managerInit, 'connect handler must be wired before optional Preset Manager startup');
  assert.ok(initialRender < managerInit, 'core editor must render before optional Preset Manager startup');

  const guard = mainScript.slice(managerInit, managerInit + 500);
  assert.match(guard, /catch\\(error\\)/, 'Preset Manager startup errors must be caught locally');
  assert.match(guard, /Editor dan USB-MIDI tetap tersedia/, 'fallback must preserve editor and USB-MIDI operation');
});
