import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

function createAmpRenderer() {
  const start = html.indexOf('const MG30_AMP_ART_PALETTES=');
  const end = html.indexOf('function renderGearSvg(blockId,modelName){', start);
  assert.ok(start >= 0 && end > start, 'the in-app AMP artwork renderer must exist');

  const bundle = html.slice(start, end) + '\nreturn renderAmpArtworkForApp;';
  const namNames = Array.from({ length: 10 }, (_, index) =>
    index === 6 ? 'NAM Slot 07 · ID 60' : 'NAM Slot ' + String(index + 1).padStart(2, '0') + ' · ID ' + (54 + index)
  );
  const safeSvgText = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  return new Function('AMP_NAM_SLOT_PROFILES', 'svgEscape', bundle)(
    namNames.map(name => ({ name })),
    safeSvgText
  );
}

const renderAmp = createAmpRenderer();

function render(model, basis = model) {
  const svg = renderAmp(model, basis);
  assert.ok(svg.startsWith('<svg'), model + ' must produce an SVG root');
  assert.ok(svg.endsWith('</svg>'), model + ' must close its SVG root');
  assert.doesNotMatch(svg, /NaN|undefined/, model + ' must not contain invalid geometry');
  return svg;
}

function findTextX(svg, text) {
  const token = '>' + text + '</text>';
  const textEnd = svg.indexOf(token);
  assert.ok(textEnd >= 0, 'expected visible wordmark ' + text);
  const tagStart = svg.lastIndexOf('<text x="', textEnd);
  assert.ok(tagStart >= 0, 'expected SVG text tag for ' + text);
  const valueStart = tagStart + '<text x="'.length;
  const valueEnd = svg.indexOf('"', valueStart);
  return Number(svg.slice(valueStart, valueEnd));
}

test('MESA badge and vent are centred on the chassis in both Rectifier variants', () => {
  const dual = render('Dual Rect', 'Mesa/Boogie Dual Rectifier');
  const triple = render('MB T-Rect Modern · IMAGE', 'Mesa/Boogie Triple Rectifier Modern');

  assert.ok(dual.includes('<rect x="334" y="143" width="92"'));
  assert.ok(triple.includes('<rect x="334" y="144" width="92"'));
  assert.equal(findTextX(dual, 'MESA'), 380);
  assert.equal(findTextX(triple, 'MESA'), 380);
  assert.ok(dual.includes('<rect x="203" y="150" width="355"'));
  assert.ok(triple.includes('<rect x="203" y="151" width="355"'));
});

test('Budda purple tone-control panel is centred and its six knobs sit within it', () => {
  const svg = render('Budda', 'Budda Superdrive');
  assert.ok(svg.includes('<rect x="168" y="116" width="424" height="78"'));
  assert.equal(168 + 424 / 2, 380);
  for (const x of [317, 368, 419, 470, 521, 564]) {
    assert.ok(svg.includes('M' + (x - 10) + ' 163'), 'missing Budda control at x=' + x);
  }
  assert.ok(svg.includes('<ellipse cx="380" cy="274"'));
  assert.ok(svg.includes('BUDDA'));
  assert.ok(svg.includes('cx="615" cy="142"'), 'upper-right jack must be outside the purple control strip');
});

test('PV 5150 right rail has two contained rocker switches, not an overflowing third toggle', () => {
  const svg = render('PV 5150 · IMAGE', 'Peavey 5150 family');
  assert.equal((svg.match(/width="16" height="30"/g) || []).length, 2);
  assert.ok(svg.includes('<rect x="630" y="285" width="16" height="30"'));
  assert.ok(svg.includes('<rect x="658" y="285" width="16" height="30"'));
  assert.ok(658 + 16 <= 678, 'right rocker must remain inside the lower faceplate');
});

test('right-edge controls stay inset on Cali Crunch, Dr. Z, Twin Reverb and Orange', () => {
  const cali = render('Cali Crunch', 'Mesa/Boogie Mark I');
  const drz = render('Mr Z 38', 'Dr. Z MAZ 38 Senior');
  const twin = render('Twin Rvb', 'Fender Twin Reverb');
  const orange = render('ORA Rock Lead · IMAGE', 'Orange Rockerverb family');

  assert.ok(cali.includes('<circle cx="666" cy="179" r="8"'));
  assert.ok(666 + 8 <= 678);
  assert.ok(drz.includes('<circle cx="665" cy="156" r="8"'));
  assert.ok(665 + 8 <= 678);
  assert.ok(twin.includes('<circle cx="670" cy="174" r="8"'));
  assert.ok(670 + 8 <= 678);
  assert.ok(orange.includes('<circle cx="660" cy="309" r="7"'));
  assert.ok(orange.includes('<circle cx="634" cy="279" r="11"'));
  assert.ok(660 - 634 >= 7 + 11, 'Orange input jack must not overlap the final knob');
});

test('reviewed AMP variants all produce complete, non-placeholder SVG', () => {
  const cases = [
    ['Dual Rect', 'Mesa Rectifier'],
    ['MB T-Rect Modern · IMAGE', 'Mesa Triple Rectifier'],
    ['Budda', 'Budda Superdrive'],
    ['PV 5150 · IMAGE', 'Peavey 5150'],
    ['Cali Crunch', 'Mesa Mark I'],
    ['Mr Z 38', 'Dr. Z MAZ 38 Senior'],
    ['ORA Rock Lead · IMAGE', 'Orange Rockerverb'],
    ['Twin Rvb', 'Fender Twin Reverb'],
    ['Super Rvb', 'Fender Super Reverb'],
    ['RIV Knuckle · IMAGE', 'Rivera Knucklehead']
  ];
  for (const [model, basis] of cases) {
    const svg = render(model, basis);
    assert.ok(svg.length > 5000, model + ' artwork should not be a placeholder');
  }
});

test('all inline JavaScript remains syntactically valid after AMP artwork changes', () => {
  const scripts = [];
  let cursor = 0;
  while (true) {
    const open = html.indexOf('<script', cursor);
    if (open < 0) break;
    const contentStart = html.indexOf('>', open) + 1;
    const close = html.indexOf('</script>', contentStart);
    assert.ok(contentStart > 0 && close >= contentStart, 'script tag must close');
    scripts.push(html.slice(contentStart, close));
    cursor = close + '</script>'.length;
  }
  assert.ok(scripts.length >= 1);
  for (const [index, source] of scripts.entries()) {
    if (!source.trim()) continue;
    assert.doesNotThrow(() => new Function(source), 'inline script ' + index + ' must parse');
  }
});
