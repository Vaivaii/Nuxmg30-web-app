import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../www/ui-redesign.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const studioCss = readFileSync(new URL('../www/studio-daw.css', import.meta.url), 'utf8');
const studioJs = readFileSync(new URL('../www/studio-daw.js', import.meta.url), 'utf8');
const irTransfer = readFileSync(new URL('../www/ir-transfer.js', import.meta.url), 'utf8');

test('app-wide motion layer provides short entrances for every main app tab', () => {
  assert.ok(css.includes('@keyframes mg30-page-enter'));
  assert.ok(css.includes('body>.app>section[id^="page-"]:not(.hidden)'));
  assert.ok(css.includes('animation:mg30-page-enter .18s ease-out both'));
  assert.ok(css.includes('@keyframes mg30-content-enter'));
  for (const id of ['page-editor', 'page-nam', 'page-presets', 'page-studio', 'page-device', 'page-backup']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing app tab: ' + id);
  }
});

test('all native popup dialogs get a lightweight entrance and backdrop fade', () => {
  assert.ok(css.includes('@keyframes mg30-dialog-enter'));
  assert.ok(css.includes('dialog[open]{'));
  assert.ok(css.includes('animation:mg30-dialog-enter .19s'));
  assert.ok(css.includes('dialog[open]::backdrop'));
  assert.ok(css.includes('@keyframes mg30-backdrop-enter'));
  for (const id of ['ctrlEditorDialog', 'presetImportProgressDialog', 'dawStemDialog', 'renameTakeDialog']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing dialog: ' + id);
  }
});

test('menus, controls, cards and toast have bounded micro-interactions', () => {
  assert.ok(css.includes('@keyframes mg30-popup-enter'));
  assert.ok(css.includes('.scene-copy-menu:not([hidden])'));
  assert.ok(css.includes('.app .preset-jump-menu:not(.hidden)'));
  assert.ok(css.includes('.app details[open]>:not(summary)'));
  assert.ok(css.includes('.app button:not(:disabled):not(.daw-playhead-hit):active'));
  assert.ok(css.includes('.app input:not([type="range"])'));
  assert.ok(css.includes('.app .preset-library-card'));
  assert.ok(css.includes('@keyframes mg30-toast-enter'));
  assert.ok(css.includes('.app .toast.show'));
});

test('reduced-motion preference disables app-wide motion', () => {
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('animation-duration:.01ms!important'));
  assert.ok(css.includes('transition-duration:.01ms!important'));
  assert.ok(css.includes('scroll-behavior:auto!important'));
});

test('shared stylesheet cache token is bumped for the motion layer', () => {
  assert.ok(html.includes('ui-redesign.css?v=stable-ui-3'));
  assert.ok(!html.includes('ui-redesign.css?v=stable-ui-1'));
});


test('Studio panels containing the fixed DAW dock use opacity-only entrance animations', () => {
  assert.ok(css.includes('@keyframes mg30-studio-panel-fade{from{opacity:0}to{opacity:1}}'));
  assert.ok(css.includes('#page-studio [data-studio-mode-panel]:not(.hidden),'));
  assert.ok(css.includes('#page-studio [data-daw-page-panel]:not(.hidden){animation:mg30-studio-panel-fade .16s ease-out both}'));
  assert.ok(!css.includes('#page-studio [data-daw-page-panel]:not(.hidden){animation:mg30-content-enter'));
  assert.ok(!css.includes('#page-studio [data-studio-mode-panel]:not(.hidden){animation:mg30-content-enter'));
  assert.ok(studioCss.includes('#page-studio #dawStudioDock'));
  assert.ok(studioCss.includes('position:fixed!important'));
});


test('NAM and TONE3000 panes use opacity-only entrance to preserve mobile width layout', () => {
  assert.ok(irTransfer.includes("namPane.className='nam-ir-tool-pane nam-ir-nam-pane'"));
  assert.ok(irTransfer.includes("tonePane.className='nam-ir-tool-pane nam-ir-tone-pane'"));
  assert.ok(css.includes('@keyframes mg30-nam-pane-fade{from{opacity:0}to{opacity:1}}'));
  assert.ok(css.includes('#page-nam .nam-ir-tool-pane:not([hidden]){animation:mg30-nam-pane-fade .16s ease-out both}'));
  assert.ok(!css.includes('#page-nam .nam-ir-tool-pane:not([hidden]){animation:mg30-content-enter'));
  assert.ok(css.includes('.nam-ir-tools-stage { min-width: 0; }'));
  assert.ok(css.includes('.nam-ir-tool-pane:not([hidden]) { display: block; min-width: 0; margin-top: 7px; }'));
});


test('Editor viewport is fixed and the parameter sheet uses transform-only animation', () => {
  assert.match(css, /editor-parameter-panel\s*\{[\s\S]*?position: absolute !important/);
  assert.match(css, /transform: translate3d\(0, calc\(100% \+ 8px\), 0\)/);
  assert.match(css, /transform \.4s cubic-bezier\(\.22, 1, \.36, 1\)/);
  assert.doesNotMatch(css, /transition:max-height/);
  assert.match(css, /#page-editor:not\(\.hidden\)\s*\{[\s\S]*?overflow: hidden !important/);
});

test('stable main tabs and Studio panels use prior opacity-only transitions',()=>{
 assert.ok(css.includes('body>.app>section[id^="page-"]:not(.hidden){animation:mg30-page-enter .18s ease-out both}'));
 assert.ok(css.includes('@keyframes mg30-studio-panel-fade{from{opacity:0}to{opacity:1}}'));
 assert.ok(!html.includes('function playHorizontalSlide(node,offset)'));
 assert.ok(!studioJs.includes('MG30PlayHorizontalSlide'));
 assert.ok(studioJs.includes('window.requestAnimationFrame(syncStudioPinnedControls)'));
 assert.ok(studioCss.includes('position:fixed!important'));
});
test('non-AMP artwork is reduced by sizing the SVG viewport; AMP stays unchanged',()=>{
 assert.ok(html.includes('const artClass=block.id==="AMP"?"gear-art-amp"'));
 for(const width of ['55%','44%','48%','52%'])assert.ok(html.includes('width:'+width+'!important'));
});
test('parameter panel follows content height with a maximum scroll height',()=>{
 assert.ok(css.includes('height:auto!important;min-height:0!important;max-height:min(64dvh,580px)!important'));
 assert.ok(css.includes('overflow-y:auto!important'));
});

test('Editor dock restores pre-dock stage and Scene card proportions without changing the fixed viewport',()=>{
  const start=html.indexOf('<style id="editor-card-proportions-override">');
  const end=html.indexOf('</style>',start);
  assert.ok(start>=0&&end>start);
  const editorStyle=html.slice(start,end);
  assert.ok(editorStyle.includes('height:116px!important;'));
  assert.ok(editorStyle.includes('height:105px!important;'));
  assert.ok(editorStyle.includes('margin:auto 0 0!important;'));
  assert.ok(editorStyle.includes('min-height:46px!important;'));
  assert.ok(css.includes('body > .app > #page-editor:not(.hidden)'));
  assert.ok(css.includes('overflow: hidden !important'));
  assert.ok(css.includes('body > .app > #page-editor > .editor'));
  assert.ok(!html.includes('function playHorizontalSlide(node,offset)'));
});


test('Editor dock stack is behind bottom navigation and model header is above parameter sheet', () => {
  const layerStart = css.lastIndexOf('/* Final dock stacking order:');
  assert.ok(layerStart >= 0, 'missing final dock stacking override');
  const layerRules = css.slice(layerStart);
  assert.match(layerRules, /\.editor-dock-backdrop\s*\{[^}]*z-index:\s*58\s*!important/s);
  assert.match(layerRules, /\.editor-parameter-dock\s*\{[^}]*z-index:\s*59\s*!important/s);
  assert.match(layerRules, /\.editor-parameter-panel\s*\{[^}]*z-index:\s*1\s*!important/s);
  assert.match(layerRules, /\.editor-model-dock\s*\{[^}]*z-index:\s*2\s*!important/s);
  assert.match(layerRules, /\.nav\s*\{[^}]*z-index:\s*60\s*!important/s);
  assert.ok(html.indexOf('id="editorParameterPanel"') > html.indexOf('id="editorParameterDock"'));
  assert.ok(html.indexOf('class="editor-model-dock"') > html.indexOf('id="editorParameterPanel"'));
});

test('Editor artwork SVGs have explicit bounded widths instead of intrinsic auto width', () => {
  const start = html.indexOf('<style id="editor-card-proportions-override">');
  const end = html.indexOf('</style>', start);
  assert.ok(start >= 0 && end > start);
  const stageRules = html.slice(start, end);
  assert.match(stageRules, /gear-art-amp \.gear-svg\s*\{[^}]*width:62%!important;[^}]*height:100%!important/s);
  assert.match(stageRules, /gear-art-pedal \.gear-svg\s*\{[^}]*width:30%!important;[^}]*height:100%!important/s);
  assert.match(stageRules, /gear-art-cabinet \.gear-svg\s*\{[^}]*width:54%!important;[^}]*height:100%!important/s);
  assert.match(stageRules, /gear-art-expression \.gear-svg\s*\{[^}]*width:34%!important;[^}]*height:100%!important/s);
  assert.match(stageRules, /gear-art-loop \.gear-svg\s*\{[^}]*width:40%!important;[^}]*height:100%!important/s);
  assert.doesNotMatch(stageRules, /gear-art-(?:amp|pedal|cabinet|expression|loop) \.gear-svg\s*\{[^}]*width:auto!important/s);
});


test('final Editor frame preserves complete AMP/pedal artwork and gives the inline knob grid the remaining height',()=>{
  const finalCss=html.match(/<style id="editor-reference-final-v4">([\\s\\S]*?)<\\/style>/)?.[1]||'';
  assert.ok(finalCss.length>8000,'missing authoritative final Editor stylesheet');
  assert.match(finalCss,/#modelVisual\\.model-visual-stage\\{[^}]*height:116px!important/s);
  assert.match(finalCss,/gear-art \\.gear-svg\\{[^}]*object-fit:contain!important/s);
  assert.match(finalCss,/gear-art-amp \\.gear-svg\\{[^}]*width:84%!important/s);
  assert.match(finalCss,/gear-copy\\{[^}]*height:17px!important/s);
  assert.match(finalCss,/gear-copy \\.gear-type,[\\s\\S]*?display:none!important/s);
  assert.match(finalCss,/#knobs\\{[^}]*flex:1 1 0!important/s);
  assert.match(finalCss,/#knobs\\{[^}]*grid-template-columns:repeat\\(4,minmax\\(0,1fr\\)\\)!important/s);
  assert.match(finalCss,/max-height:780px\\)[\\s\\S]*?height:104px!important/s);
  assert.ok(!css.includes('Final compact mobile Editor layout: complete artwork'));
});

test('Scene dock is outside the AMP card, compact, and directly above the application tab bar',()=>{
  const finalCss=html.match(/<style id="editor-reference-final-v4">([\\s\\S]*?)<\\/style>/)?.[1]||'';
  const page=html.slice(html.indexOf('<section id="page-editor">'),html.indexOf('</section>',html.indexOf('<section id="page-editor">')));
  const cardEnd=page.indexOf('</div><details class="control quick-panel">');
  const dockPosition=page.indexOf('id="editorSceneDock"');
  assert.ok(cardEnd>=0&&dockPosition>cardEnd,'Scene dock must follow the Editor card');
  assert.match(finalCss,/#editorSceneDock\\{[^}]*position:relative!important[^}]*flex:0 0 54px!important/s);
  assert.match(finalCss,/body>\\.app>\\.nav\\{[^}]*bottom:0!important[^}]*height:72px!important/s);
  assert.match(finalCss,/padding:0 0 var\\(--editor-workspace-reserve,80px\\)!important/);
  assert.match(finalCss,/scene-button\\{[^}]*height:44px!important/s);
});


test('AMP and IR renderers always include their category label and Based on value in the shared caption rail',()=>{
  const start=html.indexOf('function renderModelVisual(){');
  const end=html.indexOf('\nfunction renderBlockIcon',start);
  assert.ok(start>=0&&end>start,'missing model visual renderer');
  const renderer=html.slice(start,end);
  assert.ok(renderer.includes('?"AMPLIFIER":block.id==="IR"?"SPEAKER CABINET"'), 'AMP and IR category names must remain explicit');
  assert.ok(renderer.includes('class="gear-type">\'+category'), 'category must be rendered in the caption rail');
  assert.ok(renderer.includes('class="based-on"><b>Based on:</b><span>\'+escapeHtml(basis)'), 'Based on label and value must be rendered');
});

test('Editor Scenes remain bottom-anchored inside the fixed card with the approved touch targets',()=>{
  const marker='/* Final compact mobile Editor layout:';
  const start=css.lastIndexOf(marker);
  assert.ok(start>=0);
  const rules=css.slice(start);
  assert.match(rules,/\.scene-bar\s*\{[^}]*margin:auto 0 0!important/s);
  assert.match(rules,/\.scene-bar\s*\{[^}]*padding:10px 0 2px!important/s);
  assert.match(rules,/\.scene-button\s*\{[^}]*min-height:64px!important/s);
  assert.match(rules,/\.main-editor-card\s*\{[^}]*padding-bottom:12px!important/s);
  assert.ok(css.includes('body > .app > #page-editor > .editor'));
  assert.ok(css.includes('overflow: hidden !important'));
});


test('IMAGE-based AMP and EFX keep artwork badge and Based on, but hide only caption IMAGE chip and disclaimer',()=>{
  const start=html.indexOf('function renderModelVisual(){');
  const end=html.indexOf('\nfunction renderBlockIcon',start);
  const renderer=html.slice(start,end);
  assert.ok(renderer.includes('const hideImageCaptionChip=origin==="IMAGE"&&(block.id==="AMP"||block.id==="EFX")'));
  assert.ok(renderer.includes('const hideImageDisclaimer=hideImageCaptionChip'));
  assert.ok(renderer.includes('origin&&!hideImageCaptionChip?'));
  assert.ok(renderer.includes('const artBadgeText=isNamAmp?\'NAM\':origin==="IMAGE"?\'IMAGE\':\'\';'));
  assert.ok(renderer.includes("'+category+'</span>'+originChip+'</div><div class=\"gear-copy-meta\">"));
  assert.ok(renderer.includes(`<b>Based on:</b><span>'+escapeHtml(basis)+'`));
  assert.ok(renderer.includes("'+renderGearSvg(block.id,name)+artBadge+'</div>"));
  assert.ok(renderer.includes("originNote=origin===\"IMAGE\"&&!hideImageDisclaimer?"));
  assert.ok(!renderer.includes('hideImageCaptionChip?\'\':\'IMAGE\''));
  const displayStart=html.indexOf('function modelDisplayLabel(');
  const displayEnd=html.indexOf('\nfunction getModelBasis',displayStart);
  const display=html.slice(displayStart,displayEnd);
  assert.ok(!display.includes('return getModelBaseName(name)'));
  assert.ok(html.includes('MODEL_BASED_ON'));
});
test('floating toast is suppressed by default and opt-in only for preset, NAM and IR synchronization',()=>{
  assert.ok(html.includes("function toast(s,duration=1900,scope=''){if(!['preset','nam','ir'].includes(scope))return;"));
  assert.match(html,/toast\('Preset tersimpan; urutan signal chain diverifikasi',1900,'preset'\)/);
  assert.match(html,/toast\('Nama 10 slot NAM disinkronkan dari MG-30',1900,'nam'\)/);
  assert.match(html,/toast\('Preset imported and all three scenes verified',1900,'preset'\)/);
  assert.ok(irTransfer.includes("'Collection synced ·"));
  assert.match(irTransfer,/window\.toast\([^\n]*,2600,'ir'\)/);
  assert.match(irTransfer,/window\.toast\([^\n]*,2800,'ir'\)/);
  assert.ok(html.includes("toast('Draft dimuat')"),'local draft feedback remains in source but is suppressed by default');
});
