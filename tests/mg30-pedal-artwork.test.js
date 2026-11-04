import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../www/pedal-reference-artwork.js', import.meta.url), 'utf8');
const fakeWindow = {};
new Function('window', source)(fakeWindow);
const render = fakeWindow.renderPedalReferenceSvg;
assert.equal(typeof render, 'function');

const referenceModels = [
  ['GATE', 'Noise Gate'],
  ['CMP', 'Rose Comp'], ['CMP', 'K Comp'], ['CMP', 'Studio Comp'],
  ['EQ', '6-Band EQ'], ['EQ', 'Align EQ'], ['EQ', '10-Band EQ'], ['EQ', 'Para EQ'],
  ['RVB', 'Room'], ['RVB', 'Hall'], ['RVB', 'Plate'], ['RVB', 'Spring'], ['RVB', 'Shimmer'],
  ['DLY', 'Analog Delay'], ['DLY', 'Digital Delay'], ['DLY', 'Modulation'], ['DLY', 'Tape Echo'], ['DLY', 'Reverse'], ['DLY', 'Pan Delay'], ['DLY', 'Duotime'],
  ['MOD', 'CE-1'], ['MOD', 'St Chorus'], ['MOD', 'Vibrator'], ['MOD', 'Flanger'], ['MOD', 'Phase 90'], ['MOD', 'Phase 100'], ['MOD', 'SCF'], ['MOD', 'U-Vibe'], ['MOD', 'Tremolo'], ['MOD', 'Rotary'], ['MOD', 'Harmonist'], ['MOD', 'SCH-1'], ['MOD', 'Mono Octave'],
  ['EFX', 'Distortion+'], ['EFX', 'RC Boost'], ['EFX', 'AC Boost'], ['EFX', 'Dist One'], ['EFX', 'T Scream'], ['EFX', 'Blues Drv'], ['EFX', 'Morning Drv'], ['EFX', 'Eat Dist'], ['EFX', 'Red Dirt'], ['EFX', 'Crunch'], ['EFX', 'Muff Fuzz'], ['EFX', 'Katana'], ['EFX', 'ST Singer'], ['EFX', 'Red Fuzz'], ['EFX', 'Touch Wah'],
  ['EFX', 'Full-OD HP · IMAGE'], ['EFX', 'Horseman OD · IMAGE'], ['EFX', 'NOB ODR · IMAGE'], ['EFX', 'RIV BLUEFLOG · IMAGE'], ['EFX', 'TURBO OD · IMAGE']
];

function getSvg(block, model) {
  const svg = render(block, model);
  assert.ok(svg, block + ' / ' + model + ' should use a dedicated archived-reference renderer');
  assert.ok(svg.startsWith('<svg'), block + ' / ' + model + ' should return an SVG root');
  assert.ok(svg.endsWith('</svg>'), block + ' / ' + model + ' should close the SVG root');
  assert.doesNotMatch(svg, /NaN|undefined/, block + ' / ' + model + ' should not contain invalid geometry');
  assert.doesNotMatch(svg, /<image\b|https?:\/\//i, block + ' / ' + model + ' should be locally drawn, not photo-backed');
  return svg;
}

test('all 53 archived pedal references have dedicated local SVG artwork', () => {
  assert.equal(referenceModels.length, 53);
  for (const [block, model] of referenceModels) {
    const svg = getSvg(block, model);
    assert.ok(svg.length > 2500, block + ' / ' + model + ' artwork should contain actual control/chassis geometry');
  }
});

test('Boss NF-1 Noise Gate follows the uploaded two-knob silver pedal layout', () => {
  const svg = getSvg('GATE', 'Noise Gate');
  assert.match(svg, /Noise Gate NF-1 reference/);
  assert.match(svg, />CHECK<\/text>/);
  assert.match(svg, />SENS<\/text>/);
  assert.match(svg, />DECAY<\/text>/);
  assert.match(svg, />← OUTPUT<\/text>/);
  assert.match(svg, />INPUT →<\/text>/);
  assert.match(svg, />NF-1<\/text>/);
  assert.match(svg, />BOSS<\/text>/);
  assert.match(svg, /cx="210" cy="34" r="7"/);
});

test('large or non-stompbox references retain their own form factors', () => {
  const lexicon = getSvg('RVB', 'Hall');
  const spaceEcho = getSvg('DLY', 'Tape Echo');
  const ce1 = getSvg('MOD', 'CE-1');
  const mxr10 = getSvg('EQ', '10-Band EQ');
  const parametric = getSvg('EQ', 'Para EQ');
  const centaur = getSvg('EFX', 'Horseman OD · IMAGE');

  assert.match(lexicon, /LEXICON/);
  assert.match(lexicon, /480L/);
  assert.match(spaceEcho, /SPACE ECHO/);
  assert.match(spaceEcho, /RE-201/);
  assert.match(ce1, /BOSS CHORUS ENSEMBLE/);
  assert.match(ce1, /VIBRATO/);
  assert.match(mxr10, /10 BAND EQ/);
  assert.match(parametric, /PARAMETRIC EQ · BAND CONTROL/);
  assert.match(centaur, /CENTAUR/);
});

test('pedal models absent from the uploaded archives keep the previous renderer', () => {
  for (const [block, model] of [
    ['MOD', 'CE-2'], ['MOD', 'Detune'], ['DLY', 'Phi Delay'],
    ['RVB', 'Damp'], ['WAH', 'V847'], ['VOL', 'Volume']
  ]) {
    assert.equal(render(block, model), null, block + ' / ' + model + ' must not be replaced with invented reference artwork');
  }
});

test('repeated instances use isolated SVG gradient and pattern IDs', () => {
  const first = getSvg('CMP', 'Studio Comp');
  const second = getSvg('CMP', 'Studio Comp');
  const id1 = first.match(/id="(pedal-art-\d+-metal)"/)?.[1];
  const id2 = second.match(/id="(pedal-art-\d+-metal)"/)?.[1];
  assert.ok(id1);
  assert.ok(id2);
  assert.notEqual(id1, id2);
  assert.ok(first.includes('url(#' + id1 + ')') || first.includes('url(#pedal-art-1-metal)') || first.includes('1176'));
});

test('the original in-app gear renderer loads and calls the local pedal SVG module', () => {
  assert.ok(html.includes('<script type="module" src="./pedal-reference-artwork.js"></script>'));
  assert.ok(html.includes('window.renderPedalReferenceSvg?.(blockId,modelName)'));
  assert.ok(html.indexOf('<script type="module" src="./pedal-reference-artwork.js"></script>') < html.indexOf('<script>'));
  assert.match(source, /document\.addEventListener\('DOMContentLoaded', refreshInitialPedalArtwork/);
  assert.match(source, /queueMicrotask\(refreshInitialPedalArtwork\)/);
});

test('pedal art module remains syntactically valid and has no remote image dependencies', () => {
  assert.doesNotThrow(() => new Function('window', source));
  assert.doesNotMatch(source, /<image\b|https?:\/\//i);
});
