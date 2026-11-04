import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');

function ampLayoutsFromSource() {
  const block = html.match(/const AMP_QUICKTONE_LAYOUTS = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'QuickTone amp layouts must be defined');
  const rows = [...block[1].matchAll(/ampLayout\((\[\[.*?\]\])\)/g)];
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
  const midiAmp = html.match(/\[24,25,26,27,28,29,30,31\],\s*\/\/ AMP: base CC 24/);
  const bufferMap = html.match(/const KNOB_SLOTS=\[[\s\S]*?\];/);
  assert.ok(midiAmp, 'AMP CC range remains 24..31');
  assert.ok(bufferMap, 'preset buffer slot map remains explicit');
  assert.match(html, /control\.ccIndex/);
  assert.match(html, /slots\[control\.ccIndex\]\);if\(selectorParam/);
  assert.deepEqual(layouts[0].map(x => x[2]), [0,1,2,3,4,6]);
  assert.deepEqual(layouts[30].map(x => x[2]), [0,1,3,4,6,7]);
  assert.deepEqual(layouts[31].map(x => x[2]), [0,1,2,3,5,6]);
});

test('Mic and Mic Position expose the eight and three original MG-30 choices', () => {
  assert.match(html, /const MIC_OPTIONS = \[([^\]]+,){7}[^\]]+\]/);
  assert.match(html, /const MIC_POSITION_OPTIONS = \[([^\]]+,){2}[^\]]+\]/);
  for (const mic of ['1. DYN421','2. S57','3. U87','4. R122','5. R121','6. C414','7. C3000','8. B52']) {
    assert.ok(html.includes(mic), 'Missing mic option: ' + mic);
  }
  for (const position of ['CENTER','MIDDLE','EDGE']) {
    assert.ok(html.includes("'" + position + "'"), 'Missing mic position: ' + position);
  }
  assert.match(html, /mic:7, position:2/);
  assert.match(html, /p==='mic'\?MIC_OPTIONS:MIC_POSITION_OPTIONS/);
  assert.match(html, /class="parameter-select"/);
});

test('readback, selector sync, and writes use existing discrete parameter encoding', () => {
  assert.match(html, /function sendBlockParam\([\s\S]*?control\.ccIndex/);
  assert.match(html, /function syncIncomingParameterCC\([\s\S]*?item\.ccIndex===pi/);
  assert.match(html, /selector\.value=String\(encodeParameterValue\(param,next\)\)/);
  assert.match(html, /sendBlockParam\(selected,param,value\)/);
  assert.match(html, /normalizeParameterValue\(param,raw\)/);
  assert.match(html, /encodeParameterValue\(param,value\)/);
});

test('Mic selector styling is present without changing the existing rotary control styles', () => {
  assert.match(css, /#knobs \.knob-selector \.parameter-select/);
  assert.match(css, /\.dial\{/);
  assert.doesNotMatch(css, /font:600 11px\/1\.25 inherit/);
});


test('DGLASS switch captions match physical top-middle-bottom positions and retain CC indices', () => {
  const block = html.match(/const AMP_THREE_POSITION_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'Three-position switch catalogue must exist');
  assert.match(block[1], /param:'lo mids freq',label:'LO MIDS FREQ',ccIndex:2/);
  assert.match(block[1], /param:'hi mids freq',label:'HI MIDS FREQ',ccIndex:5/);
  assert.match(block[1], /label:'500 Hz',position:'TOP'[\s\S]*?label:'1 kHz',position:'MIDDLE'[\s\S]*?label:'250 Hz',position:'BOTTOM'/);
  assert.match(block[1], /label:'1.5 kHz',position:'TOP'[\s\S]*?label:'3 kHz',position:'MIDDLE'[\s\S]*?label:'750 Hz',position:'BOTTOM'/);
  assert.match(block[1], /label:'500 Hz',position:'TOP',value:0[\s\S]*?label:'1 kHz',position:'MIDDLE',value:1[\s\S]*?label:'250 Hz',position:'BOTTOM',value:2/);
});

test('STARLIFT Contour labels match the physical top-middle-bottom positions on CC index 4', () => {
  const block = html.match(/const AMP_THREE_POSITION_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block);
  assert.match(block[1], /param:'contour',label:'CONTOUR',ccIndex:4/);
  assert.match(block[1], /label:'VINTAGE',position:'TOP'[\s\S]*?label:'OFF',position:'MIDDLE'[\s\S]*?label:'MODERN',position:'BOTTOM'/);
  assert.match(block[1], /label:'VINTAGE',position:'TOP',value:0[\s\S]*?label:'OFF',position:'MIDDLE',value:1[\s\S]*?label:'MODERN',position:'BOTTOM',value:2/);
});

test('physical MG-30 switch enum values map TOP/MIDDLE/BOTTOM to 0/1/2 and write on the original CCs', () => {
  const block = html.match(/const AMP_THREE_POSITION_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block);
  assert.match(block[1], /ccIndex:2[\s\S]*?position:'TOP',value:0[\s\S]*?position:'MIDDLE',value:1[\s\S]*?position:'BOTTOM',value:2/);
  assert.match(block[1], /ccIndex:5[\s\S]*?position:'TOP',value:0[\s\S]*?position:'MIDDLE',value:1[\s\S]*?position:'BOTTOM',value:2/);
  assert.match(block[1], /ccIndex:4[\s\S]*?position:'TOP',value:0[\s\S]*?position:'MIDDLE',value:1[\s\S]*?position:'BOTTOM',value:2/);
  const writer = html.match(/function sendBlockParam\([\s\S]*?\n\}/);
  assert.ok(writer);
  assert.match(writer[0], /item\.value===Number\(value\)/);
  assert.match(writer[0], /sendCC\(cc,choice\.value\)/);
  assert.match(html,/querySelectorAll\('\.switch-position-button'\)\.forEach\(el=>\{/);
  assert.match(html,/choice\.position\+' \/ '\+choice\.label/);
  assert.match(html,/Number\(button\.dataset\.switchValue\)===next/);
  assert.match(html,/control\.ccIndex\]\);if\(selectorParam/);
});

test('IR Collection status prefixes are translated when CRC/device text is appended', () => {
  const english = readFileSync(new URL('../www/english-ui.js', import.meta.url), 'utf8');
  assert.match(english, /"IR tersimpan di perangkat · CRC ":"IR stored on device · CRC "/);
  assert.match(english, /"Import WAV ke salah satu dari 24 slot Collection MG-30\. Pilih slot, lalu validasi dan kirim IR langsung\.":"Import WAV to one of the 24 MG-30 Collection slots/);
});


test('DGLASS switch labels follow the actual physical screen positions from the photos', () => {
  const block = html.match(/const AMP_THREE_POSITION_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block);
  assert.match(block[1], /param:'lo mids freq'[\s\S]*?label:'500 Hz',position:'TOP'[\s\S]*?label:'1 kHz',position:'MIDDLE'[\s\S]*?label:'250 Hz',position:'BOTTOM'/);
  assert.match(block[1], /param:'hi mids freq'[\s\S]*?label:'1.5 kHz',position:'TOP'[\s\S]*?label:'3 kHz',position:'MIDDLE'[\s\S]*?label:'750 Hz',position:'BOTTOM'/);
});

test('STARLIFT switch label positions remain Vintage / Off / Modern from top to bottom', () => {
  const block = html.match(/const AMP_THREE_POSITION_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block);
  assert.match(block[1], /param:'contour'[\s\S]*?label:'VINTAGE',position:'TOP'[\s\S]*?label:'OFF',position:'MIDDLE'[\s\S]*?label:'MODERN',position:'BOTTOM'/);
});

test('discrete switches default visually without sending MIDI until the user selects a position', () => {
  assert.match(html, /const hasReadback=stored!==undefined/);
  assert.match(html, /const defaultChoice=control\.choices\.find\(choice=>choice\.value===control\.defaultValue\)/);
  assert.match(html, /displayValue!==undefined&&Number\(displayValue\)===choice\.value/);
  assert.match(html, /sendBlockParam\(selected,param,value\)/);
  assert.doesNotMatch(html, /switch-raw-value|switch-safe-note|Hardware raw value|Selected MIDI value|awaiting pedal readback|Posisi awal hanya tampilan/);
});

test('six QuickTone effect switches use their existing parameter positions and retain model order', () => {
  const block = html.match(/const EFFECT_DISCRETE_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'Effect switch catalogue must exist');
  assert.match(block[1], /'Katana': \[\{param:'boost',label:'BOOST',type:'two-way-switch'/);
  assert.match(block[1], /'SCF': \[\{param:'chfl',label:'MODE',type:'three-way-switch'/);
  assert.match(block[1], /'U-Vibe': \[\{param:'chvib',label:'MODE',type:'two-way-switch'/);
  assert.match(block[1], /'Harmonist': \[\{param:'minor',label:'MODE',type:'two-way-switch'/);
  assert.match(block[1], /'Touch Wah': \[\{param:'updown',label:'UP \/ DOWN',type:'two-way-switch'/);
  assert.match(block[1], /'Octave-Shift': \[\{param:'updown',label:'UP \/ DOWN',type:'two-way-switch'/);
  assert.match(block[1], /label:'CHORUS',position:'TOP',value:0[\s\S]*?label:'P\.M\. · PITCH MODULATION',position:'MIDDLE',value:1[\s\S]*?label:'FLANGER',position:'BOTTOM',value:2/);
  assert.match(block[1], /label:'CHORUS',position:'TOP',value:1[\s\S]*?label:'VIBRATO',position:'BOTTOM',value:0/);
  assert.match(block[1], /label:'MINOR',position:'TOP',value:1[\s\S]*?label:'MAJOR',position:'BOTTOM',value:0/);
});

test('effect switch CCs resolve through the existing parameter index maps without renumbering', () => {
  assert.match(html, /\[11,12,13\],\s*\/\/ WAH: base CC 11/);
  assert.match(html, /\[18,19,20,21,22,23\],\s*\/\/ EFX: base CC 18/);
  assert.match(html, /\[48,49,50,51,52,53\],\s*\/\/ MOD: base CC 48/);
  assert.match(html, /'Octave-Shift','pedal, updown'/);
  assert.match(html, /'Katana','boost, volume'/);
  assert.match(html, /'Touch Wah','mode, decay, sens, updown, level'/);
  assert.match(html, /'SCF','speed, width, chfl, intensity, subd'/);
  assert.match(html, /'U-Vibe','speed, volume, intensity, chvib, subd'/);
  assert.match(html, /"U-Vibe":"speed, volume, intensity, chvib"/);
  assert.match(html, /'Harmonist','key, minor, harmo, blend'/);
  assert.match(html, /const cc=ccs\[control\.ccIndex\]/);
});

test('switch raw values bypass rotary scaling for both live MIDI and preset readback', () => {
  assert.match(html, /const discrete=isDiscreteSwitch\(control\),next=discrete\?Number\(rawValue\):normalizeParameterValue/);
  assert.match(html, /if\(isDiscreteSwitch\(control\)\)\{[\s\S]*?candidate\[i\]\.values\[control\.param\]=value/);
  assert.match(html, /if\(isDiscreteSwitch\(control\)\)\{[\s\S]*?sendCC\(cc,choice\.value\)/);
  assert.match(html, /knob-two-way/);
  assert.match(css, /#knobs \.two-way-switch\{grid-template-rows:repeat\(2/);
});


test('physical enum reversals are limited to Octave-Shift, Touch Wah, U-Vibe, and Harmonist', () => {
  const block = html.match(/const EFFECT_DISCRETE_SWITCHES = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'Effect switch catalogue must exist');
  assert.match(block[1], /'Octave-Shift':[\s\S]*?defaultValue:1,choices:\[[\s\S]*?label:'UP',position:'UP',value:1[\s\S]*?label:'DOWN',position:'DOWN',value:0/);
  assert.match(block[1], /'Touch Wah':[\s\S]*?defaultValue:1,choices:\[[\s\S]*?label:'UP',position:'UP',value:1[\s\S]*?label:'DOWN',position:'DOWN',value:0/);
  assert.match(block[1], /'U-Vibe':[\s\S]*?defaultValue:1,choices:\[[\s\S]*?label:'CHORUS',position:'TOP',value:1[\s\S]*?label:'VIBRATO',position:'BOTTOM',value:0/);
  assert.match(block[1], /'Harmonist':[\s\S]*?defaultValue:1,choices:\[[\s\S]*?label:'MINOR',position:'TOP',value:1[\s\S]*?label:'MAJOR',position:'BOTTOM',value:0/);
  // Preserve the physically verified controls; these must not inherit the reversal.
  assert.match(block[1], /'Katana':[\s\S]*?defaultValue:0,choices:\[[\s\S]*?label:'OFF',position:'OFF',value:0[\s\S]*?label:'ON',position:'ON',value:1/);
  assert.match(block[1], /'SCF':[\s\S]*?defaultValue:0,choices:\[[\s\S]*?label:'CHORUS',position:'TOP',value:0[\s\S]*?position:'MIDDLE',value:1[\s\S]*?label:'FLANGER',position:'BOTTOM',value:2/);
});


test('AMP and effect switch UI shows positions and labels without debug captions', () => {
  assert.match(html, /class="knob knob-discrete-switch/);
  assert.match(html, /class="switch-position-button/);
  assert.match(html, /<span class="switch-position">/);
  assert.match(html, /<strong>\x27\+escapeHtml\(choice\.label\)/);
  assert.doesNotMatch(html, /Hardware raw value|Selected MIDI value|awaiting pedal readback|switch-raw-value|switch-safe-note/);
  assert.doesNotMatch(css, /switch-raw-value|switch-safe-note/);
});
