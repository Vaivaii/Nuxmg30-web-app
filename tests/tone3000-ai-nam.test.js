import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tone3000 = readFileSync(new URL('../www/tone3000.js', import.meta.url), 'utf8');
const aiStudio = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
const secureStore = readFileSync(new URL('../native-android/MG30SecureStorePlugin.java', import.meta.url), 'utf8');
const chatGptPlugin = readFileSync(new URL('../native-android/MG30ChatGPTPlugin.java', import.meta.url), 'utf8');
const namTransfer = readFileSync(new URL('../www/nam-transfer.js', import.meta.url), 'utf8');

test('TONE3000 OAuth uses the one existing Publishable Key and PKCE flow for both capture types', () => {
  assert.match(tone3000, /const SecureStore = registerPlugin\('MG30SecureStore'\)/);
  assert.match(tone3000, /code_challenge_method: 'S256'/);
  assert.match(tone3000, /prompt: 'select_tone'/);
  assert.match(tone3000, /format: 'nam'/);
  assert.match(tone3000, /architecture: '2'/);
  assert.match(tone3000, /options\.gear === 'amp' \? 'amp'/);
  assert.match(tone3000, /options\.gear === 'amp-cab' \? 'amp-cab'/);
  assert.match(tone3000, /window\.NUXTONE3000Bridge/);
  assert.doesNotMatch(aiStudio, /t3k_pub_|oauth\/token|code_verifier/);
});

test('TONE3000 OAuth tokens and transient PKCE values migrate to Android secure storage', () => {
  assert.match(tone3000, /AUTH_FIELDS = \['access_token', 'refresh_token', 'expires_at', 'code_verifier', 'state', 'redirect_uri', 'oauth_flow'\]/);
  assert.match(tone3000, /SecureStore\.getSecret\(\{ provider: 'tone3000' \}\)/);
  assert.match(tone3000, /SecureStore\.setSecret\(\{ provider: 'tone3000'/);
  assert.match(tone3000, /Remove plaintext tokens\/PKCE values only after secure storage was read or migration succeeded/);
  assert.match(tone3000, /localStorage\.removeItem\(PREFIX \+ key\)/);
  assert.match(secureStore, /"tone3000"\.equals\(value\)/);
  assert.match(secureStore, /AndroidKeyStore/);
  assert.match(secureStore, /AES\/GCM\/NoPadding/);
});

test('AI NAM bridge reads current slot-10 metadata and requires confirmation before overwrite', () => {
  assert.match(tone3000, /async function importTone3000ModelForAI/);
  assert.match(tone3000, /options\.slotNumber \?\? 10/);
  assert.match(tone3000, /slotNumber !== 10/);
  assert.match(tone3000, /readMG30NAMSlotNames\(connection/);
  assert.match(tone3000, /const slot = scan\.slots\.find\(row => row\.slotNumber === 10\)/);
  assert.match(tone3000, /if \(!slot\?\.received\) throw new Error/);
  assert.match(tone3000, /Current device label:/);
  assert.match(tone3000, /This will overwrite slot 10/);
  assert.match(tone3000, /sendModel\(index, null, \{/);
  assert.match(tone3000, /confirmed: true, connection, slotNumber: 10/);
  assert.match(tone3000, /prepared\?\.modelBytes \? \{ modelBytes: prepared\.modelBytes \}/);
  assert.match(tone3000, /window\.NUXTONE3000Bridge = Object\.freeze/);
});

test('AI NAM flow asks Built-in vs TONE3000, then Amp Only vs Amp + Cab', () => {
  assert.match(aiStudio, /data-ai-nam-source="builtin"/);
  assert.match(aiStudio, /data-ai-nam-source="nam"/);
  assert.match(aiStudio, /data-ai-nam-gear="amp"/);
  assert.match(aiStudio, /data-ai-nam-gear="amp-cab"/);
  assert.match(aiStudio, /mg30-tone3000-catalogue-loaded/);
  assert.match(aiStudio, /Validate & Import to Slot 10/);
  assert.match(aiStudio, /window\.NUXTONE3000Bridge/);
});

test('AI import cannot bypass the validated original MG-30 Gen 2 A2-Lite transfer codec', () => {
  assert.match(tone3000, /extractMG30A2LiteWeights\(modelBytes\)/);
  assert.match(tone3000, /buildMG30A2LiteTransferPlan\(weightBytes, rawLabel, slotNumber\)/);
  assert.match(tone3000, /sendMG30A2LiteTransfer\(connection, plan/);
  assert.match(namTransfer, /const WEIGHT_COUNT = 1871/);
  assert.match(namTransfer, /A2-Lite WaveNet/i);
  assert.match(namTransfer, /WEIGHT_BYTES = WEIGHT_COUNT \* 4/);
  assert.match(namTransfer, /does not read model weights/i);
});

test('AI slot-10 destination leaves manual NAM import target selection unchanged', () => {
  assert.match(tone3000, /const slotNumber = Number\(options\.slotNumber \?\? \(\$\('t3kTargetSlot'\)/);
  assert.match(tone3000, /const slotNumber = Number\(options\.slotNumber \?\? 10\)/);
  assert.ok(aiStudio.includes('bridge.searchTones(intent.query,{gear:activeNamGear})'));
});

test('AI Studio delegates TONE3000 NAM A2 catalogue search to the authenticated Cloudflare Worker', () => {
  assert.match(tone3000, /async function searchTone3000ForAI/);
  assert.match(tone3000, /\/api\/v1\/tone3000\/ai-search/);
  assert.match(tone3000, /X-TONE3000-Authorization/);
  assert.match(tone3000, /async function loadTone3000ForAI/);
  assert.ok(tone3000.includes('searchTones(query, options = {})'));
  assert.match(aiStudio, /async function beginNamSearch/);
  assert.match(aiStudio, /async function automaticNamImportForPrompt/);
  assert.match(aiStudio, /data-ai-nam-card=/);
  assert.match(aiStudio, /data-ai-nam-view-captures=/);
  assert.match(aiStudio, /data-ai-nam-import-selected=/);
  assert.match(aiStudio, /data-ai-nam-confirm=/);
  assert.ok(aiStudio.includes('bridge.searchTones(intent.query,{gear:activeNamGear})'));
  assert.match(tone3000, /TONE3000 API search rate limit reached/);
});

test('AI NAM automation preserves only slot 10 as an available destination', () => {
  assert.match(aiStudio, /installed NAM context/i);
  assert.match(aiStudio, /kind==='nam-slot-selection'&&model.slot===10/);
  assert.match(tone3000, /\/api\/v1\/tone3000\/ai-search/);
});

test('Automatic NAM import preflights A2-Lite bytes and reuses the exact downloaded binary', () => {
  assert.match(tone3000, /async function prepareTone3000ModelForAI/);
  assert.match(tone3000, /\/api\/v1\/tone3000\/ai-search/);
  assert.match(tone3000, /buildMG30A2LiteTransferPlan\(weightBytes, label, 10\)/);
  assert.match(tone3000, /modelBytes = options\.modelBytes \|\| null/);
  assert.match(tone3000, /prepared\?\.modelBytes \? \{ modelBytes: prepared\.modelBytes \}/);
  assert.match(tone3000, /preparedAiNamFiles\.delete\(cacheKey\)/);
  assert.match(tone3000, /async loadTone\(toneId, options = \{\}\)/);
});

test('Automatic NAM starts from Send and uses explicit profile, capture and slot-10 confirmation cards', () => {
  assert.match(aiStudio, /async function automaticNamImportForPrompt/);
  assert.match(aiStudio, /pendingNamSelection/);
  assert.match(aiStudio, /await automaticNamImportForPrompt\(prompt,conversation,preparedPlan\)/);
  assert.match(aiStudio, /if\(namResult\?\.pendingConnection\|\|namResult\?\.pendingSelection\)return;/);
  assert.match(aiStudio, /bridge\.searchTones\(searchTerms,\{gear:activeNamGear\}\)/);
  assert.match(aiStudio, /selected\.prepared=await bridge\.prepareModel\(selected\.model\.id\)/);
  assert.match(aiStudio, /bridge\.importModel\(pending\.selected\.model\.id,\{slotNumber:10,confirmOverwrite:false,prepare:false\}\)/);
  assert.match(aiStudio, /data-ai-nam-view-captures=/);
  assert.match(aiStudio, /data-ai-nam-import-selected=/);
  assert.match(aiStudio, /data-ai-nam-confirm=/);
});

test('TONE3000 provides a separate connect-only account sign-in flow', () => {
  assert.match(tone3000, /t3kConnectAccount/);
  assert.match(tone3000, /async function startConnectAccountFlow/);
  assert.match(tone3000, /oauth_flow: 'connect'/);
  assert.match(tone3000, /oauthFlow === 'connect' && code && !toneId/);
  assert.match(tone3000, /Connect TONE3000 Account/);
});

test('NAM catalog search/preflight and ChatGPT Tone Plan remain independent from USB-MIDI apply', () => {
  const submit = aiStudio.slice(aiStudio.indexOf(' async function submit(){'), aiStudio.indexOf(' async function undo(){'));
  const planning = submit.indexOf('await makePlan(prompt,bridge,audioMetricsForRequest,conversation)');
  const applyGuard = submit.indexOf('pendingToneApply=plan', planning);
  const apply = submit.indexOf('await bridge.applyPlan(plan)');
  assert.ok(planning >= 0 && applyGuard > planning && apply > applyGuard,
    'AI planning must finish before the USB-MIDI requirement for live apply');
  assert.match(submit, /pendingToneApply=plan/);
  assert.match(submit, /Rencana ini akan digunakan kembali tanpa memanggil AI lagi/);
  const automaticStart = aiStudio.indexOf('async function automaticNamImportForPrompt');
  const automaticEnd = aiStudio.indexOf('async function resolveFreeProviderTeam', automaticStart);
  const automatic = aiStudio.slice(automaticStart, automaticEnd);
  assert.ok(automaticStart >= 0 && automaticEnd > automaticStart);
  assert.doesNotMatch(automatic, /isConnected/, 'catalog search and A2-Lite preflight must not require USB-MIDI');
  assert.match(aiStudio, /selected\.prepared=await bridge\.prepareModel\(selected\.model\.id\)/);
  assert.ok(aiStudio.includes("if(!editor?.isConnected?.())throw new Error('Connect the MG-30 via USB-MIDI before transferring the selected NAM to slot 10.')"));
  assert.match(aiStudio, /bridge\.importModel\(pending\.selected\.model\.id,\{slotNumber:10,confirmOverwrite:false,prepare:false\}\)/);
  assert.match(aiStudio, /pendingNamSelection/);
});

test('TONE3000 session check refreshes the OAuth access token and separates app key from account auth', () => {
  assert.match(tone3000, /async hasSession\(\) \{ try \{ await ensureAccessToken\(\); return true; \} catch \{ return false; \} \}/);
  assert.match(aiStudio, /Publishable Key identifies this app only/);
});

test('Native SIWC bridge preserves Responses message arrays and bounded specialist handoff items',()=>{
  assert.match(chatGptPlugin,/content instanceof String \|\| content instanceof JSONArray/);
  assert.match(chatGptPlugin,/A prior Responses message item is incomplete/);
  assert.match(chatGptPlugin,/"function_call_output"/);
  assert.match(chatGptPlugin,/max_output_tokens/);
  assert.match(chatGptPlugin,/parallel_tool_calls/);
  assert.match(chatGptPlugin,/result\.put\("outputItems", outputItems\)/);
  assert.match(chatGptPlugin,/result\.put\("toolCalls", toolCalls\)/);
});

test('Native SIWC stream returns partial text and incomplete reason for one JS-side continuation',()=>{
  assert.match(chatGptPlugin,/String incompleteReason = ""/);
  assert.match(chatGptPlugin,/"response\.incomplete"\.equals\(type\)/);
  assert.match(chatGptPlugin,/details\.optString\("reason", "incomplete"\)/);
  assert.match(chatGptPlugin,/incompleteReason = "stream_interrupted"/);
  assert.match(chatGptPlugin,/incompleteReason = "stream_ended"/);
  assert.match(chatGptPlugin,/result\.put\("incomplete", !completed\)/);
  assert.match(chatGptPlugin,/result\.put\("incompleteReason", incompleteReason/);
  assert.match(chatGptPlugin,/Resolve an incomplete result even when it contains no visible text/);
  assert.match(chatGptPlugin,/result\.put\("incompleteReason", incompleteReason/);
  assert.match(chatGptPlugin,/call\.resolve\(result\)/);
});

test('ChatGPT plan access uses the native SIWC plugin and never sends ChatGPT tokens through Cloudflare', () => {
  assert.match(aiStudio, /MG30ChatGPTBridge/);
  assert.match(aiStudio, /async function chatgpt\(_credential, system, prompt, model\)/);
  assert.match(aiStudio, /await bridge\.sendResponse/);
  assert.match(aiStudio, /direct Android connection/);
  assert.match(chatGptPlugin, /@CapacitorPlugin\(name = "MG30ChatGPT"\)/);
  assert.match(chatGptPlugin, /AndroidKeyStore/);
  assert.match(chatGptPlugin, /AES\/GCM\/NoPadding/);
  assert.match(chatGptPlugin, /chatgpt\.tokens\.use\.direct/);
  assert.match(chatGptPlugin, /API_BASE \+ "\/responses"/);
  assert.doesNotMatch(aiStudio, /Authorization.*Bearer.*MG30ChatGPT/);
  assert.match(tone3000, /SecureStore\.setSecret\(\{ provider: 'tone3000'/);
});


test('TONE3000 search broadens the AI phrase in Worker and defers Lite filtering to downloadable model metadata', () => {
  const start = tone3000.indexOf('async function searchTone3000ForAI');
  const end = tone3000.indexOf('async function loadTone3000ForAI', start);
  const source = tone3000.slice(start, end);
  const worker = readFileSync(new URL('../cloud-worker/worker.js', import.meta.url), 'utf8');
  assert.match(source, /cloudApiRequest\('\/api\/v1\/tone3000\/ai-search'/);
  assert.match(worker, /const candidates = \[\.\.\.new Set\(\[query, words\.length > 1 \? words\[words\.length - 1\] : ""\]\)\]/);
  assert.match(worker, /format: "nam", architecture: "2"/);
  assert.match(worker, /gear !== "amp" && gear !== "amp-cab"/);
  assert.doesNotMatch(worker.slice(worker.indexOf('async function tone3000AiSearch'), worker.indexOf('function toneOfficialHost')), /sizes.*lite/i);
});

test('AI exposes TONE3000 zero-result query diagnostics and distinguishes catalogue emptiness from file validation', () => {
  assert.match(aiStudio, /API total for last search/);
  assert.match(aiStudio, /Capture-size filtering is deferred until model download/);
  assert.match(aiStudio, /No file was downloaded and no pedal data was changed/);
});


test('AI TONE3000 tone loader accepts numeric tone IDs using the same digit regex as the existing loader', () => {
  const start = tone3000.indexOf('async function loadTone3000ForAI');
  const end = tone3000.indexOf('function saveWorkspaceSnapshot', start);
  const loader = tone3000.slice(start, end);
  assert.ok(loader.includes("if (!/^\\d+$/.test(id))"));
  assert.ok(!loader.includes("if (!/^\\\\d+$/.test(id))"));
});

test('AI candidate discovery does not reject A2 models based on a TONE3000 size label before file extraction', () => {
  const start = aiStudio.indexOf('const candidates=(snapshot?.models||[])');
  const end = aiStudio.indexOf('if(!candidates.length)', start);
  const filter = aiStudio.slice(start, end);
  assert.match(filter, /Boolean\(model\.model_url\)/);
  assert.match(filter, /\^\(2\|a2\)\$/);
  assert.doesNotMatch(filter, /model\.size|size==='lite'/);
});

