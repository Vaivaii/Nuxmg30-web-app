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
    ['MOD', 'CE-3'], ['MOD', 'Detune II'], ['DLY', 'Phi Delay II'],
    ['RVB', 'Cathedral'], ['WAH', 'Custom Wah'], ['VOL', 'Expression']
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


test('Ross Compressor and Keeley Red Dirt use their archived non-BOSS pedal layouts', () => {
  const ross = getSvg('CMP', 'Rose Comp');
  assert.match(ross, /Ross Compressor reference/);
  assert.match(ross, />ROSS<\/text>/);
  assert.match(ross, />LEVEL<\/text>/);
  assert.match(ross, />SUSTAIN<\/text>/);
  assert.doesNotMatch(ross, /BOSS/);

  const redDirt = getSvg('EFX', 'Red Dirt');
  assert.match(redDirt, /Keeley Red Dirt Pro GE808 reference/);
  assert.match(redDirt, />RED DIRT<\/text>/);
  assert.match(redDirt, /Overdrive Pro GE808/);
  assert.match(redDirt, />OVERDRIVE<\/text>/);
  assert.match(redDirt, />LEVEL<\/text>/);
  assert.match(redDirt, />TONE<\/text>/);
  assert.doesNotMatch(redDirt, /BOSS/);
});

test('1176, Big Muff and OCD lettering is placed clear of their control areas', () => {
  const studioComp = getSvg('CMP', 'Studio Comp');
  assert.match(studioComp, /x="210" y="185"[^>]*>1176<\/text>/);
  assert.doesNotMatch(studioComp, /x="210" y="36"[^>]*>1176<\/text>/);

  const bigMuff = getSvg('EFX', 'Muff Fuzz');
  assert.match(bigMuff, /x="210" y="120"[^>]*>BIG MUFF<\/text>/);
  assert.match(bigMuff, /cx="157" cy="57"/);
  assert.match(bigMuff, /cx="210" cy="57"/);
  assert.match(bigMuff, /cx="263" cy="57"/);
  assert.doesNotMatch(bigMuff, /cx="174" cy="109"/);

  const ocd = getSvg('EFX', 'Full-OD HP · IMAGE');
  assert.match(ocd, /cx="210" cy="68" r="3.5"/);
  assert.match(ocd, /x="210" y="169"[^>]*>OCD<\/text>/);
  assert.doesNotMatch(ocd, /cx="210" cy="141"/);
});


test('Damp and Phi Delay logo and knob spacing match the latest review', () => {
  const damp = getSvg('RVB', 'Damp');
  assert.match(damp, />WET<\/text>/);
  assert.match(damp, />reverb<\/text>/);
  assert.doesNotMatch(damp, /neunaber|technology|>nt<\/text>/i);

  const phi = getSvg('DLY', 'Phi Delay');
  assert.match(phi, />PHI DELAY<\/text>/);
  assert.doesNotMatch(phi, />HALO<\/text>|>CORE<\/text>/);
  assert.match(phi, /cx="132" cy="65"/);
  assert.match(phi, /cx="132" cy="153"/);
  assert.doesNotMatch(phi, /M160 145l-9 -6v12z|M260 145l9 -6v12z/, 'the white side arrows must be removed');
  assert.ok(153 - 29 > 65 + 29, 'FDBK and lower Tone knobs must have a visible gap');
});

test('newly supplied CE-2, Damp, Phi Delay, Detune, Volume/Wah and Octave Shift references have dedicated artwork', () => {
  const ce2 = getSvg('MOD', 'CE-2');
  assert.match(ce2, /BOSS CE-2 Chorus reference/);
  assert.match(ce2, />RATE<\/text>/);
  assert.match(ce2, />DEPTH<\/text>/);
  assert.match(ce2, />CE-2<\/text>/);

  const damp = getSvg('RVB', 'Damp');
  assert.match(damp, /Damp reverb reference/);
  assert.match(damp, />WET<\/text>/);
  assert.match(damp, />mix<\/text>/);
  assert.match(damp, />depth<\/text>/);

  const phi = getSvg('DLY', 'Phi Delay');
  assert.match(phi, /NUX Phi Delay reference layout/);
  assert.match(phi, />PHI DELAY<\/text>/);
  assert.doesNotMatch(phi, />HALO<\/text>|>CORE<\/text>/);
  assert.match(phi, /cx="112" cy="218"/);
  assert.match(phi, /cx="310" cy="218"/);

  const detune = getSvg('MOD', 'Detune');
  assert.match(detune, /DigiTech Luxe anti-chorus reference/);
  assert.match(detune, />Luxe<\/text>/);
  assert.match(detune, />Detune<\/text>/);

  const volume = getSvg('VOL', 'Volume');
  assert.match(volume, /Expression wah\/volume pedal reference/);
  assert.match(volume, /ribbed treadle/);
  const wah = getSvg('WAH', 'V847');
  assert.match(wah, /Expression wah\/volume pedal reference/);

  const octave = getSvg('WAH', 'Octave-Shift');
  assert.match(octave, /DigiTech Whammy octave shift reference/);
  assert.match(octave, />WHAMMY<\/text>/);
  assert.match(octave, />HARMONY<\/text>/);
});

test('model names route to the matching new pedal artwork without changing the MG-30 model map', () => {
  for (const [block, model, label] of [
    ['MOD','CE-2','BOSS CE-2 Chorus reference'],
    ['RVB','Damp','Damp reverb reference'],
    ['DLY','Phi Delay','NUX Phi Delay reference layout'],
    ['MOD','Detune','DigiTech Luxe anti-chorus reference'],
    ['VOL','Volume','Expression wah/volume pedal reference'],
    ['WAH','V847','Expression wah/volume pedal reference'],
    ['WAH','Octave-Shift','DigiTech Whammy octave shift reference']
  ]) {
    const svg = fakeWindow.renderPedalReferenceSvg(block, model);
    assert.ok(svg, block + ' / ' + model + ' should resolve a reference artwork');
    assert.ok(svg.includes(label), block + ' / ' + model + ' should resolve to the intended pedal');
  }
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
