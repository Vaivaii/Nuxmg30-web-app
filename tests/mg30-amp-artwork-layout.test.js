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

test('Bogner, standard 5150 and Orange right-side hardware stays clear of the head edge', () => {
  const bogner = render('Uber', 'Bogner Uberschall');
  assert.ok(bogner.includes('<circle cx="655" cy="289" r="7"'));
  assert.ok(bogner.includes('<circle cx="655" cy="320" r="7"'));
  assert.ok(655 + 7 <= 678);
  assert.ok(bogner.includes('cx="590" cy="309" r="11.5"'), 'last Bogner knob must be inset before the input pair');

  const peavey = render('Vivo', 'Peavey 5150');
  assert.ok(peavey.includes('M628 310v-12'));
  assert.ok(peavey.includes('M654 310v-12'));
  assert.ok(654 + 4 <= 678, 'right 5150 switch must stay inset');

  const orange = render('ORA Rock Lead · IMAGE', 'Orange Rockerverb family');
  assert.ok(orange.includes('<circle cx="642" cy="294" r="7"'));
  assert.ok(642 + 7 <= 664, 'Orange jack must stay inside its lower black control bay');
  assert.ok(orange.includes('cx="621" cy="279" r="11"'), 'rightmost Orange control must leave room for the input jack');
});

test('right-edge controls stay inset on Cali Crunch, Dr. Z, Twin Reverb and Orange', () => {
  const cali = render('Cali Crunch', 'Mesa/Boogie Mark I');
  const drz = render('Mr Z 38', 'Dr. Z MAZ 38 Senior');
  const twin = render('Twin Rvb', 'Fender Twin Reverb');
  const orange = render('ORA Rock Lead · IMAGE', 'Orange Rockerverb family');

  assert.ok(cali.includes('<circle cx="666" cy="179" r="8"'));
  assert.ok(666 + 8 <= 678);
  assert.ok(drz.includes('<circle cx="137" cy="301" r="5.2"'));
  assert.ok(drz.includes('>MAZ 38</text>'));
  assert.ok(drz.includes('<circle cx="625" cy="289" r="7"'));
  assert.ok(drz.includes('<circle cx="625" cy="317" r="7"'));
  assert.ok(625 + 7 <= 678);
  assert.ok(twin.includes('<circle cx="648" cy="174" r="8"'));
  assert.ok(648 + 8 <= 678, 'Twin Reverb jewel light must sit inside the right edge');
  assert.ok(670 + 8 <= 678);
  assert.ok(orange.includes('<circle cx="642" cy="294" r="7"'));
  assert.ok(orange.includes('<circle cx="621" cy="279" r="11"'));
  assert.ok(Math.hypot(642 - 621, 294 - 279) >= 7 + 11, 'Orange input jack must not overlap the final knob');
});

test('Hiwatt and Diezel red indicators and switches remain inside the head faceplate', () => {
  const hiwatt = render('Hiwire', 'Hiwatt DR103');
  assert.ok(hiwatt.includes('<circle cx="627" cy="293" r="8"'));
  assert.ok(hiwatt.includes('M651 302v-12'));
  assert.ok(627 + 8 <= 678 && 651 + 4 <= 678);

  const diezel = render('Die VH4', 'Diezel VH4');
  assert.ok(diezel.includes('<circle cx="658" cy="300" r="8"'));
  assert.ok(diezel.includes('M618 309v-12'));
  assert.ok(diezel.includes('M641 309v-12'));
  assert.ok(658 + 8 <= 678, 'Diezel jewel light must stay within the faceplate');
});

test('Plexi 100 follows the newly uploaded Marshall 1959 Super Lead head reference', () => {
  const plexi = render('Plexi 100', 'Marshall 1959 Super Lead');
  assert.ok(plexi.includes('<rect x="205" y="238" width="370" height="50"'));
  assert.ok(plexi.includes('font-family="Brush Script MT, Segoe Script, cursive"'));
  assert.ok(plexi.includes('>Marshall</text>'));
  assert.ok(plexi.includes('#c9a35f'));
});

test('the ten NAM slots each use the requested amp-family chassis with NAM-only maker branding', () => {
  const slots = Array.from({ length: 10 }, (_, index) => {
    const slot = index + 1;
    const id = slot === 7 ? 60 : 53 + slot;
    return render('NAM Slot ' + String(slot).padStart(2,'0') + ' · ID ' + id);
  });
  assert.equal(new Set(slots).size, 10, 'each NAM slot must have distinct artwork');
  for (const [index, svg] of slots.entries()) {
    assert.match(svg, />NAM<\/text>/, 'NAM slot ' + (index + 1) + ' should carry NAM as its logo');
    assert.doesNotMatch(svg, />(?:Fender|MESA|Boogie|Bogner|Friedman|Soldano|Marshall|Diezel|Peavey)<\/text>/i,
      'NAM slot ' + (index + 1) + ' must not retain a manufacturer wordmark');
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
  assert.ok(slots[0].includes('#08776e'), 'slot 1 should use the Tone King teal reference');
  assert.ok(slots[3].includes('<rect x="532" y="127" width="133"'), 'slot 4 should use the Mesa JP graphic EQ bay');
  assert.ok(slots[9].includes('#c9a35f'), 'slot 10 should use the Plexi gold control fascia');
});

test('amp wordmarks use brand-appropriate type families rather than one shared script font', () => {
  const fender = render('Twin Rvb', 'Fender Twin Reverb');
  const hiwatt = render('Hiwire', 'Hiwatt DR103');
  const diezel = render('Die VH4', 'Diezel VH4');
  const mesa = render('Dual Rect', 'Mesa/Boogie Dual Rectifier');
  assert.match(fender, /font-family="Brush Script MT, Segoe Script, cursive"/);
  assert.match(hiwatt, /font-family="Arial Narrow, Arial, sans-serif"/);
  assert.match(diezel, /font-family="Arial Black, Impact, sans-serif"/);
  assert.match(mesa, /font-family="Georgia, Times New Roman, serif"/);
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
