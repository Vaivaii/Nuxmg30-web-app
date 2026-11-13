import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAiTonePlan, providerFallbackOrder, isRetryableProviderError } from '../www/ai-tone-studio.js';

const catalog = [
  {
    id: 'AMP',
    currentModel: 'Deluxe Rvb',
    models: [
      { name: 'Deluxe Rvb', parameters: [
        { key: 'gain', kind: 'range' },
        { key: 'bass', kind: 'range' },
        { key: 'middle', kind: 'range' },
        { key: 'treble', kind: 'range' }
      ] },
      { name: 'Twin Rvb', parameters: [
        { key: 'gain', kind: 'range' },
        { key: 'master', kind: 'range' }
      ] }
    ]
  },
  {
    id: 'RVB',
    currentModel: 'Spring',
    models: [
      { name: 'Spring', parameters: [{ key: 'decay', kind: 'range' }, { key: 'level', kind: 'range' }] },
      { name: 'Hall', parameters: [{ key: 'decay', kind: 'range' }, { key: 'predelay', kind: 'range' }] }
    ]
  },
  {
    id: 'MOD',
    currentModel: 'CE-1',
    models: [
      { name: 'CE-1', parameters: [{ key: 'depth', kind: 'range' }, { key: 'subd', kind: 'discrete', choices: [{ value: 0 }, { value: 1 }] }] }
    ]
  }
];

test('validates a partial parameter refinement on the current model', () => {
  const plan = validateAiTonePlan({
    summary: 'Menambah sedikit karakter amp.',
    blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 38, middle: 62 } }],
    notes: []
  }, catalog);
  assert.equal(plan.blocks[0].parameters.gain, 38);
  assert.equal(plan.blocks[0].parameters.middle, 62);
});

test('requires every writable parameter when AI changes a model', () => {
  assert.throws(() => validateAiTonePlan({
    blocks: [{ id: 'AMP', model: 'Twin Rvb', parameters: { gain: 40 } }]
  }, catalog), /requires all parameters/);
});

test('accepts a complete model change and multiple blocks', () => {
  const plan = validateAiTonePlan({
    summary: 'Amp dan reverb diperbarui.',
    blocks: [
      { id: 'AMP', model: 'Twin Rvb', parameters: { gain: 40, master: 65 } },
      { id: 'RVB', model: 'Spring', parameters: { decay: 32 } }
    ]
  }, catalog);
  assert.equal(plan.blocks.length, 2);
});

test('rejects unknown blocks, models and parameter names', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'IR', model: 'Third-party', parameters: { level: 50 } }] }, catalog), /not allowed/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Fake Amp', parameters: { gain: 50 } }] }, catalog), /not available in the .* catalog/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { magic: 50 } }] }, catalog), /not available/);
});

test('rejects values outside the normalized range and invalid discrete choices', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 101 } }] }, catalog), /outside the supported choices\/range/);
  assert.throws(() => validateAiTonePlan({ blocks: [{ id: 'MOD', model: 'CE-1', parameters: { subd: 7 } }] }, catalog), /outside the supported choices\/range/i);
});

test('rejects duplicate blocks and plans with no changes', () => {
  assert.throws(() => validateAiTonePlan({ blocks: [
    { id: 'AMP', model: 'Deluxe Rvb', parameters: { gain: 40 } },
    { id: 'AMP', model: 'Deluxe Rvb', parameters: { bass: 45 } }
  ] }, catalog), /duplicate block/i);
  assert.throws(() => validateAiTonePlan({ blocks: [] }, catalog), /invalid|no changes/);
});

test('AI UI has no Apply-to-Editor action and exposes compact provider/model dropdowns plus Undo', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /id="aiToneProviderSelect"/);
  assert.match(source, /id="aiToneActiveModel"/);
  assert.doesNotMatch(source, /data-ai-provider=/);
  assert.match(source, /Undo AI Changes/);
  assert.doesNotMatch(source, /Terapkan ke Editor|Apply to Editor/i);
});

test('live bridge keeps AI writes inside existing parameter CC path and excludes IR/NAM blocks', () => {
  const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(html, /window\.MG30AIToneBridge=Object\.freeze/);
  assert.match(html, /BLOCKS\.slice\(0,9\)/);
  assert.match(html, /await midiSend\(\[0xB0,cc/);
  assert.match(html, /aiSendCC\(parameter\.cc,parameter\.rawValue\)/);
  assert.match(html, /ai-tone-midi-transaction/);
  assert.match(source, /ai-tone-midi-transaction #page-editor/);
  assert.doesNotMatch(html.slice(html.indexOf('window.MG30AIToneBridge=Object.freeze'), html.indexOf('window.MG30CtrlBridge=Object.freeze')), /sendMg30SysEx|midiFrame\(/);
});

test('Android credential plugin uses Android Keystore and authenticated encryption', () => {
  const java = readFileSync(new URL('../native-android/MG30SecureStorePlugin.java', import.meta.url), 'utf8');
  assert.match(java, /AndroidKeyStore/);
  assert.match(java, /AES\/GCM\/NoPadding/);
  assert.match(java, /GCMParameterSpec/);
  assert.match(java, /MODE_PRIVATE/);
  assert.doesNotMatch(java, /Log\.[diwe].*value/);
});


test('AI assistant UI is taller, keeps chat readable and exposes a visible working indicator', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.ok(source.includes('height:auto;min-height:0;max-height:var(--ai-tone-max-height)'));
  assert.ok(source.includes('--ai-tone-max-height:84dvh'));
  assert.ok(source.includes('--ai-tone-max-height:82dvh'));
  assert.ok(source.includes('.ai-tone-messages{display:flex;flex-direction:column;gap:10px;min-height:0'));
  assert.ok(source.includes('max-height:25dvh'));
  assert.ok(source.includes('max-height:28dvh'));
  assert.ok(source.includes('scrollbar-width:thin'));
  assert.match(source, /\.ai-tone-message[^}]*font-size:14px/);
  assert.match(source, /#aiToneOpenButton[^}]*font-size:17px/);
  assert.match(source, /ai-tone-status\[data-state=busy\]::before/);
  assert.match(source, /@keyframes aiToneSpin/);
  assert.match(source, /busy\?'Working…':'Send ↗'/);
});

test('AI assistant interface and generated tone summaries are English', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /Keep summary and notes in English/);
  assert.match(source, /AI ready. MG-30 connection is required for live preset transfer/);
  assert.match(source, /Save API Keys/);
  assert.match(source, /Undo AI Changes/);
  assert.match(source, /Parameters sent to:/);
  assert.doesNotMatch(source, /Menunggu koneksi|Simpan API Key|Kirim ↗|Parameter dikirim|Undo gagal|berhasil merespons/);
});

test('AI AMP catalog exposes only NAM slot 10 as selection-only with no internal controls', () => {
  const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('namProfile?.slot!==10)return;'));
  assert.ok(html.includes('namProfile?.slot!==10)return;'));
  assert.ok(html.includes('NAM slot 10 is selection-only'));
  assert.ok(html.includes('if(blockIndex===3&&ampNamProfileForModelIndex(state.model))return'));
});

test('after NAM import AI deterministically forces AMP to verified slot 10', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /const installed=amp\?\.models\?\.find\(model=>model\.kind==='nam-slot-selection'&&model\.slot===10&&model\.name===activeNamModelName\)/);
  assert.match(source, /const ampChange=\{id:'AMP',model:installed\.name,enabled:true,parameters:\{\}\}/);
  assert.match(source, /if\(existing>=0\)plan\.blocks\[existing\]=ampChange;else plan\.blocks\.unshift\(ampChange\)/);
  assert.match(source, /No preset changes were sent/);
});

test('AI editor snapshot omits NAM internals and NAM mode triggers automatic import on Send', () => {
  const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.ok(html.includes('parameters:namProfile?{}:{...states[index].values}'));
  assert.ok(source.includes('namModeActive=true;activeNamGear=gear'));
  assert.ok(source.includes('if(namModeActive){const namResult=await automaticNamImportForPrompt(prompt);if(namResult?.pendingConnection||namResult?.pendingSelection)return;}'));
});


test('Auto is the default AI provider and provider model options are dropdowns', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /let mode='auto'/);
  assert.match(source, /value="auto" selected>Auto · fastest available/);
  assert.match(source, /id="aiToneActiveModel"/);
  assert.match(source, /providerModels/);
  assert.match(source, /listAiProviderModels/);
  assert.match(source, /api\.groq\.com\/openai\/v1\/models/);
  assert.match(source, /openrouter\.ai\/api\/v1\/models/);
  assert.match(source, /supportedGenerationMethods/);
});

test('AI fallback order is Gemini, Groq, OpenRouter, GPT and retries only transient errors', () => {
  assert.deepEqual(providerFallbackOrder('gemini'), ['gemini','groq','openrouter','gpt']);
  assert.deepEqual(providerFallbackOrder('groq'), ['groq','gemini','openrouter','gpt']);
  assert.equal(isRetryableProviderError(new Error('HTTP 429 rate limit')), true);
  assert.equal(isRetryableProviderError(new Error('HTTP 503 service unavailable')), true);
  assert.equal(isRetryableProviderError(new Error('request timed out')), true);
  assert.equal(isRetryableProviderError(new Error('HTTP 401 invalid API key')), false);
  assert.equal(isRetryableProviderError(new Error('HTTP 400 invalid request')), false);
});


test('Groq and OpenRouter JSON-object requests explicitly include JSON in the messages', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /Return a valid JSON object only\. The response must be JSON/);
  assert.match(source, /response_format:\{type:'json_object'\}/);
  assert.match(source, /max_completion_tokens:2600/);\n  assert.match(source, /reasoning_effort:'low',include_reasoning:false/);
});

test('provider and active model selection use compact dropdown controls instead of large button rows', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /id="aiToneProviderSelect"/);
  assert.match(source, /id="aiToneActiveModel"/);
  assert.match(source, /\.ai-tone-provider-row\{display:grid/);
  assert.doesNotMatch(source, /class="ai-tone-provider on"/);
});


test('Gemini high-demand errors are classified as temporary and eligible for fallback', () => {
  assert.equal(isRetryableProviderError(new Error('This model is currently experiencing high demand. Spikes in demand are usually temporary.')), true);
});

test('AI defaults to automatic fastest-ready provider and model selection while preserving manual providers', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /let mode='auto'/);
  assert.match(source, /value="auto" selected>Auto · fastest available/);
  assert.match(source, /fastestReadyProviderOrder/);
  assert.match(source, /Auto · provider and model selected per request/);
  assert.match(source, /Auto selected .*probe/);
  assert.match(source, /mode==='auto'\|\|ui\.autoFallback\.checked/);
  for (const provider of ['gemini','groq','openrouter','gpt']) assert.match(source, new RegExp('value="'+provider+'"'));
});

test('automatic provider probes use a short timeout and cache the fastest healthy order', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /autoProviderHealthCache\.expires=Date\.now\(\)\+45_000/);
  assert.ok(source.includes('row.id,10000'));
  assert.match(source, /Promise\.all\(candidates\.map/);
  assert.match(source, /sort\(\(a,b\)=>a\.latency-b\.latency\)/);
});



test('Groq TPM and oversized-request errors are fallback eligible',()=>{assert.equal(isRetryableProviderError(new Error('Request too large: tokens per minute (TPM) Limit 8000, Requested 12508')),true);assert.equal(isRetryableProviderError(new Error('Please reduce your message size and try again')),true);});
test('artist tone guidance differentiates Mayer, Petrucci and Satriani',async()=>{const {artistToneGuidance}=await import('../www/ai-tone-studio.js');const a=artistToneGuidance('John Mayer lead tone'),b=artistToneGuidance('John Petrucci lead tone'),c=artistToneGuidance('Joe Satriani lead tone');assert.match(a,/edge-of-breakup/);assert.match(b,/tight high gain/);assert.match(c,/expressive saturated/);assert.notEqual(a,b);assert.notEqual(b,c);});
test('compact tuple tone context preserves discrete choices and drops irrelevant snapshot fields',async()=>{const {compactToneContext}=await import('../www/ai-tone-studio.js');const c=compactToneContext(catalog,[{id:'AMP',model:'Deluxe Rvb',enabled:true,parameters:{gain:30},extra:'drop'}]);assert.deepEqual(c.snapshot,[['AMP','Deluxe Rvb',1,{gain:30}]]);assert.deepEqual(c.catalog.find(x=>x[0]==='MOD')[2][0][3][1],['subd',[0,1]]);});
test('provider model dropdown defaults to auto and permits explicit manual override',()=>{const s=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.match(s,/Auto · fastest available/);assert.match(s,/fastestReadyModel\(provider,key\)/);assert.match(s,/mg30-ai-model-manual-/);assert.ok(s.includes('row.id,10000'));});


test('Groq length-of-messages errors are fallback eligible',()=>{assert.equal(isRetryableProviderError(new Error('Please reduce the length of the messages or completion.')),true);assert.equal(isRetryableProviderError(new Error('tokens per minute (TPM) Limit 8000, Requested 12508')),true);});
test('TONE3000 metadata differentiates explicit boost/OD from unknown',async()=>{const {describeNamCaptureMetadata}=await import('../www/ai-tone-studio.js');const boosted=describeNamCaptureMetadata({name:'Lead amp',description:'Captured with Tube Screamer boost'},{name:'Mesa capture',description:'Overdrive pedal before amp'},'amp-cab');const clean=describeNamCaptureMetadata({name:'Clean direct',description:'No boost or overdrive used'},{name:'Clean capture'},'amp');const unknown=describeNamCaptureMetadata({name:'Studio NAM'},{name:'Capture 1'},'amp-cab');assert.match(boosted.driveMetadata,/mentions boost\/overdrive/);assert.match(clean.driveMetadata,/explicitly indicates no boost/);assert.match(unknown.driveMetadata,/does not specify/);});
test('TONE3000 NAM keeps AI recommendation and user dropdown while hiding long metadata from the picker',()=>{const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.match(source,/namModeActive=true;\s*return \{success:true,tone:selected\.tone/);assert.ok(source.includes('id="aiToneNamCaptureSelect"'));assert.ok(source.includes('data-ai-nam-continue'));assert.match(source,/const choices=candidates\.map/);assert.ok(source.includes('SOURCE METADATA (TONE3000, supporting evidence only)'));const picker=source.slice(source.indexOf('function renderAiNamCapturePicker('),source.indexOf('async function automaticNamImportForPrompt'));assert.ok(picker.includes('AI-recommended NAM capture'));assert.ok(picker.includes('pending.selected.model.name'));assert.ok(picker.includes('pending.selected.reason'));assert.ok(!picker.includes('meta.summary'));assert.ok(!picker.includes('item.metadata.driveMetadata'));});
test('AI retries one invalid Tone Plan against exact catalog before MIDI apply',()=>{const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.ok(source.includes('first proposal did not exactly match the MG-30 catalog'));assert.ok(source.includes('correcting the catalog validation'));assert.ok(source.includes('No MIDI changes were sent'));});
test('Groq GPT-OSS hides reasoning and retries JSON validation failures without JSON mode',()=>{const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.ok(source.includes("reasoning_effort:'low',include_reasoning:false"));assert.ok(source.includes('max_completion_tokens:2600'));assert.ok(source.includes('isGroqJsonValidationError(error)'));assert.ok(source.includes('delete retryBody.response_format'));});
test('OpenRouter no-final-text responses retry without JSON mode and exclude reasoning',()=>{const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.ok(source.includes("reasoning:{effort:'low',exclude:true}"));assert.ok(source.includes("error?.code==='AI_NO_TEXT_OUTPUT'"));assert.ok(source.includes('OpenRouter returned no final text on the first attempt'));});
test('OpenAI-compatible response parser handles text parts and diagnoses reasoning-only responses',async()=>{const {compatibleChatText}=await import('../www/ai-tone-studio.js');assert.equal(compatibleChatText({choices:[{message:{content:[{type:'text',text:'{"status":"ok"}'}]}}]},'openrouter'),'{"status":"ok"}');assert.throws(()=>compatibleChatText({choices:[{finish_reason:'length',message:{content:null,reasoning:'hidden'}}]},'openrouter'),/no final text output.*reasoning-only/);});
