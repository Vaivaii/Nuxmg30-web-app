import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');

function ampLayoutsFromSource() {
  const block = html.match(/const AMP_QUICKTONE_LAYOUTS = \\[([\\s\\S]*?)\\n\\];/);
  assert.ok(block, 'QuickTone amp layouts must be defined');
  const rows = [...block[1].matchAll(/ampLayout\\((\\[\\[.*?\\]\\])\\)/g)];
  return rows.map(match => JSON.parse(match[1].replace(/'/g, '"')));
}

test('original MG-30 amp UI contains 35 ordered per-model control layouts', () => {
  const layouts = ampLayoutsFromSource();
  assert.equal(layouts.length, 35);
  assert.deepEqual(layouts[0], [
    ['gain', 'GAIN', 0], ['master', 'MASTER', 1], ['bass', 'BASS', 2],
    ['middle', 'MIDDLE', 3], ['treble', 'TREB', 4], ['level', 'LEVEL', 6]
  ]);
  assert.deepEqual(layouts[3], [
    ['gain', 'GAIN', 0], ['tone', 'TONE', 1], ['master', 'MASTER', 2], ['level', 'LEVEL', 3]
  ]);
  assert.deepEqual(layouts[7], [
    ['gain', 'GAIN', 0], ['master', 'MASTER', 1], ['cut', 'CUT', 2],
    ['bass', 'BASS', 3], ['treble', 'TREB', 4], ['level', 'LEVEL', 5]
  ]);
  assert.deepEqual(layouts[30], [
    ['master', 'MASTER', 0], ['bass', 'BASS', 1], ['lo mids', 'LO MIDS', 3],
    ['hi mids', 'HI MIDS', 4], ['treble', 'TREB', 6], ['level', 'LEVEL', 7]
  ]);
  assert.deepEqual(layouts[31], [
    ['bass', 'BASS', 0], ['mid', 'MID', 1], ['mid freq', 'MID FREQ', 2],
    ['treble', 'TREB', 3], ['volume', 'VOLUME', 5], ['level', 'LEVEL', 6]
  ]);
  assert.deepEqual(layouts[33], [
    ['volume', 'VOLUME', 0], ['treble', 'TREB', 1], ['bass', 'BASS', 2],
    ['bias', 'BIAS', 3], ['level', 'LEVEL', 4]
  ]);
});

test('amp CC holes stay attached to the original parameter and buffer indices', () => {
  const layouts = ampLayoutsFromSource();
  const midiAmp = html.match(/\\[24,25,26,27,28,29,30,31\\].*?AMP: base CC 24/);
  const bufferMap = html.match(/const KNOB_SLOTS=\\[[\\s\\S]*?\\];/);
  assert.ok(midiAmp, 'AMP CC range remains 24..31');
  assert.ok(bufferMap, 'preset buffer slot map remains explicit');
  assert.match(html, /control\\.ccIndex/);
  assert.match(html, /control\\.ccIndex\\]\\);if\\(selectorParam/);
  assert.deepEqual(layouts[0].map(x => x[2]), [0,1,2,3,4,6]);
  assert.deepEqual(layouts[30].map(x => x[2]), [0,1,3,4,6,7]);
  assert.deepEqual(layouts[31].map(x => x[2]), [0,1,2,3,5,6]);
});

test('Mic and Mic Position expose the eight and three original MG-30 choices', () => {
  assert.match(html, /const MIC_OPTIONS = \\[([^\\]]+,){7}[^\\]]+\\]/);
  assert.match(html, /const MIC_POSITION_OPTIONS = \\[([^\\]]+,){2}[^\\]]+\\]/);
  for (const mic of ['1. DYN421','2. S57','3. U87','4. R122','5. R121','6. C414','7. C3000','8. B52']) {
    assert.ok(html.includes(mic), 'Missing mic option: ' + mic);
  }
  for (const position of ['CENTER','MIDDLE','EDGE']) {
    assert.ok(html.includes("'" + position + "'"), 'Missing mic position: ' + position);
  }
  assert.match(html, /mic:7, position:2/);
  assert.match(html, /p==='mic'\\?MIC_OPTIONS:MIC_POSITION_OPTIONS/);
  assert.match(html, /class="parameter-select"/);
});

test('readback, selector sync, and writes use existing discrete parameter encoding', () => {
  assert.match(html, /function sendBlockParam\\([\\s\\S]*?control\\.ccIndex/);
  assert.match(html, /function syncIncomingParameterCC\\([\\s\\S]*?control\\.ccIndex===pi/);
  assert.match(html, /selector\\.value=String\\(encodeParameterValue\\(param,next\\)\\)/);
  assert.match(html, /sendBlockParam\\(selected,param,value\\)/);
  assert.match(html, /normalizeParameterValue\\(param,raw\\)/);
  assert.match(html, /encodeParameterValue\\(param,value\\)/);
});

test('Mic selector styling is present without changing the existing rotary control styles', () => {
  assert.match(css, /#knobs \\.knob-selector \\.parameter-select/);
  assert.match(css, /#knobs \\.dial/);
  assert.doesNotMatch(css, /font:600 11px\\/1\\.25 inherit/);
});
