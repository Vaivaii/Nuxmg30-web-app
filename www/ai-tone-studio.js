import { cloudApiRequest } from './cloud-api.js';
let cloudAiStatusCache = null;
let cloudAiStatusAt = 0;
async function getCloudAiStatus(refresh = false) {
 if (!refresh && cloudAiStatusCache && Date.now() - cloudAiStatusAt < 15000) return cloudAiStatusCache;
 const data = await cloudApiRequest('/api/v1/ai/providers');
 cloudAiStatusCache = data; cloudAiStatusAt = Date.now(); return data;
}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));

export function validateAiTonePlan(plan,catalog){
 if(!plan||typeof plan!=='object'||!Array.isArray(plan.blocks)||plan.blocks.length<1||plan.blocks.length>9)throw new Error('The AI Tone Plan is invalid or contains no changes.');
 const seen=new Set(),blocks=[];
 for(const p of plan.blocks){
  const id=String(p?.id||'').trim().toUpperCase(),block=catalog.find(x=>x.id===id);
  if(seen.has(id))throw new Error('Duplicate block: '+id+'.');
  seen.add(id);
  if(!block)throw new Error('Block '+id+' is not allowed.');
  const modelName=String(p.model||'').trim(),model=block.models.find(x=>x.name===modelName);
  if(!model)throw new Error('Model '+modelName+' is not available in the '+id+' catalog.');
  if(p.enabled!==undefined&&typeof p.enabled!=='boolean')throw new Error('Invalid ON/OFF state for '+id+'.');
  if(!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters))throw new Error('Invalid parameters for '+id+'.');
  const allowed=new Map(model.parameters.map(x=>[x.key,x])),parameters={};
  for(const [key,raw] of Object.entries(p.parameters)){
   const d=allowed.get(key),v=Number(raw);
   if(!d)throw new Error('Parameter '+key+' is not available for '+id+'/'+modelName+'.');
   if(!Number.isFinite(v))throw new Error('Value for '+key+' must be numeric.');
   if(d.kind==='discrete'?!d.choices.some(x=>Number(x.value)===v):v<0||v>100)throw new Error('Value for '+id+'.'+key+' is outside the supported choices/range.');
   parameters[key]=v;
  }
  if(modelName!==block.currentModel){
   const missing=model.parameters.filter(x=>!Object.prototype.hasOwnProperty.call(parameters,x.key));
   if(missing.length)throw new Error('Changing model '+id+' requires all parameters: '+missing.map(x=>x.key).join(', '));
  }
  if(!Object.keys(parameters).length&&modelName===block.currentModel&&p.enabled===undefined&&model.kind!=='nam-slot-selection')throw new Error('Block '+id+' has no changes.');
  blocks.push({id,model:modelName,enabled:p.enabled,parameters});
 }
 return {summary:String(plan.summary||'Tone updated by AI.').slice(0,420),blocks,notes:Array.isArray(plan.notes)?plan.notes.map(x=>String(x).slice(0,180)).slice(0,5):[]};
}
function parseJson(text){
 const s=String(text||'').trim(),a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a<0||b<=a)throw new Error('The AI response does not contain a JSON Tone Plan.');
 return JSON.parse(s.slice(a,b+1));
}
function outputText(data){
 if(typeof data?.output_text==='string')return data.output_text;
 const a=[];for(const item of data?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')a.push(c.text);
 if(!a.length)throw new Error('GPT returned no text output.');return a.join('\n');
}
function geminiOutput(data){
 const a=data?.candidates?.[0]?.content?.parts||[],s=a.map(x=>x?.text||'').filter(Boolean).join('\n');
 if(!s)throw new Error('Gemini returned no text output.');return s;
}
function providerHttpError(data,status){
 const api=data?.error||{},failed=api.failed_generation;
 const detail=typeof failed==='string'?failed:failed&&typeof failed==='object'?[failed.reason,failed.message].filter(Boolean).join('; '):'';
 const error=new Error(String(api.message||data?.message||('HTTP '+status))+(detail?' Details: '+detail.slice(0,360):''));
 error.status=status;error.failedGeneration=Boolean(failed);error.providerErrorType=String(api.type||api.code||'');
 return error;
}
async function postJson(url,options,timeoutMs=90000){
 const ctl=new AbortController(),timer=window.setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  const r=await fetch(url,{...options,signal:ctl.signal}),raw=await r.text();let data={};
  try{data=raw?JSON.parse(raw):{}}catch{data={rawText:raw}}
  if(!r.ok)throw providerHttpError(data,r.status);
  return data;
 }catch(e){if(e?.name==='AbortError')throw new Error('The AI request timed out after 90 seconds.');throw e;}
 finally{window.clearTimeout(timer);}
}
export function compactToneContext(catalog,snapshot){const c=(catalog||[]).map(b=>[b.id,b.currentModel,(b.models||[]).map(m=>[m.name,m.kind||'',m.slot??'',(m.parameters||[]).map(p=>p.kind==='discrete'?[p.key,(p.choices||[]).map(x=>x.value)]:p.key)])]);const s=(snapshot||[]).map(b=>[b.id,b.model,b.enabled?1:0,b.parameters||{}]);return {catalog:c,snapshot:s};}
export function describeNamCaptureMetadata(tone,model,gear='amp-cab'){const fields={toneName:String(tone?.name||tone?.title||''),creator:String(tone?.creator||tone?.username||''),toneDescription:String(tone?.description||''),makes:Array.isArray(tone?.makes)?tone.makes.map(x=>String(x?.name||x)).slice(0,6):[],tags:Array.isArray(tone?.tags)?tone.tags.map(x=>String(x?.name||x)).slice(0,8):[],modelName:String(model?.name||''),modelDescription:String(model?.description||''),architecture:String(model?.architecture_version??model?.architecture??'A2'),size:String(model?.size??'unspecified'),gear:String(gear)};const text=[fields.toneName,fields.toneDescription,fields.makes.join(' '),fields.tags.join(' '),fields.modelName,fields.modelDescription].join(' ').toLowerCase();const no=/\b(no|without|unboosted|clean[- ]only)\b.{0,35}\b(boost|overdrive|\bod\b|drive pedal)\b|\b(boost|overdrive|\bod\b|drive pedal)\b.{0,25}\b(not included|not used|none)\b/.test(text);const yes=/\b(boosted|boost|overdrive|overdrive pedal|tube screamer|klon|treble booster|drive pedal|\bod\b)\b/.test(text);fields.driveMetadata=no?'TONE3000 text explicitly indicates no boost/overdrive':yes?'TONE3000 text mentions boost/overdrive or a drive pedal':'TONE3000 metadata does not specify whether boost/overdrive is embedded';fields.driveConfidence=no||yes?'explicit metadata mention':'unknown';fields.source='TONE3000 tone/model description and catalogue tags';fields.summary=fields.modelName+' — '+fields.driveMetadata+'. '+(fields.modelDescription||fields.toneDescription||'No detailed capture description supplied by TONE3000.');return fields;}
export function artistToneGuidance(prompt){const p=String(prompt||'').toLowerCase();if(/\b(john\s*mayer|mayer)\b/.test(p))return 'ARTIST TONE: John Mayer-inspired blues/pop lead. Prefer touch-sensitive clean to edge-of-breakup response, warm lows, present mids, restrained treble, subtle modulation, short/medium delay and tasteful spring/plate/hall reverb. Avoid high-gain metal voicing. This is a stylistic target, not a claim about exact studio gear.';if(/\b(john\s*petrucci|petrucci|dream\s*theater)\b/.test(p))return 'ARTIST TONE: John Petrucci / progressive-metal lead. Prefer tight high gain, controlled low end, focused upper mids, articulate sustain, noise control if available, lead delay and restrained reverb. Do not default to blues edge-of-breakup.';if(/\b(joe\s*satriani|satriani)\b/.test(p))return 'ARTIST TONE: Joe Satriani-inspired melodic rock lead. Prefer expressive saturated singing mids, smooth highs, sustain, rhythmic delay, subtle modulation and moderate reverb. Do not reuse a Petrucci metal or Mayer low-gain chain unchanged.';return 'ARTIST / STYLE INTENT: infer gain, dynamics, amp voicing and ambience from this request. Avoid a generic chain by default.';}
function systemPrompt(catalog,snapshot,review,toneGuidance=''){
 const lines=[
 'You are a live tone editor for the original NUX MG-30 Gen 2 firmware 6.0.x, never MKII.',
 'Return only JSON: {"summary":"English summary","blocks":[{"id":"AMP","model":"Deluxe Rvb","enabled":true,"parameters":{"gain":35}}],"notes":[]}.',
 'Only include blocks you intend to change. Use exact block ids, model names and parameter keys from the app catalog.',
 'Rotary/selector values are normalized 0..100. Discrete controls must use an exact numeric choice from the catalog.',
 'When changing model, include every writable parameter for that model. When keeping the current model, include only parameters to change.',
 'Never invent models, parameter names, effect identifiers, MIDI CC values or unsupported features.',
 'Never change IR/User/Third Party/Collection IR, NAM internal parameters, Send/Return, Volume, scene, preset slot, MIDI mapping or signal-chain order.',
 'The AMP catalog may expose NAM Slot 10 as a selection-only model. When installed NAM context is supplied, do not propose any AMP block; the application selects imported slot 10 deterministically. Never write NAM internal controls and never select NAM slots 1–9.',
 'Do not output MIDI, SysEx, preset bytes or import instructions. The app validates and writes parameter changes through its current editor path.',
 'Catalog format is compact arrays: each block is [blockId,currentModel,models]; each model is [exactModelName,kind,slot,parameters]; range parameters are string keys and discrete parameters are [key,[allowed numeric choices]]. Copy exact names and keys from the catalog. When changing a model, include every parameter listed for that model. Preserve every block not listed. Make amp, gain, EQ, modulation, delay and reverb choices specific to the requested artist/style, not generic moderate settings. Different artists should not receive the same default amp/effect chain unless the catalog and request justify it. Change actual models where musically necessary, not only numeric values. Never claim an exact artist rig; describe it as inspired by the sound. Keep summary and notes in English. Use TONE3000 metadata as supporting evidence only: if it explicitly mentions embedded boost/OD, do not stack another by default; if it explicitly says clean/no boost, add one only if the requested tone needs it; if unknown, do not assume.'
 ];
 if(toneGuidance)lines.push(toneGuidance);
 if(review)lines.push('You are the Gemini reviewer in collaboration mode. Check artist/style specificity and catalog correctness, then return the complete final changed-block proposal.');
 const compact=compactToneContext(catalog,snapshot);
 return lines.join('\n')+'\n\nAPP CATALOG (compact):\n'+JSON.stringify(compact.catalog)+'\n\nCURRENT EDITOR (compact):\n'+JSON.stringify(compact.snapshot);
}
function userText(prompt,candidate,namContext){return 'USER REQUEST:\n'+prompt+(namContext?'\n\nINSTALLED NAM CONTEXT:\n'+namContext:'')+(candidate?'\n\nGPT PROPOSAL TO REVIEW:\n'+JSON.stringify(candidate):'')+'\n\nReturn final JSON only.';}
async function secret(provider) {
 const key = provider === 'openai' ? 'gpt' : provider;
 const status = await getCloudAiStatus();
 return status?.providers?.[key] ? 'cloud-managed' : '';
}
async function cloudTonePlan(provider, system, prompt, model) {
 if (!model) throw new Error('Choose an available model in AI Settings.');
 const result = await cloudApiRequest('/api/v1/ai/tone-plan', { method: 'POST', body: { provider, model, system, prompt } });
 if (!result?.tonePlan || typeof result.tonePlan !== 'object') throw new Error('Cloud AI did not return a valid Tone Plan response.');
 return result.tonePlan;
}
async function openai(_credential, system, prompt, model) { return cloudTonePlan('gpt', system, prompt, model); }
async function gemini(_credential, system, prompt, model) { return cloudTonePlan('gemini', system, prompt, model); }

export function compatibleChatText(data,provider){
 const choice=data?.choices?.[0]||{},message=choice.message||{};
 const content=message.content;
 const parts=Array.isArray(content)?content.map(part=>typeof part==='string'?part:(typeof part?.text==='string'?part.text:typeof part?.content==='string'?part.content:typeof part?.output_text==='string'?part.output_text:'')).filter(Boolean):[];
 const text=typeof content==='string'?content:parts.join('\n')||String(message.output_text||choice.text||data?.output_text||'');
 if(!text.trim()){
  const finish=String(choice.finish_reason||'unknown'),providerName=String(data?.provider||data?.provider_name||'');
  const reasonOnly=Boolean(message.reasoning||message.reasoning_details?.length);
  const refusal=typeof message.refusal==='string'&&message.refusal?'; refusal returned':'';
  const error=new Error((provider==='groq'?'Groq':'OpenRouter')+' returned no final text output (finish_reason: '+finish+(providerName?'; route: '+providerName:'')+(reasonOnly?'; reasoning-only response':'')+refusal+').');
  error.code='AI_NO_TEXT_OUTPUT';error.finishReason=finish;error.reasoningOnly=reasonOnly;
  throw error;
 }
 return text;
}
function isGroqJsonValidationError(error){
 return Boolean(error?.failedGeneration)||error?.code==='AI_NO_TEXT_OUTPUT'||error instanceof SyntaxError||/failed to validate json|failed_generation|generated json.{0,50}(valid|syntax)|does not contain a json tone plan|unexpected token|unexpected end of json/i.test(String(error?.message||error||''));
}
function appendJsonContract(messages){
 const rows=messages.map(row=>({...row}));
 const last=rows[rows.length-1];
 last.content=String(last.content||'')+'\n\nFINAL OUTPUT CONTRACT: Return exactly one complete JSON object and nothing else. Do not use Markdown fences, commentary, or tool calls. Required top-level keys: summary (string), blocks (array), notes (array).';
 return rows;
}
async function openAiCompatible(_credential, system, prompt, model, provider) {
 return cloudTonePlan(provider, system, prompt, model);
}
export async function listAiProviderModels(provider, _credential) {
 const data = await cloudApiRequest('/api/v1/ai/models?provider=' + encodeURIComponent(provider === 'gpt' ? 'gpt' : provider));
 return Array.isArray(data.models) ? data.models : [];
}
export function providerFallbackOrder(primary='gemini'){
 const priority=['gemini','groq','openrouter','gpt'];
 const first=priority.includes(primary)?primary:'gemini';
 return [first,...priority.filter(provider=>provider!==first)];
}
export function isRetryableProviderError(error){
 const value=String(error?.message||error||'');
 return /\b(408|425|429|498|500|502|503|504)\b|rate.?limit|resource_exhausted|overloaded|capacity.?exceeded|temporarily unavailable|high demand|demand spike|server busy|temporarily busy|timed? out|network|failed to fetch|tokens? per minute|\bTPM\b|request too large|reduce your message size|reduce the length of (the )?messages|completion.{0,30}(length|long)|requested \d+.*limit \d+/i.test(value);
}
function niceError(e,provider){
 const s=String(e?.message||e||'Unknown error');
 if(/401|unauthorized|invalid.*key|api key not valid/i.test(s))return provider+': API key was rejected.';
 if(/tokens? per minute|\bTPM\b|request too large|reduce your message size/i.test(s))return provider+': request exceeds this model token-throughput limit; trying another model/provider may help. No pedal changes were sent.';
 if(/429|quota|rate.?limit|resource_exhausted/i.test(s))return provider+': quota or rate limit reached; no pedal changes were sent.';
 if(/failed to fetch|network|cors|internet/i.test(s))return provider+': network or provider unavailable; no pedal changes were sent.';
 return provider+': '+s;
}
function style(){
 if($('aiToneCss'))return;
 const s=document.createElement('style');s.id='aiToneCss';
 s.textContent='.ai-tone-midi-transaction #page-editor{pointer-events:none!important;opacity:.92}.ai-tone-open{border-color:#769b3d!important;color:#c5f36b!important;background:#c5f36b12!important}.ai-tone-backdrop{position:fixed;inset:0;z-index:12000;background:#0009;opacity:0;pointer-events:none;transition:opacity .2s}.ai-tone-backdrop.on{opacity:1;pointer-events:auto}.ai-tone-sheet{--ai-tone-max-height:82dvh;position:fixed;z-index:12001;left:50%;bottom:0;transform:translate(-50%,105%);width:min(720px,100%);height:auto;min-height:0;max-height:var(--ai-tone-max-height);display:flex;flex-direction:column;overflow:hidden;border:1px solid #3b4935;border-bottom:0;border-radius:22px 22px 0 0;background:linear-gradient(155deg,#172018,#0d1210);box-shadow:0 -18px 70px #000a;transition:transform .24s ease;padding-bottom:env(safe-area-inset-bottom,0px)}.ai-tone-sheet.on{transform:translate(-50%,0)}.ai-tone-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #2d382b}.ai-tone-head strong{font-size:18px;letter-spacing:.1px}.ai-tone-head small{display:block;color:#96a28e;font-size:10px}.ai-tone-body{padding:12px 14px;flex:0 1 auto;min-height:0;max-height:calc(var(--ai-tone-max-height) - 66px);overflow-y:auto;overscroll-behavior:contain}.ai-tone-provider-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.45fr);gap:8px;margin-bottom:10px}.ai-tone-provider-row .ai-tone-key-field{min-width:0;margin:0}.ai-tone-provider-row .ai-tone-key-field small{display:block;margin-bottom:4px;color:#9ead91;font-size:10px;font-weight:800}.ai-tone-provider-row .ai-tone-key-field select{width:100%;min-width:0;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8;padding:10px;font-size:12px}.ai-tone-status{display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.4;color:#aab5a2;margin:7px 1px 10px;min-height:38px;padding:8px 11px;border:1px solid #303c2b;border-radius:11px;background:#0e150f}.ai-tone-status[data-state=busy]{color:#d8f4ac;border-color:#607d39;background:#172316}.ai-tone-status[data-state=busy]::before{content:"";width:16px;height:16px;flex:0 0 16px;border:2px solid #526044;border-top-color:#c5f36b;border-radius:50%;animation:aiToneSpin .8s linear infinite}@keyframes aiToneSpin{to{transform:rotate(360deg)}}.ai-tone-status[data-state=success]{color:#b9ec7b}.ai-tone-status[data-state=error]{color:#ff938c}.ai-tone-messages{display:flex;flex-direction:column;gap:10px;min-height:0;max-height:28dvh;overflow-y:auto;overscroll-behavior:contain;margin-bottom:10px;padding:2px 1px;scrollbar-width:thin}.ai-tone-message{max-width:96%;padding:12px 14px;border:1px solid #303c2b;border-radius:13px;background:#141c14;color:#e1e9dc;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.ai-tone-message.user{align-self:flex-end;background:#24311d;border-color:#516b32}.ai-tone-message.ai{align-self:flex-start}.ai-tone-message small{display:block;color:#9ead91;font-size:10px;font-weight:850;letter-spacing:.45px;margin-bottom:5px}.ai-tone-prompt{width:100%;min-height:62px;max-height:120px;resize:vertical;border:1px solid #3b4934;border-radius:13px;background:#0b110d;color:#f1f5ed;padding:12px;font:13px/1.45 system-ui}.ai-tone-compose{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:8px}.ai-tone-hint{color:#819078;font-size:10px}.ai-tone-send{border:1px solid #b7e65e;border-radius:11px;background:#c5f36b;color:#12170c;font-weight:850;padding:10px 15px}.ai-tone-undo{border:1px solid #536142;border-radius:10px;background:#192218;color:#dce8d2;padding:9px 12px;font-size:11px}.ai-tone-send:disabled,.ai-tone-undo:disabled{opacity:.55}.ai-tone-send:disabled{cursor:progress}#aiToneOpenButton{min-width:62px;min-height:48px;padding:10px 13px!important;font-size:17px!important;font-weight:950!important;letter-spacing:.2px}.ai-tone-icon{border:1px solid #33402e;border-radius:10px;background:#121912;color:#dce8d2;padding:9px 12px}.ai-tone-settings{display:none;border:1px solid #354330;border-radius:13px;background:#101710;padding:12px;margin:2px 0 12px}.ai-tone-settings.on{display:block}.ai-tone-settings h4{margin:0 0 5px;font-size:12px}.ai-tone-settings p{margin:0 0 10px;color:#9ca992;font-size:10px;line-height:1.45}.ai-tone-key-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ai-tone-key-field label{display:block;color:#b8c5af;font-size:10px;margin:0 0 5px}.ai-tone-key-field input,.ai-tone-key-field select{width:100%;min-width:0;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8;padding:9px;font-size:11px}.ai-tone-model-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ai-tone-fallback-toggle{display:flex;align-items:center;gap:9px;margin-top:10px;padding:9px;border:1px solid #354330;border-radius:9px;background:#0d150e;color:#dce8d2;font-size:11px}.ai-tone-fallback-toggle input{accent-color:#c5f36b;width:17px;height:17px}.ai-tone-fallback-toggle small{display:block;margin-top:3px;color:#9ca992;font-size:9px;line-height:1.4}.ai-tone-key-state{display:block;color:#9baa91;font-size:9px;margin-top:5px;min-height:13px}.ai-tone-setting-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ai-tone-setting-actions button{border:1px solid #3d4a35;border-radius:9px;background:#192218;color:#dce8d2;padding:8px 10px;font-size:10px}.ai-tone-setting-actions .primary{background:#c5f36b;color:#10160b}.ai-tone-note{margin-top:9px!important;color:#d3c18d!important;font-size:9px!important}@media(max-width:520px){.ai-tone-key-grid,.ai-tone-model-grid{grid-template-columns:1fr}.ai-tone-sheet{--ai-tone-max-height:84dvh;height:auto;min-height:0;max-height:var(--ai-tone-max-height)}.ai-tone-body{max-height:calc(var(--ai-tone-max-height) - 62px)}.ai-tone-messages{min-height:0;max-height:25dvh}.ai-tone-provider{font-size:12px}}';
 s.textContent += '.ai-tone-nam-toolbar{display:flex;align-items:center;gap:8px;margin:0 0 10px}.ai-tone-nam-action{border:1px solid #566e37;border-radius:10px;background:#182317;color:#d8f4ac;padding:9px 12px;font-size:12px;font-weight:800}.ai-tone-nam-wizard,.ai-tone-nam-results{margin:0 0 12px;padding:11px;border:1px solid #34422e;border-radius:12px;background:#101710}.ai-tone-nam-wizard[hidden],.ai-tone-nam-results[hidden]{display:none!important}.ai-tone-nam-wizard p,.ai-tone-nam-results p{margin:0 0 9px;color:#aab69f;font-size:11px;line-height:1.45}.ai-tone-nam-choice-row{display:flex;flex-wrap:wrap;gap:7px}.ai-tone-nam-choice,.ai-tone-nam-import{border:1px solid #435438;border-radius:9px;background:#1a2518;color:#dce8d2;padding:8px 10px;font-size:11px;font-weight:750}.ai-tone-nam-results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px}.ai-tone-nam-results-head strong{font-size:12px}.ai-tone-nam-results-head small{display:block;margin-top:3px;color:#90a184;font-size:10px}.ai-tone-nam-model{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:9px 0;border-top:1px solid #2a3627}.ai-tone-nam-model-copy{min-width:0;flex:1}.ai-tone-nam-model-copy strong{display:block;font-size:11px;overflow-wrap:anywhere}.ai-tone-nam-model-copy small{display:block;margin-top:3px;color:#91a08a;font-size:10px}.ai-tone-nam-import{flex:0 0 auto;background:#c5f36b;border-color:#c5f36b;color:#11170b}.ai-tone-nam-import:disabled,.ai-tone-nam-choice:disabled{opacity:.5}@media(max-width:430px){.ai-tone-nam-model{align-items:flex-start;flex-direction:column}.ai-tone-nam-import{width:100%}}';
 document.head.appendChild(s);
}
async function init(){
 const actions=document.querySelector('#page-editor .editor-top-actions'),ctrl=$('openCtrlEditor');
 if(!actions||!ctrl||$('aiToneOpenButton'))return;
 style();
 const open=document.createElement('button');open.id='aiToneOpenButton';open.type='button';open.className='btn';open.textContent='✦ AI';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-expanded','false');actions.insertBefore(open,ctrl);
 const shade=document.createElement('div');shade.className='ai-tone-backdrop';
 const sheet=document.createElement('section');sheet.className='ai-tone-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','AI Live Tone Assistant');
 sheet.innerHTML=[
 '<div class="ai-tone-head"><div><strong>✦ AI Live Tone Assistant</strong><small>Live editor control · Original MG-30 Gen 2</small></div><div><button class="ai-tone-icon" id="aiToneSettingsToggle" type="button">⚙</button> <button class="ai-tone-icon" id="aiToneClose" type="button">×</button></div></div>',
 '<div class="ai-tone-body"><div class="ai-tone-settings" id="aiToneSettings"><h4>Cloud AI Providers & Models</h4><p>Provider credentials are stored only as Cloudflare Worker secrets. This app requests provider status, model lists and Tone Plans through the authenticated Cloud gateway.</p>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><strong>OpenAI / GPT</strong><span class="ai-tone-key-state" id="aiOpenAiKeyState">Checking Cloud configuration…</span></div><div class="ai-tone-key-field"><strong>Gemini</strong><span class="ai-tone-key-state" id="aiGeminiKeyState">Checking Cloud configuration…</span></div></div>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><strong>Groq</strong><span class="ai-tone-key-state" id="aiGroqKeyState">Checking Cloud configuration…</span></div><div class="ai-tone-key-field"><strong>OpenRouter</strong><span class="ai-tone-key-state" id="aiOpenRouterKeyState">Checking Cloud configuration…</span></div></div>',
 
 '<label class="ai-tone-fallback-toggle"><input id="aiToneAutoFallback" type="checkbox" checked><span><strong>Automatic fallback</strong><small>Gemini → Groq → OpenRouter → GPT when a provider is temporarily busy</small></span></label>',
 '<div class="ai-tone-setting-actions"><button class="primary" id="aiToneSaveKeys" type="button">Refresh Cloud Status</button><button id="aiToneRefreshModels" type="button">Refresh Models</button><button id="aiToneTestOpenAi" type="button">Test GPT</button><button id="aiToneTestGemini" type="button">Test Gemini</button><button id="aiToneTestGroq" type="button">Test Groq</button><button id="aiToneTestOpenRouter" type="button">Test OpenRouter</button></div>',
 '<p class="ai-tone-note">Provider secrets never leave the Worker. Free-model quotas still apply. Automatic fallback retries only temporary rate-limit, capacity, timeout, network and server failures. Tone Plans are checked against the verified original MG-30 Gen 2 catalog before editor MIDI changes.</p></div>',
'<div class="ai-tone-provider-row"><label class="ai-tone-key-field"><small>AI Provider</small><select id="aiToneProviderSelect"><option value="auto" selected>Auto · fastest available</option><option value="gemini">Gemini</option><option value="groq">Groq</option><option value="openrouter">OpenRouter</option><option value="gpt">GPT</option><option value="collab">GPT + Gemini</option></select></label><label class="ai-tone-key-field"><small id="aiToneActiveModelLabel">Model</small><select id="aiToneActiveModel" disabled><option value="">Configure provider in Cloudflare Worker to load models</option></select></label></div>',
 '<div class="ai-tone-status" id="aiToneStatus" data-state="idle" role="status" aria-live="polite" aria-busy="false">AI ready. MG-30 connection is required for live preset transfer.</div>',
 '<div class="ai-tone-nam-toolbar"><button class="ai-tone-nam-action" id="aiToneFindNam" type="button">Search TONE3000 NAM</button></div>',
 '<div class="ai-tone-nam-wizard" id="aiToneNamWizard" hidden></div>',
 '<div class="ai-tone-nam-results" id="aiToneNamResults" hidden></div>',
 '<div class="ai-tone-messages" id="aiToneMessages"><div class="ai-tone-message ai"><small>AI ASSISTANT</small>Describe the tone you want. Validated results update the editor controls and send parameters over USB-MIDI immediately. There is no Apply step.</div></div>',
 '<textarea class="ai-tone-prompt" id="aiTonePrompt" maxlength="1400" placeholder="Example: Create a warm blues-rock tone with mild breakup, low-to-medium gain, present mids, short delay, and light reverb."></textarea>',
 '<div class="ai-tone-compose"><button class="ai-tone-undo" id="aiToneUndo" type="button" disabled>↶ Undo AI Changes</button><div><span class="ai-tone-hint" id="aiToneCount">0/1400</span> <button class="ai-tone-send" id="aiToneSend" type="button">Send ↗</button></div></div>',
 '<p class="ai-tone-hint">Use the editor’s Save to Device button to store the tone. Success confirms MIDI commands were sent; it does not confirm full pedal ACK/readback.</p></div>'
 ].join('');
 document.body.append(shade,sheet);
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),providerSelect:$('aiToneProviderSelect'),activeModel:$('aiToneActiveModel'),activeModelLabel:$('aiToneActiveModelLabel'),autoFallback:$('aiToneAutoFallback'),findNam:$('aiToneFindNam'),namWizard:$('aiToneNamWizard'),namResults:$('aiToneNamResults')};
 let mode='auto',busy=false,last=null,namFlowActive=false,namImportBusy=false,namModeActive=false,activeNamGear='',activeNamContext='',activeNamModelName='',pendingNamSelection=null;const history=[];
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';ui.status.setAttribute('aria-busy',state==='busy'?'true':'false');};
 const message=(role,text)=>{history.push({role,text:String(text)});while(history.length>12)history.shift();ui.messages.innerHTML=history.map(x=>'<div class="ai-tone-message '+x.role+'"><small>'+(x.role==='user'?'YOU':'AI TONE STUDIO')+'</small>'+esc(x.text)+'</div>').join('');ui.messages.scrollTop=ui.messages.scrollHeight;};
 const setBusy=v=>{busy=!!v;ui.send.disabled=busy;ui.send.textContent=busy?'Working…':'Send ↗';ui.prompt.disabled=busy;ui.findNam.disabled=busy||namImportBusy;ui.providerSelect.disabled=busy;ui.activeModel.disabled=busy||ui.activeModel.options.length===0;ui.autoFallback.disabled=busy;ui.undo.disabled=busy||!last;ui.namWizard.querySelectorAll('button').forEach(b=>b.disabled=busy);ui.namResults.querySelectorAll('button,select').forEach(b=>b.disabled=busy);};
 const setMode=v=>{mode=v;ui.providerSelect.value=v;renderActiveModelSelect();};
 const openPanel=()=>{shade.classList.add('on');sheet.classList.add('on');open.classList.add('ai-tone-open');open.setAttribute('aria-expanded','true');window.setTimeout(()=>ui.prompt.focus(),150);};
 const closePanel=()=>{shade.classList.remove('on');sheet.classList.remove('on');open.classList.remove('ai-tone-open');open.setAttribute('aria-expanded','false');};
 function showNamSourceChoice(){
  ui.namResults.hidden=true;ui.namWizard.hidden=false;
  ui.namWizard.innerHTML='<p>Choose the amplifier source for this request.</p><div class="ai-tone-nam-choice-row"><button class="ai-tone-nam-choice" data-ai-nam-source="builtin" type="button">Built-in MG-30 Amp</button><button class="ai-tone-nam-choice" data-ai-nam-source="nam" type="button">TONE3000 NAM</button></div>';
 }
 function showNamGearChoice(){
  ui.namWizard.innerHTML='<p>Choose the NAM capture type. This controls the official TONE3000 catalog filter.</p><div class="ai-tone-nam-choice-row"><button class="ai-tone-nam-choice" data-ai-nam-gear="amp" type="button">Amp Only</button><button class="ai-tone-nam-choice" data-ai-nam-gear="amp-cab" type="button">Amp + Cab</button></div>';
 }
 function renderNamSearchResults(rows, query){
  ui.namResults.hidden=false;ui.namWizard.hidden=true;
  ui.namResults.innerHTML='<div class="ai-tone-nam-results-head"><div><strong>TONE3000 NAM Search</strong><small>Query: '+esc(query)+' · A2 · AI destination: slot 10</small></div></div>'+
   '<p>Search results are filtered to NAM architecture A2 and your selected capture type. Choose a tone to load its compatible A2 model candidates.</p>'+
   (rows.length?rows.map(tone=>'<div class="ai-tone-nam-model"><div class="ai-tone-nam-model-copy"><strong>'+esc(tone.name)+'</strong><small>'+(tone.creator?'@'+esc(tone.creator)+' · ':'')+esc((tone.makes||[]).join(', ')||tone.gear||'NAM')+' · '+(tone.a2ModelsCount?esc(tone.a2ModelsCount)+' A2 models':'A2 models available')+'</small></div><button class="ai-tone-nam-choice" type="button" data-ai-nam-tone="'+esc(tone.id)+'">Load A2 Models</button></div>').join(''):'<p>No matching NAM tones were found. Try a shorter amplifier name, such as “Deluxe Reverb”, or adjust the search phrase.</p>');
 }
 async function beginNamSearch(gear){
  if(gear!=='amp'&&gear!=='amp-cab')throw new Error('Choose Amp Only or Amp + Cab.');
  const bridge=window.NUXTONE3000Bridge;
  if(!bridge?.searchTones||!bridge?.loadTone||!bridge?.prepareModel||!bridge?.importModel)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update MG30 Studio.');
  const gearChanged=activeNamGear!==gear;namModeActive=true;activeNamGear=gear;namFlowActive=false;activeNamContext='';activeNamModelName='';if(gearChanged)pendingNamSelection=null;
  if(!await bridge.hasSession())throw new Error('TONE3000 account is not authenticated. The Publishable Key identifies this app only; it does not sign in your account. Open Device → TONE3000 Settings → Connect TONE3000 Account, finish sign-in, then press Send again.');
  ui.namResults.hidden=true;ui.namWizard.hidden=true;
  const capture=gear==='amp'?'Amp Only':'Amp + Cab';
  message('ai','Automatic TONE3000 NAM mode is ready ('+capture+'). Every new Send will search for a fresh capture for that tone request; AI recommends a capture and you can change it before slot-10 import.');
  status('Automatic NAM mode ready. Your next Send starts the full search and import.','success');
 }
 function renderNamCandidates(detail){
  const tone=detail?.tone||{},models=Array.isArray(detail?.models)?detail.models:[];
  ui.namResults.hidden=false;ui.namWizard.hidden=true;
  ui.namResults.innerHTML='<div class="ai-tone-nam-results-head"><div><strong>'+esc(tone.name||('TONE3000 tone '+detail.toneId))+'</strong><small>'+(tone.creator?'@'+esc(tone.creator)+' · ':'')+'AI destination: slot 10</small></div></div>'+
   '<p>These models were returned by TONE3000 for architecture A2. Each downloaded file must still pass the MG-30 Gen 2 A2-Lite validator before transfer. Choose a candidate to continue.</p>'+
   (models.length?models.map(model=>'<div class="ai-tone-nam-model"><div class="ai-tone-nam-model-copy"><strong>'+esc(model.name||'Unnamed model')+'</strong><small>'+esc(model.architecture_version??model.architecture??'A2')+' · '+esc(model.size??'Size unavailable')+(model.downloadable?' · Download available':' · Download unavailable')+'</small></div><button class="ai-tone-nam-import" type="button" data-ai-nam-import="'+esc(model.id)+'" '+(model.downloadable?'':'disabled')+'>'+(model.downloadable?'Validate & Import to Slot 10':'No Download URL')+'</button></div>').join(''):'<p>No models were returned for this tone. Choose another tone in TONE3000.</p>');
 }
 ui.findNam.addEventListener('click',()=>{if(!busy)showNamSourceChoice();});
 ui.namWizard.addEventListener('click',async event=>{
  const source=event.target.closest('[data-ai-nam-source]')?.dataset.aiNamSource;
  if(source==='builtin'){
   namFlowActive=false;namModeActive=false;activeNamGear='';activeNamContext='';activeNamModelName='';pendingNamSelection=null;ui.namWizard.hidden=true;
   ui.prompt.value=(ui.prompt.value.trim()?ui.prompt.value.trim()+'\n\n':'')+'Use a built-in MG-30 amp model, not a NAM capture. ';$('aiToneCount').textContent=ui.prompt.value.length+'/1400';ui.prompt.focus();
   message('ai','Built-in MG-30 Amp selected. Describe the sound you want, then send your tone request.');return;
  }
  if(source==='nam'){showNamGearChoice();message('ai','TONE3000 NAM selected. Choose Amp Only or Amp + Cab.');return;}
  const gear=event.target.closest('[data-ai-nam-gear]')?.dataset.aiNamGear;
  if(gear==='amp'||gear==='amp-cab'){
   try{await beginNamSearch(gear);}catch(error){status('TONE3000 search failed: '+(error.message||error),'error');message('ai','TONE3000 search failed: '+(error.message||error));}
  }
 });
 ui.namResults.addEventListener('change',event=>{
  const select=event.target.closest('#aiToneNamCaptureSelect');if(!select||!pendingNamSelection)return;
  const item=pendingNamSelection.choices.find(row=>String(row.model.id)===String(select.value));const meta=$('aiToneNamCaptureMeta');
  if(item&&meta)meta.textContent=item.metadata.summary+' Source: '+item.metadata.source+'. Metadata is supporting evidence, not a verified pedal-chain inventory.';
 });
 ui.namResults.addEventListener('click',async event=>{
  const continueButton=event.target.closest('[data-ai-nam-continue]');
  if(continueButton&&!busy&&pendingNamSelection){const select=$('aiToneNamCaptureSelect');const item=pendingNamSelection.choices.find(row=>String(row.model.id)===String(select?.value||''));if(!item){status('Choose a downloadable NAM capture first.','error');return;}pendingNamSelection.selected=item;ui.namResults.hidden=true;ui.prompt.value=pendingNamSelection.prompt;$('aiToneCount').textContent=ui.prompt.value.length+'/1400';message('ai','Selected capture: '+item.model.name+'. '+item.metadata.driveMetadata+'. Validating and importing to slot 10.');void submit();return;}
  const toneButton=event.target.closest('[data-ai-nam-tone]');
  if(toneButton&&!busy&&!namImportBusy){
   const toneId=toneButton.dataset.aiNamTone,bridge=window.NUXTONE3000Bridge;
   if(!bridge?.loadTone){status('The TONE3000 tone loader is unavailable.','error');return;}
   namFlowActive=true;setBusy(true);ui.namResults.innerHTML='<p>Loading tone details and A2 capture candidates from TONE3000…</p>';status('Loading TONE3000 A2 models…','busy');
   try{await bridge.loadTone(toneId);}
   catch(error){namFlowActive=false;ui.namResults.innerHTML='<p>Could not load this tone: '+esc(error.message||error)+'</p>';status('Could not load TONE3000 tone: '+(error.message||error),'error');}
   finally{setBusy(false);}
   return;
  }
  const button=event.target.closest('[data-ai-nam-import]');if(!button||namImportBusy)return;
  const modelId=button.dataset.aiNamImport,bridge=window.NUXTONE3000Bridge;
  if(!bridge?.importModel){status('The TONE3000 import bridge is unavailable.','error');return;}
  let autoCreatePreset=false;
  namImportBusy=true;setBusy(true);status('Checking slot 10 and preparing the NAM download…','busy');
  try{
   const result=await bridge.importModel(modelId,{slotNumber:10,confirmOverwrite:true});
   if(result?.cancelled){message('ai','NAM import canceled. Slot 10 was not changed.');status('Import canceled.','idle');return;}
   if(!result?.success)throw new Error('The NAM import did not complete.');
   namFlowActive=false;ui.namWizard.hidden=true;ui.namResults.hidden=true;
   const ampCatalog=window.MG30AIToneBridge?.getCatalog?.().find(block=>block.id==='AMP');
   const slotTenModel=ampCatalog?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10)?.name||'NAM Slot 10';
   activeNamModelName=slotTenModel;
   activeNamContext='The TONE3000 NAM model "'+(result.modelName||'selected A2 capture')+'" was validated and imported into MG-30 NAM slot 10 (tone ID '+result.toneId+'). For the AMP block, select the exact selection-only catalog model "'+slotTenModel+'" with parameters:{} so the preset uses slot 10. Never change NAM internal parameters. Build the requested tone around this installed capture; adjust only the other permitted tone blocks.';
   autoCreatePreset=Boolean(ui.prompt.value.trim());
   message('ai','Imported '+(result.modelName||'the selected NAM')+' to MG-30 slot 10. A copy is retained in NAM Library. I will now build the requested tone using the slot-10 NAM capture. Device write ACKs and slot metadata were confirmed; model weights are not read back by this protocol.');
   status('NAM imported to slot 10. Preparing the tone from the installed capture…','success');
  }catch(error){message('ai','NAM import failed: '+(error.message||error));status('NAM import failed: '+(error.message||error),'error');}
  finally{namImportBusy=false;setBusy(false);if(autoCreatePreset)await submit();}
 });
 window.addEventListener('mg30-tone3000-catalogue-loaded',event=>{
  if(!namFlowActive)return;
  renderNamCandidates(event.detail||{});
  const count=Array.isArray(event.detail?.models)?event.detail.models.length:0;
  message('ai','TONE3000 returned '+count+' model candidates. The transfer validator is the final compatibility check for MG-30 Gen 2.');
  status('TONE3000 models loaded. Choose a NAM candidate for slot 10.','success');
 });
 window.addEventListener('mg30-ai-nam-progress',event=>{
  if(!namImportBusy)return;const p=event.detail||{};
  if(p.stage==='name-read')status('Reading current NAM slot metadata: pass '+p.round+'/2, slot '+p.slot+'/10…','busy');
  else if(p.stage==='write')status('Writing NAM to slot 10: ACK '+p.completed+'/'+p.total+'…','busy');
  else if(p.stage==='readback')status('Verifying device slot names: pass '+p.round+'/2, slot '+p.slot+'/10…','busy');
 });
 const providerKeyId=p=>p==='gpt'?'openai':p;
 const providerNames={gpt:'GPT',gemini:'Gemini',groq:'Groq',openrouter:'OpenRouter'};
 const providerModels={gpt:[],gemini:[],groq:[],openrouter:[]};
 const modelStorageKey=p=>'mg30-ai-model-'+p;
 const autoProviderHealthCache={expires:0,order:[],errors:[]};
 const autoModelHealthCache={};
 const activeModelProvider=()=>mode==='collab'?'gpt':mode==='auto'?'gemini':mode;
 function selectedModel(provider){
  const key=provider==='collab'?'gpt':provider;
  if(localStorage.getItem('mg30-ai-model-manual-'+key)!=='1')return '';
  const active=key===activeModelProvider()?ui.activeModel.value:'';
  return String((active&&active!=='__auto__'?active:'')||localStorage.getItem(modelStorageKey(key))||'').trim();
 }
 function renderActiveModelSelect(){
  const provider=activeModelProvider(),select=ui.activeModel;
  const saved=String(localStorage.getItem(modelStorageKey(provider))||'');
  const models=providerModels[provider]||[];
  select.replaceChildren();
  const autoOption=document.createElement('option');autoOption.value='__auto__';autoOption.textContent='Auto · fastest available';select.append(autoOption);
  if(models.length){
   for(const row of models){
    const option=document.createElement('option');option.value=row.id;
    option.textContent=row.name===row.id?row.id:(row.name+' · '+row.id);
    select.append(option);
   }
   const manual=localStorage.getItem('mg30-ai-model-manual-'+provider)==='1';
   const chosen=manual&&models.some(row=>row.id===saved)?saved:'__auto__';
   select.value=chosen;select.disabled=false;
   if(chosen!=='__auto__')localStorage.setItem(modelStorageKey(provider),chosen);
  }else if(saved){
   const option=document.createElement('option');option.value=saved;
   option.textContent='Saved model (catalog refresh unavailable): '+saved;
   select.append(option);select.value=saved;select.disabled=false;
  }else{
   const option=document.createElement('option');option.value='';
   option.textContent='Configure '+providerNames[provider]+' in Worker to load models';
   select.append(option);select.disabled=true;
  }
  ui.activeModelLabel.textContent=mode==='collab'?'GPT Model (Gemini reviewer uses its saved model)':mode==='auto'?'Auto provider + fastest model':'Model';
  if(mode==='auto'){select.replaceChildren();const option=document.createElement('option');option.value='__auto__';option.textContent='Auto · provider and model selected per request';select.append(option);select.disabled=true;}
 }
 async function refreshProviderModels(provider,quiet=true){
  const saved=String(localStorage.getItem(modelStorageKey(provider))||'');
  const stored=await secret(providerKeyId(provider));
  if(!stored){
   providerModels[provider]=[];
   if(provider===activeModelProvider())renderActiveModelSelect();
   return [];
  }
  try{
   const models=await listAiProviderModels(provider,stored);
   if(!models.length)throw new Error('No text-generation models were returned by '+providerNames[provider]+'.');
   providerModels[provider]=models;
   let chosen=models.some(row=>row.id===saved)?saved:'';
   if(!chosen){
    if(provider==='openrouter')chosen=models.some(row=>row.id==='openrouter/free')?'openrouter/free':models[0].id;
    else if(provider==='gemini')chosen=(models.find(row=>/flash/i.test(row.id)&&!/live|image|tts|audio/i.test(row.id))||models[0]).id;
    else if(provider==='groq')chosen=(models.find(row=>/openai\/gpt-oss-20b/i.test(row.id))||models[0]).id;
    else chosen=(models.find(row=>/mini/i.test(row.id))||models[0]).id;
   }
   if(chosen)localStorage.setItem(modelStorageKey(provider),chosen);
   if(provider===activeModelProvider())renderActiveModelSelect();
   return models;
  }catch(error){
   providerModels[provider]=saved?[{id:saved,name:'Saved model (list refresh failed)'}]:[];
   if(provider===activeModelProvider())renderActiveModelSelect();
   if(!quiet)status(providerNames[provider]+' model list failed: '+(error.message||error),'error');
   return [];
  }
 }
 async function refreshAllProviderModels(quiet=true){
  await Promise.all(['gpt','gemini','groq','openrouter'].map(provider=>refreshProviderModels(provider,quiet)));
  renderActiveModelSelect();
 }
 async function keyStates(){
  try {
   const data=await getCloudAiStatus(true),providers=data?.providers||{};
   const labels={gpt:'aiOpenAiKeyState',gemini:'aiGeminiKeyState',groq:'aiGroqKeyState',openrouter:'aiOpenRouterKeyState'};
   for(const [provider,id] of Object.entries(labels)){const node=$(id);if(node)node.textContent=providers[provider]?'Configured in Cloudflare Worker':'Not configured in Cloudflare Worker';}
   await refreshAllProviderModels(true);
  } catch(error) {
   ['aiOpenAiKeyState','aiGeminiKeyState','aiGroqKeyState','aiOpenRouterKeyState'].forEach(id=>{if($(id))$(id).textContent='Connect Cloud Account / check Cloud API';});
   providerModels.gpt=[];providerModels.gemini=[];providerModels.groq=[];providerModels.openrouter=[];renderActiveModelSelect();
   status(error.message||'Cloud AI configuration is unavailable.','error');
  }
}
async function saveKeys(){await keyStates();status('Provider credentials are managed as Cloudflare Worker secrets. Cloud status and model lists refreshed.','success');}
async function deleteKey(provider){status('Manage '+providerNames[provider]+' credentials in Cloudflare Worker secrets. The app cannot read or delete server-side keys.','idle');}
async function invokeProvider(provider,key,system,user,model,timeoutMs=90000){
  if(provider==='gpt')return openai(key,system,user,model,timeoutMs);
  if(provider==='gemini')return gemini(key,system,user,model,timeoutMs);
  return openAiCompatible(key,system,user,model,provider,timeoutMs);
 }
 async function fastestReadyModel(provider,key){
  if(selectedModel(provider))return selectedModel(provider);
  const cached=autoModelHealthCache[provider];if(cached&&Date.now()<cached.expires)return cached.model;
  let models=providerModels[provider]||[];if(!models.length)models=await refreshProviderModels(provider,true);
  const score=id=>{const v=String(id).toLowerCase();if(provider==='gemini')return /flash-lite/.test(v)?0:/flash/.test(v)?1:4;if(provider==='groq')return /llama-3.1-8b-instant|llama-3.3-70b-versatile|qwen.*32b/.test(v)?0:/instant|8b/.test(v)?1:4;if(provider==='openrouter')return v==='openrouter/free'?0:/free/.test(v)?1:4;return /gpt-4.1-mini|gpt-4o-mini|gpt-5-mini/.test(v)?0:/mini/.test(v)?1:4;};
  const candidates=models.slice().sort((a,b)=>score(a.id)-score(b.id)).slice(0,3);if(!candidates.length)throw new Error('No text model is available for '+providerNames[provider]+'.');
  const probes=await Promise.all(candidates.map(async row=>{const started=Date.now();try{await invokeProvider(provider,key,'Return exactly {"status":"ok"}.','Return exactly {"status":"ok"}.',row.id,10000);return {id:row.id,latency:Date.now()-started};}catch(error){return {id:row.id,error,latency:Date.now()-started};}}));
  const ready=probes.filter(x=>!x.error).sort((a,b)=>a.latency-b.latency);if(!ready.length)throw new Error(providerNames[provider]+' has no responding model: '+probes.map(x=>x.id+' '+(x.error?.message||'')).join('; '));
  autoModelHealthCache[provider]={model:ready[0].id,expires:Date.now()+45_000};return ready[0].id;
 }
 async function fastestReadyProviderOrder(){
  if(Date.now()<autoProviderHealthCache.expires&&autoProviderHealthCache.order.length)return autoProviderHealthCache.order.slice();
  await refreshAllProviderModels(true);const providers=['gemini','groq','openrouter','gpt'];
  const probes=await Promise.all(providers.map(async provider=>{const key=await secret(providerKeyId(provider));if(!key)return {provider,ok:false,error:new Error('Provider not configured in Cloudflare Worker')};const started=Date.now();try{const model=await fastestReadyModel(provider,key);return {provider,model,latency:Date.now()-started,ok:true};}catch(error){return {provider,latency:Date.now()-started,ok:false,error};}}));
  const ready=probes.filter(x=>x.ok).sort((a,b)=>a.latency-b.latency);autoProviderHealthCache.expires=Date.now()+45_000;autoProviderHealthCache.order=ready.map(x=>x.provider);autoProviderHealthCache.errors=probes.filter(x=>!x.ok).map(x=>({provider:x.provider,message:String(x.error?.message||x.error)}));
  if(!ready.length)throw new Error('No configured Cloud AI provider/model is responding right now. '+probes.map(x=>providerNames[x.provider]+': '+(x.error?.message||'unavailable')).join(' · '));
  message('ai','Auto selected '+providerNames[ready[0].provider]+' / '+ready[0].model+' ('+ready[0].latency+' ms model probe).');return autoProviderHealthCache.order.slice();
 }
 async function testProvider(provider){
  setBusy(true);status('Testing '+providerNames[provider]+' API…','busy');
  try{
   const key=await secret(providerKeyId(provider));if(!key)throw new Error(providerNames[provider]+' is not configured in Cloudflare Worker.');
   const model=await fastestReadyModel(provider,key);
   await invokeProvider(provider,key,'Return exactly {"status":"ok"}.','Return exactly {"status":"ok"}.',model);
   const stateId=({gpt:'aiOpenAiKeyState',gemini:'aiGeminiKeyState',groq:'aiGroqKeyState',openrouter:'aiOpenRouterKeyState'})[provider];
   if($(stateId))$(stateId).textContent='Configured in Cloudflare Worker · API test successful';
   status(providerNames[provider]+' API responded successfully.','success');
  }catch(error){status(niceError(error,provider),'error');}
  finally{setBusy(false);}
 }
 async function askNamAIJson(system,user,stage){
  if(mode==='collab'){
   const g=await secret('openai'),m=await secret('gemini');
   if(!g||!m)throw new Error('Collaboration mode requires both GPT and Gemini credentials configured in Cloudflare Worker.');
   const gm=await fastestReadyModel('gpt',g),mm=await fastestReadyModel('gemini',m);
   status('GPT is '+stage+'…','busy');const draft=await openai(g,system,user,gm);
   status('Gemini is reviewing GPT’s '+stage+'…','busy');
   return gemini(m,system+'\nYou are the Gemini reviewer. Verify the proposal against the supplied data, correct unsupported assumptions, and return the same JSON schema only.',user+'\n\nGPT PROPOSAL:\n'+JSON.stringify(draft),mm);
  }
  const auto=mode==='auto'||ui.autoFallback.checked,order=mode==='auto'?await fastestReadyProviderOrder():(auto?providerFallbackOrder(mode):[mode]),missing=[];
  let lastError=null;
  for(let index=0;index<order.length;index++){
   const provider=order[index],key=await secret(providerKeyId(provider));
   if(!key){if(provider===mode)throw new Error(providerNames[provider]+' API key has not been saved.');missing.push(providerNames[provider]+' Worker secret');continue;}
   const model=await fastestReadyModel(provider,key);
   if(!model){if(provider===mode)throw new Error('Select a model for '+providerNames[provider]+' in AI Settings.');missing.push(providerNames[provider]+' model');continue;}
   try{
    status(providerNames[provider]+' is '+stage+'…','busy');
    const result=await invokeProvider(provider,key,system,user,model);
    if(provider!==mode)message('ai','Automatic fallback used '+providerNames[provider]+' after '+providerNames[mode]+' was unavailable.');
    return result;
   }catch(error){
    lastError=error;
    const next=order.slice(index+1).find(candidate=>candidate!==provider);
    if(!auto||!next||!isRetryableProviderError(error))throw new Error(niceError(error,provider));
    if(mode==='auto'){autoProviderHealthCache.order=autoProviderHealthCache.order.filter(item=>item!==provider);autoProviderHealthCache.expires=Date.now()+45_000;}
    message('ai',providerNames[provider]+' is temporarily busy ('+(error.message||error)+'). Switching to '+providerNames[next]+'.');
    status(providerNames[provider]+' unavailable. Trying '+providerNames[next]+'…','busy');
   }
  }
  if(lastError)throw new Error('All configured fallback providers were unavailable. Last error: '+(lastError.message||lastError));
  throw new Error('No configured AI provider/model is available. Configure a Gemini, Groq, OpenRouter, or OpenAI secret in Cloudflare Worker. Missing: '+missing.join(', '));
 }
 async function deriveNamSearchQuery(prompt){
  const system='You select search terms for the TONE3000 NAM catalog. Return JSON only: {"query":"short search phrase","reason":"brief English reason"}. Extract 2–5 useful words focused on amplifier make/model or searchable amp family/style. For artist/song tone requests, infer a plausible amp family only when justified by the requested sound; do not claim an exact real-world rig. Do not use generic words like preset, guitar tone, live, or effects. Keep query under 60 characters.';
  const result=await askNamAIJson(system,'USER TONE REQUEST:\\n'+prompt,'deriving TONE3000 search terms');
  const query=String(result?.query||'').trim().replace(/\\s+/g,' ').slice(0,60);
  if(query.length<2)throw new Error('AI could not derive useful amplifier search terms. Add an amplifier name or a clearer tone description.');
  return {query,reason:String(result?.reason||'')};
 }
 async function chooseNamTone(prompt,searchQuery,tones){
  const candidates=tones.slice(0,12).map(t=>({id:String(t.id),name:t.name,creator:t.creator,description:t.description,makes:t.makes,tags:t.tags,gear:t.gear,sizes:t.sizes,a2ModelsCount:t.a2ModelsCount,format:t.format}));
  const system='Choose the single best TONE3000 NAM tone pack for the user request. Return JSON only: {"toneId":"123","reason":"short English reason"}. Select only an ID present in CANDIDATES. Prefer direct amp make/model and compatible gear/size. If none are meaningfully relevant return {"toneId":"","reason":"no relevant match"}. Never invent a tone or assert capture details not in metadata.';
  const result=await askNamAIJson(system,'USER REQUEST:\\n'+prompt+'\\nAI SEARCH QUERY:\\n'+searchQuery+'\\nCANDIDATES:\\n'+JSON.stringify(candidates),'choosing the closest NAM tone');
  const tone=tones.find(t=>String(t.id)===String(result?.toneId||''));
  if(!tone)throw new Error('No TONE3000 tone result was relevant enough for this request. Nothing was downloaded or written to the pedal.');
  return {tone,reason:String(result.reason||'')};
 }
 async function chooseNamModel(prompt,tone,models,rejected=[]){
  const candidates=models.filter(m=>!rejected.includes(String(m.id))).slice(0,18).map(m=>({id:String(m.id),name:m.name,size:m.size,architecture:m.architecture_version??m.architecture,description:m.description,metadata:(()=>{const meta=describeNamCaptureMetadata(tone,m,tone.gear||'amp-cab');return {drive:meta.driveMetadata,description:String(m.description||tone?.description||'').slice(0,180)};})(),downloadable:Boolean(m.model_url)}));
  if(!candidates.length)throw new Error('No remaining downloadable A2-Lite captures are available in the selected TONE3000 tone.');
  const system='Choose the best downloadable A2 NAM capture for the requested guitar tone from this one TONE3000 tone pack. Return JSON only: {"modelId":"123","reason":"short English reason"}. Select only an ID from CANDIDATES. Do not choose a model without a download URL. Use model description and tone metadata as backup evidence for whether boost/OD is included; do not invent this when metadata is silent. Prefer a capture appropriate to the artist tone, and let the user override the selection in the capture dropdown. Actual file validation is authoritative.';
  const result=await askNamAIJson(system,'USER REQUEST:\\n'+prompt+'\\nSELECTED TONE:\\n'+JSON.stringify({name:tone.tone?.name||tone.name,creator:tone.tone?.creator||tone.creator,description:tone.tone?.description||tone.description,gear:tone.gear})+'\\nCANDIDATES:\\n'+JSON.stringify(candidates)+'\\nREJECTED MODEL IDS:\\n'+JSON.stringify(rejected),'selecting the closest A2-Lite capture');
  const model=models.find(m=>String(m.id)===String(result?.modelId||'')&&m.model_url);
  if(!model||rejected.includes(String(model.id)))throw new Error('AI did not select a valid downloadable candidate from this TONE3000 result.');
  return {model,reason:String(result.reason||'')};
 }
   function renderAiNamCapturePicker(pending){
   const choices=Array.isArray(pending?.choices)?pending.choices:[];
   ui.namResults.hidden=false;ui.namWizard.hidden=true;
   if(!choices.length){ui.namResults.innerHTML='<p>No downloadable A2 NAM captures remain to choose.</p>';return;}
   const recommendedId=String(pending.selected.model.id);
   const options=choices.map(item=>'<option value="'+esc(item.model.id)+'" '+(String(item.model.id)===recommendedId?'selected':'')+'>'+esc((item.model.name||'Unnamed capture')+(String(item.model.id)===recommendedId?' · AI recommended':''))+'</option>').join('');
   const reason=String(pending.selected.reason||'').trim().slice(0,180);
   ui.namResults.innerHTML='<div class="ai-tone-nam-results-head"><div><strong>AI-recommended NAM capture</strong><small>'+esc(pending.selected.tone.name)+' · '+esc(pending.selected.tone.creator?'@'+pending.selected.tone.creator:'TONE3000')+' · slot 10</small></div></div>'+
    '<p><strong>'+esc(pending.selected.model.name)+'</strong> is the AI top match. '+choices.length+' downloadable A2 captures are available; you can choose another below.</p>'+
    (reason?'<p class="ai-tone-nam-reason">Why AI recommends it: '+esc(reason)+'</p>':'')+
    '<label class="ai-tone-key-field" for="aiToneNamCaptureSelect">Choose NAM capture</label><select id="aiToneNamCaptureSelect" style="width:100%;margin:7px 0 9px;padding:11px;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8">'+options+'</select>'+
    '<button class="ai-tone-nam-import" type="button" data-ai-nam-continue>Use selected capture & continue</button>';
  }
async function automaticNamImportForPrompt(prompt){
  const bridge=window.NUXTONE3000Bridge;
  if(!activeNamGear)throw new Error('Choose Amp Only or Amp + Cab in the NAM source menu before sending this tone request.');
  if(!bridge?.searchTones||!bridge?.loadTone||!bridge?.prepareModel||!bridge?.importModel)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update the AI Studio app.');
  if(!await bridge.hasSession())throw new Error('TONE3000 account is not authenticated. Open Device → TONE3000 Settings → Connect TONE3000 Account and finish sign-in.');
  let pending=pendingNamSelection&&pendingNamSelection.prompt===prompt&&pendingNamSelection.gear===activeNamGear?pendingNamSelection:null;
  let selected=pending?.selected||null;
  if(!selected){
   const intent=await deriveNamSearchQuery(prompt);
   message('ai','Searching TONE3000 for “'+intent.query+'” ('+(activeNamGear==='amp'?'Amp Only':'Amp + Cab')+', A2 NAM).');
   status('Searching the TONE3000 NAM catalog…','busy');
   const tones=await bridge.searchTones(intent.query,{gear:activeNamGear});
   if(!tones.length){const meta=tones.searchMeta||{};throw new Error('TONE3000 catalog returned zero A2 NAM results for '+intent.query+'. Queries tried: '+(meta.queriesTried||[]).join(' → ')+'. API total for last search: '+Number(meta.total||0)+'. Capture-size filtering is deferred until model download. No file was downloaded and no pedal data was changed.');}
   const selection=await chooseNamTone(prompt,intent.query,tones);
   message('ai','Selected TONE3000 tone: '+selection.tone.name+(selection.tone.creator?' by @'+selection.tone.creator:'')+'. '+selection.reason);
   const toneOptions=[selection.tone,...tones.filter(t=>String(t.id)!==String(selection.tone.id))].slice(0,3);
   let lastError=null;
   for(const toneChoice of toneOptions){
    status('Loading A2 NAM capture metadata for '+toneChoice.name+'…','busy');
    let snapshot;try{snapshot=await bridge.loadTone(toneChoice.id,{silent:true});}catch(error){lastError=error;continue;}
    const candidates=(snapshot?.models||[]).filter(model=>Boolean(model.model_url)&&/^(2|a2)$/.test(String(model.architecture_version??model.architecture??'2').trim().toLowerCase()));
    if(!candidates.length){lastError=new Error('No downloadable A2 NAM captures in '+toneChoice.name+'.');continue;}
    const aiChoice=await chooseNamModel(prompt,toneChoice,candidates);
    const selectedModel=candidates.find(model=>String(model.id)===String(aiChoice.model.id));
    if(!selectedModel){lastError=new Error('AI selected a model outside the TONE3000 catalogue.');continue;}
    const choices=candidates.map(model=>({tone:toneChoice,model,snapshot,reason:String(model.id)===String(selectedModel.id)?aiChoice.reason:'Available alternative capture',metadata:describeNamCaptureMetadata(toneChoice,model,activeNamGear),prepared:null}));
    selected=choices.find(item=>String(item.model.id)===String(selectedModel.id));
    pending={prompt,gear:activeNamGear,selected,choices,aiSelectedModelId:String(selectedModel.id)};
    pendingNamSelection=pending;break;
   }
   if(!selected)throw new Error('No downloadable TONE3000 A2 NAM candidate found in the best matching tone packs. '+(lastError?.message||'Try another search phrase.'));
   if(pending.choices.length>1){
    renderAiNamCapturePicker(pending);
    message('ai','AI recommends '+selected.model.name+'. '+pending.choices.length+' downloadable captures are available; choose the recommendation or another capture in the dropdown.');
    status('Choose a capture before downloading and importing to slot 10. No pedal data has changed.','success');
    return {pendingSelection:true};
   }
  }
  if(!selected.prepared){
   status('Downloading '+selected.model.name+' and validating its actual NAM weights for MG-30 Gen 2…','busy');
   try{selected.prepared=await bridge.prepareModel(selected.model.id);if(pending)pending.selected=selected;pendingNamSelection=pending||{prompt,gear:activeNamGear,selected,choices:[selected]};message('ai','Capture validation passed: '+selected.model.name+' ('+selected.prepared.weightBytes.toLocaleString()+' weight bytes). '+selected.metadata.driveMetadata+'.');}
   catch(error){
    if(pending){pending.choices=pending.choices.filter(item=>String(item.model.id)!==String(selected.model.id));if(pending.choices.length){pending.selected=pending.choices[0];pendingNamSelection=pending;renderAiNamCapturePicker(pending);message('ai','Selected file failed MG-30 Gen-2 validation: '+error.message+'. Choose another capture.');status('Capture rejected; choose another available model. No device data changed.','error');return {pendingSelection:true};}}
    throw new Error('Selected NAM failed MG-30 Gen-2 weight validation: '+error.message);
   }
  }
  const editor=window.MG30AIToneBridge;
  if(!editor?.isConnected?.()){status('NAM found and validated. Connect the MG-30 via USB-MIDI, then press Send again to transfer to slot 10. No pedal data has been written.','success');return {pendingConnection:true};}
  status('Checking slot 10 and asking before overwrite if occupied…','busy');
  const imported=await bridge.importModel(selected.model.id,{slotNumber:10,confirmOverwrite:true,prepare:false});
  if(imported?.cancelled){pendingNamSelection=null;throw new Error('NAM import canceled. Slot 10 was not changed.');}
  if(!imported?.success)throw new Error('The automatic NAM import did not complete.');
  pendingNamSelection=null;
  const amp=editor.getCatalog?.().find(block=>block.id==='AMP'),slotModel=amp?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10);
  if(!slotModel)throw new Error('NAM imported, but AMP NAM Slot 10 is not verifiable. No AI parameters were sent.');
  activeNamModelName=slotModel.name;
  activeNamContext='TONE3000 NAM capture "'+selected.model.name+'" from tone "'+selected.tone.name+'" was validated and imported into slot 10. Use exact selection-only AMP model "'+activeNamModelName+'" with no parameters; never modify NAM internals. SOURCE METADATA (TONE3000, supporting evidence only): '+JSON.stringify(selected.metadata)+'.';
  message('ai','Imported '+selected.model.name+' from '+selected.tone.name+' into NAM Slot 10. Library copy retained. '+selected.metadata.driveMetadata+'.');
  status('NAM installed in slot 10. Building the preset around the imported amp…','busy');namModeActive=true;
  return {success:true,tone:selected.tone,model:selected.model,slotModel:slotModel.name};
 }
 async function makePlan(prompt,bridge){
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();if(!catalog?.length)throw new Error('The MG-30 catalog is unavailable.');
  const system=systemPrompt(catalog,snapshot,false,artistToneGuidance(prompt));
  const first=await askNamAIJson(system,userText(prompt,null,activeNamContext),'building your Tone Plan');
  try{return validateAiTonePlan(first,catalog);}catch(validationError){
   message('ai','The first proposal did not exactly match the MG-30 catalog ('+validationError.message+'). Asking the AI to correct the model/parameter selection before sending anything.');
   const correctionSystem=system+'\nMANDATORY CORRECTION: Your prior proposal failed application validation. Re-check exact block model names and parameter keys against the compact catalog. If changing a model, include every parameter listed for that exact model. Do not guess or abbreviate names. Return corrected complete JSON only.';
   const correctionUser='USER REQUEST:\n'+prompt+'\nINSTALLED NAM CONTEXT:\n'+(activeNamContext||'none')+'\nVALIDATION ERROR:\n'+validationError.message+'\nPREVIOUS INVALID PLAN:\n'+JSON.stringify(first)+'\\nReturn a corrected JSON Tone Plan using only exact catalog entries.';
   const corrected=await askNamAIJson(correctionSystem,correctionUser,'correcting the catalog validation');
   try{return validateAiTonePlan(corrected,catalog);}catch(secondError){throw new Error('AI could not produce a catalog-valid Tone Plan after one correction. No MIDI changes were sent. '+secondError.message);}
  }
 }
 async function submit(){
  if(busy)return;const prompt=ui.prompt.value.trim();if(!prompt){status('Enter a tone request first.','error');return;}
  const bridge=window.MG30AIToneBridge;if(!bridge){status('The MG-30 editor bridge is unavailable. Reload MG30 Studio.','error');return;}if(!namModeActive&&!bridge.isConnected?.()){status('Failed: MG-30 is disconnected. Connect USB-MIDI before generating a built-in amp live preset.','error');return;}
  setBusy(true);message('user',prompt);status(namModeActive?'Preparing the TONE3000 NAM search…':'Checking USB-MIDI connection…','busy');
  try{
   if(namModeActive){const namResult=await automaticNamImportForPrompt(prompt);if(namResult?.pendingConnection||namResult?.pendingSelection)return;}
   if(!bridge.isConnected?.())throw new Error('The MG-30 is disconnected. Connect USB-MIDI before applying the live preset.');
   const plan=await makePlan(prompt,bridge);
   if(activeNamContext){
    const amp=bridge.getCatalog?.().find(block=>block.id==='AMP');
    const installed=amp?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10&&model.name===activeNamModelName);
    if(!installed)throw new Error('The imported NAM is not visible as a verified AMP slot-10 model. No preset changes were sent. Re-read the pedal slot metadata and try again.');
    const currentAmp=bridge.getSnapshot?.().find(block=>block.id==='AMP');
    const existing=plan.blocks.findIndex(block=>block.id==='AMP');
    if(currentAmp?.model===installed.name&&currentAmp.enabled){
     if(existing>=0)plan.blocks.splice(existing,1);
    }else{
     const ampChange={id:'AMP',model:installed.name,enabled:true,parameters:{}};
     if(existing>=0)plan.blocks[existing]=ampChange;else plan.blocks.unshift(ampChange);
    }
    plan.summary=(plan.summary||'AI tone')+' using the imported NAM capture in slot 10.';
   }
   if(!bridge.isConnected())throw new Error('The MG-30 disconnected before changes could be sent.');
   status('Tone Plan validated. Updating the editor and sending MIDI…', 'busy');const result=await bridge.applyPlan(plan);
   last={before:result.before,after:result.after,blocks:result.blocks};ui.undo.disabled=false;
   message('ai',plan.summary+'\nParameters sent to: '+result.blocks.join(', ')+(plan.notes.length?'\n'+plan.notes.join(' · '):''));
   ui.prompt.value='';$('aiToneCount').textContent='0/1400';status('Done. Editor controls updated and MIDI commands sent. Play your guitar to audition the tone.','success');
  }catch(e){message('ai','Failed: '+(e.message||e));status('Failed: '+(e.message||e),'error');}
  finally{setBusy(false);ui.undo.disabled=!last;}
 }
 async function undo(){
  if(busy||!last)return;const bridge=window.MG30AIToneBridge;if(!bridge?.isConnected?.()){status('Undo failed: MG-30 is not connected.','error');return;}
  setBusy(true);status('Checking manual tweaks and undoing AI changes…','busy');
  try{const r=await bridge.restoreBlocks(last.before,last.after,last.blocks);
   if(r.restored.length)message('ai','Undo completed: '+r.restored.join(', '));
   if(r.skipped.length)message('ai','Skipped blocks modified manually: '+r.skipped.join(', '));
   last=null;status(r.restored.length?'Undo completed.':'No blocks can be safely undone without overwriting manual tweaks.',r.restored.length?'success':'error');
  }catch(e){status('Undo failed: '+e.message,'error');}
  finally{setBusy(false);ui.undo.disabled=!last;}
 }
 open.addEventListener('click',()=>sheet.classList.contains('on')?closePanel():openPanel());
 $('aiToneClose').addEventListener('click',closePanel);shade.addEventListener('click',closePanel);
 $('aiToneSettingsToggle').addEventListener('click',()=>{ui.settings.classList.toggle('on');if(ui.settings.classList.contains('on'))void keyStates();});
 $('aiToneSaveKeys').addEventListener('click',saveKeys);
 $('aiToneRefreshModels').addEventListener('click',()=>{void refreshAllProviderModels(false);});
 $('aiToneTestOpenAi').addEventListener('click',()=>testProvider('gpt'));$('aiToneTestGemini').addEventListener('click',()=>testProvider('gemini'));
 $('aiToneTestGroq').addEventListener('click',()=>testProvider('groq'));$('aiToneTestOpenRouter').addEventListener('click',()=>testProvider('openrouter'));
 $('aiToneDeleteOpenAi').addEventListener('click',()=>deleteKey('gpt'));$('aiToneDeleteGemini').addEventListener('click',()=>deleteKey('gemini'));
 $('aiToneDeleteGroq').addEventListener('click',()=>deleteKey('groq'));$('aiToneDeleteOpenRouter').addEventListener('click',()=>deleteKey('openrouter'));
 
 ui.autoFallback.checked=localStorage.getItem('mg30-ai-auto-fallback')!=='0';
 ui.autoFallback.addEventListener('change',()=>localStorage.setItem('mg30-ai-auto-fallback',ui.autoFallback.checked?'1':'0'));
 ui.providerSelect.value=mode;ui.providerSelect.addEventListener('change',()=>setMode(ui.providerSelect.value));
 ui.activeModel.addEventListener('change',()=>{const provider=activeModelProvider();if(ui.activeModel.value==='__auto__'){localStorage.setItem('mg30-ai-model-manual-'+provider,'0');delete autoModelHealthCache[provider];}else if(ui.activeModel.value){localStorage.setItem(modelStorageKey(provider),ui.activeModel.value);localStorage.setItem('mg30-ai-model-manual-'+provider,'1');}autoProviderHealthCache.expires=0;});
 $('aiToneUndo').addEventListener('click',undo);$('aiToneSend').addEventListener('click',submit);
 ui.prompt.addEventListener('input',()=>{$('aiToneCount').textContent=ui.prompt.value.length+'/1400';});
 ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('on')&&!busy)closePanel();});
 window.addEventListener('mg30-midi-connection-state',e=>{if(!e.detail?.connected)status('USB-MIDI disconnected. TONE3000 search can still run; connect MG-30 before slot-10 import or live preset send.','idle');else if(!busy)status('MG-30 connected via USB-MIDI.','success');});
 window.addEventListener('mg30-midi-connected',()=>{if(!busy)status('MG-30 connected. AI live editing is ready.','success');});
 await keyStates();if(window.MG30AIToneBridge?.isConnected?.())status('MG-30 connected via USB-MIDI.','success');
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});else void init();
}
