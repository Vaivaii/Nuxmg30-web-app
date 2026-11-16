import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAiTonePlan, providerFallbackOrder, isRetryableProviderError, isLocalToneRefinement, compactToneArchitectIntent, shouldInvokeCriticalReviewer, toneArchitectSystemPrompt, toneLeadInstruction, responseLanguageInstruction, findDefaultGeminiModel, classifyAssistantIntent, inferNamCaptureType, shouldAutoImportNamForTone, estimateTokenCount, outputTokenBudgetForStage, shouldUseMultiAgent, isComplexToneRequest, shouldCooldownProvider, sanitizeNamProfileCandidates, sanitizeNamCaptureCandidates, normalizeNamSearchTerms, compactNamConversation, conciseNamRecommendationReason } from '../www/ai-tone-studio.js';

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

test('AI assistant interface stays English while generated tone summaries follow the request language', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /same language as the USER REQUEST/);
  assert.match(source, /same language as the USER MUSICAL REQUEST/);
  assert.doesNotMatch(source, /Keep summary and notes in English/);
  assert.match(source, /AI ready. MG-30 connection is required for live tone assistance/);
  assert.match(source, /Refresh Status/);
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
  assert.ok(source.includes('shouldAutoImportNamForTone(intent,namModeActive,Boolean(activeNamContext))'));
  assert.ok(source.includes('automaticNamImportForPrompt(prompt,conversation,preparedPlan)'));
});


test('Auto is the default AI provider and provider model options are dropdowns', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /let mode='auto'/);
  assert.match(source, /value="auto" selected>Auto · Workers AI \+ Free Multi-AI/);
  assert.match(source, /id="aiToneActiveModel"/);
  assert.match(source, /providerModels/);
  assert.match(source, /listAiProviderModels/);
  assert.match(source, /\/api\/v1\/ai\/models/);
  assert.match(source, /cloudApiRequest/);
});

test('AI fallback is free-first and GPT is only used after explicit manual selection', () => {
  assert.deepEqual(providerFallbackOrder('gemini'), ['gemini','groq','openrouter']);
  assert.deepEqual(providerFallbackOrder('groq'), ['groq','gemini','openrouter']);
  assert.deepEqual(providerFallbackOrder('openrouter'), ['openrouter','gemini','groq']);
  assert.deepEqual(providerFallbackOrder('auto'), ['gemini','groq','openrouter']);
  assert.deepEqual(providerFallbackOrder('gpt'), ['gpt','gemini','groq','openrouter']);
  assert.equal(isRetryableProviderError(new Error('HTTP 429 rate limit')), true);
  assert.equal(isRetryableProviderError(new Error('HTTP 503 service unavailable')), true);
  assert.equal(isRetryableProviderError(new Error('Provider rejected the request. Check the selected model and request settings. [404 /api/v1/ai/tone-plan]')), true);
  assert.equal(isRetryableProviderError(new Error('Cloud API route not found. [404 /api/v1/ai/tone-plan]')), false);
  assert.equal(isRetryableProviderError(new Error('request timed out')), true);
  assert.equal(isRetryableProviderError(new Error('HTTP 401 invalid API key')), false);
  assert.equal(isRetryableProviderError(new Error('HTTP 400 invalid request')), false);
});

test('AI provider requests use the authenticated Worker and keep vendor endpoints out of the app', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../cloud-worker/src/index.js', import.meta.url), 'utf8');
  assert.match(source, /\/api\/v1\/ai\/tone-plan/);
  assert.match(source, /cloudApiRequest/);
  assert.doesNotMatch(source, /api\.openai\.com|generativelanguage\.googleapis\.com|api\.groq\.com|openrouter\.ai/);
  assert.match(worker, /OPENAI_API_KEY/);
  assert.match(worker, /GEMINI_API_KEY/);
  assert.match(worker, /GROQ_API_KEY/);
  assert.match(worker, /OPENROUTER_API_KEY/);
  assert.match(worker, /X-TONE3000-Authorization/);
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

test('AI defaults to a free Multi-AI team while keeping GPT manual-only', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  assert.match(source, /let mode='auto'/);
  assert.match(source, /value="auto" selected>Auto · Workers AI \+ Free Multi-AI/);
  assert.match(source, /fastestReadyProviderOrder/);
  assert.match(source, /Auto · Cloudflare first; team joins for complex tones/);
  assert.match(source, /No OpenAI GPT API model was probed or selected/);
  assert.match(source, /mode==='auto'\|\|mode==='collab'\|\|ui\.autoFallback\.checked/);
  assert.match(source, /const providers=\['gemini','groq','openrouter'\]/);
  assert.match(source, /GPT · manual \(may be paid\)/);
  for (const provider of ['gemini','groq','openrouter','gpt']) assert.match(source, new RegExp('value="'+provider+'"'));
});

test('automatic model selection uses the model catalogue without spending generation tokens on probes', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  const selection = source.slice(source.indexOf('async function fastestReadyModel'), source.indexOf('async function testProvider'));
  assert.match(selection, /autoProviderHealthCache\.expires=Date\.now\(\)\+45_000/);
  assert.match(selection, /providerModels\[provider\]/);
  assert.match(selection, /localStorage\.setItem\(modelStorageKey\(provider\),chosen\)/);
  assert.doesNotMatch(selection, /row\.id,10000|invokeProvider\(/);
  assert.match(selection, /const providers=\['cloudflare','gemini','groq','openrouter'\]/);
  assert.doesNotMatch(selection, /'gpt'/);
});

test('Groq TPM and oversized-request errors are fallback eligible',()=>{assert.equal(isRetryableProviderError(new Error('Request too large: tokens per minute (TPM) Limit 8000, Requested 12508')),true);assert.equal(isRetryableProviderError(new Error('Please reduce your message size and try again')),true);});
test('artist tone guidance differentiates Mayer, Petrucci and Satriani',async()=>{const {artistToneGuidance}=await import('../www/ai-tone-studio.js');const a=artistToneGuidance('John Mayer lead tone'),b=artistToneGuidance('John Petrucci lead tone'),c=artistToneGuidance('Joe Satriani lead tone');assert.match(a,/edge-of-breakup/);assert.match(b,/tight high gain/);assert.match(c,/expressive saturated/);assert.notEqual(a,b);assert.notEqual(b,c);});
test('compact tuple tone context preserves discrete choices and drops irrelevant snapshot fields',async()=>{const {compactToneContext}=await import('../www/ai-tone-studio.js');const c=compactToneContext(catalog,[{id:'AMP',model:'Deluxe Rvb',enabled:true,parameters:{gain:30},extra:'drop'}]);assert.deepEqual(c.snapshot,[['AMP','Deluxe Rvb',1,{gain:30}]]);assert.deepEqual(c.catalog.find(x=>x[0]==='MOD')[2][0][3][1],['subd',[0,1]]);});
test('provider model dropdown defaults to auto and permits explicit manual override',()=>{const s=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.match(s,/Auto · Workers AI \+ Free Multi-AI/);assert.match(s,/fastestReadyModel\(provider,key\)/);assert.match(s,/mg30-ai-model-manual-/);assert.doesNotMatch(s,/row.id,10000/);});


test('Groq length-of-messages errors are fallback eligible',()=>{assert.equal(isRetryableProviderError(new Error('Please reduce the length of the messages or completion.')),true);assert.equal(isRetryableProviderError(new Error('tokens per minute (TPM) Limit 8000, Requested 12508')),true);});
test('TONE3000 metadata differentiates explicit boost/OD from unknown',async()=>{const {describeNamCaptureMetadata}=await import('../www/ai-tone-studio.js');const boosted=describeNamCaptureMetadata({name:'Lead amp',description:'Captured with Tube Screamer boost'},{name:'Mesa capture',description:'Overdrive pedal before amp'},'amp-cab');const clean=describeNamCaptureMetadata({name:'Clean direct',description:'No boost or overdrive used'},{name:'Clean capture'},'amp');const unknown=describeNamCaptureMetadata({name:'Studio NAM'},{name:'Capture 1'},'amp-cab');assert.match(boosted.driveMetadata,/mentions boost\/overdrive/);assert.match(clean.driveMetadata,/explicitly indicates no boost/);assert.match(unknown.driveMetadata,/does not specify/);});
test('TONE3000 profile results and A2 capture choices render in conversation cards with explicit slot-10 confirmation',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("chatCard('nam-profiles'"));
 assert.ok(source.includes('data-ai-nam-view-captures='));
 assert.ok(source.includes("chatCard('nam-captures'"));
 assert.ok(source.includes('data-ai-nam-capture-radio='));
 assert.ok(source.includes('Import Selected Capture'));
 assert.ok(source.includes("chatCard('nam-confirm'"));
 assert.ok(source.includes('Confirm NAM Transfer'));
 assert.ok(source.includes('Transfer to Slot 10'));
 assert.ok(source.includes('This will replace the current contents of slot 10'));
 assert.equal(source.includes('id="aiToneNamCaptureSelect"'),false);
 assert.ok(source.includes("bridge.importModel(pending.selected.model.id,{slotNumber:10,confirmOverwrite:false,prepare:false})"));
});
test('AI retries one invalid Tone Plan against exact catalog before MIDI apply',()=>{const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');assert.ok(source.includes('first proposal did not exactly match the MG-30 catalog'));assert.ok(source.includes('correcting the catalog validation'));assert.ok(source.includes('No MIDI changes were sent'));});
test('Groq GPT-OSS server adapter hides reasoning and retries JSON validation failures without JSON mode',()=>{const source=readFileSync(new URL('../cloud-worker/src/index.js',import.meta.url),'utf8');assert.ok(source.includes('reasoning_effort: "low", include_reasoning: false'));assert.ok(source.includes('max_completion_tokens: clampOutputTokenLimit(maxOutputTokens)'));
  assert.ok(source.includes('max_tokens: clampOutputTokenLimit(maxOutputTokens)'));
  assert.ok(source.includes('max_output_tokens: clampOutputTokenLimit(maxOutputTokens)'));
  assert.equal(source.includes('retry ? 3200 : 2600'),false);assert.ok(source.includes('error.failedGeneration'));assert.ok(source.includes('retry ? {} : { response_format'));});
test('OpenRouter server adapter excludes reasoning and retries empty or malformed JSON output',()=>{const source=readFileSync(new URL('../cloud-worker/src/index.js',import.meta.url),'utf8');assert.ok(source.includes('reasoning: { effort: "low", exclude: true }'));assert.ok(source.includes('config.api === "openrouter"'));assert.ok(source.includes('JSON Tone Plan|invalid response'));});
test('OpenAI-compatible response parser handles text parts and diagnoses reasoning-only responses',async()=>{const {compatibleChatText}=await import('../www/ai-tone-studio.js');assert.equal(compatibleChatText({choices:[{message:{content:[{type:'text',text:'{"status":"ok"}'}]}}]},'openrouter'),'{"status":"ok"}');assert.throws(()=>compatibleChatText({choices:[{finish_reason:'length',message:{content:null,reasoning:'hidden'}}]},'openrouter'),/no final text output.*reasoning-only/);});


test('manual provider selection refreshes the matching model catalogue and keeps its models visible outside Auto mode',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source,/const handleProviderSelection=\(\)=>\{const selected=ui\.providerSelect\.value;if\(selected!==mode\)setMode\(selected\);\}/);
 assert.match(source,/ui\.providerSelect\.addEventListener\('input',handleProviderSelection\)/);
 assert.match(source,/ui\.providerSelect\.addEventListener\('change',handleProviderSelection\)/);
 assert.match(source,/if\(currentMode\(\)==='auto'\|\|currentMode\(\)==='collab'\)\{select\.replaceChildren\(\)/);
 assert.doesNotMatch(source,/if\(mode==='auto'\)\{select\.replaceChildren\(\)/);
 assert.match(source,/if\(next!=='auto'&&next!=='collab'\)void refreshProviderModels\(next,false\)/);
});

test('Send wraps bridge checks, AI planning and MIDI apply in visible error handling',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const submit=source.slice(source.indexOf(' async function submit(){'),source.indexOf(' async function undo(){'));
 assert.ok(submit.indexOf('try{')<submit.indexOf('const bridge=window.MG30AIToneBridge'));
 assert.match(submit,/Preparing the MG-30 catalog and requesting an AI Tone Plan/);
 assert.match(submit,/await makePlan\(prompt,bridge,audioMetricsForRequest,conversation\)/);
 assert.match(submit,/await bridge\.applyPlan\(plan\)/);
 assert.match(submit,/catch\(error\)[\s\S]*message\('ai','Failed: '\+detail\)[\s\S]*status\('Failed: '\+detail,'error'\)/);
 assert.match(source,/aiToneSend'\)\.addEventListener\('click',\(\)=>\{void submit\(\)\.catch/);
});


test('AI initialization does not bind listeners to missing legacy provider-delete buttons',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 for(const id of ['aiToneDeleteOpenAi','aiToneDeleteGemini','aiToneDeleteGroq','aiToneDeleteOpenRouter']){
  assert.doesNotMatch(source,new RegExp("\\$\\('" + id + "'\\)\\.addEventListener"));
 }
 assert.match(source,/await keyStates\(\)/);
 assert.match(source,/window\.onerror\s*=/);
 assert.match(source,/addEventListener\('unhandledrejection'/);
 assert.match(source,/AI assistant startup/);
});

test('AI runtime failures are rendered into the dynamically created assistant chat',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source,/document\.getElementById\('aiToneMessages'\)/);
 assert.match(source,/RUNTIME ERROR/);
 assert.match(source,/flushAiRuntimeErrors\(\)/);
 assert.match(source,/showAiRuntimeError\('window\.onerror'/);
 assert.match(source,/showAiRuntimeError\('unhandledrejection'/);
});

test('HTML has no duplicate static IDs and AI interactive IDs are created exactly once by the assistant module',()=>{
 const html=readFileSync(new URL('../www/index.html',import.meta.url),'utf8');
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\\bid\\s*=\\s*["']([^"']+)["']/g)].map(match=>match[1]);
 const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
 assert.deepEqual([...new Set(duplicates)],[]);
 for(const id of ['aiToneProviderSelect','aiToneActiveModel','aiTonePrompt','aiToneSend','aiToneMessages','aiToneStatus']){
  assert.equal([...source.matchAll(new RegExp('id="' + id + '"','g'))].length,1,id+' should be created once');
 }
});


test('Tone Architect is mandatory and hands compact musical intent to Lead AI', () => {
  const architect = toneArchitectSystemPrompt();
  const lead = toneLeadInstruction({ style: 'blues rock', feel: 'touch-sensitive' });
  assert.match(architect, /Tone Architect/);
  assert.match(architect, /do not choose device models/);
  assert.match(lead, /Tone Architect has completed/);
  assert.match(lead, /Gear Specialist and Parameter Engineer/);
  assert.match(lead, /blues rock/);
});

test('Tone Architect intent is compact and missing confidence remains unknown', () => {
  const intent = compactToneArchitectIntent({
    tone_intent: {
      reference: 'John Mayer',
      style: 'blues pop',
      feel: 'touch sensitive',
      dynamics: 'volume-knob responsive',
      gain_character: 'clean edge of breakup',
      tonal_balance: 'warm lows, present mids',
      ambience: 'short delay and spring reverb',
      avoid: ['high gain metal', 'excessive treble', 'long wash', 'extra item', 'discard'],
      summary: 'Warm expressive lead'
    }
  }, 'John Mayer lead');
  assert.equal(intent.reference, 'John Mayer');
  assert.equal(intent.style, 'blues pop');
  assert.equal(intent.confidence, null);
  assert.equal(intent.avoid.length, 4);
  assert.ok(Object.keys(intent).length <= 11);
});

test('Tone Architect context is reused for local refinements and rebuilt for new musical goals', () => {
  assert.equal(isLocalToneRefinement('make the delay a little shorter and reduce reverb'), true);
  assert.equal(isLocalToneRefinement('more gain and a warmer tone'), true);
  assert.equal(isLocalToneRefinement('change the style to jazz'), false);
  assert.equal(isLocalToneRefinement('create a new John Mayer lead preset'), false);
});

test('Critical Reviewer triggers only for explicit uncertainty, low confidence or coupled material changes', () => {
  assert.equal(shouldInvokeCriticalReviewer({ confidence: null, blocks: [{}, {}] }), false);
  assert.equal(shouldInvokeCriticalReviewer({ confidence: 0.9, blocks: [{}, {}] }), false);
  assert.equal(shouldInvokeCriticalReviewer({ review_required: true, confidence: 0.9, blocks: [] }), true);
  assert.equal(shouldInvokeCriticalReviewer({ confidence: 0.4, blocks: [{}, {}] }), true);
  assert.equal(shouldInvokeCriticalReviewer({ conflicts: ['amp and drive mismatch'], blocks: [] }), true);
  assert.equal(shouldInvokeCriticalReviewer({ confidence: 0.9, blocks: [{}, {}, {}, {}] }), true);
});

test('live orchestration retains direct applyPlan MIDI path with no manual Apply gate', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  const submit = source.slice(source.indexOf(' async function submit(){'), source.indexOf(' async function undo(){'));
  assert.match(submit, /await makePlan\(prompt,bridge,audioMetricsForRequest,conversation\)/);
  assert.match(submit, /await bridge\.applyPlan\(plan\)/);
  assert.doesNotMatch(submit, /manual approval|confirm.*apply|Apply to Pedal/i);
});

test('Auto orchestration excludes paid GPT while existing Cloud API gateway remains the Tone Plan route', () => {
  const source = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
  const auto = source.slice(source.indexOf('async function fastestReadyProviderOrder'), source.indexOf('async function testProvider'));
  const worker = readFileSync(new URL('../cloud-worker/src/index.js', import.meta.url), 'utf8');
  const cloudApi = readFileSync(new URL('../www/cloud-api.js', import.meta.url), 'utf8');
  assert.match(auto, /\['cloudflare','gemini','groq','openrouter'\]/);
  assert.doesNotMatch(auto, /['\"]gpt['\"]|OPENAI_API_KEY|invokeProvider\('gpt'/);
  assert.match(source, /GPT · manual \(may be paid\)/);
  assert.match(source, /\/api\/v1\/ai\/tone-plan/);
  assert.match(worker, /\/api\/v1\/ai\/tone-plan/);
  assert.match(cloudApi, /CLOUD_API_BASE/);
});


test('Tone Architect fallback text preserves the language of the user request', () => {
  const request = 'Buat tone blues yang hangat dengan gain rendah dan reverb tipis.';
  const intent = compactToneArchitectIntent({}, request);
  assert.equal(intent.summary, request);
  assert.equal(intent.focus, request);
});


test('Bahasa Indonesia is the default AI response language and other user languages are followed',()=>{
 const policy=responseLanguageInstruction();
 assert.match(policy,/Bahasa Indonesia by default/);
 assert.match(policy,/same language as the USER REQUEST/);
 assert.match(toneArchitectSystemPrompt(),/Bahasa Indonesia by default/);
});

test('Gemini automatic model is specifically Gemini 3.1 Flash Lite',()=>{
 const models=[
  {id:'gemini-2.5-flash',name:'Gemini 2.5 Flash'},
  {id:'gemini-3.1-flash',name:'Gemini 3.1 Flash'},
  {id:'gemini-3.1-flash-lite-preview-09-2026',name:'Gemini 3.1 Flash Lite'}
 ];
 assert.equal(findDefaultGeminiModel(models),'gemini-3.1-flash-lite-preview-09-2026');
 assert.equal(findDefaultGeminiModel([{id:'gemini-2.5-flash',name:'Gemini 2.5 Flash'}]),'');
});

test('AI assistant keeps only conversation scrollable with a pinned audio card and message composer',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source, /\.ai-tone-body\{position:relative;display:flex;flex:1 1 auto;flex-direction:column/);
 assert.match(source, /\.ai-tone-messages\{display:flex;flex:0 1 auto/);
 assert.match(source, /\.ai-tone-audio-panel\{flex:0 0 auto/);
 assert.match(source, /\.ai-tone-composer\{display:flex;flex:0 0 auto/);
 assert.match(source, /position:absolute;z-index:8/);
 assert.match(source, /ai-tone-status-accessible/);
 assert.match(source, /renderActivity\(\)/);
});

test('audio diagnosis marks the AI request complete or failed after the final chat response',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const request=source.slice(source.indexOf('async function requestAudioDiagnosis'),source.indexOf('async function finishAudioListening'));
 assert.match(request, /status\('Audio analysis complete\..*'success'\)/);
 assert.match(request, /status\('Audio analysis failed:.*'error'\)/);
});


test('stale manually saved Gemini model cannot override the current model catalogue default',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('manualModelAvailable=manual&&models.some(row=>row.id===saved)'));
 assert.ok(source.includes("if(manual&&!manualModelAvailable)localStorage.setItem(manualKey,'0')"));
 assert.ok(source.includes("if(manual)localStorage.setItem('mg30-ai-model-manual-'+provider,'0')"));
});


test('assistant classifies consultation, preset creation, refinement, audio analysis and NAM search',()=>{
 assert.equal(classifyAssistantIntent('Apa pengaruh Presence terhadap karakter amplifier?'),'consultation');
 assert.equal(classifyAssistantIntent('Buat preset John Mayer menggunakan NAM'),'tone_create');
 assert.equal(classifyAssistantIntent('Kurangi sedikit Treble dan haluskan tone ini'),'tone_refine');
 assert.equal(classifyAssistantIntent('Analisis tone gitar saya sekarang'),'audio_analyze');
 assert.equal(classifyAssistantIntent('Carikan profile NAM Vox AC30'),'nam_search');
 assert.equal(classifyAssistantIntent('Find an amp capture for a Fender Deluxe'),'nam_search');
});
test('NAM capture type defaults to Amp + Cab and follows explicit Amp Only requests',()=>{
 assert.equal(inferNamCaptureType('Carikan NAM capture untuk Vox AC30'),'amp-cab');
 assert.equal(inferNamCaptureType('Find an Amp Only capture for a Deluxe Reverb'),'amp');
 assert.equal(inferNamCaptureType('Search TONE3000 head only profile'),'amp');
 assert.equal(inferNamCaptureType('Find an amp plus cab model'),'amp-cab');
});
test('Audio Listening is collapsed behind a dedicated header toggle and only conversation scrolls',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source,/id="aiToneAudioToggle"/);
 assert.match(source,/aria-controls="aiToneAudioPanel"/);
 assert.ok(source.includes(String.raw`id=\"aiToneAudioPanel\" hidden`));
 assert.ok(source.includes('setAudioPanelExpanded(ui.audioPanel.hidden)'));
 assert.ok(source.includes('.ai-tone-messages{display:flex;flex:1 1 auto'));
 assert.ok(source.includes('.ai-tone-audio-panel{flex:0 0 auto'));
 assert.ok(source.includes('.ai-tone-composer{display:flex;flex:0 0 auto'));
});
test('TONE3000 NAM is always visible with Amp + Cab active by default and a persistent ON/OFF button',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source,/id="aiToneFindNam" type="button" aria-pressed="false">OFF/);
 assert.ok(source.includes('data-ai-nam-gear="amp-cab" aria-pressed="true">Amp + Cab'));
 assert.ok(source.includes('function updateNamControlState()'));
 assert.ok(source.includes('setNamMode(!namModeActive)'));
 assert.match(source,/TONE3000 NAM mode OFF/);
});



test('assistant intent routing separates discussion, preset creation, tone refinement, audio analysis and NAM search',()=>{
 assert.equal(classifyAssistantIntent('Apa pengaruh Presence terhadap karakter amplifier?'),'consultation');
 assert.equal(classifyAssistantIntent('Buat preset John Mayer menggunakan NAM'),'tone_create');
 assert.equal(classifyAssistantIntent('Kurangi sedikit Treble dan haluskan tone ini'),'tone_refine');
 assert.equal(classifyAssistantIntent('Analisis tone gitar saya sekarang'),'audio_analyze');
 assert.equal(classifyAssistantIntent('Carikan profile NAM Vox AC30'),'nam_search');
 assert.equal(classifyAssistantIntent('Find an amp capture for a Fender Deluxe'),'nam_search');
 assert.equal(classifyAssistantIntent('Kenapa tone saya terlalu bright?'),'consultation');
});
test('NAM capture type defaults to Amp + Cab and follows explicit Amp Only requests',()=>{
 assert.equal(inferNamCaptureType('Carikan NAM capture untuk Vox AC30'),'amp-cab');
 assert.equal(inferNamCaptureType('Find an Amp Only capture for a Deluxe Reverb'),'amp');
 assert.equal(inferNamCaptureType('Search TONE3000 head only profile'),'amp');
 assert.equal(inferNamCaptureType('Find an amp plus cab model'),'amp-cab');
});
test('standalone NAM and consultation routes are separate from device-write operations',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('async function answerToneConversation'));
 assert.ok(source.includes('Do not create a Tone Plan'));
 assert.ok(source.includes("if(intent==='consultation')"));
 assert.ok(source.includes('async function searchNamCatalogForPrompt'));
 assert.ok(source.includes("if(intent==='nam_search')"));
 assert.ok(source.includes('Nothing has been imported'));
});
test('recent conversation context is carried into audio diagnosis and Tone Plans',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('const conversationContextText='));
 assert.ok(source.includes('RECENT CONVERSATION CONTEXT'));
 assert.ok(source.includes('makePlan(prompt,bridge,audioMetricsForRequest,conversation)'));
 assert.ok(source.includes('requestAudioDiagnosis(prompt,audioMetricsForRequest,conversation)'));
});
test('standalone NAM search and import stay in chat and never auto-create a preset',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("if(intent==='nam_search'){await searchNamCatalogForPrompt(prompt,conversation);return;}"));
 assert.ok(source.includes("ui.messages.addEventListener('click'"));
 assert.ok(source.includes('async function searchNamCatalogForPrompt'));
 assert.ok(source.includes('async function confirmNamTransfer'));
 assert.equal(source.includes("ui.namResults.addEventListener('click'"),false);
 assert.ok(source.includes("pending.purpose==='create'"));
 assert.ok(source.includes("recommendation,'search',prompt,conversation"));
 assert.ok(source.includes("if(pending.purpose==='create')resumePrompt= pending.prompt")||source.includes("if(pending.purpose==='create')resumePrompt=pending.prompt"));
 assert.ok(source.includes('return {pendingSelection:true}'));
});
test('automatic NAM search synchronizes the visible capture choice with explicit prompt gear',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("namCaptureType=inferNamCaptureType(prompt,namCaptureType)"));
 assert.ok(source.includes("if(namModeActive){activeNamGear=namCaptureType;updateNamControlState();}"));
});


test('Indonesian Tone3000 amp search phrases route to the NAM search tool, not conversational AI',()=>{
 assert.equal(classifyAssistantIntent('Cari ampnya di tone3000'),'nam_search');
 assert.equal(classifyAssistantIntent('Carikan amp-nya di Tone3000'),'nam_search');
 assert.equal(classifyAssistantIntent('Tolong cariin amplifier di Tone3000'),'nam_search');
 assert.equal(classifyAssistantIntent('Find the amp profile on TONE3000'),'nam_search');
});
test('every new preset searches a fresh NAM while same-preset tweaks reuse the installed NAM',()=>{
 assert.equal(shouldAutoImportNamForTone('tone_create',true,true),true);
 assert.equal(shouldAutoImportNamForTone('tone_create',true,false),true);
 assert.equal(shouldAutoImportNamForTone('tone_create',false,true),false);
 assert.equal(shouldAutoImportNamForTone('tone_refine',true,true),false);
 assert.equal(shouldAutoImportNamForTone('tone_refine',true,false),true);
 assert.equal(shouldAutoImportNamForTone('consultation',true,true),false);
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("intent==='tone_create'&&!resumesImportedNamPlan"));
 assert.ok(source.includes("intent==='tone_create'&&!pendingMatchesThisRequest"));
});
test('NAM-backed tone summaries cannot claim that an unrelated built-in amp was applied',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("Tone updated using the installed TONE3000 NAM capture in slot 10."));
 assert.ok(source.includes('The installed NAM capture remained the amp source'));
 assert.ok(source.includes('AUTHORITATIVE AMP SOURCE: TONE3000 NAM is installed in MG-30 slot 10'));
});
test('Audio Listening header uses a waveform icon and shares the Settings frame dimensions',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('<svg viewBox="0 0 24 24" width="18" height="18"'));
 assert.ok(source.includes('.ai-tone-head-actions .ai-tone-icon{width:38px;height:38px;min-width:38px;min-height:38px;flex:0 0 38px'));
 assert.equal(source.includes('>♫</button>'),false);
});


test('new artist and amp targets override old conversation context during planning and NAM selection',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('The CURRENT USER REQUEST is authoritative'));
 assert.ok(source.includes('never reuse a previous artist or amp search query'));
 assert.ok(source.includes('must never override a newly named artist, amp or target'));
 assert.ok(source.includes('previous artist references must not override a newly named artist or target'));
});


test('Auto mode uses a single AI for ordinary tone work and Multi-AI only for complex new presets',()=>{
 assert.equal(shouldUseMultiAgent('Buat tone Joe Satriani','tone_create','auto',false),false);
 assert.equal(shouldUseMultiAgent('Buat tone blues hangat dengan gain rendah','tone_create','auto',false),false);
 assert.equal(shouldUseMultiAgent('Build a layered dual-amp rig with separate clean and lead scenes, tempo-synced delays, parallel modulation and a specific intro-to-solo transition','tone_create','auto',false),true);
 assert.equal(shouldUseMultiAgent('Buat preset biasa','tone_create','collab',false),true);
 assert.equal(shouldUseMultiAgent('Kurangi treble sedikit','tone_refine','collab',true),false);
 assert.equal(shouldUseMultiAgent('Jelaskan fungsi Presence','consultation','auto',false),false);
 assert.equal(isComplexToneRequest('Build a dual-amp rig'),true);
});
test('agent stages use bounded output-token budgets and a clearly-labelled local estimate',()=>{
 assert.equal(outputTokenBudgetForStage('deriving TONE3000 search terms'),180);
 assert.equal(outputTokenBudgetForStage('defining the musical direction'),260);
 assert.equal(outputTokenBudgetForStage('building your Tone Plan'),1350);
 assert.equal(outputTokenBudgetForStage('checking a material conflict or coupled change'),850);
 assert.equal(outputTokenBudgetForStage('answering your tone question'),520);
 assert.equal(estimateTokenCount('12345678'),2);
 assert.equal(estimateTokenCount(''),1);
});
test('provider cooldown marks rate limits and temporary upstream failures, not auth or Worker route errors',()=>{
 assert.equal(shouldCooldownProvider({status:429,message:'rate limit'}),true);
 assert.equal(shouldCooldownProvider({upstreamStatus:503,message:'unavailable'}),true);
 assert.equal(shouldCooldownProvider({status:404,message:'Cloud API route not found'}),false);
 assert.equal(shouldCooldownProvider({status:401,message:'Unauthorized'}),false);
});
test('Tone Architect passes one compact state to Lead; correction and Reviewer only receive affected catalog blocks',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("JSON.stringify({state:'MG30_TONE_INTENT_V1',request:prompt,intent:toneIntent,installed_nam:"));
 assert.ok(source.includes('toneLeadInstruction(hasArchitect?null:toneIntent,hasArchitect)'));
 assert.ok(source.includes('affected_catalog:compactToneContext(affectedCatalog,affectedSnapshot)'));
 assert.ok(source.includes('affected_catalog:compactToneContext(reviewCatalog,reviewSnapshot)'));
 assert.ok(source.includes('!correctionUsed&&shouldInvokeCriticalReviewer(first)'));
});
test('same-tone refinements request parameter deltas without regenerating a preset chain',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('DELTA PATCH MODE: This is a focused edit to the CURRENT tone.'));
 assert.ok(source.includes('only changed blocks and only changed parameter keys'));
 assert.ok(source.includes('Do not regenerate the chain'));
});
test('conversation memory is four recent turns and AI usage logging omits prompt contents',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('value.slice(0,1400)'));
 assert.ok(source.includes('while(dialogueContext.length>4)'));
 assert.ok(source.includes("console.info('[MG30 AI TOKEN USAGE]',record)"));
 assert.ok(source.includes("usage_source:usage?'provider':'estimated_chars_div_4'"));
 const plan=source.slice(source.indexOf('async function makePlan'),source.indexOf('async function submit'));
 assert.equal(plan.includes('RECENT CONVERSATION:'),false);
});
test('per-stage token limits are sent through Cloud API while usage is read only when provided by Worker',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('body: { provider, model, system, prompt, maxOutputTokens }'));
 assert.ok(source.includes("value:'provider'")===false);
 assert.ok(source.includes("value:result.usage||null")||source.includes("value:result.usage || null"));
 assert.ok(source.includes('logAiTokenUsage(provider,result?.__aiModel||model,stage,maxOutputTokens,system,user,result)'));
});


test('Lead state-passing retains the current user request but excludes prior chat history and raw audio',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const plan=source.slice(source.indexOf('async function makePlan'),source.indexOf('async function submit'));
 assert.ok(plan.includes("state:'MG30_TONE_INTENT_V1',request:prompt,intent:toneIntent"));
 assert.equal(plan.includes('RECENT CONVERSATION:'),false);
 assert.equal(plan.includes('MEASURED USB AUDIO'),true);
});


test('AI Settings uses compact provider and usage accordions while NAM controls remain visible',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('id="aiToneProviderDetails"'));
 assert.ok(source.includes('id="aiToneUsageDetails"'));
 assert.ok(source.includes('id="aiToneProviderSelect"'));
 assert.ok(source.includes('id="aiToneActiveModel"'));
 assert.ok(source.includes('id="aiToneNamPanel"'));
 assert.ok(source.includes('data-ai-nam-gear="amp"'));
 assert.ok(source.includes('data-ai-nam-gear="amp-cab"'));
 assert.ok(source.includes('Reset Session'));
});
test('NAM capture selection updates only the selected card and transfer still requires USB-MIDI',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("ui.messages.addEventListener('change'"));
 assert.ok(source.includes("historyItem.data.selectedId=String(radio.value)"));
 assert.ok(source.includes("label.classList.toggle('selected',input.checked)"));
 assert.equal(source.includes("historyItem.data.selectedId=String(radio.value);renderHistory();"),false);
 assert.ok(source.includes("if(!editor?.isConnected?.())throw new Error('Connect the MG-30 via USB-MIDI before transferring the selected NAM to slot 10.')"));
 assert.ok(source.includes("const result=await bridge.importModel(pending.selected.model.id,{slotNumber:10,confirmOverwrite:false,prepare:false})"));
});


test('TONE3000 profile AI payload is allow-listed and description is capped at 100 characters',()=>{
 const rows=sanitizeNamProfileCandidates([{id:42,title:'Fender Twin Reverb',name:'ignored',creator:'vaivaii',tags:[{name:'clean'},{name:'spring'}],description:'x'.repeat(180),avatar_url:'https://secret/avatar',created_at:'today',downloads:99,file_url:'https://secret/file',makes:['Fender'],sizes:['large'],gear:'amp-cab'}]);
 assert.deepEqual(Object.keys(rows[0]),['id','name','creator','tags','description']);
 assert.equal(rows[0].id,'42');assert.equal(rows[0].description.length,100);
 assert.deepEqual(rows[0].tags,['clean','spring']);
 assert.equal(JSON.stringify(rows).includes('avatar_url'),false);
 assert.equal(JSON.stringify(rows).includes('file_url'),false);
 assert.equal(JSON.stringify(rows).includes('downloads'),false);
});

test('TONE3000 A2 capture AI payload keeps only ID, name, size and concise gain/cab notes',()=>{
 const rows=sanitizeNamCaptureCandidates([
  {id:'m1',name:'Clean 1',size:1871,weights:[1,2,3],gain_character:'clean headroom',cab_character:'open-back 2x12',description:'captured with mild breakup',model_url:'https://secret/file',architecture_version:2,created_at:'today',user:{name:'private'}},
  {id:'m2',name:'Rejected',size:900,model_url:'https://secret/2'}
 ],['m2']);
 assert.deepEqual(Object.keys(rows[0]),['id','name','size','notes']);
 assert.equal(rows[0].size,3);
 assert.match(rows[0].notes,/clean headroom/);
 assert.match(rows[0].notes,/open-back 2x12/);
 assert.equal(JSON.stringify(rows).includes('model_url'),false);
 assert.equal(JSON.stringify(rows).includes('architecture_version'),false);
});

test('TONE3000 chooser reasons are capped at two sentences and 30 words; chooser output ceiling is 320',()=>{
 const reason=conciseNamRecommendationReason('Profil ini paling dekat dengan karakter clean yang diminta dan punya respons dinamis. Deskripsinya juga menyebut kabinet yang relevan. Kalimat ketiga harus dibuang.');
 assert.equal(reason.split(/\s+/).length<=30,true);
 assert.equal((reason.match(/[.!?]/g)||[]).length<=2,true);
 assert.equal(outputTokenBudgetForStage('choosing the closest NAM tone'),320);
 assert.equal(outputTokenBudgetForStage('selecting the closest A2-Lite capture'),320);
});

test('Workers AI derives fresh TONE3000 search_terms after Tone Plan validation and reuses the prepared plan after import',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/TONE3000 SEARCH TERMS:[\s\S]*search_terms/);
 assert.match(source,/invokeWorkersAILightTask\('tone3000-search-terms'/);
 assert.match(source,/if\(namModeActive&&!activeNamContext\)[\s\S]*deriveNamSearchQuery\(prompt,conversation\)/);
 assert.match(source,/const searchTerms=normalizeNamSearchTerms\(preparedPlan\?\.search_terms\)/);
 assert.match(source,/renderNamSearchResults\(rows,searchTerms,recommendation,'create',prompt,conversation,preparedPlan\)/);
 assert.match(source,/preparedPlan=await makePlan\(prompt,bridge,audioMetricsForRequest,conversation\)/);
 assert.match(source,/preparedPlan:completed\.preparedPlan\|\|null/);
 assert.match(source,/const plan=preparedPlan\|\|await makePlan/);
 assert.match(source,/sanitizeNamProfileCandidates\(tones,12\)/);
 assert.match(source,/sanitizeNamCaptureCandidates\(eligible,rejected,18\)/);
 assert.match(source,/conciseNamRecommendationReason\(result\.reason\)/);
});
test('free tone discussion uses the Workers AI light-task route as its primary path',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.match(source,/invokeWorkersAILightTask\('tone-discussion'/);
 assert.match(source,/invokeWorkersAILightTask\('tone3000-search-terms'/);
 assert.match(source,/const WORKERS_AI_MODEL = '@cf\/google\/gemma-4-26b-a4b-it'/);
 assert.match(source,/providerNames=\{[^}]*cloudflare:'Cloudflare Workers AI'/);
});

test('profile and capture recommendation UI retain full local TONE3000 objects',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('tones:rows.map(tone=>({...tone}))'));
 assert.ok(source.includes('const choices=candidates.map(model=>({tone,model,snapshot'));
 assert.match(source,/bridge\.importModel\(pending\.selected\.model\.id,\{slotNumber:10/);
});


test('Cloudflare Workers AI is visible as the fifth provider and can be tested directly',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('id="aiCloudflareBindingState"'));
 assert.ok(source.includes('id="aiToneTestCloudflare"'));
 assert.ok(source.includes("$('aiToneTestCloudflare').addEventListener('click',()=>{void testWorkersAI();})"));
 assert.ok(source.includes("ui.providerSummary.textContent=configured+' / 5 configured'"));
 assert.ok(source.includes("provider==='cloudflare'?(providers.cloudflare?'Binding AI active · Gemma 4 ready':'Binding AI unavailable')"));
 assert.ok(source.includes('Cloudflare Workers AI is first for light tasks and the first member of the complex Tone Architect team.'));
 assert.ok(source.includes('Tone Plan fallback: Gemini → Groq → OpenRouter → Cloudflare Workers AI.'));
 assert.ok(source.includes('<option value="cloudflare">Cloudflare Workers AI · Gemma 4</option>'));
 assert.ok(source.includes("if(provider==='cloudflare'){"));
 assert.ok(source.includes('async function testWorkersAI(){'));
 assert.ok(source.includes("invokeWorkersAILightTask('tone-discussion'"));
});

test('manual Cloudflare provider starts with Workers AI before free providers',()=>{
 assert.deepEqual(providerFallbackOrder('cloudflare'),['cloudflare','gemini','groq','openrouter']);
});


test('Auto mode keeps ordinary Tone Plans and every TONE3000 ranking stage on Cloudflare Workers AI only',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("if(mode==='auto'||mode==='cloudflare'){"));
 assert.ok(source.includes("first=await invokeProvider('cloudflare',workerKey,singleSystem,singleUser,WORKERS_AI_MODEL"));
 assert.ok(source.includes("if(mode==='auto'){"));
 assert.ok(source.includes("if(await secret('cloudflare'))order=['cloudflare'];"));
 assert.ok(source.includes("invokeWorkersAILightTask('tone-discussion'"));
 assert.ok(source.includes("invokeWorkersAILightTask('tone3000-search-terms'"));
 assert.ok(source.includes("invokeWorkersAILightTask('tone3000-profile-ranking'"));
 assert.ok(source.includes("invokeWorkersAILightTask('tone3000-capture-selection'"));
});

test('complex Auto Tone Architect team starts with Cloudflare before Gemini, Groq and OpenRouter',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const team=source.slice(source.indexOf('async function fastestReadyProviderOrder'),source.indexOf('async function testProvider'));
 assert.match(team,/const providers=\['cloudflare','gemini','groq','openrouter'\]/);
 assert.ok(source.includes('async function resolveFreeProviderTeam()'));
 assert.ok(source.includes('hasArchitect=team.length>=2&&!localRefinement'));
 assert.ok(source.includes("'Tone Architect · '+providerNames[architectMember.provider]"));
});


test('manual TONE3000 profile selection shows a persistent loading card and replaces it with A2 capture choices',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes("if(item.type==='nam-captures-loading')"));
 assert.ok(source.includes("chatCard('nam-captures-loading',{cardId:loadingCardId,tone:"));
 assert.ok(source.includes("renderAiNamCapturePicker(pending,loadingCardId)"));
 assert.ok(source.includes("updateChatCard(replaceCardId,'nam-captures',data)"));
 assert.ok(source.includes('removeChatCard(loadingCardId)'));
 assert.ok(source.includes('window.requestAnimationFrame(()=>window.requestAnimationFrame(scroll))'));
 assert.ok(source.includes('const selectedModel=aiChoice?.model||candidates[0]'));
});


test('selecting a manual A2 capture updates only its card and never scrolls the conversation',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const start=source.indexOf("ui.messages.addEventListener('change',event=>{");
 const end=source.indexOf("ui.messages.addEventListener('click',async event=>{",start);
 assert.ok(start>=0&&end>start,'capture radio change handler must exist');
 const handler=source.slice(start,end);
 assert.ok(handler.includes("historyItem.data.selectedId=String(radio.value)"));
 assert.ok(handler.includes("card.querySelectorAll('input[data-ai-nam-capture-radio]')"));
 assert.ok(handler.includes("label.classList.toggle('selected',input.checked)"));
 assert.equal(handler.includes('renderHistory()'),false);
 assert.equal(handler.includes('scrollMessagesToEnd()'),false);
 assert.equal(handler.includes('scrollTop='),false);
});

test('replacing the loading card preserves the conversation and body scroll positions',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('const updateChatCard=');
 const end=source.indexOf('const removeChatCard=',start);
 assert.ok(start>=0&&end>start,'in-place card updater must exist');
 const updater=source.slice(start,end);
 assert.ok(updater.includes('existing.outerHTML=renderNamChatCard(item)'));
 assert.ok(updater.includes("const scrollArea=$('aiToneScrollArea')"));
 assert.ok(updater.includes('const scrollTop=scrollArea?.scrollTop||0'));
 assert.ok(updater.includes('if(scrollArea)scrollArea.scrollTop=scrollTop'));
 assert.equal(updater.includes('renderHistory()'),false);
});

test('reopening the AI assistant does not reset body/chat scroll or force focus onto the composer',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('const openPanel=');
 const end=source.indexOf('const closePanel=',start);
 assert.ok(start>=0&&end>start,'openPanel handler must exist');
 const openPanel=source.slice(start,end);
 assert.ok(openPanel.includes('shade.classList.add(\'on\')'));
 assert.ok(openPanel.includes('sheet.classList.add(\'on\')'));
 assert.equal(openPanel.includes('scrollTop='),false);
 assert.equal(openPanel.includes('prompt.focus'),false);
 assert.equal(openPanel.includes('scrollMessagesToEnd'),false);
});


test('Audio Listening and Settings stay pinned outside conversation scroll; conversation has no artificial tail space',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const settings=source.indexOf('<div class="ai-tone-settings" id="aiToneSettings">');
 const region=source.indexOf('<div class="ai-tone-scroll-area" id="aiToneScrollArea">');
 const audio=source.lastIndexOf('<section class=',source.indexOf('AUDIO LISTENING'));
 const composer=source.indexOf('<div class="ai-tone-composer">');
 assert.ok(settings>=0&&settings<region,'Settings overlay must be outside and before the scroll region');
 assert.ok(source.includes('</div><div class="ai-tone-scroll-area" id="aiToneScrollArea">'),'Settings wrapper must close before the conversation scroller begins');
 assert.ok(region>=0&&audio>region&&composer>audio,'conversation, Audio Listening dock, and composer must be separate siblings');
 assert.ok(source.includes('</div></div><section class='),'conversation body and scroll region must close before Audio Listening begins');
 const conversation=source.slice(region,audio);
 assert.ok(conversation.includes('id="aiToneMessages"'));
 assert.equal(conversation.includes('aiToneSettings'),false,'Settings must not be nested in the conversation scroller');
 assert.equal(conversation.includes('aiToneAudioPanel'),false,'Audio Listening must not be nested in the conversation scroller');
 const audioDock=source.slice(audio,composer);
 assert.ok(audioDock.includes('ai-tone-audio-indicator'),'USB status appears beside the Audio Listening title');
  assert.ok(audioDock.includes('aiToneAudioStatus'),'status remains available to accessibility');
  assert.equal(audioDock.includes('ai-tone-audio-note'),false,'visible audio footnote is removed');
 assert.ok(source.includes('setAudioPanelExpanded(ui.audioPanel.hidden)'),'header toggle must still collapse/expand the pinned audio dock');
 const cssStart=source.indexOf(".ai-tone-sheet{box-sizing:border-box!important;display:grid!important");
 const cssEnd=source.indexOf("';",cssStart);
 assert.ok(cssStart>=0&&cssEnd>cssStart,'authoritative grid dock CSS must exist');
 const css=source.slice(cssStart,cssEnd);
 assert.ok(css.includes('grid-template-rows:auto minmax(0,1fr) auto auto!important;'));
 assert.ok(css.includes('grid-row:2!important;display:block!important;min-width:0!important;min-height:0!important;'));
 assert.ok(css.includes('.ai-tone-body{box-sizing:border-box!important;position:relative!important;display:flex!important;flex:0 0 auto!important;flex-direction:column!important;min-width:0!important;min-height:0!important;'));
 assert.equal(css.includes('min-height:100%!important;'),false,'conversation content must not be forced to viewport height');
 assert.ok(css.includes('.ai-tone-audio-panel{grid-row:3!important;'));
 assert.ok(css.includes('.ai-tone-settings{position:absolute!important;z-index:10!important;top:64px!important;'));
 assert.ok(css.includes('.ai-tone-composer{grid-row:4!important;position:relative!important;z-index:3!important;'));
 assert.ok(css.includes('overflow-y:auto!important;'));
 assert.ok(source.includes("const scrollArea=$('aiToneScrollArea');if(scrollArea)scrollArea.scrollTop=scrollArea.scrollHeight;"),'activity updates must scroll the actual conversation container');
});

test('Audio Listening and composer docks use rounded floating surfaces and Settings height follows content',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const polishStart=source.indexOf("audioStyle.textContent += '.ai-tone-audio-panel{box-sizing:border-box!important;");
 const polishEnd=source.indexOf("';",polishStart);
 assert.ok(polishStart>=0&&polishEnd>polishStart,'dock and settings polish stylesheet must exist');
 const css=source.slice(polishStart,polishEnd);
 assert.ok(css.includes('.ai-tone-audio-panel{box-sizing:border-box!important;margin:0 10px 8px!important;'));
 assert.ok(css.includes('border-radius:20px!important;'));
 assert.ok(css.includes('.ai-tone-composer{box-sizing:border-box!important;width:auto!important;margin:0 10px 10px!important;'));
 assert.ok(css.includes('background:linear-gradient(155deg,rgba(25,39,26,.98),rgba(12,20,14,.99))!important;'));
 assert.ok(css.includes('.ai-tone-settings{box-sizing:border-box!important;position:absolute!important;'));
 assert.ok(css.includes('bottom:auto!important;width:auto!important;height:auto!important;min-height:0!important;max-height:calc(100% - 76px)!important;'));
 assert.equal(css.includes('bottom:calc(132px + env(safe-area-inset-bottom,0px))!important;'),false,'Settings must not reserve empty space below collapsed cards');
 assert.ok(css.includes('.ai-tone-settings-section[open]>summary{'));
 assert.ok(css.includes('border-radius:15px!important;'));
});
test('Audio status is a small USB LED; dock footnotes are removed and both panels slide behind fixed layers',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 assert.ok(source.includes('ai-tone-audio-indicator'),'USB status must use an LED beside the title');
 assert.equal(source.includes('Uses MG-30 USB Audio input channels 1–2'),false,'Audio Listening explanatory footnote must be removed');
 assert.equal(source.includes('Use the editor’s Save to Device button'),false,'composer footnote must be removed');
 assert.ok(source.includes("ui.audioDevice.dataset.state=ready?'connected':'error';"));
 assert.ok(source.includes("ui.audioDevice.textContent='';"));
 assert.ok(source.includes("ui.audioPanel.classList.add('is-open')"));
 assert.ok(source.includes("ui.audioPanel.classList.remove('is-open')"));
 assert.ok(source.includes("ui.settings.classList.add('is-open')"));
 assert.ok(source.includes("ui.settings.classList.remove('is-open')"));
 assert.ok(source.includes("setSettingsExpanded(!ui.settings.classList.contains('on'))"));
 const cssStart=source.indexOf("audioStyle.textContent += '.ai-tone-head{position:relative!important;");
 const cssEnd=source.indexOf("';",cssStart);
 assert.ok(cssStart>=0&&cssEnd>cssStart);
 const css=source.slice(cssStart,cssEnd);
 assert.ok(css.includes('z-index:12!important'));
 assert.ok(css.includes('.ai-tone-audio-panel.is-open{transform:translateY(0)!important;opacity:1!important}'));
 assert.ok(css.includes('.ai-tone-settings.is-open{transform:translateY(0)!important;opacity:1!important;pointer-events:auto!important}'));
 assert.ok(css.includes('z-index:4!important'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
test('settings panel stays content-sized, opaque, below the fixed header, and animates quickly',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const start=source.indexOf("audioStyle.textContent += '.ai-tone-head{position:relative!important;z-index:30");
 const end=source.indexOf("';",start);
 assert.ok(start>=0&&end>start,'settings visual override exists');
 const css=source.slice(start,end);
 assert.ok(css.includes('background:#172018!important'));
 assert.ok(css.includes('z-index:30!important'));
 assert.ok(css.includes('position:absolute!important'));
 assert.ok(css.includes('height:auto!important'));
 assert.ok(css.includes('min-height:0!important'));
 assert.ok(css.includes('max-height:calc(94dvh - 170px)!important'));
 assert.ok(css.includes('background:#101710!important'));
 assert.ok(css.includes('transition:transform .17s ease-out,opacity .14s ease-out!important'));
 assert.ok(css.includes('z-index:20!important'));
});
test('new chat messages scroll the unified region, not an inner messages scroller',()=>{
 const source=readFileSync(new URL('../www/ai-tone-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('const scrollMessagesToEnd=');
 const end=source.indexOf('const renderHistory=',start);
 assert.ok(start>=0&&end>start);
 const scroll=source.slice(start,end);
 assert.ok(scroll.includes("$('aiToneScrollArea')"));
 assert.ok(scroll.includes('scrollArea.scrollTop=scrollArea.scrollHeight'));
 assert.equal(scroll.includes('ui.messages.scrollTop='),false);
});
