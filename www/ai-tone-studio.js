import { cloudApiRequest } from './cloud-api.js';
import { analyzeToneAudioSamples, formatToneAudioMetrics, selectUsbInputChannels } from './ai-audio-analysis.js';

const aiRuntimeErrorQueue = [];
let aiRuntimeErrorHandlersInstalled = false;
function safeAiRuntimeError(value) {
 const raw = value instanceof Error ? (value.stack || value.message) : String(value ?? 'Unknown JavaScript error');
 return raw
  .replace(/Bearer\s+[A-Za-z0-9._~+-]+=*/gi, 'Bearer [redacted]')
  .replace(/(?:api[_-]?key|token|secret)(\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
  .slice(0, 1800);
}
function showAiRuntimeError(kind, value, location = '') {
 const detail = safeAiRuntimeError(value) + (location ? '\n' + location : '');
 const node = typeof document !== 'undefined' ? document.getElementById('aiToneMessages') : null;
 const statusNode = typeof document !== 'undefined' ? document.getElementById('aiToneStatus') : null;
 if (!node) { aiRuntimeErrorQueue.push({ kind, detail }); return; }
 const item = document.createElement('div');
 item.className = 'ai-tone-message ai';
 const label = document.createElement('small');
 label.textContent = 'RUNTIME ERROR · ' + kind;
 const body = document.createElement('div');
 body.textContent = detail;
 item.append(label, body);
 node.appendChild(item);
 node.scrollTop = node.scrollHeight;
 if (statusNode) {
  statusNode.textContent = 'JavaScript ' + kind + ': ' + detail.split('\n')[0];
  statusNode.dataset.state = 'error';
  statusNode.setAttribute('aria-busy', 'false');
 }
}
function flushAiRuntimeErrors() {
 while (aiRuntimeErrorQueue.length) {
  const entry = aiRuntimeErrorQueue.shift();
  showAiRuntimeError(entry.kind, entry.detail);
 }
}
function installAiRuntimeErrorHandlers() {
 if (typeof window === 'undefined' || aiRuntimeErrorHandlersInstalled) return;
 aiRuntimeErrorHandlersInstalled = true;
 const previous = window.onerror;
 window.onerror = function(message, source, line, column, error) {
  const location = [source, line ? 'line ' + line : '', column ? 'column ' + column : ''].filter(Boolean).join(': ');
  showAiRuntimeError('window.onerror', error || message, location);
  if (typeof previous === 'function') {
   try { return previous.call(this, message, source, line, column, error); } catch (handlerError) {
    showAiRuntimeError('previous window.onerror handler', handlerError);
   }
  }
  return false;
 };
 window.addEventListener('unhandledrejection', event => {
  showAiRuntimeError('unhandledrejection', event.reason || 'Unhandled promise rejection');
 });
}
installAiRuntimeErrorHandlers();

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
   if(!d)throw new Error('Parameter '+key+' is not available for '+id+'/'+modelName+'. Allowed exact catalog keys: '+(allowed.size?[...allowed.keys()].join(', '):'(none)')+'. Do not substitute aliases.');
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

export const TONE_SPECIALIST_ROLES=Object.freeze([
 'amp_cabinet_specialist','effects_specialist',
 'guitar_input_specialist','tone_calibration_specialist','tone_critic'
]);
export function toneSpecialistToolDefinition(){
 return {
  type:'function',
  name:'delegate_tone_specialist',
  description:'Delegate exactly one sequential task to one external role-specialist. You are GPT-6 Luna, the sole Chief Tone Architect and final decision-maker. You perform initial musical/reference research yourself; Tone Researcher is not an external role. For every new preset, obtain at least two successful technical specialist roles from two different configured providers. Request one specialist, wait for its real provider result, evaluate it, then request the next different role. Never call multiple specialists in parallel. Available roles: Amp & Cabinet Specialist; Effects Specialist; Guitar & Input Specialist only when guitar/pickup/input materially affects the target; Tone Calibration Specialist for whole-chain balance; Tone Critic only when there is material uncertainty, conflict, or risk. Maximum six specialist tasks total. Gemini is first priority; failed tasks fall back sequentially to Groq, OpenRouter, then Cloudflare Workers AI. The app enforces different providers for the two required successful experts.',
  strict:true,
  parameters:{
   type:'object',
   properties:{
    role:{type:'string',enum:[...TONE_SPECIALIST_ROLES]},
    focus:{type:'string',maxLength:140},
    brief:{type:'string',maxLength:600},
    blockIds:{type:'array',items:{type:'string',maxLength:12},maxItems:4},
    candidatePlan:{type:'string',maxLength:3000}
   },
   required:['role','focus','brief','blockIds','candidatePlan'],
   additionalProperties:false
  }
 };
}
export async function requestChatGptConversation({bridge,model,system,user,maxOutputTokens=520}){
 if(!bridge?.sendResponse)throw new Error('ChatGPT native SIWC connection is unavailable. Open Device settings and connect your ChatGPT account.');
 const outputLimit=Math.max(256,Math.min(700,Math.floor(Number(maxOutputTokens)||520)));
 const instructions=String(system||'');
 const originalUser=String(user||'');
 const breakdown=[];
 const usageOf=response=>{
  const usage=response?.usage;
  if(!usage||typeof usage!=='object')return null;
  const input=Number(usage.input_tokens??usage.prompt_tokens??0);
  const output=Number(usage.output_tokens??usage.completion_tokens??0);
  return {input_tokens:input,output_tokens:output,total_tokens:Number(usage.total_tokens??input+output)};
 };
 const request=async(input,tokens,stage)=>{
  try{
   const response=await bridge.sendResponse({model,input,instructions,maxOutputTokens:tokens,parallelToolCalls:false});
   breakdown.push({stage,model:response?.model||model,usage:usageOf(response),input:JSON.stringify(input),incomplete:Boolean(response?.incomplete),failed:false,reason:String(response?.incompleteReason||'')});
   return response;
  }catch(error){
   breakdown.push({stage,model,usage:null,input:JSON.stringify(input),incomplete:false,failed:true,reason:String(error?.message||error).slice(0,180)});
   throw error;
  }
 };
 const attachBreakdown=error=>{
  try{Object.defineProperty(error,'__aiUsageBreakdown',{value:breakdown,enumerable:false,configurable:true});}catch{}
  return error;
 };
 const retryableNetworkError=error=>/timed? ?out|connection reset|connection aborted|failed to connect|network|stream ended|unexpected end of stream|socket closed|stream interrupted/i.test(String(error?.message||error||''));
 let first;
 try{
  first=await request([{role:'user',content:originalUser}],outputLimit,'answering your tone question · initial');
 }catch(error){
  if(!retryableNetworkError(error))throw attachBreakdown(error);
  try{
   first=await request([{role:'user',content:originalUser.slice(0,2600)}],outputLimit,'answering your tone question · network retry');
  }catch(retryError){throw attachBreakdown(new Error('ChatGPT discussion could not reconnect after one bounded retry: '+String(retryError?.message||retryError)));}
 }
 let finalResponse=first;
 let partial=String(first?.text||'').trim();
 if(first?.incomplete){
  const reason=String(first.incompleteReason||'incomplete').toLowerCase();
  const mayContinue=['max_output_tokens','stream_ended','stream_interrupted','incomplete'].includes(reason);
  if(!mayContinue){breakdown[breakdown.length-1].failed=true;throw attachBreakdown(new Error('ChatGPT response was incomplete (reason: '+reason+'). No tone changes were made.'));}
  const continuationInput=partial
   ?[{role:'assistant',content:partial.slice(-2800)},{role:'user',content:'Continue from the exact ending of the previous answer. Do not repeat or summarize any earlier sentences. Finish the answer concisely.'}]
   :[{role:'user',content:originalUser.slice(0,2600)+'\\n\\nRetry this discussion answer once, concise and complete. Do not make device changes.'}];
  try{
   finalResponse=await request(continuationInput,partial?360:outputLimit,'answering your tone question · '+(partial?'continuation':'bounded retry'));
  }catch(error){throw attachBreakdown(new Error('ChatGPT discussion could not be completed after one bounded continuation: '+String(error?.message||error)));}
  if(finalResponse?.incomplete){
   breakdown[breakdown.length-1].failed=true;
   throw attachBreakdown(new Error('ChatGPT response remained incomplete after one bounded continuation (reason: '+String(finalResponse.incompleteReason||'unknown')+'). No device changes were made.'));
  }
 }
 const continuation=String(finalResponse?.text||'').trim();
 let reply=partial&&first?.incomplete?partial:continuation;
 if(first?.incomplete&&partial&&continuation){
  let overlap=0;
  const max=Math.min(120,partial.length,continuation.length);
  for(let n=max;n>=12;n--){if(partial.slice(-n)===continuation.slice(0,n)){overlap=n;break;}}
  reply=partial+(overlap?continuation.slice(overlap):'\\n'+continuation);
 }
 if(!reply)throw attachBreakdown(new Error('ChatGPT returned an empty conversational response.'));
 const result={reply};
 const aggregate=breakdown.reduce((sum,item)=>{
  if(item.usage){sum.input_tokens+=item.usage.input_tokens;sum.output_tokens+=item.usage.output_tokens;sum.total_tokens+=item.usage.total_tokens;}
  return sum;
 },{input_tokens:0,output_tokens:0,total_tokens:0});
 if(breakdown.some(item=>item.usage))Object.defineProperty(result,'__aiUsage',{value:aggregate,enumerable:false});
 Object.defineProperty(result,'__aiUsageBreakdown',{value:breakdown,enumerable:false});
 Object.defineProperty(result,'__aiModel',{value:String(finalResponse?.model||model),enumerable:false});
 return result;
}
export function isToneCreationFollowUp(prompt,conversation=''){
 const value=String(prompt||'').toLowerCase().replace(/\s+/g,' ').trim();
 const context=String(conversation||'').toLowerCase();
 if(!value||!context)return false;
 const hasToneDiscussion=/\b(tone|guitar|gitar|amplifier|\bamp\b|preset|patch|sound|suara|gain|pickup|delay|reverb|efek|effect|john\s*mayer|petrucci|satriani|blues|jazz|rock|funk|country|ambient)\b/i.test(context);
 if(!hasToneDiscussion)return false;
 if(/\b(ringkasan|summary|penjelasan|explanation|daftar|list|tabel|table|perbandingan|comparison|analisis|analysis|lirik|lyrics|catatan|notes)\b/i.test(value))return false;
 const explicitNewTarget=/\b(john\s*mayer|john\s*petrucci|petrucci|satriani|dream\s*theater|jazz|blues|metal|country|funk|ambient|progressive rock)\b/i.test(value)
  ||/\b(?:tone|preset|patch|sound|suara)\s+(?!ini\b|itu\b|tadi\b|tersebut\b|sekarang\b|baru\b|it\b|that\b|this\b|now\b)[\p{L}\d-]+(?:\s+[\p{L}\d-]+)?/iu.test(value);
 if(explicitNewTarget)return false;
 const directBuild=/\b(buatkan|bikinkan|bikin(?:kan)?|rakit(?:kan)?|susun(?:kan)?|generate|create|build|make)\b/i.test(value);
 const applyRecommendation=/\b(terapkan|apply|wujudkan|implement)\b.{0,50}\b(rekomendasi|hasil diskusi|yang tadi|itu|ini|tersebut|saran|it|this|that|above|discussed)\b/i.test(value);
 const continueAndBuild=/\b(?:oke|ok|sip|setuju|baik|ya|sekarang|langsung|now|go ahead|sounds good|yes|please)\b.{0,55}\b(?:buatkan|bikin(?:kan)?|rakit(?:kan)?|susun(?:kan)?|generate|create|build|make|terapkan|apply)\b/i.test(value);
 const buildWithReference=/\b(?:buatkan|bikinkan|bikin|generate|create|build|make|terapkan|apply)\b.{0,35}\b(?:sekarang|langsung|ini|itu|tersebut|tadi|seperti itu|yang tadi|it|this|that|now)\b/i.test(value);
 return directBuild||applyRecommendation||continueAndBuild||buildWithReference;
}
export function classifyAssistantIntent(prompt,conversation=''){
 const value=String(prompt||'').toLowerCase().replace(/\s+/g,' ').trim();
 if(!value)return 'consultation';
 const searchVerb=/\b(cari(?:kan|in)?|temukan|telusuri|find|search|look for|help me find|recommend(?: me)?)\b/i;
 const namSubject=/\b(nam|tone\s*3000|amp(?:-?nya)?|amplifier(?:-?nya)?|head(?:-?nya)?|cab(?:inet)?(?:-?nya)?|capture|profil(?:e)?|profile|pedal(?:-?nya)?)\b/i;
 if(searchVerb.test(value)&&namSubject.test(value))return 'nam_search';
 if(/\b(ringkasan|summary|penjelasan|explanation|daftar|list|tabel|table|perbandingan|comparison|lirik|lyrics)\b/i.test(value))return 'consultation';
 const analysis=/\b(analy[sz](?:e|ing|is|a)?|analysis|analisa|analisis|dengar|listen|evaluasi|evaluate|diagnos(?:e|is))\b/i.test(value);
 const audioTopic=/\b(audio|tone|suara|gitar|guitar|current|sekarang|ini|rekaman|recording)\b/i.test(value);
 const change=/\b(tweak|adjust|fix|improv(?:e|ement)|change|modify|reduce|increase|raise|lower|less|more|make it|kurangi|kurangin|tambah|naikkan|turunkan|ubah|perbaiki|haluskan|lembutkan|buat lebih|lebih\s+(hangat|gelap|terang|bright|lembut|sustain|gain|body|panjang|pendek)|kurang\s+(hangat|body|sustain|gain))\b/i.test(value);
 const toneProblem=/\b(too bright|too muddy|too harsh|too fizzy|too thin|too boomy|terlalu (tajam|bright|muddy|tipis|boomy|keras|terang)|kurang (hangat|body|sustain|gain)|berlebihan)\b/i.test(value);
 const question=/\b(apa|apakah|kenapa|mengapa|bagaimana|gimana|jelaskan|bedanya|perbedaan|what|why|how|explain|difference|does|do you|can you explain|should i)\b/i.test(value)||/[?？]$/.test(value);
 if(analysis&&audioTopic&&!change)return 'audio_analyze';
 if(change)return 'tone_refine';
 if(isToneCreationFollowUp(prompt,conversation))return 'tone_create';
 if(question)return 'consultation';
 if(toneProblem)return 'tone_refine';
 if(/\b(create|generate|build|make|design|buat(?:kan)?|bikin)\b[\s\S]{0,45}\b(preset|tone|patch|sound|suara)\b|\b(preset|tone|patch)\b[\s\S]{0,35}\b(for|untuk|ala|inspired|inspired by|bergaya)\b/i.test(value))return 'tone_create';
 return 'consultation';
}
export function requiresToneArchitect(prompt){
 const value=String(prompt||'');
 return /\b(?:buat(?:kan)?|bikin|create|make|build|generate)\b.{0,90}\b(?:tone|preset)\b/i.test(value) ||
  /\b(john\s*mayer|john\s*petrucci|petrucci|satriani|dream\s*theater|stevie\s*ray\s*vaughan|srv|jimi\s*hendrix|hendrix|eric\s*clapton|david\s*gilmour|gilmour|slash|eddie\s*van\s*halen|van\s*halen|john\s*frusciante|frusciante|mark\s*knopfler|gary\s*moore|joe\s*bonamassa|bb\s*king|b\.b\.\s*king)\b/i.test(value);
}
export function shouldOfferToneSpecialist(prompt,localRefinement=false){
 if(localRefinement||isLocalToneRefinement(prompt))return false;
 return requiresToneArchitect(prompt)||isComplexToneRequest(prompt)||classifyAssistantIntent(prompt)==='tone_create';
}
export function shouldUseMultiAgent(prompt,intent='tone_create',selectedMode='auto',localRefinement=false){if(localRefinement||intent!=='tone_create')return false;return selectedMode==='collab';}
export function shouldCooldownProvider(error){const status=Number(error?.upstreamStatus||error?.status||0);if([408,425,429,500,502,503,504].includes(status))return true;const v=String(error?.message||error||'');return /high demand|capacity exceeded|temporarily unavailable|temporarily busy|server busy|timed? out|failed to fetch|network|provider rejected the request.*\b404\b/i.test(v);}
function systemPrompt(catalog,snapshot,review,toneGuidance=''){
 const lines=[
 'You are a live tone editor for the original NUX MG-30 Gen 2 firmware 6.0.x, never MKII.',
 responseLanguageInstruction(),
 'Interpret the musical goal before selecting gear. When a structured Tone Architect state is provided, treat it as authoritative and do not re-run or invent artist analysis.',
 'The CURRENT USER REQUEST is authoritative. Use recent conversation only to clarify omitted preferences; never carry over a previous artist, amp model or tone direction when the current request names a different artist or target.',
 'Convert the intent into the smallest catalog-valid set of MG-30 block and parameter changes. Preserve every unaffected block and setting.',
 'Include compact orchestration metadata at the top level when possible: tone_intent (object), confidence (0..1), review_required (boolean), and review_reason (short string). These metadata fields do not replace or bypass application validation.',
 'Return only JSON: {"summary":"summary in the USER REQUEST language","blocks":[{"id":"AMP","model":"Deluxe Rvb","enabled":true,"parameters":{"gain":35}}],"notes":[]}.',
 'Only include blocks you intend to change. Use exact block ids, model names and parameter keys from the app catalog.',
 'Rotary/selector values are normalized 0..100. Discrete controls must use an exact numeric choice from the catalog.',
 'When changing model, include every writable parameter for that model. When keeping the current model, include only parameters to change.',
 'Never invent models, parameter names, effect identifiers, MIDI CC values or unsupported features.',
 'Never change IR/User/Third Party/Collection IR, NAM internal parameters, Send/Return, Volume, scene, preset slot, MIDI mapping or signal-chain order.',
 'The AMP catalog may expose NAM Slot 10 as a selection-only model. When installed NAM context is supplied, do not propose any AMP block; the application selects imported slot 10 deterministically. Never write NAM internal controls and never select NAM slots 1–9.',
 'Do not output MIDI, SysEx, preset bytes or import instructions. The app validates and writes parameter changes through its current editor path.',
 'CATALOG CONTRACT: Blocks are [id,currentModel,models]; models are [exactName,kind,slot,parameters]. Range parameters are exact keys; discrete parameters are [key,[allowed values]]. Copy each parameter key character-for-character from the selected exact model. Never substitute common pedal synonyms or carry a key from another effect model (for example, mix, level, volume, intensity, or echo are not universal aliases). If a key is absent for that exact model, do not output it. A model change includes all writable parameters; a same-model tweak includes changed keys only. Preserve unlisted blocks. Make choices artist/style-specific; never claim an exact artist rig. TONE3000 metadata is supporting evidence only; unknown boost/OD status must remain unknown.'
 ];
 if(toneGuidance)lines.push(toneGuidance);
 if(review)lines.push('You are the Gemini reviewer in collaboration mode. Check artist/style specificity and catalog correctness, then return the complete final changed-block proposal.');
 const compact=compactToneContext(catalog,snapshot);
 return lines.join('\n')+'\n\nAPP CATALOG (compact):\n'+JSON.stringify(compact.catalog)+'\n\nCURRENT EDITOR (compact):\n'+JSON.stringify(compact.snapshot);
}
function userText(prompt,candidate,namContext,conversation=''){return (conversation?'RECENT CONVERSATION CONTEXT (chronological):\n'+conversation+'\n\n':'')+'USER REQUEST:\n'+prompt+(namContext?'\n\nINSTALLED NAM CONTEXT:\n'+namContext:'')+(candidate?'\n\nGPT PROPOSAL TO REVIEW:\n'+JSON.stringify(candidate):'')+'\n\nReturn final JSON only.';}
async function secret(provider) {
if (provider === 'chatgpt') {
try { const session = await window.MG30ChatGPTBridge?.getSession?.(); return session?.status === 'connected' && session?.sharing ? 'chatgpt-plan' : ''; }
catch { return ''; }
}
const key = provider === 'openai' ? 'gpt' : provider;
const status = await getCloudAiStatus();
return status?.providers?.[key] ? 'cloud-managed' : '';
}
const WORKERS_AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';
async function cloudTonePlan(provider, system, prompt, model, maxOutputTokens=900) {
 if(provider==='cloudflare')model=WORKERS_AI_MODEL;
 else if (!model) throw new Error('Choose an available model in AI Settings.');
 const result = await cloudApiRequest('/api/v1/ai/tone-plan', { method: 'POST', body: { provider, model, system, prompt, maxOutputTokens } });
 if (!result?.tonePlan || typeof result.tonePlan !== 'object') throw new Error('Cloud AI did not return a valid Tone Plan response.');
 const plan={...result.tonePlan};
 Object.defineProperty(plan,'__aiUsage',{value:result.usage||null,enumerable:false,configurable:false});
 Object.defineProperty(plan,'__aiModel',{value:result.model||WORKERS_AI_MODEL,enumerable:false,configurable:false});
 return plan;
}
async function openai(_credential, system, prompt, model, maxOutputTokens=900) { return cloudTonePlan('gpt', system, prompt, model, maxOutputTokens); }
async function chatgpt(_credential, system, prompt, model) {
const bridge = window.MG30ChatGPTBridge;
if (!bridge?.sendResponse) throw new Error('ChatGPT native SIWC connection is unavailable. Open Device settings and connect your ChatGPT account.');
const response = await bridge.sendResponse({ model, input: [{ role: 'user', content: String(prompt || '') }], instructions: String(system || ''), maxOutputTokens: 1350, parallelToolCalls: false });
const text = String(response?.text || '').trim();
if (!text) throw new Error('ChatGPT returned no text output.');
const result = parseJson(text);
if(response?.usage&&typeof response.usage==='object')Object.defineProperty(result,'__aiUsage',{value:{
 input_tokens:Number(response.usage.input_tokens??response.usage.prompt_tokens??0),
 output_tokens:Number(response.usage.output_tokens??response.usage.completion_tokens??0),
 total_tokens:Number(response.usage.total_tokens??((response.usage.input_tokens??response.usage.prompt_tokens??0)+(response.usage.output_tokens??response.usage.completion_tokens??0)))
},enumerable:false,configurable:false});
Object.defineProperty(result, '__aiModel', { value: response.model || model, enumerable: false, configurable: false });
return result;
}
async function gemini(_credential, system, prompt, model, maxOutputTokens=900) { return cloudTonePlan('gemini', system, prompt, model, maxOutputTokens); }

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
if (provider === 'chatgpt') {
const rows = await window.MG30ChatGPTBridge?.listModels?.();
return (Array.isArray(rows) ? rows : []).map(row => ({ id: String(row.slug || ''), name: String(row.displayName || row.slug || '') })).filter(row => row.id);
}
const data = await cloudApiRequest('/api/v1/ai/models?provider=' + encodeURIComponent(provider === 'gpt' ? 'gpt' : provider));
return Array.isArray(data.models) ? data.models : [];
}
export function providerFallbackOrder(primary='gemini'){
const freePriority=['gemini','groq','openrouter'];
if(primary==='cloudflare')return ['cloudflare','chatgpt',...freePriority];
if(['chatgpt','auto'].includes(primary))return ['chatgpt',...freePriority,'cloudflare'];
const first=freePriority.includes(primary)?primary:(primary==='gpt'?'gpt':'gemini');
return first==='gpt'?['gpt',...freePriority,'cloudflare']:[first,...freePriority.filter(provider=>provider!==first),'cloudflare'];
}
export function isLocalToneRefinement(prompt){
 const p=String(prompt||'').toLowerCase();
 if(!p.trim())return false;
 if(/\b(genre|style|artist|musisi|lagu|referensi|reference|vibe|feel|karakter musikal|tone baru|preset baru|from scratch|mulai dari awal|reset|john\s*mayer|petrucci|satriani|jazz|blues|metal|country|funk|ambient|progressive rock)\b/.test(p))return false;
 return /\b(more|less|slightly|a little|reduce|increase|raise|lower|shorter|longer|warmer|brighter|darker|tighter|softer|wetter|drier|kurangi|kurangin|tambah|naikkan|turunkan|lebih|sedikit|agak|pendekkan|panjangkan|hangat|terang|gelap|gain|bass|middle|treble|presence|delay|reverb|mix|depth|rate|attack|level)\b/.test(p);
}
export function compactToneArchitectIntent(raw,prompt=''){
 const source=raw?.tone_intent||raw?.toneIntent||raw?.intent||raw||{};
 const short=(value,fallback='')=>String(value??fallback).replace(/\s+/g,' ').trim().slice(0,120);
 const list=value=>Array.isArray(value)?value.map(x=>short(x)).filter(Boolean).slice(0,4):[];
 return {
  reference:short(source.reference||source.artist_reference||source.artist),
  style:short(source.style||source.genre),
  feel:short(source.feel||source.playing_feel),
  dynamics:short(source.dynamics||source.response),
  gainCharacter:short(source.gain_character||source.gain||source.saturation),
  tonalBalance:short(source.tonal_balance||source.eq||source.frequency_balance),
  ambience:short(source.ambience||source.effects_space),
  avoid:list(source.avoid||source.avoid_list),
  focus:short(source.focus||source.priority,short(prompt,artistToneGuidance(prompt))),
  summary:short(source.summary||source.reasoning_summary,short(prompt,artistToneGuidance(prompt))),
  confidence:source.confidence!==undefined&&source.confidence!==null&&Number.isFinite(Number(source.confidence))?Math.max(0,Math.min(1,Number(source.confidence))):null
 };
}
export function shouldInvokeCriticalReviewer(plan){
 if(!plan||typeof plan!=='object')return false;
 if(plan.review_required===true||plan.reviewRequired===true)return true;
 if((Array.isArray(plan.conflicts)&&plan.conflicts.length)||(Array.isArray(plan.uncertainties)&&plan.uncertainties.length))return true;
 const confidence=Number(plan.confidence);
 if(plan.confidence!==undefined&&plan.confidence!==null&&Number.isFinite(confidence)&&confidence<0.62)return true;
 return Array.isArray(plan.blocks)&&plan.blocks.length>=4;
}
export function toneArchitectSystemPrompt(){
 return 'You are GPT-6 Luna, the sole Chief Tone Architect for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' The CURRENT USER MUSICAL REQUEST is authoritative; previous artist references must not override a newly named artist or target. If the current request is a short continuation command such as make it now, use the recent tone discussion to resolve the referent and carry forward agreed musical preferences. Perform the initial artist/song/era, tone-character and rig research yourself. Separate known, reported, inferred and unknown details; never invent an exact rig, source or citation. You own the Tone Researcher responsibility; do not delegate it. For every new preset, request at least two distinct technical specialist roles sequentially from at least two different external provider identities. Gemini is first; fallback is Groq, OpenRouter, then Cloudflare Workers AI. Review each real result before requesting the next specialist. Never run specialists in parallel. Synthesize findings into a catalogue-valid Tone Plan and remain the only final decision-maker. Choose only exact original MG-30 Gen 2 firmware 6.0.x models, blocks and parameter keys. Preserve unrelated state, NAM, IR mappings and MIDI mappings. Use the same language as the USER MUSICAL REQUEST for every natural-language JSON value.';
}
export function toneLeadInstruction(intent,stateProvidedInUser=false){
 const state=stateProvidedInUser?'The current compact tone intent is supplied in the user payload. Treat it as authoritative and do not reconstruct missing chat history.':(intent?'Use this compact tone intent as context: '+JSON.stringify(intent)+'.':'Infer the musical intent from the current user request and clearly separate evidence, inference and uncertainty.');
 return 'GPT-6 LUNA · TONE ARCHITECT CHIEF: You are GPT-6 Luna, the sole researcher, orchestrator, preset engineer and final decision-maker. Do the musical/reference research yourself before consulting external technical specialists. Do not hand the Tone Researcher responsibility to another provider. Then consult at least two distinct technical specialists sequentially, on two different provider identities, before creating a new preset. Evaluate their findings, reconcile disagreement and synthesize one catalogue-valid MG-30 Gen 2 firmware 6.0.x Tone Plan. Never invent model names or parameter keys. Preserve unaffected blocks, NAM, IR mappings, MIDI mappings, signal-chain order and unrelated device state. Set review_required=true only for material conflicts, low confidence, uncertain mapping or coupled changes; include a short review_reason and confidence (0..1). Return the normal Tone Plan JSON only.';
}
export function isRetryableProviderError(error){
 const value=String(error?.message||error||'');
 return /\b(408|425|429|498|500|502|503|504)\b|provider rejected the request.*\b404\b|rate.?limit|resource_exhausted|overloaded|capacity.?exceeded|temporarily unavailable|high demand|demand spike|server busy|temporarily busy|timed? out|network|failed to fetch|tokens? per minute|\bTPM\b|request too large|reduce your message size|reduce the length of (the )?messages|completion.{0,30}(length|long)|requested \d+.*limit \d+/i.test(value);
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

 const audioStyle=document.createElement('style');audioStyle.id='aiToneAudioCss';
 audioStyle.textContent='.ai-tone-audio-panel{margin:0 0 12px;padding:13px;border:1px solid #3c4b32;border-radius:16px;background:linear-gradient(145deg,rgba(23,34,22,.88),rgba(13,19,15,.95))}.ai-tone-audio-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ai-tone-audio-head strong{display:block;color:#edf5e4;font-size:12px;letter-spacing:.07em}.ai-tone-audio-head small{display:block;margin-top:4px;color:#9daa93;font-size:10px}.ai-tone-audio-head small[data-state=connected]{color:#c5f36b}.ai-tone-audio-refresh{border:1px solid #3c4b32;border-radius:9px;padding:7px 10px;background:#141c14;color:#b9c7ad;font-size:10px;font-weight:750}.ai-tone-audio-modes{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:12px;padding:4px;border:1px solid #34402f;border-radius:11px;background:#0c110d}.ai-tone-audio-modes button{min-height:36px;border:0;border-radius:8px;background:transparent;color:#a6b09d;font-size:11px;font-weight:750}.ai-tone-audio-modes button.active{background:#c5f36b;color:#10150b}.ai-tone-audio-start{width:100%;min-height:45px;margin-top:10px;border:1px solid #c5f36b;border-radius:11px;background:#c5f36b;color:#10150b;font-size:13px;font-weight:850}.ai-tone-audio-start:disabled,.ai-tone-audio-refresh:disabled,.ai-tone-audio-modes button:disabled{opacity:.45}.ai-tone-audio-meter{display:flex;align-items:center;justify-content:center;gap:3px;height:35px;margin-top:9px;overflow:hidden}.ai-tone-audio-meter span{height:var(--audio-level,15%);flex:1;min-width:2px;border-radius:3px;background:#526b35;opacity:.6;transform:scaleY(.28);transform-origin:center;transition:height .12s,transform .12s,opacity .12s}.ai-tone-audio-meter.is-active span{transform:scaleY(1);opacity:1;background:#91c44d}.ai-tone-audio-meter.is-active span:nth-child(3n){background:#c5f36b}.ai-tone-audio-status{margin-top:5px;color:#bdc9b2;text-align:center;font-size:11px;line-height:1.45}.ai-tone-audio-status[data-state=error]{color:#ffd2a3}.ai-tone-audio-note{display:block;margin-top:8px;color:#7f8c77;font-size:9px;line-height:1.5}@media(max-width:380px){.ai-tone-audio-panel{padding:11px}.ai-tone-audio-head strong{font-size:11px}}';

 audioStyle.textContent += '.ai-tone-sheet{--ai-tone-max-height:min(94dvh,920px);height:auto;min-height:0;max-height:var(--ai-tone-max-height);display:flex;flex-direction:column;overflow:hidden}.ai-tone-body{position:relative;display:flex;flex:1 1 auto;flex-direction:column;gap:9px;min-height:0;max-height:calc(var(--ai-tone-max-height) - 62px);height:auto;padding:10px 13px 12px;overflow:hidden;overscroll-behavior:none}.ai-tone-settings{position:absolute;z-index:8;top:7px;left:12px;right:12px;max-height:calc(100dvh - 100px);overflow-y:auto;overscroll-behavior:contain;box-shadow:0 16px 35px #000b}.ai-tone-settings.on{display:block}.ai-tone-status-accessible{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.ai-tone-messages{display:flex;flex:0 1 auto;flex-direction:column;gap:9px;min-height:clamp(118px,21dvh,220px);max-height:min(48dvh,500px);height:auto;margin:0;padding:2px 2px 5px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.ai-tone-message{max-width:96%;flex:0 0 auto;font-size:14px;line-height:1.5}.ai-tone-activity{align-self:flex-start;display:flex;flex-direction:column;gap:8px;flex:0 0 auto;width:min(100%,440px);max-width:100%;padding:11px 12px;border:1px solid #536a39;border-radius:14px;background:#172316;color:#d8f4ac;font-size:12px;line-height:1.4}.ai-tone-activity.ai-tone-generic{display:flex;flex-direction:row;align-items:center;gap:9px;width:auto}.ai-tone-activity.ai-tone-generic:before{content:"";width:13px;height:13px;flex:0 0 13px;border:2px solid #526044;border-top-color:#c5f36b;border-radius:50%;animation:aiToneSpin .8s linear infinite}.ai-tone-discussion-label,.ai-tone-mission-head,.ai-tone-mission-provider>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.ai-tone-discussion-label strong,.ai-tone-mission-head strong{color:#f0f6e8;font-size:12px}.ai-tone-discussion-label span,.ai-tone-mission-live{font-size:9px;font-weight:800;letter-spacing:.6px;color:#b9ed70}.ai-tone-discussion-dots,.ai-tone-typing-dots{display:flex;align-items:center;gap:5px;height:12px}.ai-tone-discussion-dots i,.ai-tone-typing-dots i{width:6px;height:6px;border-radius:50%;background:#c5f36b;animation:aiToneTyping 1.1s ease-in-out infinite}.ai-tone-discussion-dots i:nth-child(2),.ai-tone-typing-dots i:nth-child(2){animation-delay:.16s}.ai-tone-discussion-dots i:nth-child(3),.ai-tone-typing-dots i:nth-child(3){animation-delay:.32s}.ai-tone-activity>small{color:#aebda4;font-size:10px}.ai-tone-mission-head>div{display:flex;flex-direction:column;gap:2px}.ai-tone-mission-head small{font-size:9px;letter-spacing:.7px;color:#aebda4;font-weight:800}.ai-tone-mission-chief{display:flex;align-items:center;gap:9px;padding:10px;border-radius:11px;background:#263927;border:1px solid #516b43}.ai-tone-mission-orb{width:25px;height:25px;flex:0 0 25px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e1f7b7,#8fbd59 45%,#344e2b 75%);box-shadow:0 0 0 4px #9dce5b22,0 0 14px #b9ed7055}.ai-tone-mission-chief>div{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.ai-tone-mission-chief strong{font-size:11px;color:#ecf4e5}.ai-tone-mission-chief small{font-size:9px;color:#aebda4}.ai-tone-mission-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#aebda4;font-size:9px}.ai-tone-mission-team{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.ai-tone-mission-provider{min-width:0;padding:8px;border:1px solid #394a36;border-radius:9px;background:#1d2b1e}.ai-tone-mission-provider strong{font-size:10px;color:#e3ecdc}.ai-tone-mission-provider span{font-size:8px;font-weight:850;letter-spacing:.35px;color:#9eae93}.ai-tone-mission-provider small{display:block;margin-top:4px;color:#aab9a0;font-size:9px;line-height:1.3;overflow-wrap:anywhere}.ai-tone-mission-provider[data-state=working]{border-color:#b9ed70;background:#2b3d26}.ai-tone-mission-provider[data-state=working] span{color:#d5f4a5}.ai-tone-mission-provider[data-state=completed]{border-color:#5d8650}.ai-tone-mission-provider[data-state=completed] span{color:#b9ed70}.ai-tone-mission-provider[data-state=fallback],.ai-tone-activity.has-error{border-color:#895448}.ai-tone-mission-provider[data-state=fallback] span,.ai-tone-activity.has-error .ai-tone-mission-live{color:#ffab98}.ai-tone-mission-provider[data-state=unavailable]{opacity:.52}@keyframes aiToneSpin{to{transform:rotate(360deg)}}@keyframes aiToneTyping{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}.ai-tone-audio-panel{flex:0 0 auto;margin:0;padding:10px 11px;border-radius:14px}.ai-tone-audio-head{min-height:25px}.ai-tone-audio-head strong{font-size:11px}.ai-tone-audio-head small{font-size:10px}.ai-tone-audio-modes{margin-top:8px}.ai-tone-audio-modes button{min-height:33px}.ai-tone-audio-start{min-height:40px;margin-top:8px}.ai-tone-audio-meter{height:19px;margin-top:6px}.ai-tone-audio-status{font-size:10px;margin-top:3px}.ai-tone-audio-note{font-size:9px;margin-top:5px;line-height:1.35}.ai-tone-composer{display:flex;flex:0 0 auto;flex-direction:column;gap:7px;margin-top:0;padding-top:2px;background:linear-gradient(180deg,transparent,#101710 12%)}.ai-tone-prompt{flex:0 0 auto;min-height:54px;max-height:88px;height:54px;resize:none;overflow-y:auto;padding:11px 12px}.ai-tone-compose{flex:0 0 auto;margin-top:0}.ai-tone-composer>.ai-tone-hint{flex:0 0 auto;margin:0;font-size:9px;line-height:1.35}.ai-tone-provider-row{margin-bottom:10px}.ai-tone-nam-toolbar{margin:10px 0}.ai-tone-nam-wizard,.ai-tone-nam-results{max-height:40dvh;overflow-y:auto;overscroll-behavior:contain}@media(max-width:520px){.ai-tone-sheet{--ai-tone-max-height:94dvh;height:auto;min-height:0;max-height:var(--ai-tone-max-height);width:100%;border-radius:22px 22px 0 0}.ai-tone-body{max-height:calc(var(--ai-tone-max-height) - 60px);padding:9px 12px calc(9px + env(safe-area-inset-bottom,0px));gap:8px}.ai-tone-messages{min-height:clamp(116px,20dvh,190px);max-height:48dvh;gap:8px}.ai-tone-message{font-size:13px;padding:10px 12px}.ai-tone-audio-panel{padding:9px 10px}.ai-tone-audio-note{display:block}.ai-tone-prompt{min-height:50px;height:50px;max-height:76px}.ai-tone-composer>.ai-tone-hint{font-size:8px}}@media(max-height:620px){.ai-tone-sheet{--ai-tone-max-height:96dvh}.ai-tone-messages{min-height:90px;max-height:34dvh}.ai-tone-audio-note{display:none}.ai-tone-audio-meter{height:14px}.ai-tone-audio-modes{margin-top:5px}.ai-tone-audio-start{min-height:35px}.ai-tone-prompt{height:46px;min-height:46px}}';


 audioStyle.textContent += '.ai-tone-sheet{--ai-tone-max-height:min(94dvh,920px);height:var(--ai-tone-max-height);max-height:94dvh}.ai-tone-head{flex:0 0 auto}.ai-tone-head-actions{display:flex;align-items:center;gap:6px}.ai-tone-audio-toggle{font-size:19px;font-weight:850;min-width:42px}.ai-tone-audio-toggle.active{border-color:#c5f36b;color:#c5f36b;background:#c5f36b18}.ai-tone-body{position:relative;display:flex;flex:1 1 auto;flex-direction:column;gap:9px;min-height:0;height:auto;max-height:none;padding:10px 13px calc(10px + env(safe-area-inset-bottom,0px));overflow:hidden;overscroll-behavior:none}.ai-tone-messages{display:flex;flex:1 1 auto;flex-direction:column;gap:9px;min-height:0;max-height:none;height:auto;margin:0;padding:2px 2px 5px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.ai-tone-message{flex:0 0 auto}.ai-tone-audio-panel{flex:0 0 auto;margin:0;padding:9px 11px;border-radius:14px}.ai-tone-audio-panel[hidden]{display:none!important}.ai-tone-audio-head strong{font-size:11px}.ai-tone-audio-head small{font-size:10px}.ai-tone-audio-modes{margin-top:8px}.ai-tone-audio-modes button{min-height:33px}.ai-tone-audio-start{min-height:39px;margin-top:8px}.ai-tone-audio-meter{height:16px;margin-top:5px}.ai-tone-audio-status{font-size:10px;margin-top:3px}.ai-tone-audio-note{font-size:9px;margin-top:5px;line-height:1.3}.ai-tone-composer{display:flex;flex:0 0 auto;flex-direction:column;gap:6px;margin:0;padding-top:3px;background:linear-gradient(180deg,transparent,#101710 12%)}.ai-tone-prompt{flex:0 0 auto;min-height:50px;height:50px;max-height:76px;resize:none;overflow-y:auto;padding:10px 12px}.ai-tone-compose{flex:0 0 auto;margin:0}.ai-tone-composer>.ai-tone-hint{flex:0 0 auto;margin:0;font-size:9px;line-height:1.3}.ai-tone-settings{position:absolute;z-index:8;top:7px;left:12px;right:12px;max-height:calc(100dvh - 96px);overflow-y:auto;overscroll-behavior:contain;box-shadow:0 16px 35px #000b}.ai-tone-settings.on{display:block}.ai-tone-nam-panel{display:flex;flex-direction:column;gap:9px;margin:12px 0;padding:11px;border:1px solid #3c4b32;border-radius:13px;background:#111911}.ai-tone-nam-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ai-tone-nam-panel-head strong{display:block;color:#edf5e4;font-size:12px}.ai-tone-nam-panel-head small{display:block;margin-top:3px;color:#9daa93;font-size:10px}.ai-tone-nam-action{border:1px solid #536447;border-radius:10px;background:#182317;color:#c7d3bf;padding:9px 14px;font-size:11px;font-weight:850;letter-spacing:.03em}.ai-tone-nam-action.active{border-color:#c5f36b;background:#c5f36b;color:#10160b;box-shadow:0 0 0 1px #c5f36b35}.ai-tone-nam-gear-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ai-tone-nam-gear-row .ai-tone-nam-choice{min-height:40px;border:1px solid #435438;border-radius:10px;background:#172017;color:#b9c7ad;font-size:11px;font-weight:800}.ai-tone-nam-gear-row .ai-tone-nam-choice.active{border-color:#c5f36b;background:#c5f36b;color:#10160b}.ai-tone-nam-mode-status{color:#96a28e;font-size:10px;line-height:1.4}.ai-tone-nam-mode-status[data-active=true]{color:#c5f36b}.ai-tone-nam-model.recommended{border-color:#8cad54;background:#182418}.ai-tone-nam-results{max-height:42dvh;overflow-y:auto;overscroll-behavior:contain}@media(max-width:520px){.ai-tone-sheet{--ai-tone-max-height:94dvh;height:94dvh;max-height:94dvh;width:100%;border-radius:22px 22px 0 0}.ai-tone-body{padding:9px 12px calc(8px + env(safe-area-inset-bottom,0px));gap:8px}.ai-tone-messages{min-height:0;gap:8px}.ai-tone-message{font-size:13px;padding:10px 12px}.ai-tone-audio-panel{padding:8px 9px}.ai-tone-audio-note{display:block}.ai-tone-prompt{height:49px;min-height:49px;max-height:72px}}@media(max-height:620px){.ai-tone-sheet{--ai-tone-max-height:96dvh;height:96dvh;max-height:96dvh}.ai-tone-audio-note{display:none}.ai-tone-audio-meter{height:12px}.ai-tone-audio-modes{margin-top:5px}.ai-tone-audio-start{min-height:34px}.ai-tone-prompt{height:43px;min-height:43px}}';

 audioStyle.textContent += '.ai-tone-head-actions .ai-tone-icon{width:38px;height:38px;min-width:38px;min-height:38px;flex:0 0 38px;padding:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;font-size:16px;line-height:1}.ai-tone-audio-toggle{font-size:0;line-height:1}.ai-tone-audio-toggle svg{display:block;width:18px;height:18px;flex:0 0 18px}';

 audioStyle.textContent += '.ai-tone-settings{padding:8px;gap:8px;max-height:calc(100dvh - 100px);overflow-y:auto}.ai-tone-settings-section{border:1px solid #354330;border-radius:11px;background:#101710;margin:0 0 8px;overflow:hidden}.ai-tone-settings-section>summary{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 11px;cursor:pointer;list-style:none}.ai-tone-settings-section>summary::-webkit-details-marker{display:none}.ai-tone-settings-section>summary strong{display:block;color:#edf3e8;font-size:12px}.ai-tone-settings-section>summary small{display:block;color:#98a38f;font-size:9px;margin-top:2px}.ai-tone-settings-section>summary b{color:#c5f36b;font-size:10px;white-space:nowrap}.ai-tone-settings-section[open]>summary{border-bottom:1px solid #2b3828}.ai-tone-settings-section-body{padding:10px}.ai-tone-settings-section-body>p{font-size:9px;line-height:1.35}.ai-tone-settings-section .ai-tone-key-grid{grid-template-columns:1fr 1fr;gap:8px}.ai-tone-settings-section .ai-tone-key-state{min-height:10px}.ai-tone-settings-section .ai-tone-fallback-toggle{margin-top:8px;padding:8px}.ai-tone-settings-section .ai-tone-setting-actions{margin-top:8px;gap:5px}.ai-tone-settings-section .ai-tone-setting-actions button{padding:7px 8px;font-size:9px}.ai-tone-settings-section .ai-tone-note{margin-top:7px!important}.ai-tone-compact-provider-row{margin:8px 0}.ai-tone-compact-provider-row .ai-tone-key-field select{padding:9px 8px;font-size:10px}.ai-tone-usage-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ai-tone-usage-metrics>div{border:1px solid #34412e;border-radius:9px;background:#0b120d;padding:9px}.ai-tone-usage-metrics strong{display:block;color:#c5f36b;font-size:18px;font-variant-numeric:tabular-nums}.ai-tone-usage-metrics small,.ai-tone-usage-subtitle{display:block;color:#9ca992;font-size:9px}.ai-tone-usage-subtitle{margin:10px 0 5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.ai-tone-usage-rows>div{display:flex;justify-content:space-between;gap:8px;padding:5px 1px;border-bottom:1px solid #263125;font-size:10px;color:#cbd4c3}.ai-tone-usage-rows>div strong{color:#c5f36b;font-variant-numeric:tabular-nums}.ai-tone-usage-rows p{font-size:10px;color:#899681}.ai-tone-usage-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}.ai-tone-usage-foot small{font-size:8px;line-height:1.3;color:#919d87}.ai-tone-usage-foot button{flex:0 0 auto;border:1px solid #425139;border-radius:8px;background:#192218;color:#dce8d2;padding:7px 9px;font-size:9px}.ai-tone-nam-chat-card{display:flex;flex-direction:column;gap:9px;margin:8px 0 2px;padding:10px;border:1px solid #405039;border-radius:14px;background:#111a12}.ai-tone-nam-chat-card>header{display:flex;align-items:center;gap:8px}.ai-tone-nam-chat-card>header strong{display:block;color:#edf4e6;font-size:12px}.ai-tone-nam-chat-card>header small{display:block;color:#9ba88f;font-size:9px;margin-top:2px}.ai-tone-nam-card-icon{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;border:1px solid #536d3c;border-radius:8px;color:#c5f36b;font-size:18px}.ai-tone-nam-recommendation{margin:0;padding:9px;border:1px solid #abc95b;border-radius:10px;background:#bff06a;color:#10170c;font-size:11px;font-weight:800}.ai-tone-nam-recommendation strong{font-size:9px}.ai-tone-nam-recommendation small{display:block;margin-top:4px;font-size:9px;font-weight:500}.ai-tone-nam-profile-list,.ai-tone-nam-capture-list{display:flex;flex-direction:column;gap:6px;max-height:min(42dvh,380px);overflow-y:auto;overscroll-behavior:contain;padding-right:2px}.ai-tone-nam-profile{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border:1px solid #34412e;border-radius:9px;background:#0c130e}.ai-tone-nam-profile.recommended{border-color:#a8c65d;background:#182318}.ai-tone-nam-profile-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.ai-tone-nam-profile-copy strong{font-size:11px;color:#eaf1e4}.ai-tone-nam-profile-copy small{font-size:9px;color:#9da995;line-height:1.3}.ai-tone-nam-recommended-label{color:#c5f36b!important;font-weight:850}.ai-tone-nam-profile button{flex:0 0 104px;max-width:104px;border:1px solid #536943;border-radius:8px;background:#182318;color:#d8e6ce;padding:8px 6px;font-size:9px;font-weight:800}.ai-tone-nam-card-footnote,.ai-tone-nam-card-copy{margin:0;color:#9da995;font-size:9px;line-height:1.4}.ai-tone-nam-capture{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #394632;border-radius:9px;background:#0c130e;cursor:pointer}.ai-tone-nam-capture.selected{border-color:#c5f36b;background:#182318}.ai-tone-nam-capture input{position:absolute;opacity:0;pointer-events:none}.ai-tone-nam-radio{width:17px;height:17px;flex:0 0 17px;border:1.5px solid #879780;border-radius:50%;position:relative}.ai-tone-nam-capture.selected .ai-tone-nam-radio{border-color:#c5f36b}.ai-tone-nam-capture.selected .ai-tone-nam-radio:after{content:\"\";position:absolute;inset:4px;background:#c5f36b;border-radius:50%}.ai-tone-nam-capture-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.ai-tone-nam-capture-copy strong{font-size:11px;color:#eaf1e4}.ai-tone-nam-capture-copy small{font-size:9px;color:#9da995;line-height:1.25}.ai-tone-nam-mini-tag{font-size:8px;color:#c5f36b;font-weight:800}.ai-tone-nam-slot-note{margin:0;padding:8px;border-top:1px dashed #45523b;color:#aebaa4;font-size:9px}.ai-tone-nam-primary{width:100%;min-height:40px;border:1px solid #c5f36b;border-radius:9px;background:#c5f36b;color:#10160b;font-size:11px;font-weight:900}.ai-tone-nam-confirm{border-color:#8b9e4e}.ai-tone-nam-warning{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border:1px solid #c7d86c;border-radius:8px;color:#c5f36b;font-weight:900}.ai-tone-nam-success{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border:1px solid #7dba53;border-radius:8px;color:#c5f36b;font-weight:900}.ai-tone-nam-overwrite-warning{margin:0;padding:8px;border:1px solid #625b34;border-radius:8px;background:#1a1a11;color:#ddcf9e;font-size:10px;line-height:1.35}.ai-tone-nam-validated{margin:0;color:#b8d58b;font-size:9px}.ai-tone-nam-confirm-actions{display:grid;grid-template-columns:1fr 1.15fr;gap:7px}.ai-tone-nam-confirm-actions>button:first-child{border:1px solid #536943;border-radius:9px;background:#172018;color:#d8e6ce;min-height:40px;font-size:10px;font-weight:800}';
 audioStyle.textContent += '.ai-tone-nam-loading-row{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px;border:1px solid #536a39;border-radius:10px;background:#172316}.ai-tone-nam-loading-row>span{width:16px;height:16px;flex:0 0 16px;border:2px solid #526044;border-top-color:#c5f36b;border-radius:50%;animation:aiToneSpin .8s linear infinite}.ai-tone-nam-loading-row p{margin:0;color:#d8f4ac;font-size:11px;line-height:1.4}.ai-tone-nam-captures-loading{border-color:#657b43}';
 audioStyle.textContent += '.ai-tone-body{overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch}.ai-tone-sheet{max-height:94dvh;max-height:94svh}.ai-tone-nam-panel,.ai-tone-nam-wizard,.ai-tone-nam-results{flex:0 0 auto;min-height:0}';
 audioStyle.textContent += '.ai-tone-sheet{box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr) auto auto!important;align-content:stretch!important;align-items:stretch!important;top:max(8dvh,calc(env(safe-area-inset-top,0px) + 64px))!important;right:auto!important;bottom:0!important;left:50%!important;width:min(720px,100%)!important;height:auto!important;max-height:none!important;min-height:0!important;padding-bottom:0!important;overflow:hidden!important}.ai-tone-head{grid-row:1!important;min-width:0!important}.ai-tone-scroll-area{box-sizing:border-box!important;grid-row:2!important;display:block!important;min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;align-self:stretch!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:thin}.ai-tone-body{box-sizing:border-box!important;position:relative!important;display:flex!important;flex:0 0 auto!important;flex-direction:column!important;min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;overscroll-behavior:auto!important;padding:9px 12px 8px!important}.ai-tone-messages{box-sizing:border-box!important;display:flex!important;flex:0 0 auto!important;min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;overscroll-behavior:auto!important;margin:0!important}.ai-tone-audio-panel{grid-row:3!important;box-sizing:border-box!important;position:relative!important;z-index:2!important;display:block!important;flex:0 1 auto!important;min-width:0!important;min-height:0!important;max-height:30dvh!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding:8px 12px!important;margin:0!important;border-top:1px solid #2d382b!important;border-radius:0!important;background:#111a12!important;box-shadow:0 -8px 18px #0004!important}.ai-tone-audio-panel[hidden]{display:none!important}.ai-tone-settings{position:absolute!important;z-index:10!important;top:64px!important;left:12px!important;right:12px!important;bottom:calc(132px + env(safe-area-inset-bottom,0px))!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain!important;box-shadow:0 16px 35px #000b!important}.ai-tone-composer{grid-row:4!important;position:relative!important;z-index:3!important;display:flex!important;flex:initial!important;flex-direction:column!important;align-self:stretch!important;gap:7px!important;width:100%!important;min-width:0!important;min-height:max-content!important;margin:0!important;padding:10px 13px calc(10px + env(safe-area-inset-bottom,0px))!important;border-top:1px solid #2d382b!important;background:#101710!important;box-shadow:0 -8px 22px #0005!important}.ai-tone-prompt{flex:0 0 auto!important;resize:none!important}.ai-tone-compose{flex:0 0 auto!important}.ai-tone-composer>.ai-tone-hint{flex:0 0 auto!important}';
 audioStyle.textContent += '.ai-tone-audio-panel{box-sizing:border-box!important;margin:0 10px 8px!important;padding:12px 13px!important;border:1px solid rgba(116,150,91,.34)!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(25,40,27,.97),rgba(13,22,16,.98))!important;box-shadow:0 8px 24px #0005,inset 0 1px 0 #ffffff08!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.ai-tone-audio-head{padding:0 1px 7px}.ai-tone-audio-head strong{letter-spacing:.09em}.ai-tone-audio-refresh{border-radius:12px!important;padding:8px 12px!important;background:rgba(255,255,255,.035)!important}.ai-tone-audio-modes{margin-top:5px!important;padding:4px!important;border:1px solid rgba(116,150,91,.22)!important;border-radius:15px!important;background:rgba(5,12,7,.54)!important}.ai-tone-audio-modes button{border-radius:11px!important;transition:background .18s ease,color .18s ease,transform .18s ease}.ai-tone-audio-modes button.active{box-shadow:0 2px 10px #c5f36b22}.ai-tone-audio-start{border-radius:14px!important;box-shadow:0 5px 16px #c5f36b1c!important;transition:transform .18s ease,box-shadow .18s ease}.ai-tone-audio-start:not(:disabled):active{transform:scale(.99)}.ai-tone-audio-status{padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.025)}.ai-tone-audio-note{padding:0 2px}.ai-tone-composer{box-sizing:border-box!important;width:auto!important;margin:0 10px 10px!important;padding:11px 12px calc(11px + env(safe-area-inset-bottom,0px))!important;border:1px solid rgba(116,150,91,.32)!important;border-radius:20px!important;background:linear-gradient(155deg,rgba(25,39,26,.98),rgba(12,20,14,.99))!important;box-shadow:0 9px 26px #0006,inset 0 1px 0 #ffffff08!important;gap:8px!important}.ai-tone-prompt{box-sizing:border-box!important;border:1px solid rgba(116,150,91,.3)!important;border-radius:16px!important;background:rgba(5,12,7,.56)!important;padding:12px 14px!important;line-height:1.5!important}.ai-tone-compose{align-items:center!important;gap:8px!important}.ai-tone-undo{border-radius:13px!important;background:rgba(255,255,255,.035)!important}.ai-tone-send{border-radius:14px!important;min-height:44px;box-shadow:0 4px 14px #c5f36b20}.ai-tone-composer>.ai-tone-hint{padding:0 2px;line-height:1.4!important}.ai-tone-settings{box-sizing:border-box!important;position:absolute!important;z-index:10!important;top:64px!important;left:12px!important;right:12px!important;bottom:auto!important;width:auto!important;height:auto!important;min-height:0!important;max-height:calc(100% - 76px)!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;margin:0!important;padding:12px!important;border:1px solid rgba(116,150,91,.36)!important;border-radius:22px!important;background:linear-gradient(155deg,rgba(23,36,24,.99),rgba(12,19,14,.99))!important;box-shadow:0 18px 42px #000b,inset 0 1px 0 #ffffff08!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:box-shadow .2s ease,opacity .18s ease}.ai-tone-settings-section{border-radius:15px!important;border-color:rgba(116,150,91,.28)!important;background:rgba(8,15,10,.35)!important;margin-bottom:8px!important}.ai-tone-settings-section>summary{padding:12px 13px!important}.ai-tone-settings-section[open]>summary{border-bottom-color:rgba(116,150,91,.2)!important}.ai-tone-settings-section-body{padding:11px 12px!important}.ai-tone-settings-section:last-child{margin-bottom:0!important}@media(max-width:520px){.ai-tone-audio-panel{margin:0 8px 7px!important;padding:10px 11px!important;border-radius:18px!important}.ai-tone-composer{margin:0 8px 8px!important;padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px))!important;border-radius:18px!important}.ai-tone-settings{top:62px!important;left:10px!important;right:10px!important;max-height:calc(100% - 72px)!important;padding:10px!important;border-radius:20px!important}.ai-tone-settings-section>summary{padding:11px!important}.ai-tone-settings-section-body{padding:10px!important}}';
  audioStyle.textContent += '.ai-tone-head{position:relative!important;z-index:30!important;background:#172018!important;isolation:isolate!important;opacity:1!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.ai-tone-audio-indicator{display:inline-block;vertical-align:middle;width:7px;height:7px;margin-left:8px;border-radius:50%;background:#465044;box-shadow:inset 0 0 0 1px #84917b55;transition:background .2s ease,box-shadow .2s ease}.ai-tone-audio-indicator[data-state=connected]{background:#c5f36b;box-shadow:0 0 0 3px #c5f36b20,0 0 12px #c5f36b90}.ai-tone-audio-indicator[data-state=checking]{background:#a4b36c;box-shadow:0 0 0 3px #a4b36c18}.ai-tone-audio-status-accessible{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.ai-tone-audio-panel{position:relative!important;z-index:2!important;transform:translateY(105%)!important;opacity:0!important;transition:transform .34s cubic-bezier(.2,.78,.2,1),opacity .26s ease!important;will-change:transform,opacity!important}.ai-tone-audio-panel.is-open{transform:translateY(0)!important;opacity:1!important}.ai-tone-composer{position:relative!important;z-index:4!important}.ai-tone-settings{position:absolute!important;top:calc(var(--ai-tone-head-height,68px) + 1px)!important;left:12px!important;right:12px!important;bottom:auto!important;width:auto!important;height:auto!important;min-height:0!important;max-height:calc(94dvh - 170px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;box-sizing:border-box!important;margin:0!important;padding:12px!important;z-index:20!important;background:#101710!important;opacity:0!important;transform:translateY(-10px)!important;pointer-events:none!important;transition:transform .17s ease-out,opacity .14s ease-out!important;will-change:transform,opacity!important}.ai-tone-settings.on{display:block!important}.ai-tone-settings.is-open{transform:translateY(0)!important;opacity:1!important;pointer-events:auto!important}.ai-tone-settings-section{background:#101710!important}.ai-tone-settings-section[open]{background:#111b12!important}@media(prefers-reduced-motion:reduce){.ai-tone-audio-panel,.ai-tone-settings{transition:none!important;transform:none!important}.ai-tone-audio-panel{opacity:1!important}.ai-tone-settings.is-open{opacity:1!important}}';
  
  document.head.appendChild(audioStyle);

 const open=document.createElement('button');open.id='aiToneOpenButton';open.type='button';open.className='btn';open.textContent='✦ AI';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-expanded','false');actions.insertBefore(open,ctrl);
 const shade=document.createElement('div');shade.className='ai-tone-backdrop';
 const sheet=document.createElement('section');sheet.className='ai-tone-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','AI Live Tone Assistant');
 sheet.innerHTML=[
 '<div class="ai-tone-head"><div><strong>✦ AI Live Tone Assistant</strong><small>Live editor control · Original MG-30 Gen 2</small></div><div class="ai-tone-head-actions"><button class="ai-tone-icon ai-tone-audio-toggle" id="aiToneAudioToggle" type="button" aria-label="Toggle Audio Listening" aria-controls="aiToneAudioPanel" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 10v4 M6 6v12 M10 3v18 M14 8v8 M18 5v14 M22 10v4"/></svg></button> <button class="ai-tone-icon" id="aiToneSettingsToggle" type="button" aria-label="AI Settings">⚙</button> <button class="ai-tone-icon" id="aiToneClose" type="button" aria-label="Close AI Assistant">×</button></div></div>',
 '<div class="ai-tone-settings" id="aiToneSettings">'+
 '<details class="ai-tone-settings-section" id="aiToneProviderDetails"><summary><span><strong>AI Providers & ChatGPT Account</strong><small>GPT-5.6 discussions · GPT-6 Luna presets · sequential specialist team</small></span><b id="aiToneProviderSummary">Checking…</b></summary><div class="ai-tone-settings-section-body"><div class="ai-tone-key-grid"><div class="ai-tone-key-field"><strong>ChatGPT plan · SIWC</strong><span class="ai-tone-key-state" id="aiChatGPTKeyState">Checking ChatGPT account…</span></div><div class="ai-tone-key-field"><strong>OpenAI / GPT</strong><span class="ai-tone-key-state" id="aiOpenAiKeyState">Checking…</span></div><div class="ai-tone-key-field"><strong>Gemini</strong><span class="ai-tone-key-state" id="aiGeminiKeyState">Checking…</span></div><div class="ai-tone-key-field"><strong>Groq</strong><span class="ai-tone-key-state" id="aiGroqKeyState">Checking…</span></div><div class="ai-tone-key-field"><strong>OpenRouter</strong><span class="ai-tone-key-state" id="aiOpenRouterKeyState">Checking…</span></div><div class="ai-tone-key-field"><strong>Cloudflare Workers AI</strong><span class="ai-tone-key-state" id="aiCloudflareBindingState">Checking binding…</span></div></div>'+
 '<label class="ai-tone-fallback-toggle"><input id="aiToneAutoFallback" type="checkbox" checked><span><strong>Automatic fallback</strong><small>GPT-6 Luna performs the initial research and final synthesis. New presets require two different specialist providers in sequence: Gemini first, then Groq/OpenRouter/Cloudflare as fallback.</small></span></label>'+
 '<div class="ai-tone-setting-actions"><button class="primary" id="aiToneSaveKeys" type="button">Refresh Status</button><button id="aiToneRefreshModels" type="button">Refresh Models</button><button id="aiToneTestChatGPT" type="button">Test ChatGPT</button><button id="aiToneTestOpenAi" type="button">Test GPT</button><button id="aiToneTestGemini" type="button">Test Gemini</button><button id="aiToneTestGroq" type="button">Test Groq</button><button id="aiToneTestOpenRouter" type="button">Test OpenRouter</button><button id="aiToneTestCloudflare" type="button">Test Cloudflare Worker AI</button></div>'+
 '<p class="ai-tone-note">GPT-5.6 Luna handles ordinary discussion. GPT-6 Luna is used only for preset creation and refinement: it performs the musical research, consults at least two different specialist providers sequentially, then validates the Tone Plan against the original MG-30 Gen 2 catalogue before any MIDI changes.</p></div></details>'+
 '<details class="ai-tone-settings-section" id="aiToneUsageDetails"><summary><span><strong>AI Usage & Token Monitor</strong><small>Session totals · model and agent breakdown</small></span><b id="aiToneUsageSummary">0 tokens</b></summary><div class="ai-tone-settings-section-body"><div class="ai-tone-usage-metrics"><div><strong id="aiToneUsageTotal">0</strong><small>Total tokens</small></div><div><strong id="aiToneUsageRequests">0</strong><small>AI requests</small></div></div><div class="ai-tone-usage-subtitle">By provider / model</div><div id="aiToneUsageProviderRows" class="ai-tone-usage-rows"><p>No AI requests recorded in this session.</p></div><div class="ai-tone-usage-subtitle">By task / agent + model</div><div id="aiToneUsageAgentRows" class="ai-tone-usage-rows"><p>No AI requests recorded in this session.</p></div><div class="ai-tone-usage-foot"><small>Provider counts are actual when available; otherwise marked as estimates. Reset only clears this local session display.</small><button type="button" id="aiToneUsageReset">Reset Session</button></div></div></details>'+
 '<div class="ai-tone-routing-strip"><div><small>DISKUSI BIASA</small><strong>GPT-5.6 Luna</strong></div><div><small>CREATE PRESET</small><strong>GPT-6 Luna</strong></div><div><small>SPECIALIST</small><strong>Gemini → Groq → OpenRouter → Workers AI</strong></div></div><div hidden><select id="aiToneProviderSelect"><option value="chatgpt" selected>Task-based ChatGPT routing</option></select><label><span id="aiToneActiveModelLabel">Model by task</span><select id="aiToneActiveModel" disabled><option value="__auto__">GPT-5.6 discussion / GPT-6 Luna preset</option></select></label></div>'+
 '<div class="ai-tone-status ai-tone-status-accessible" id="aiToneStatus" data-state="idle" role="status" aria-live="polite" aria-busy="false">AI ready. MG-30 connection is required for live tone assistance.</div>'+
 '<section class="ai-tone-nam-panel" id="aiToneNamPanel"><div class="ai-tone-nam-panel-head"><div><strong>TONE3000 NAM</strong><small>Optional NAM search mode for amp captures</small></div><button class="ai-tone-nam-action" id="aiToneFindNam" type="button" aria-pressed="false">OFF</button></div><div class="ai-tone-nam-gear-row" role="group" aria-label="NAM capture type"><button class="ai-tone-nam-choice" type="button" data-ai-nam-gear="amp" aria-pressed="false">Amp Only</button><button class="ai-tone-nam-choice active" type="button" data-ai-nam-gear="amp-cab" aria-pressed="true">Amp + Cab</button></div><small class="ai-tone-nam-mode-status" id="aiToneNamModeStatus">TONE3000 NAM mode OFF · Built-in MG-30 amps remain selected by default.</small></section>'+
 '<div class="ai-tone-nam-wizard" id="aiToneNamWizard" hidden></div><div class="ai-tone-nam-results" id="aiToneNamResults" hidden></div></div><div class="ai-tone-scroll-area" id="aiToneScrollArea"><div class="ai-tone-body">',
 '<div class="ai-tone-messages" id="aiToneMessages"><div class="ai-tone-message ai"><small>AI ASSISTANT</small>Describe the tone you want. Validated results update the editor controls and send parameters over USB-MIDI immediately. There is no Apply step.</div></div>',
 "</div></div><section class=\"ai-tone-audio-panel\" id=\"aiToneAudioPanel\" hidden> <div class=\"ai-tone-audio-head\"><div><strong>⌁ AUDIO LISTENING <span class=\"ai-tone-audio-indicator\" id=\"aiToneAudioDevice\" data-state=\"checking\" role=\"status\" aria-label=\"Checking MG-30 USB Audio connection; phone microphone is not used\"></span></strong></div><button class=\"ai-tone-audio-refresh\" id=\"aiToneAudioRefresh\" type=\"button\">Refresh</button></div> <div class=\"ai-tone-audio-modes\" role=\"group\" aria-label=\"Audio listening mode\"><button class=\"active\" data-ai-audio-mode=\"once\" type=\"button\">Analyze Once</button><button data-ai-audio-mode=\"live\" type=\"button\">Live Listening</button></div> <button class=\"ai-tone-audio-start\" id=\"aiToneAudioStart\" type=\"button\" disabled>Start Listening</button> <div class=\"ai-tone-audio-meter\" id=\"aiToneAudioMeter\" aria-hidden=\"true\"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div> <div class=\"ai-tone-audio-status ai-tone-audio-status-accessible\" id=\"aiToneAudioStatus\" role=\"status\" aria-live=\"polite\">Ready to capture</div></section>",
 '<div class="ai-tone-composer">',
'<textarea class="ai-tone-prompt" id="aiTonePrompt" maxlength="1400" placeholder="Ask anything about your tone…"></textarea>',
'<div class="ai-tone-compose"><button class="ai-tone-undo" id="aiToneUndo" type="button" disabled>↶ Undo AI Changes</button><div><span class="ai-tone-hint" id="aiToneCount">0/1400</span> <button class="ai-tone-send" id="aiToneSend" type="button">Send ↗</button></div></div>',
'</div>'
 ].join('');
 document.body.append(shade,sheet);
 flushAiRuntimeErrors();
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),providerSelect:$('aiToneProviderSelect'),activeModel:$('aiToneActiveModel'),activeModelLabel:$('aiToneActiveModelLabel'),autoFallback:$('aiToneAutoFallback'),findNam:$('aiToneFindNam'),namWizard:$('aiToneNamWizard'),namResults:$('aiToneNamResults'),namModeStatus:$('aiToneNamModeStatus'),namGearButtons:sheet.querySelectorAll('[data-ai-nam-gear]'),providerSummary:$('aiToneProviderSummary'),usageSummary:$('aiToneUsageSummary'),usageTotal:$('aiToneUsageTotal'),usageRequests:$('aiToneUsageRequests'),usageProviders:$('aiToneUsageProviderRows'),usageAgents:$('aiToneUsageAgentRows'),usageReset:$('aiToneUsageReset'),audioToggle:$('aiToneAudioToggle'),audioPanel:$('aiToneAudioPanel'),audioDevice:$('aiToneAudioDevice'),audioRefresh:$('aiToneAudioRefresh'),audioStart:$('aiToneAudioStart'),audioStatus:$('aiToneAudioStatus'),audioMeter:$('aiToneAudioMeter'),audioModes:sheet.querySelectorAll('[data-ai-audio-mode]')};
 let mode='chatgpt',busy=false,last=null,namFlowActive=false,namImportBusy=false,namModeActive=false,namCaptureType='amp-cab',activeNamGear='',activeNamContext='',activeNamModelName='',pendingNamSelection=null,namSearchOnlyActive=false,namSearchPrompt='';const history=[],dialogueContext=[];
 let activityMode='generic',toneMission=null;
 const toneProviderLabels={gemini:'Gemini',groq:'Groq',openrouter:'OpenRouter',cloudflare:'Cloudflare Workers AI'};
 const beginToneMission=(prompt,requiresExperts=true)=>{toneMission={prompt:String(prompt||''),chiefState:'researching',stage:'GPT-6 Luna sedang melakukan riset awal',completed:0,required:requiresExperts?2:0,providers:Object.fromEntries(Object.keys(toneProviderLabels).map(provider=>[provider,{state:'standby',role:'',detail:'Menunggu giliran'}]))};activityMode='tone';};
 const updateToneMission=(patch={})=>{if(toneMission){Object.assign(toneMission,patch);renderActivity();}};
 const updateToneMissionProvider=(provider,state,role='',detail='')=>{if(!toneMission||!toneMission.providers[provider])return;toneMission.providers[provider]={state,role:String(role||''),detail:String(detail||'')};if(state==='completed')toneMission.completed++;renderActivity();};
 const renderToneMissionActivity=()=>{
  if(!toneMission)return '<div>GPT-6 Luna sedang menyiapkan preset…</div>';
  const error=ui.status.dataset.state==='error';
  const stateLabel=error?'TERHENTI':toneMission.chiefState==='synthesizing'?'SINTESIS':toneMission.chiefState==='validating'?'VALIDASI':toneMission.chiefState==='applying'?'MENERAPKAN':'SEDANG BEKERJA';
  const rows=Object.entries(toneMission.providers).map(([id,item])=>{const label={standby:'STANDBY',ready:'SIAP',working:'AKTIF',fallback:'FALLBACK',completed:'SELESAI',unavailable:'TIDAK TERSEDIA'}[item.state]||'MENUNGGU';return '<div class="ai-tone-mission-provider" data-state="'+esc(item.state)+'"><div><strong>'+esc(toneProviderLabels[id])+'</strong><span>'+label+'</span></div><small>'+esc(item.role?item.role.replaceAll('_',' '):item.detail||'Menunggu giliran')+'</small></div>';}).join('');
  return '<div class="ai-tone-mission-head"><div><small>CREATE PRESET · MISSION CONTROL</small><strong>GPT-6 Luna · Chief</strong></div><span class="ai-tone-mission-live">'+stateLabel+'</span></div>'+'<div class="ai-tone-mission-chief" data-state="'+esc(toneMission.chiefState)+'"><span class="ai-tone-mission-orb"></span><div><strong>'+esc(toneMission.stage)+'</strong><small>Riset, keputusan dan sintesis dilakukan oleh GPT-6 Luna</small></div><span class="ai-tone-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>'+'<div class="ai-tone-mission-team">'+rows+'</div>'+'<div class="ai-tone-mission-foot"><span>Ahli berhasil: '+Number(toneMission.completed||0)+' / '+Number(toneMission.required||0)+'</span><span>Berjalan bergantian · bukan paralel</span></div>';
 };
 const renderActivity=()=>{
  let activity=ui.messages.querySelector('.ai-tone-activity');
  const isBusy=ui.status.dataset.state==='busy',keepFailedMission=activityMode==='tone'&&toneMission&&ui.status.dataset.state==='error';
  if(isBusy||keepFailedMission){
   if(!activity){activity=document.createElement('div');activity.setAttribute('role','status');}
   activity.className='ai-tone-activity '+(activityMode==='discussion'?'ai-tone-discussion':activityMode==='tone'?'ai-tone-mission':'ai-tone-generic');
   if(activityMode==='discussion')activity.innerHTML='<div class="ai-tone-discussion-label"><strong>GPT-5.6 Luna</strong><span>SEDANG MENGETIK</span></div><div class="ai-tone-discussion-dots" aria-hidden="true"><i></i><i></i><i></i></div><small>'+esc(ui.status.textContent)+'</small>';
   else if(activityMode==='tone'){activity.innerHTML=renderToneMissionActivity();if(keepFailedMission)activity.classList.add('has-error');}
   else activity.textContent=ui.status.textContent;
   if(!activity.isConnected)ui.messages.appendChild(activity);
   const scrollArea=$('aiToneScrollArea');if(scrollArea)scrollArea.scrollTop=scrollArea.scrollHeight;
  }else if(activity)activity.remove();
 };
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';ui.status.setAttribute('aria-busy',state==='busy'?'true':'false');renderActivity();};
 const renderNamChatCard=item=>{
  const data=item.data||{},cardId=esc(data.cardId||'');
  if(item.type==='nam-profiles'){
   const rows=Array.isArray(data.tones)?data.tones:[];
   return '<section class="ai-tone-nam-chat-card" data-ai-nam-card="'+cardId+'">'+
    '<header><span class="ai-tone-nam-card-icon">◇</span><div><strong>TONE3000 NAM · '+(data.gear==='amp'?'Amp Only':'Amp + Cab')+' · '+rows.length+' profiles</strong><small>Search: '+esc(data.query||'')+'</small></div></header>'+
    (data.recommendation?'<p class="ai-tone-nam-recommendation"><strong>★ AI RECOMMENDED</strong><br>'+esc(data.recommendation.name)+(data.recommendation.creator?' · @'+esc(data.recommendation.creator):'')+(data.recommendation.reason?'<small>'+esc(data.recommendation.reason)+'</small>':'')+'</p>':'')+
    '<div class="ai-tone-nam-profile-list">'+(rows.length?rows.map(tone=>'<article class="ai-tone-nam-profile '+(String(tone.id)===String(data.recommendedId)?'recommended':'')+'"><div class="ai-tone-nam-profile-copy">'+(String(tone.id)===String(data.recommendedId)?'<small class="ai-tone-nam-recommended-label">★ AI RECOMMENDED</small>':'')+'<strong>'+esc(tone.name||'Unnamed NAM profile')+'</strong><small>'+(tone.creator?'@'+esc(tone.creator)+' · ':'')+esc((tone.makes||[]).join(', ')||tone.gear||'NAM')+' · '+Number(tone.a2ModelsCount||0)+' A2 captures</small></div><button type="button" data-ai-nam-view-captures="'+esc(tone.id)+'" data-ai-nam-card="'+cardId+'">View A2 Captures</button></article>').join(''):'<p>No matching TONE3000 profiles were found.</p>')+'</div>'+
    '<p class="ai-tone-nam-card-footnote">Choose a profile to inspect its downloadable A2 captures. Nothing has been downloaded or transferred yet.</p></section>';
  }
  if(item.type==='nam-captures-loading'){
   const tone=data.tone||{};
   return '<section class="ai-tone-nam-chat-card ai-tone-nam-captures-loading" data-ai-nam-card="'+cardId+'"><header><span class="ai-tone-nam-card-icon">◇</span><div><strong>'+esc(tone.name||'TONE3000 NAM')+' · A2 captures</strong><small>'+(tone.creator?'@'+esc(tone.creator)+' · ':'')+'Destination: MG-30 NAM Slot 10</small></div></header><div class="ai-tone-nam-loading-row"><span aria-hidden="true"></span><p>Loading the profile metadata and downloadable A2 capture list. The search results stay available while this finishes.</p></div></section>';
  }
  if(item.type==='nam-captures'){
   const choices=Array.isArray(data.choices)?data.choices:[];
   return '<section class="ai-tone-nam-chat-card" data-ai-nam-card="'+cardId+'">'+
    '<header><span class="ai-tone-nam-card-icon">◇</span><div><strong>'+esc(data.tone?.name||'TONE3000 NAM')+' · A2 captures</strong><small>'+(data.tone?.creator?'@'+esc(data.tone.creator)+' · ':'')+'Destination: MG-30 NAM Slot 10</small></div></header>'+
    (data.reason?'<p class="ai-tone-nam-card-copy">AI recommendation: '+esc(data.reason)+'</p>':'')+
    '<div class="ai-tone-nam-capture-list">'+choices.map(choice=>'<label class="ai-tone-nam-capture '+(String(choice.model.id)===String(data.selectedId)?'selected':'')+'"><input type="radio" name="ai-tone-nam-'+cardId+'" value="'+esc(choice.model.id)+'" data-ai-nam-capture-radio="'+cardId+'" '+(String(choice.model.id)===String(data.selectedId)?'checked':'')+'><span class="ai-tone-nam-radio"></span><span class="ai-tone-nam-capture-copy"><strong>'+esc(choice.model.name||'Unnamed A2 capture')+'</strong><small>'+esc(choice.model.architecture_version??choice.model.architecture??'A2')+' · '+esc(choice.model.size??'Size unavailable')+' · '+(choice.model.model_url?'Download available':'Download unavailable')+'</small>'+(choice.metadata?.driveMetadata?'<small>'+esc(choice.metadata.driveMetadata)+'</small>':'')+'</span>'+(String(choice.model.id)===String(data.recommendedId)?'<span class="ai-tone-nam-mini-tag">AI pick</span>':'')+'</label>').join('')+'</div>'+
    '<p class="ai-tone-nam-slot-note">Destination: <strong>MG-30 NAM Slot 10</strong>. The file will be validated as MG-30 Gen-2 A2-Lite before transfer.</p>'+
    '<button class="ai-tone-nam-primary" type="button" data-ai-nam-import-selected="'+cardId+'">Import Selected Capture</button></section>';
  }
  if(item.type==='nam-confirm'){
   const model=data.selected?.model||{},tone=data.selected?.tone||{};
   return '<section class="ai-tone-nam-chat-card ai-tone-nam-confirm" data-ai-nam-card="'+cardId+'"><header><span class="ai-tone-nam-warning">!</span><div><strong>Confirm NAM Transfer</strong><small>Validated A2-Lite capture</small></div></header>'+
    '<p>Import <strong>'+esc(model.name||'selected capture')+'</strong> from '+esc(tone.name||'TONE3000')+' to MG-30 NAM Slot 10?</p>'+
    '<p class="ai-tone-nam-overwrite-warning">This will replace the current contents of slot 10. No device data is written until you confirm.</p>'+
    '<p class="ai-tone-nam-validated">A2-Lite validation passed · '+Number(data.prepared?.weightBytes||0).toLocaleString()+' weight bytes</p>'+
    '<div class="ai-tone-nam-confirm-actions"><button type="button" data-ai-nam-cancel="'+cardId+'">Cancel</button><button type="button" class="ai-tone-nam-primary" data-ai-nam-confirm="'+cardId+'">Transfer to Slot 10</button></div></section>';
  }
  if(item.type==='nam-transfer'){
   const ok=data.success===true;
   return '<section class="ai-tone-nam-chat-card ai-tone-nam-transfer-result"><header><span class="'+(ok?'ai-tone-nam-success':'ai-tone-nam-warning')+'">'+(ok?'✓':'!')+'</span><div><strong>'+(ok?'NAM Transfer Successful':'NAM Transfer Failed')+'</strong><small>'+esc(data.modelName||'TONE3000 NAM')+' · MG-30 NAM Slot 10</small></div></header><p>'+esc(data.message||'')+'</p>'+(ok?'<p class="ai-tone-nam-card-footnote">Transfer completed. NAM Library copy retained.</p>':'')+'</section>';
  }
  return '';
 };
 const scrollMessagesToEnd=()=>{
  const scrollArea=$('aiToneScrollArea');
  const scroll=()=>{if(scrollArea?.isConnected)scrollArea.scrollTop=scrollArea.scrollHeight;};
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(()=>window.requestAnimationFrame(scroll));else scroll();
 };
 const renderHistory=()=>{ui.messages.innerHTML=history.map(item=>item.type?'<div class="ai-tone-message ai"><small>AI TONE ASSISTANT</small>'+renderNamChatCard(item)+'</div>':'<div class="ai-tone-message '+item.role+'"><small>'+(item.role==='user'?'YOU':'AI TONE ASSISTANT')+'</small>'+esc(item.text)+'</div>').join('');renderActivity();scrollMessagesToEnd();};
 const message=(role,text)=>{history.push({role,text:String(text)});while(history.length>60)history.shift();renderHistory();};
 const chatCard=(type,data)=>{history.push({role:'ai',type,data:{...data,cardId:data.cardId||'nam-'+(++namCardSequence)}});while(history.length>60)history.shift();renderHistory();};
 const updateChatCard=(cardId,type,data)=>{
  const item=history.find(row=>row.type&&String(row.data?.cardId)===String(cardId));
  if(!item){chatCard(type,{...data,cardId});return;}
  item.type=type;item.data={...data,cardId};
  const existing=Array.from(ui.messages.querySelectorAll('[data-ai-nam-card]')).find(node=>node.dataset.aiNamCard===String(cardId));
  if(!existing)return;
  const scrollArea=$('aiToneScrollArea');
  const scrollTop=scrollArea?.scrollTop||0;
  existing.outerHTML=renderNamChatCard(item);
  if(scrollArea)scrollArea.scrollTop=scrollTop;
 };
 const removeChatCard=cardId=>{const index=history.findIndex(row=>row.type&&String(row.data?.cardId)===String(cardId));if(index>=0){history.splice(index,1);renderHistory();}};
 let namCardSequence=0;
 const aiUsage={requests:0,total:0,providers:Object.create(null),models:Object.create(null),tasks:Object.create(null)};
 const renderUsageRows=rows=>Object.keys(rows).length
   ?Object.entries(rows).sort((a,b)=>b[1].tokens-a[1].tokens).map(([name,row])=>
    '<div><span>'+esc(name)+'<small>In '+Number(row.input_tokens||0).toLocaleString()+' · Out '+Number(row.output_tokens||0).toLocaleString()+' · '+row.successes+' ok / '+Number(row.continued||0)+' cont / '+row.failures+' fail</small></span><strong>'+row.tokens.toLocaleString()+(row.estimated?' ~':'')+'<small>'+row.requests+' req</small></strong></div>').join('')
   :'<p>No AI requests recorded in this session.</p>';
  const renderAiUsageMonitor=()=>{
   ui.usageTotal.textContent=aiUsage.total.toLocaleString();
   ui.usageRequests.textContent=String(aiUsage.requests);
   ui.usageSummary.textContent=aiUsage.total.toLocaleString()+' tokens';
   ui.usageProviders.innerHTML=renderUsageRows(aiUsage.models);
   ui.usageAgents.innerHTML=renderUsageRows(aiUsage.tasks);
  };
 const toneSession={intent:null,architectProvider:'',sourcePrompt:''};
 let pendingToneApply=null;
 const rememberConversation=(role,text)=>{const value=String(text||'').trim();if(!value)return;dialogueContext.push({role,text:value.slice(0,1400)});while(dialogueContext.length>8)dialogueContext.shift();};
 const conversationContextText=()=>dialogueContext.slice(-8).map(turn=>(turn.role==='user'?'User':'Assistant')+': '+turn.text).join('\\n');
 let audioMode='once',audioCaptureActive=false,audioBusy=false,audioCaptureTimer=0,audioPollTimer=0,audioCaptureStartedAt=0,lastAudioMetrics=null;
 const setBusy=v=>{busy=!!v;ui.send.disabled=busy;ui.send.textContent=busy?'Working…':'Send ↗';ui.prompt.disabled=busy;ui.findNam.disabled=busy||namImportBusy;ui.providerSelect.disabled=busy;ui.activeModel.disabled=busy||ui.activeModel.options.length===0;ui.autoFallback.disabled=busy;ui.undo.disabled=busy||!last;ui.audioStart.disabled=busy||audioBusy||(!audioCaptureActive&&ui.audioDevice.dataset.state!=='connected');ui.audioModes.forEach(button=>button.disabled=busy||audioBusy||audioCaptureActive);ui.namWizard.querySelectorAll('button').forEach(b=>b.disabled=busy);ui.namResults.querySelectorAll('button,select').forEach(b=>b.disabled=busy);};
 const setMode=v=>{
const next='chatgpt';
  mode=next;ui.providerSelect.value=next;autoProviderHealthCache.expires=0;
  renderActiveModelSelect();
  if(next!=='auto'&&next!=='collab')void refreshProviderModels(next,false);
  else if(next==='collab')void refreshAllProviderModels(true);
 };
 const openPanel=()=>{shade.classList.add('on');sheet.classList.add('on');open.classList.add('ai-tone-open');open.setAttribute('aria-expanded','true');void refreshAudioDeviceStatus();};
 const closePanel=()=>{if(audioCaptureActive)void stopAudioListeningWithoutAnalysis();shade.classList.remove('on');sheet.classList.remove('on');open.classList.remove('ai-tone-open');open.setAttribute('aria-expanded','false');};

 const setAudioPanelExpanded=expanded=>{
  if(expanded){
   ui.audioPanel.hidden=false;
   const openDock=()=>{if(!ui.audioPanel.hidden)ui.audioPanel.classList.add('is-open');};
   if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(openDock);else openDock();
  }else if(!ui.audioPanel.hidden){
   ui.audioPanel.classList.remove('is-open');
   const finish=()=>{if(!ui.audioPanel.classList.contains('is-open'))ui.audioPanel.hidden=true;};
   const onEnd=event=>{if(event.target===ui.audioPanel&&event.propertyName==='transform'){ui.audioPanel.removeEventListener('transitionend',onEnd);finish();}};
   ui.audioPanel.addEventListener('transitionend',onEnd);
   window.setTimeout(()=>{ui.audioPanel.removeEventListener('transitionend',onEnd);finish();},420);
  }
  ui.audioToggle.classList.toggle('active',Boolean(expanded));
  ui.audioToggle.setAttribute('aria-expanded',String(Boolean(expanded)));
  if(expanded)void refreshAudioDeviceStatus();
 };
 const syncSettingsTop=()=>{
  const header=sheet.querySelector('.ai-tone-head');
  if(!header)return;
  const height=Math.ceil(header.getBoundingClientRect().height);
  sheet.style.setProperty('--ai-tone-head-height',height+'px');
 };
 syncSettingsTop();
 window.addEventListener('resize',syncSettingsTop,{passive:true});
 const setSettingsExpanded=expanded=>{
  if(expanded){
   syncSettingsTop();
   ui.settings.classList.add('on');
   const openSettings=()=>{if(ui.settings.classList.contains('on'))ui.settings.classList.add('is-open');};
   if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(openSettings);else openSettings();
   void keyStates();
  }else if(ui.settings.classList.contains('on')){
   ui.settings.classList.remove('is-open');
   const finish=()=>{if(!ui.settings.classList.contains('is-open'))ui.settings.classList.remove('on');};
   const onEnd=event=>{if(event.target===ui.settings&&event.propertyName==='transform'){ui.settings.removeEventListener('transitionend',onEnd);finish();}};
   ui.settings.addEventListener('transitionend',onEnd);
   window.setTimeout(()=>{ui.settings.removeEventListener('transitionend',onEnd);finish();},420);
  }
 };
 const setAudioStatus=(text,state='idle')=>{ui.audioStatus.textContent=text;ui.audioStatus.dataset.state=state;};
 function setAudioMode(next){
  if(audioCaptureActive||audioBusy)return;
  audioMode=next==='live'?'live':'once';
  ui.audioModes.forEach(button=>button.classList.toggle('active',button.dataset.aiAudioMode===audioMode));
  setAudioStatus(audioMode==='once'?'Analyze a short sample, then receive a tone diagnosis.':'Keep listening while you play, then stop to analyze the captured performance.');
 }
 function setAudioMeter(values,active){
  const bars=ui.audioMeter.querySelectorAll('span');
  ui.audioMeter.classList.toggle('is-active',Boolean(active));
  bars.forEach((bar,index)=>{
   const level=Array.isArray(values)&&values.length?Number(values[index%values.length])||0:(active?18+((index*17)%60):8);
   bar.style.setProperty('--audio-level',Math.max(5,Math.min(100,level))+'%');
  });
 }
 async function refreshAudioDeviceStatus(){
  const recorder=window.NUXStudioRecorder;
  if(!recorder?.isNative?.()){
   ui.audioDevice.textContent='';ui.audioDevice.dataset.state='error';ui.audioDevice.setAttribute('aria-label','USB Audio capture requires the Android APK');ui.audioDevice.title='USB Audio unavailable';
   ui.audioDevice.dataset.state='error';ui.audioStart.disabled=true;return false;
  }
  try{
   const result=await recorder.inspectToneAnalysisInput();
   const devices=Array.isArray(result?.devices)?result.devices:[];
   const match=devices.find(device=>device?.isUsb&&/mg-?30|nux/i.test(String(device.name||'')));
   const ready=Boolean(match);
   ui.audioDevice.textContent='';ui.audioDevice.dataset.state=ready?'connected':'error';ui.audioDevice.setAttribute('aria-label',ready?'NUX MG-30 USB Audio connected':'NUX MG-30 USB Audio disconnected');ui.audioDevice.title=ready?'USB Audio connected':'USB Audio disconnected';
   ui.audioDevice.dataset.state=ready?'connected':'error';
   ui.audioStart.disabled=!ready||audioBusy||audioCaptureActive;
   if(!ready)setAudioStatus('Connect the MG-30 by USB OTG, then refresh the audio input status.','error');
   else if(!audioCaptureActive)setAudioStatus('Ready to capture. Play through the MG-30, not the phone microphone.');
   return ready;
  }catch(error){
   ui.audioDevice.textContent='';ui.audioDevice.dataset.state='error';ui.audioDevice.setAttribute('aria-label','USB Audio check failed');ui.audioDevice.title='USB Audio check failed';ui.audioDevice.dataset.state='error';
   ui.audioStart.disabled=true;setAudioStatus(error?.message||'Could not inspect MG-30 USB Audio.','error');return false;
  }
 }
 function stopAudioTimers(){
  if(audioCaptureTimer)window.clearTimeout(audioCaptureTimer);
  if(audioPollTimer)window.clearInterval(audioPollTimer);
  audioCaptureTimer=0;audioPollTimer=0;
 }
 async function decodeToneAnalysisTake(take){
  if(!take?.path)throw new Error('The MG-30 USB capture did not produce an audio file.');
  const url=take.audioUrl||window.NUXStudioRecorder?.pathToUrl?.(take);
  if(!url)throw new Error('The captured USB audio file URL is unavailable.');
  const response=await fetch(url);
  if(!response.ok)throw new Error('Could not read the captured MG-30 USB audio file ('+response.status+').');
  const bytes=await response.arrayBuffer();
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)throw new Error('This Android WebView does not provide Web Audio decoding.');
  const context=new AudioContextClass();
  try{
   const decoded=await context.decodeAudioData(bytes.slice(0));
   const decodedChannels=[];
   for(let index=0;index<decoded.numberOfChannels;index+=1)decodedChannels.push(decoded.getChannelData(index));
   const activeMask=Number(take.channelIndexMask)||Number(take.requestedChannelIndexMask)||3;
   const requestedMask=Number(take.requestedChannelIndexMask)||3;
   const channels=selectUsbInputChannels(decodedChannels,activeMask,requestedMask);
   const metrics=analyzeToneAudioSamples(channels,decoded.sampleRate);
   metrics.captureMode=String(take.captureMode||'multichannel');
   metrics.inputRoute='MG-30 USB input channels 1–2 (stereo host-loopback mix)';
   return metrics;
  }finally{try{await context.close();}catch(_){}}
 }
 function isReadOnlyAudioAnalysisRequest(prompt){
  const value=String(prompt||'');
  const asks=/\b(analy[sz]e|analysis|analisa|analisis|dengar|listen|evaluasi|evaluate)\b/i.test(value);
  const audioTopic=/\b(audio|tone|suara|gitar|guitar|current|sekarang|ini)\b/i.test(value);
  const asksForChange=/\b(kurangin|kurangi|tambah|naikkan|turunkan|ubah|buat|jadikan|reduce|increase|raise|lower|change|make|brighten|darken|warmer|cooler)\b/i.test(value);
  return asks&&audioTopic&&!asksForChange;
 }
 function formatAudioDiagnosis(result){
  if(typeof result==='string')return result;
  const rows=[];
  if(result?.summary)rows.push(String(result.summary));
  for(const item of Array.isArray(result?.observations)?result.observations:[]){
   rows.push('• '+String(item.area||'Observation')+': '+String(item.finding||'')+(item.evidence?' — '+String(item.evidence):''));
  }
  for(const item of Array.isArray(result?.recommendations)?result.recommendations:[])rows.push('Recommendation: '+String(item));
  if(result?.limitations)rows.push('Limitations: '+String(result.limitations));
  return rows.join('\n')||JSON.stringify(result);
 }
 async function requestAudioDiagnosis(question,metrics,conversation=''){
  const system='You are a guitar tone listening assistant for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' The audio PCM was analyzed locally; you receive only objective measurements, never raw audio. Interpret the measurements cautiously: the capture uses MG-30 USB input channels 1–2, which may include a host-loopback mix and the result is affected by pickups, playing technique, guitar volume, gain staging and the performance. Do not claim you heard timbre details that these measurements cannot establish. Spectral centroid, rolloff and band percentages are evidence, not calibrated EQ targets. Do not recommend exact knob settings unless the user asks. This is read-only analysis: do not generate a preset, Tone Plan, block list, MIDI command or hardware change. Return JSON only: {"summary":"...","observations":[{"area":"...","finding":"...","evidence":"...","confidence":0.0}],"recommendations":["..."],"limitations":"..."}.'; 
  const user=(conversation?'RECENT CONVERSATION:\n'+conversation+'\n\n':'')+'USER REQUEST:\n'+String(question||'Analisis tone gitar saya saat ini.')+'\n\nMEASURED USB AUDIO (local analysis):\n'+formatToneAudioMetrics(metrics)+'\n\nGive an evidence-based diagnosis only. No device changes.';
  try{
   const result=await askNamAIJson(system,user,'analyzing the captured MG-30 USB audio');
   const diagnosis=formatAudioDiagnosis(result);message('ai',diagnosis);rememberConversation('assistant',diagnosis);
   status('Audio analysis complete. No device parameters were changed.','success');
   return result;
  }catch(error){
   status('Audio analysis failed: '+(error?.message||error),'error');
   throw error;
  }
 }
 async function finishAudioListening(options={}){
  const askAi=options.askAi!==false,discard=Boolean(options.discard);
  if(!audioCaptureActive)return lastAudioMetrics;
  audioCaptureActive=false;stopAudioTimers();audioBusy=true;
  ui.audioStart.disabled=true;ui.audioStart.textContent='Processing Audio…';
  ui.audioModes.forEach(button=>button.disabled=true);
  setAudioMeter([],false);setAudioStatus('Stopping USB capture and preparing local analysis…','busy');
  const recorder=window.NUXStudioRecorder;let take=null,metrics=null;
  try{
   take=await recorder.stopToneAnalysis();
   if(!take?.path)throw new Error('The MG-30 USB capture stopped without producing a WAV file.');
   if(!discard){
    setAudioStatus('Analyzing captured audio locally…','busy');
    metrics=await decodeToneAnalysisTake(take);
    metrics.measuredAt=Date.now();metrics.route='MG-30 USB input channels 1–2';
    lastAudioMetrics=metrics;
    message('ai','Local USB audio measurements\n'+formatToneAudioMetrics(metrics));
    if(askAi){
     try{await requestAudioDiagnosis('Analisis tone gitar saya berdasarkan hasil capture USB Audio MG-30 ini. Jangan ubah parameter perangkat.',metrics);}
     catch(error){message('ai','Audio measurements were saved locally, but the AI diagnosis could not be completed: '+(error?.message||error));}
    }
    setAudioStatus('Analysis complete. Ask a follow-up or request a tone correction.','success');
   }else{
    lastAudioMetrics=null;setAudioStatus('Listening stopped. Temporary audio was discarded.','idle');
   }
  }catch(error){
   setAudioStatus(error?.message||'USB audio analysis failed.','error');
   message('ai','USB audio analysis failed: '+(error?.message||error));
   if(discard)lastAudioMetrics=null;
  }finally{
   if(take?.path){try{await recorder.deleteToneAnalysisTake(take.path);}catch(_){}}
   audioBusy=false;ui.audioModes.forEach(button=>button.disabled=false);
   ui.audioStart.textContent='Start Listening';await refreshAudioDeviceStatus();
  }
  return metrics;
 }
 async function startAudioListening(){
  if(audioCaptureActive){await finishAudioListening({askAi:true});return;}
  if(audioBusy||busy)return;
  audioBusy=true;ui.audioStart.disabled=true;ui.audioRefresh.disabled=true;
  ui.audioModes.forEach(button=>button.disabled=true);
  setAudioStatus('Checking MG-30 USB Audio and preparing capture…','busy');
  try{
   const recorder=window.NUXStudioRecorder;
   if(!recorder?.startToneAnalysis)throw new Error('The native MG-30 USB audio capture bridge is unavailable. Rebuild and install the Android APK.');
   const ready=await refreshAudioDeviceStatus();
   if(!ready)throw new Error('MG-30 USB Audio input is not detected. Connect the pedal and refresh.');
   if(recorder.isRecording?.())throw new Error('Another USB Audio recording is already active. Stop Quick Record or the DAW recording first.');
   const opened=await recorder.startToneAnalysis({channelIndexMask:3});
   if(!opened?.recording)throw new Error('Android did not confirm MG-30 USB Audio capture.');
   audioCaptureActive=true;audioCaptureStartedAt=Date.now();
   ui.audioStart.textContent='Stop & Analyze';ui.audioStart.disabled=false;
   ui.audioModes.forEach(button=>button.disabled=true);setAudioMeter([],true);
   setAudioStatus(audioMode==='once'?'Listening for 7 seconds… Play a short phrase or chord.':'Live Listening · Play freely, then press Stop & Analyze.','busy');
   audioPollTimer=window.setInterval(async()=>{
    try{
     const stats=await recorder.getToneAnalysisStats();
     if(!audioCaptureActive||!stats?.recording)return;
     const peaks=(stats.channelWaveforms||[]).flatMap(channel=>Array.isArray(channel.peaks)?channel.peaks:[]);
     const peak=Math.max(0,...peaks.map(Number));
     const bars=Array.from({length:32},(_,index)=>Math.max(6,Math.min(100,Math.round((peak*100)+(index%5)*3))));
     setAudioMeter(bars,true);
     const seconds=Math.max(0,Number(stats.durationSeconds)||((Date.now()-audioCaptureStartedAt)/1000));
     if(audioMode==='once')setAudioStatus('Listening · '+Math.max(0,Math.ceil(7-seconds))+' seconds remaining…','busy');
     else setAudioStatus('Live Listening · '+seconds.toFixed(1)+' s captured','busy');
    }catch(_){}
   },220);
   audioCaptureTimer=window.setTimeout(()=>{void finishAudioListening({askAi:true});},audioMode==='once'?7000:120000);
  }catch(error){
   setAudioStatus(error?.message||'Could not start USB audio listening.','error');
   message('ai','Audio listening could not start: '+(error?.message||error));
   ui.audioStart.textContent='Start Listening';await refreshAudioDeviceStatus();
  }finally{
   audioBusy=false;ui.audioRefresh.disabled=false;ui.audioModes.forEach(button=>button.disabled=audioCaptureActive);
   if(!audioCaptureActive)ui.audioStart.disabled=false;
  }
 }
 async function stopAudioListeningWithoutAnalysis(){
  if(audioCaptureActive)await finishAudioListening({askAi:false,discard:true});
 }

 function updateNamControlState(){
  ui.findNam.classList.toggle('active',namModeActive);
  ui.findNam.textContent=namModeActive?'ON':'OFF';
  ui.findNam.setAttribute('aria-pressed',String(namModeActive));
  ui.namModeStatus.dataset.active=String(namModeActive);
  ui.namGearButtons.forEach(button=>{
   const active=button.dataset.aiNamGear===namCaptureType;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
  });
  ui.namModeStatus.textContent=namModeActive
   ?'TONE3000 NAM mode ON · New tone requests will use '+(namCaptureType==='amp'?'Amp Only':'Amp + Cab')+'.'
   :'TONE3000 NAM mode OFF · Built-in MG-30 amps remain selected by default.';
 }
 function setNamMode(enabled){
  namModeActive=Boolean(enabled);
  activeNamGear=namModeActive?namCaptureType:'';
  if(!namModeActive){activeNamContext='';activeNamModelName='';pendingNamSelection=null;}
  updateNamControlState();
 }
 function showNamSourceChoice(){
  ui.namResults.hidden=true;ui.namWizard.hidden=false;
  ui.namWizard.innerHTML='<p>Choose the amplifier source for this request.</p><div class="ai-tone-nam-choice-row"><button class="ai-tone-nam-choice" data-ai-nam-source="builtin" type="button">Built-in MG-30 Amp</button><button class="ai-tone-nam-choice" data-ai-nam-source="nam" type="button">TONE3000 NAM</button></div>';
 }
 function showNamGearChoice(){
  ui.namWizard.innerHTML='<p>Choose the NAM capture type. This controls the official TONE3000 catalog filter.</p><div class="ai-tone-nam-choice-row"><button class="ai-tone-nam-choice" data-ai-nam-gear="amp" type="button">Amp Only</button><button class="ai-tone-nam-choice" data-ai-nam-gear="amp-cab" type="button">Amp + Cab</button></div>';
 }
 function renderNamSearchResults(rows,query,recommendation=null,purpose='search',prompt='',conversation='',preparedPlan=null){
  const best=recommendation?.tone||null;
  pendingNamSelection={purpose,prompt,conversation,gear:activeNamGear,query,tones:rows.slice(),recommendedToneId:best?String(best.id):'',preparedPlan,phase:'profiles'};
  chatCard('nam-profiles',{query,gear:activeNamGear,tones:rows.map(tone=>({...tone})),recommendedId:best?String(best.id):'',recommendation:best?{name:best.name,creator:best.creator,reason:recommendation.reason||''}:null});
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
 async function searchNamCatalogForPrompt(prompt,conversation=''){
  const bridge=window.NUXTONE3000Bridge;
  if(!bridge?.searchTones||!bridge?.loadTone)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update MG30 Studio.');
  namCaptureType=inferNamCaptureType(prompt,namCaptureType);setNamMode(true);
  if(!await bridge.hasSession())throw new Error('TONE3000 account is not authenticated. Open Device → TONE3000 Settings → Connect TONE3000 Account and finish sign-in.');
  const intent=await deriveNamSearchQuery(prompt,conversation);
  status('Searching the TONE3000 NAM catalog…','busy');
  const tones=await bridge.searchTones(intent.query,{gear:activeNamGear});
  if(!tones.length){const meta=tones.searchMeta||{};throw new Error('TONE3000 returned no matching A2 NAM profiles for '+intent.query+'. Try another amp name or capture type. Capture-size filtering is deferred until model download; this result means the A2 catalogue search returned no matching profile. Queries tried: '+(meta.queriesTried||[]).join(' → ')+'.');}
  let recommendation=null;
  try{recommendation=await chooseNamTone(prompt,intent.query,tones,conversation);}
  catch(error){message('ai','Profiles were found, but AI ranking was unavailable: '+(error.message||error)+'. You can still inspect every matching result and choose manually.');}
  const rows=recommendation?[recommendation.tone,...tones.filter(tone=>String(tone.id)!==String(recommendation.tone.id))]:tones;
  renderNamSearchResults(rows,intent.query,recommendation,'search',prompt,conversation);
  message('ai','TONE3000 found '+tones.length+' matching NAM profile(s). Choose a profile below to view its A2 captures. Nothing has been imported.');
  rememberConversation('assistant','TONE3000 profiles are ready. Choose a profile to view A2 captures.');
  status('NAM profiles are shown in the conversation. Select View A2 Captures to continue.','success');
  ui.prompt.value='';$('aiToneCount').textContent='0/1400';
 }

  async function answerToneConversation(prompt,conversation='',bridge=null){
  const system='You are ChatGPT, the primary conversational guitar tone partner for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' This is a DISCUSSION turn, not a Tone Plan request. Answer in natural Indonesian prose (or the user language). Use the recent conversation to resolve short references such as “yang ini”, “kalau yang tadi”, and “bagaimana dengan itu”. Explain tone, amp, NAM, IR, EQ, effects, gain staging, dynamics and practical trade-offs. Do not return JSON, code, a preset, a Tone Plan, parameter commands or MIDI. Do not claim any settings changed. Do not call specialists for ordinary discussion. Ask at most one concise follow-up only when needed.';
  const snapshot=bridge?.getSnapshot?.()||[];
  const compactState=snapshot.slice(0,8).map(block=>({
   id:String(block?.id||'').slice(0,12),
   model:String(block?.model||'').slice(0,48),
   enabled:Boolean(block?.enabled),
   parameters:Object.fromEntries(Object.entries(block?.parameters||{}).slice(0,5).map(([key,value])=>[String(key).slice(0,24),value]))
  }));
  const recent=compactNamConversation(conversation,1500);
  const stateText=JSON.stringify(compactState).slice(0,900);
  const user=(recent?'RECENT DISCUSSION:\n'+recent+'\n\n':'')+
   (stateText&&stateText!=='[]'?'CURRENT MG-30 EDITOR STATE (compact):\n'+stateText+'\n\n':'')+
   'LATEST USER MESSAGE:\n'+String(prompt||'').slice(0,500)+'\n\nAnswer this discussion turn naturally. No device changes.';
  let reply='';
  {
   const credential=await secret('chatgpt');
   if(!credential)throw new Error('ChatGPT plan access is not connected. Open Device settings and connect your ChatGPT account.');
   const model=await fastestReadyModel('chatgpt',credential,'discussion');
   const maxOutputTokens=outputTokenBudgetForStage('answering your tone question');
   let result;
   try{
    result=await requestChatGptConversation({bridge:window.MG30ChatGPTBridge,model,system,user,maxOutputTokens});
   }catch(error){
    const attempts=Array.isArray(error?.__aiUsageBreakdown)?error.__aiUsageBreakdown:[];
    if(attempts.length){
     for(const attempt of attempts){
      const logged={};
      if(attempt.usage)Object.defineProperty(logged,'__aiUsage',{value:attempt.usage,enumerable:false});
      if(attempt.incomplete)Object.defineProperty(logged,'__incomplete',{value:true,enumerable:false});
      logAiTokenUsage('chatgpt',attempt.model,attempt.stage,maxOutputTokens,system,attempt.input,logged,attempt.failed?new Error(attempt.reason||'ChatGPT request failed'):null);
     }
    }else logAiTokenUsage('chatgpt',model,'answering your tone question',maxOutputTokens,system,user,null,error);
    throw error;
   }
   for(const attempt of result.__aiUsageBreakdown||[]){
    const logged={};
    if(attempt.usage)Object.defineProperty(logged,'__aiUsage',{value:attempt.usage,enumerable:false});
    if(attempt.incomplete)Object.defineProperty(logged,'__incomplete',{value:true,enumerable:false});
    logAiTokenUsage('chatgpt',attempt.model,attempt.stage,maxOutputTokens,system,attempt.input,logged,attempt.failed?new Error(attempt.reason||'ChatGPT request failed'):null);
   }
   reply=result.reply;
  }
  if(!reply)throw new Error('AI returned an empty conversational response.');
  message('ai',reply);rememberConversation('assistant',reply);status('Conversation updated. No device parameters were changed.','success');
  ui.prompt.value='';$('aiToneCount').textContent='0/1400';
 }
 function renderNamCandidates(detail){
  const tone=detail?.tone||{},models=Array.isArray(detail?.models)?detail.models:[];
  ui.namResults.hidden=false;ui.namWizard.hidden=true;
  ui.namResults.innerHTML='<div class="ai-tone-nam-results-head"><div><strong>'+esc(tone.name||('TONE3000 tone '+detail.toneId))+'</strong><small>'+(tone.creator?'@'+esc(tone.creator)+' · ':'')+'AI destination: slot 10</small></div></div>'+
   '<p>These models were returned by TONE3000 for architecture A2. Each downloaded file must still pass the MG-30 Gen 2 A2-Lite validator before transfer. Choose a candidate to continue.</p>'+
   (models.length?models.map(model=>'<div class="ai-tone-nam-model"><div class="ai-tone-nam-model-copy"><strong>'+esc(model.name||'Unnamed model')+'</strong><small>'+esc(model.architecture_version??model.architecture??'A2')+' · '+esc(model.size??'Size unavailable')+(model.downloadable?' · Download available':' · Download unavailable')+'</small></div><button class="ai-tone-nam-import" type="button" data-ai-nam-import="'+esc(model.id)+'" '+(model.downloadable?'':'disabled')+'>'+(model.downloadable?'Validate & Import to Slot 10':'No Download URL')+'</button></div>').join(''):'<p>No models were returned for this tone. Choose another tone in TONE3000.</p>');
 }
 ui.findNam.addEventListener('click',()=>{
  if(busy||namImportBusy)return;
  setNamMode(!namModeActive);
  status(namModeActive?'TONE3000 NAM mode enabled. New tone requests will search compatible A2 captures.':'TONE3000 NAM mode disabled. Built-in MG-30 amps will be used by default.','success');
  message('ai',namModeActive?'TONE3000 NAM mode is ON. New tone-creation requests will search '+(namCaptureType==='amp'?'Amp Only':'Amp + Cab')+' profiles.':'TONE3000 NAM mode is OFF. Built-in MG-30 amp selection is restored.');
 });
 ui.namGearButtons.forEach(button=>button.addEventListener('click',()=>{
  if(busy||namImportBusy)return;
  namCaptureType=button.dataset.aiNamGear==='amp'?'amp':'amp-cab';
  if(namModeActive)activeNamGear=namCaptureType;
  updateNamControlState();
  status('NAM capture type set to '+(namCaptureType==='amp'?'Amp Only':'Amp + Cab')+'.','success');
 }));
 ui.messages.addEventListener('change',event=>{
  const radio=event.target.closest('input[data-ai-nam-capture-radio]');if(!radio)return;
  const cardId=String(radio.dataset.aiNamCaptureRadio||'');
  const historyItem=history.find(item=>item.type==='nam-captures'&&String(item.data?.cardId)===cardId);
  if(!historyItem)return;
  // Persist the choice in memory, but update only radio/label classes in the existing card.
  // Never repaint chat history or move either conversation scroll container for a radio change.
  historyItem.data.selectedId=String(radio.value);
  const card=radio.closest('[data-ai-nam-card]');
  if(!card)return;
  card.querySelectorAll('input[data-ai-nam-capture-radio]').forEach(input=>{
   const label=input.closest('.ai-tone-nam-capture');
   if(label)label.classList.toggle('selected',input.checked);
  });
 });
 ui.messages.addEventListener('click',async event=>{
  const view=event.target.closest('[data-ai-nam-view-captures]');
  if(view&&!busy&&!namImportBusy){try{await loadNamCapturesForChat(view.dataset.aiNamViewCaptures||'');}catch(error){message('ai','Could not load A2 captures: '+(error.message||error));status('Could not load NAM captures.','error');}return;}
  const importSelected=event.target.closest('[data-ai-nam-import-selected]');
  if(importSelected&&!busy&&!namImportBusy){try{await prepareSelectedNamCapture(importSelected.dataset.aiNamImportSelected||'');}catch(error){message('ai','Cannot prepare this NAM capture: '+(error.message||error));status(error.message||'NAM capture selection failed.','error');}return;}
  const confirm=event.target.closest('[data-ai-nam-confirm]');
  if(confirm&&!busy&&!namImportBusy){try{await confirmNamTransfer(confirm.dataset.aiNamConfirm||'');}catch(error){message('ai','Transfer not started: '+(error.message||error));status(error.message||'Connect the MG-30 before transfer.','error');}return;}
  const cancel=event.target.closest('[data-ai-nam-cancel]');
  if(cancel&&!busy&&!namImportBusy){cancelNamTransferConfirmation(cancel.dataset.aiNamCancel||'');return;}
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
const providerNames={chatgpt:'ChatGPT plan',gpt:'GPT',gemini:'Gemini',groq:'Groq',openrouter:'OpenRouter',cloudflare:'Cloudflare Workers AI'};
const providerModels={chatgpt:[],gpt:[],gemini:[],groq:[],openrouter:[],cloudflare:[{id:WORKERS_AI_MODEL,name:'Gemma 4 26B · Workers AI'}]};
 const modelStorageKey=p=>'mg30-ai-model-'+p;
 const autoProviderHealthCache={expires:0,order:[],errors:[]};
 const autoModelHealthCache={};
 const providerCooldownUntil=Object.create(null);
 const noteProviderFailure=(provider,error)=>{if(shouldCooldownProvider(error)){providerCooldownUntil[provider]=Date.now()+60_000;autoProviderHealthCache.order=autoProviderHealthCache.order.filter(item=>item!==provider);autoProviderHealthCache.expires=0;}};
 const providerInCooldown=provider=>Date.now()<(providerCooldownUntil[provider]||0);
 const currentMode=()=>String(ui.providerSelect.value||mode||'auto');
 const activeModelProvider=()=>currentMode()==='collab'?'gemini':currentMode()==='auto'?'chatgpt':currentMode();
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
  const autoOption=document.createElement('option');autoOption.value='__auto__';autoOption.textContent=provider==='gemini'?'Auto · Gemini 3.1 Flash Lite':provider==='chatgpt'?'Task-based · GPT-5.6 discussion / GPT-6 Luna preset':'Auto · fastest available';select.append(autoOption);if(provider==='chatgpt'){select.value='__auto__';select.disabled=true;ui.activeModelLabel.textContent='Model by task';return;}
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
   option.textContent='Connect or configure '+providerNames[provider]+' to load models';
   select.append(option);select.disabled=true;
  }
  ui.activeModelLabel.textContent=currentMode()==='collab'?'Free team · models assigned automatically':currentMode()==='auto'?'Auto: ChatGPT primary + optional fallbacks':provider==='chatgpt'?'Auto: light chat / GPT-6 tone build':'Model';
  if(currentMode()==='auto'||currentMode()==='collab'){select.replaceChildren();const option=document.createElement('option');option.value='__auto__';option.textContent=currentMode()==='collab'?'Free providers assigned by role':'Auto · ChatGPT first; Luna delegates for complex tones';select.append(option);select.disabled=true;}
 }
 async function refreshProviderModels(provider,quiet=true){
  const saved=String(localStorage.getItem(modelStorageKey(provider))||'');
  if(provider==='cloudflare'){
   providerModels.cloudflare=await secret('cloudflare')?[{id:WORKERS_AI_MODEL,name:'Gemma 4 26B · Workers AI'}]:[];
   if(provider===activeModelProvider())renderActiveModelSelect();
   return providerModels.cloudflare;
  }
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
   const manualKey='mg30-ai-model-manual-'+provider;
   const manual=localStorage.getItem(manualKey)==='1';
   const manualModelAvailable=manual&&models.some(row=>row.id===saved);
   if(manual&&!manualModelAvailable)localStorage.setItem(manualKey,'0');
   delete autoModelHealthCache[provider];
   let chosen=manualModelAvailable?saved:'';
   if(!chosen){
    if(provider==='openrouter')chosen=models.some(row=>row.id==='openrouter/free')?'openrouter/free':models[0].id;
    else if(provider==='gemini')chosen=findDefaultGeminiModel(models);
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
await refreshProviderModels('chatgpt',quiet);
const providers=['gemini','groq','openrouter','cloudflare'];
const results=await Promise.all(providers.map(provider=>refreshProviderModels(provider,quiet)));
renderActiveModelSelect();
  const failures=results.map((rows,index)=>({provider:providers[index],rows})).filter(x=>!x.rows.length);
  if(!quiet&&failures.length){
   const details=failures.map(x=>providerNames[x.provider]+': no models returned (check Worker model route, provider key and upstream permissions)').join(' · ');
   status('Free model catalogue incomplete — '+details,'error');
  }else if(!quiet){status('Free provider model catalogues refreshed. GPT is available only when selected manually.','success');}
  return results;
 }
async function keyStates(){
let nativeSession=null;
try { nativeSession=await window.MG30ChatGPTBridge?.getSession?.(); } catch {}
const chatNode=$('aiChatGPTKeyState');
if(chatNode)chatNode.textContent=nativeSession?.status==='connected'&&nativeSession?.sharing?'Connected · ChatGPT plan access enabled (direct Android connection)':'Not connected · sign in from Device settings';
// SIWC models belong to the native ChatGPT account and must not depend on Cloud Account login.
await refreshProviderModels('chatgpt',true);
try {
const data=await getCloudAiStatus(true),providers=data?.providers||{};
   const labels={gpt:'aiOpenAiKeyState',gemini:'aiGeminiKeyState',groq:'aiGroqKeyState',openrouter:'aiOpenRouterKeyState',cloudflare:'aiCloudflareBindingState'};
   let configured=0;for(const [provider,id] of Object.entries(labels)){const node=$(id);if(node)node.textContent=providers[provider]?(provider==='cloudflare'?'Binding AI active':'Configured'):'Not configured';if(providers[provider])configured++;}
   ui.providerSummary.textContent=configured+' / 5 optional providers configured';
   await refreshAllProviderModels(false);
  } catch(error) {
   ['aiOpenAiKeyState','aiGeminiKeyState','aiGroqKeyState','aiOpenRouterKeyState','aiCloudflareBindingState'].forEach(id=>{if($(id))$(id).textContent='Status unavailable';});
   ui.providerSummary.textContent='Optional provider status unavailable';
providerModels.gpt=[];providerModels.gemini=[];providerModels.groq=[];providerModels.openrouter=[];renderActiveModelSelect();
status(nativeSession?.status==='connected'&&nativeSession?.sharing?'ChatGPT plan access is connected. Optional provider status is unavailable.':(error.message||'Optional provider status is unavailable.'),nativeSession?.sharing?'success':'error');
  }
}
async function saveKeys(){await keyStates();status('ChatGPT connection and optional external provider status refreshed.','success');}
async function deleteKey(provider){status('Manage '+providerNames[provider]+' credentials through the connected provider settings.','idle');}
function aiAgentLabel(stage,provider,model){
 const task=String(stage||'AI request').toLowerCase();
 let agent=String(stage||'AI request');
 if(task.includes('answering your tone question'))agent='Discussion';
 else if(task.includes('building your tone plan'))agent=provider==='chatgpt'?'GPT-6 Luna · Chief Tone Architect':'Tone Plan Builder';
 else if(task.includes('specialist amp_cabinet_specialist'))agent='Amp & Cabinet Specialist';
 else if(task.includes('specialist effects_specialist'))agent='Effects Specialist';
 else if(task.includes('specialist guitar_input_specialist'))agent='Guitar & Input Specialist';
 else if(task.includes('specialist tone_calibration_specialist'))agent='Tone Calibration Specialist';
 else if(task.includes('specialist tone_critic'))agent='Tone Critic';
 else if(task.includes('correcting the catalog validation'))agent='Catalog Validation Correction';
 else if(task.includes('defining the musical direction')||task.includes('gpt-6 luna'))agent='GPT-6 Luna · Chief Tone Architect';
 else if(task.includes('synthesizing the final tone plan'))agent=provider==='chatgpt'?'ChatGPT Orchestrator':'Tone Plan Synthesizer';
 else if(task.includes('checking a material conflict'))agent='Critical Reviewer';
 return agent+' · '+String(model||provider||'unknown model');
}
function logAiTokenUsage(provider,model,stage,maxOutputTokens,system,user,result,error=null){
  const usage=result?.__aiUsage&&typeof result.__aiUsage==='object'?result.__aiUsage:null;
  const promptEstimate=estimateTokenCount(String(system||'')+'\\n'+String(user||''));
  const completionEstimate=result?estimateTokenCount(JSON.stringify(result)):0;
  const inputTokens=usage?.prompt_tokens??usage?.input_tokens;
  const outputTokens=usage?.completion_tokens??usage?.output_tokens;
  const totalTokens=usage?.total_tokens??(inputTokens!==undefined||outputTokens!==undefined?Number(inputTokens||0)+Number(outputTokens||0):promptEstimate+completionEstimate);
  const record={event:'mg30_ai_token_usage',task:String(stage||'AI request'),agent:aiAgentLabel(stage,provider,model),provider,model,
   prompt_tokens:inputTokens??promptEstimate,
   completion_tokens:outputTokens??completionEstimate,
   total_tokens:totalTokens,
   usage_source:usage?'provider':'estimated_chars_div_4',
   max_output_tokens:maxOutputTokens,outcome:error?'failed':result?.__incomplete?'continued':'success'};
  aiUsage.requests++;aiUsage.total+=record.total_tokens||0;
  const providerRow=aiUsage.providers[provider]||(aiUsage.providers[provider]={tokens:0,requests:0,estimated:false});
  providerRow.tokens+=record.total_tokens||0;providerRow.requests++;providerRow.estimated=providerRow.estimated||record.usage_source!=='provider';
  const modelKey=String(provider)+' · '+String(model||'unknown model');
  const modelRow=aiUsage.models[modelKey]||(aiUsage.models[modelKey]={tokens:0,input_tokens:0,output_tokens:0,requests:0,successes:0,continued:0,failures:0,estimated:false});
  modelRow.tokens+=record.total_tokens||0;modelRow.input_tokens+=record.prompt_tokens||0;modelRow.output_tokens+=record.completion_tokens||0;modelRow.requests++;
  if(error)modelRow.failures++;else if(result?.__incomplete)modelRow.continued++;else modelRow.successes++;
  modelRow.estimated=modelRow.estimated||record.usage_source!=='provider';
  const agentKey=record.agent;
  const taskRow=aiUsage.tasks[agentKey]||(aiUsage.tasks[agentKey]={tokens:0,input_tokens:0,output_tokens:0,requests:0,successes:0,continued:0,failures:0,estimated:false});
  taskRow.tokens+=record.total_tokens||0;taskRow.input_tokens+=record.prompt_tokens||0;taskRow.output_tokens+=record.completion_tokens||0;taskRow.requests++;
  if(error)taskRow.failures++;else if(result?.__incomplete)taskRow.continued++;else taskRow.successes++;
  taskRow.estimated=taskRow.estimated||record.usage_source!=='provider';
  renderAiUsageMonitor();
  try{console.info('[MG30 AI TOKEN USAGE]',record);}catch{}
 }
 async function invokeWorkerLightTask(provider,task,system,user,stage,maxOutputTokens=520,modelOverride='',role=''){
  const credential=await secret(provider);
  if(!credential)throw new Error(providerNames[provider]+' is not configured or its Worker binding is inactive.');
  const model=String(modelOverride||await fastestReadyModel(provider,credential,'discussion')||'').trim();
  if(!model)throw new Error('No '+providerNames[provider]+' model is available for this task.');
  let data;
  try{
   data=await cloudApiRequest('/api/v1/ai/light-task',{method:'POST',body:{provider,task,role,model,system,prompt:user,maxOutputTokens}});
  }catch(error){
   // Older deployed Workers may not recognize the newer lightweight task names.
   // Retry only that exact compatibility error through the existing authenticated Tone Plan route.
   if(error?.status!==400||!(/Unsupported lightweight AI task|Unsupported AI task/i.test(String(error?.message||''))))throw error;
   const legacy=await cloudApiRequest('/api/v1/ai/tone-plan',{method:'POST',body:{provider,model,system,prompt:user,maxOutputTokens}});
   if(!legacy?.tonePlan||typeof legacy.tonePlan!=='object'||Array.isArray(legacy.tonePlan))throw new Error(legacy?.error||providerNames[provider]+' returned no structured JSON result from the compatibility route.');
   data={result:legacy.tonePlan,usage:legacy.usage,model:legacy.model||model};
  }
  if(!data?.result||typeof data.result!=='object'||Array.isArray(data.result))throw new Error(data?.error||providerNames[provider]+' returned no structured JSON result.');
  const result={...data.result};
  if(data.usage&&typeof data.usage==='object')Object.defineProperty(result,'__aiUsage',{value:data.usage,enumerable:false,configurable:false});
  Object.defineProperty(result,'__aiModel',{value:data.model||model,enumerable:false,configurable:false});
  return result;
 }
async function invokeProvider(provider,key,system,user,model,timeoutMs=90000,stage='AI request',maxOutputTokens=900){
  let result;
  try{
   if(provider==='chatgpt')result=await chatgpt(key,system,user,model);
   else if(provider==='gpt')result=await openai(key,system,user,model,maxOutputTokens);
   else if(provider==='gemini')result=await gemini(key,system,user,model,maxOutputTokens);
   else if(provider==='cloudflare')result=await invokeWorkerLightTask('cloudflare',(/building|correcting|synthesizing/i.test(stage)?'tone-plan':'tone-discussion'),system,user,stage,maxOutputTokens,model);
   else result=await cloudTonePlan(provider,system,user,model,maxOutputTokens);
   logAiTokenUsage(provider,result?.__aiModel||model,stage,maxOutputTokens,system,user,result);
   return result;
  }catch(error){logAiTokenUsage(provider,model,stage,maxOutputTokens,system,user,null,error);throw error;}
 }
 async function fastestReadyModel(provider,key,task='discussion'){
  if(provider==='cloudflare'){
   if(!await secret('cloudflare'))throw new Error('Cloudflare Workers AI binding AI is not configured in the Worker.');
   return WORKERS_AI_MODEL;
  }
  const models=providerModels[provider]?.length?providerModels[provider]:await refreshProviderModels(provider,true);
  const manual=selectedModel(provider);
  if(provider!=='chatgpt'&&manual&&(!models.length||models.some(row=>row.id===manual)))return manual;
if(manual)localStorage.setItem('mg30-ai-model-manual-'+provider,'0');
if(provider==='chatgpt'){
const preferredId=selectChatGptAutoModel(models,task);
if(!preferredId){
 if(task==='tone-plan')throw new Error('GPT-6-Luna is not available in the signed-in ChatGPT model catalogue. Refresh the model list or select an available model manually; Auto will not silently substitute a weaker tone-building model.');
 throw new Error('No suitable lightweight ChatGPT model is available for discussion in this signed-in account.');
}
localStorage.setItem(modelStorageKey(provider),preferredId);
autoModelHealthCache[provider]={model:preferredId,task,expires:Date.now()+45_000};
return preferredId;
}
const cached=autoModelHealthCache[provider];
  if(cached&&Date.now()<cached.expires){
   if(provider!=='gemini'||findDefaultGeminiModel([{id:cached.model}]))return cached.model;
   delete autoModelHealthCache[provider];
  }
  if(provider==='gemini'){
   const preferred=findDefaultGeminiModel(models);
   if(!preferred)throw new Error('Gemini 3.1 Flash Lite is not available in the Cloud model catalogue. Refresh the model list or choose a model manually. No Gemini request was sent.');
   localStorage.setItem(modelStorageKey(provider),preferred);
   autoModelHealthCache[provider]={model:preferred,expires:Date.now()+45_000};
   return preferred;
  }
  const saved=String(localStorage.getItem(modelStorageKey(provider))||'');
  if(saved&&models.some(row=>row.id===saved)){
   autoModelHealthCache[provider]={model:saved,expires:Date.now()+45_000};
   return saved;
  }
  const score=id=>{
   const value=String(id).toLowerCase();
   if(provider==='groq')return /llama-3.1-8b-instant|llama-3.3-70b-versatile|qwen.*32b|gpt-oss-20b/.test(value)?0:/instant|8b|20b/.test(value)?1:4;
   if(provider==='openrouter')return value==='openrouter/free'?0:/free/.test(value)?1:4;
   return /mini/.test(value)?0:4;
  };
  const chosen=models.slice().sort((a,b)=>score(a.id)-score(b.id))[0]?.id;
  if(!chosen)throw new Error('No text model is available for '+providerNames[provider]+'.');
  localStorage.setItem(modelStorageKey(provider),chosen);
  autoModelHealthCache[provider]={model:chosen,expires:Date.now()+45_000};
  return chosen;
 }
 async function fastestReadyProviderOrder(){
  if(Date.now()<autoProviderHealthCache.expires&&autoProviderHealthCache.order.length)return autoProviderHealthCache.order.slice();
  const providers=['gemini','groq','openrouter','cloudflare'];
  const rows=await Promise.all(providers.map(async provider=>{
   const key=await secret(providerKeyId(provider));
   if(!key)return {provider,ok:false,error:new Error('Free provider is not configured in Cloudflare Worker.')};
   try{
    const model=await fastestReadyModel(provider,key);
    return {provider,model,ok:true};
   }catch(error){return {provider,ok:false,error};}
  }));
  const ready=rows.filter(item=>item.ok).map(item=>item.provider);
  autoProviderHealthCache.expires=Date.now()+45_000;
  autoProviderHealthCache.order=ready;
  autoProviderHealthCache.errors=rows.filter(item=>!item.ok).map(item=>({provider:item.provider,message:String(item.error?.message||item.error)}));
  if(!ready.length)throw new Error('No Gemini, Groq, OpenRouter, or Cloudflare Workers AI provider is configured and available for specialist work.');
  message('ai','Configured specialist providers: '+rows.filter(item=>item.ok).map(item=>item.provider+' / '+item.model).join(' · ')+'. GPT-6 Luna remains the sole Tone Architect Chief.');
  return ready.slice();
 }
 async function testProvider(provider){
  setBusy(true);status('Testing '+providerNames[provider]+' API…','busy');
  try{
   const key=await secret(providerKeyId(provider));if(!key)throw new Error(provider==='chatgpt'?'ChatGPT account is not connected or plan-use permission is disabled. Sign in from Device settings.':providerNames[provider]+' is not configured in Cloudflare Worker.');
   const model=await fastestReadyModel(provider,key);
   await invokeProvider(provider,key,'Return exactly {"status":"ok"}.','Return exactly {"status":"ok"}.',model,90000,'testing provider',64);
const stateId=({chatgpt:'aiChatGPTKeyState',gpt:'aiOpenAiKeyState',gemini:'aiGeminiKeyState',groq:'aiGroqKeyState',openrouter:'aiOpenRouterKeyState'})[provider];
if($(stateId))$(stateId).textContent=provider==='chatgpt'?'Connected · ChatGPT plan test successful':'Configured in Cloudflare Worker · API test successful';
   status(providerNames[provider]+' API responded successfully.','success');
  }catch(error){status(niceError(error,provider),'error');}
  finally{setBusy(false);}
 }
async function invokeWorkersAILightTask(task,system,user,stage,maxOutputTokens=520,_legacyForceWorkersAI=false){
  // Existing NAM search and discussion call sites follow the selected primary/fallback route.
  return askNamAIJson(system,user,stage);
 }
 async function testWorkersAI(){
  setBusy(true);status('Testing Cloudflare Workers AI · Gemma 4…','busy');
  try{
   const providers=(await getCloudAiStatus(true))?.providers||{};
   if(!providers.cloudflare)throw new Error('Cloudflare Worker binding AI is not active. Check the [ai] binding in wrangler.toml and deploy the Worker.');
   const result=await invokeWorkerLightTask('cloudflare','provider-test','Return JSON only with a non-empty reply field. Use Indonesian.','Reply with one short sentence confirming Cloudflare Workers AI is responding.','testing Workers AI',64,WORKERS_AI_MODEL);
   const reply=String(result?.reply||result?.answer||result?.response||'').trim();
   if(!reply)throw new Error('Workers AI responded without a reply field.');
   const node=$('aiCloudflareBindingState');if(node)node.textContent='Binding AI active · test successful';
   status('Cloudflare Workers AI · '+(result.__aiModel||WORKERS_AI_MODEL)+' test successful. '+reply,'success');
  }catch(error){
   const node=$('aiCloudflareBindingState');if(node)node.textContent='Workers AI test failed';
   status('Cloudflare Workers AI test failed: '+(error.message||error),'error');
  }finally{setBusy(false);}
 }

 function compactSpecialistDeviceContext(role,blockIds,catalog,snapshot,candidatePlan){
  const ids=[...new Set((Array.isArray(blockIds)?blockIds:[]).map(value=>String(value||'').trim().toUpperCase()).filter(Boolean))].slice(0,4);
  const proposed=Array.isArray(candidatePlan?.blocks)?candidatePlan.blocks:[];
  return ids.map(id=>{
   const block=(catalog||[]).find(item=>String(item.id).toUpperCase()===id);
   if(!block)return null;
   const current=(snapshot||[]).find(item=>String(item.id).toUpperCase()===id);
   const proposedBlock=proposed.find(item=>String(item.id).toUpperCase()===id);
   const models=(block.models||[]);
   const chosenName=String(proposedBlock?.model||current?.model||'');
   const selected=['amp_cabinet_specialist','effects_specialist'].includes(role)
    ?models.slice(0,24).map(model=>({name:model.name,kind:model.kind||'',slot:model.slot??null}))
    :models.filter(model=>model.name===chosenName).slice(0,1).map(model=>({
      name:model.name,kind:model.kind||'',slot:model.slot??null,
      parameters:(model.parameters||[]).map(parameter=>parameter.kind==='discrete'
       ?{key:parameter.key,kind:'discrete',choices:(parameter.choices||[]).map(choice=>choice.value)}
       :{key:parameter.key,kind:'range',min:0,max:100})
     }));
   return {id,currentModel:block.currentModel,enabled:current?.enabled??null,currentParameters:current?.parameters||{},models:selected};
  }).filter(Boolean);
 }
 async function runToneSpecialistTask(args,context){
  const role=String(args?.role||'').trim();
  const roles={
   amp_cabinet_specialist:{
    maxTokens:360,
    output:'{"recommendations":[{"id":"AMP","model":"exact catalogue model","reason":"short rationale","confidence":0.0}],"cabinet_observations":[],"alternatives":[],"limitations":[]}',
    purpose:'Select the closest available MG-30 amplifier and cabinet/speaker/microphone choices from the supplied catalogue subset. Do not invent unavailable gear, cabinet controls or parameters. Distinguish original reference rig from the closest MG-30 emulation.'
   },
   effects_specialist:{
    maxTokens:360,
    output:'{"effects":[{"id":"MOD","model":"exact catalogue model","purpose":"why it is needed","parameter_guidance":[]}],"chain_observations":[],"unnecessary_effects":[],"confidence":0.0,"limitations":[]}',
    purpose:'Recommend only effects relevant to the reference, using exact block IDs and model names from the supplied MG-30 catalogue subset. Do not assume arbitrary block reordering; describe chain implications without claiming unsupported routing.'
   },
   guitar_input_specialist:{
    maxTokens:300,
    output:'{"guitar_assumptions":[],"pickup_and_position_guidance":[],"playing_technique":[],"input_compensation":[],"unknowns":[],"confidence":0.0}',
    purpose:'Assess how guitar type, pickups, pickup position, tuning, playing technique and input level affect the target. This role is conditional. Do not invent MG-30 input controls; mark unknown user-guitar details explicitly.'
   },
   tone_calibration_specialist:{
    maxTokens:380,
    output:'{"observations":[],"proposed_adjustments":[{"id":"AMP","model":"exact current or proposed catalogue model","parameters":{"exact_key":25},"reason":""}],"gain_staging":[],"frequency_balance":[],"dynamic_response":[],"confidence":0.0,"uncertainties":[]}',
    purpose:'Evaluate the whole proposed tone and identify gain staging, frequency balance, dynamics and level interactions. Any proposed parameter key/model must exactly match the supplied device context. Do not invent ranges, aliases or unsupported controls.'
   },
   tone_critic:{
    maxTokens:320,
    output:'{"review_required":false,"conflicts":[],"risks":[],"corrections":[],"confidence":0.0}',
    purpose:'Independently critique the supplied candidate plan and evidence. Identify material mismatches, contradictions, weak assumptions and device compatibility risks. Do not rewrite the plan or invent replacement parameters; give focused corrections for the Chief.'
   }
  };
  const spec=roles[role];if(!spec)throw new Error('Unsupported specialist role.');
  const candidateText=String(args?.candidatePlan||'').trim().slice(0,3000);
  let candidate=null;
  if(candidateText){try{candidate=JSON.parse(candidateText);}catch{if(role==='tone_critic')throw new Error('Tone Critic requires a valid candidate plan JSON.');}}
  if(role==='tone_critic'&&!candidate)throw new Error('Tone Critic requires a candidate plan.');
  const blockIds=Array.isArray(args?.blockIds)?args.blockIds:[];
  const deviceContext=compactSpecialistDeviceContext(role,blockIds,context.catalog,context.snapshot,candidate);
  if(['amp_cabinet_specialist','effects_specialist','tone_calibration_specialist','tone_critic'].includes(role)&&!deviceContext.length)
   throw new Error('This specialist needs one to four valid MG-30 block IDs from the current catalogue.');
  if(role==='guitar_input_specialist'&&blockIds.length&&!deviceContext.length)
   throw new Error('The supplied MG-30 block IDs are not present in the current catalogue.');
  const system='You are the '+role.replaceAll('_',' ')+' specialist for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' '+spec.purpose+' You are advisory only. ChatGPT is the orchestrator and final decision authority. Return compact JSON only using this shape: '+spec.output+' Keep the response within '+spec.maxTokens+' output tokens.';
  const user={
   current_request:String(context.prompt||'').slice(0,700),
   recent_context:compactNamConversation(context.conversation||'',900),
   focus:String(args?.focus||'').slice(0,140),
   specialist_brief:String(args?.brief||'').slice(0,600),
   device_context:deviceContext,
   candidate_plan:candidate
  };
  const requestText=JSON.stringify(user);
  const team=Array.isArray(context.providerTeam)?context.providerTeam:await resolveFreeProviderTeam();
  if(team.length<2)throw new Error('At least two distinct specialist providers must be configured for a new preset.');
  const successfulProviders=Array.isArray(context.successfulProviders)?context.successfulProviders:[];
  const cursor=context.providerCursor&&typeof context.providerCursor==='object'?context.providerCursor:{value:0};
  const start=((Number(cursor.value)||0)%team.length+team.length)%team.length;
  const providerOrder=[...team.slice(start),...team.slice(0,start)];
  const ordered=providerOrder.filter(member=>!successfulProviders.includes(member.provider)),failures=[];
  const expertNumber=successfulProviders.length+1;
  updateToneMission({chiefState:'delegating',stage:'Specialist '+expertNumber+' · '+role.replaceAll('_',' ')});
  for(let index=0;index<ordered.length;index++){
   const member=ordered[index];
   if(providerInCooldown(member.provider)){failures.push(member.provider+': temporary cooldown');updateToneMissionProvider(member.provider,'fallback',role,'Sedang cooldown; dilewati');continue;}
   try{
    updateToneMissionProvider(member.provider,'working',role,'Menjalankan tugas ahli '+expertNumber);
    status(providerNames[member.provider]+' is executing specialist '+expertNumber+' · '+role.replaceAll('_',' ')+'…','busy');
    const findings=await invokeWorkerLightTask(member.provider,'tone-specialist',system,requestText,'specialist '+role,spec.maxTokens,member.model,role);
    const result={ok:true,role,provider:member.provider,model:findings.__aiModel||member.model,result:findings};
    if(findings.__aiUsage)Object.defineProperty(result,'__aiUsage',{value:findings.__aiUsage,enumerable:false});
    Object.defineProperty(result,'__aiModel',{value:findings.__aiModel||member.model,enumerable:false});
    logAiTokenUsage(member.provider,result.__aiModel,'specialist '+role,spec.maxTokens,system,requestText,result);
    if(!successfulProviders.includes(member.provider))successfulProviders.push(member.provider);
    cursor.value=(team.indexOf(member)+1)%team.length;
    updateToneMissionProvider(member.provider,'completed',role,'Selesai · '+(result.__aiModel||member.model));
    updateToneMission({chiefState:'reviewing',stage:'Luna menilai hasil ahli '+expertNumber});
    return result;
   }catch(error){
    noteProviderFailure(member.provider,error);
    logAiTokenUsage(member.provider,member.model,'specialist '+role,spec.maxTokens,system,requestText,null,error);
    failures.push(member.provider+': '+String(error?.message||error).slice(0,220));
    updateToneMissionProvider(member.provider,'fallback',role,'Gagal; mencoba provider berikutnya');
    const next=ordered[index+1];
    if(next)status(providerNames[member.provider]+' gagal. Beralih ke '+providerNames[next.provider]+'…','busy');
   }
  }
  throw new Error('All unused specialist providers failed role '+role.replaceAll('_',' ')+'. '+failures.join(' | ').slice(0,900));
 }
 async function askNamAIJson(system,user,stage){
  const auto=mode==='auto'||mode==='collab'||(mode!=='chatgpt'&&ui.autoFallback.checked),missing=[];
  let order=[];
  if(mode==='auto'){
   order=providerFallbackOrder('chatgpt');
   if(!await secret('chatgpt'))missing.push('The connected ChatGPT account is unavailable.');
  }else if(mode==='collab'){
   try{order=await fastestReadyProviderOrder();}
   catch(error){missing.push(String(error.message||error));}
  }else order=auto?providerFallbackOrder(mode):[mode];
  if(auto&&mode!=='auto'&&mode!=='collab')order=providerFallbackOrder(mode);
  let lastError=null;
  for(let index=0;index<order.length;index++){
   const provider=order[index],key=await secret(providerKeyId(provider));
   if(providerInCooldown(provider)){missing.push(providerNames[provider]+' cooling down after a temporary limit');continue;}
   if(!key){if(provider===mode)throw new Error(providerNames[provider]+' API key has not been saved.');missing.push(providerNames[provider]+' Worker secret');continue;}
   const toneTask=activityMode==='tone'||/building|correcting|synthesizing|deriving TONE3000|choosing the closest NAM|selecting the closest A2/i.test(stage);
   const model=await fastestReadyModel(provider,key,provider==='chatgpt'&&toneTask?'tone-plan':'discussion');
   if(!model){if(provider===mode)throw new Error('Select a model for '+providerNames[provider]+' in AI Settings.');missing.push(providerNames[provider]+' model');continue;}
   try{
    status(providerNames[provider]+' is '+stage+'…','busy');
    const result=await invokeProvider(provider,key,system,user,model,90000,stage,outputTokenBudgetForStage(stage));
    if(provider!==mode&&providerNames[mode])message('ai','Automatic fallback used '+providerNames[provider]+' after '+providerNames[mode]+' was unavailable.');
    return result;
   }catch(error){
    lastError=error;noteProviderFailure(provider,error);
    const next=order.slice(index+1).find(candidate=>candidate!==provider&&!providerInCooldown(candidate));
    if(!auto)throw new Error(niceError(error,provider));
    if(mode==='auto'){autoProviderHealthCache.order=autoProviderHealthCache.order.filter(item=>item!==provider);autoProviderHealthCache.expires=Date.now()+45_000;}
    if(next){
     message('ai',providerNames[provider]+' failed ('+(error.message||error)+'). Switching to '+providerNames[next]+'.');
     status(providerNames[provider]+' unavailable. Trying '+providerNames[next]+'…','busy');
    }
   }
  }
  if(lastError)throw new Error('All configured fallback providers were unavailable. Last error: '+(lastError.message||lastError));
  throw new Error('No configured AI provider/model is available. Configure ChatGPT, Gemini, Groq, OpenRouter or the Cloudflare Workers AI binding. Missing: '+missing.join(', '));
 }
 async function deriveNamSearchQuery(prompt,conversation=''){
  const system='You select search terms for the TONE3000 NAM catalog. The CURRENT USER TONE REQUEST is authoritative. Use recent conversation only to resolve ambiguity; never reuse a previous artist or amp search query when the current request names a different artist or target. Return JSON only: {"query":"short search phrase","reason":"brief reason in the same language as the USER REQUEST"}. Extract 2–5 useful words focused on amplifier make/model or searchable amp family/style. For artist/song tone requests, infer a plausible amp family only when justified by the requested sound; do not claim an exact real-world rig. Do not use generic words like preset, guitar tone, live, or effects. Keep query under 60 characters.';
  const result=await invokeWorkersAILightTask('tone3000-search-terms',system,(conversation?'RECENT CONVERSATION:\n'+conversation+'\n\n':'')+'USER TONE REQUEST:\n'+prompt,'deriving TONE3000 search terms',180);
  const query=String(result?.query||'').trim().replace(/\s+/g,' ').slice(0,60);
  if(query.length<2)throw new Error('AI could not derive useful amplifier search terms. Add an amplifier name or a clearer tone description.');
  return {query,reason:String(result?.reason||'')};
 }
 async function chooseNamTone(prompt,searchQuery,tones,conversation=''){
  const candidates=sanitizeNamProfileCandidates(tones,12);
  const system='Choose the single best TONE3000 NAM tone pack for the current user request. The CURRENT USER REQUEST is authoritative; recent conversation may clarify preferences but must never override a newly named artist, amp or target. Return JSON only: {"toneId":"123","reason":"alasan singkat Bahasa Indonesia"}. Select only an ID present in CANDIDATES. Prefer a direct amplifier make/model or clearly relevant amp family. If none are meaningfully relevant return {"toneId":"","reason":"tidak ada profil yang cukup relevan"}. Never invent tone details not present in the candidate fields. Write the reason in Bahasa Indonesia, 1–2 short sentences, maximum 30 words total. Keep the reason concise and factual.';
  const recent=compactNamConversation(conversation);
  const user=(recent?'RECENT CONVERSATION (compact):\\n'+recent+'\\n\\n':'')+'USER REQUEST:\\n'+prompt+'\\nAI SEARCH QUERY:\\n'+searchQuery+'\\nCANDIDATES (minified JSON):\\n'+JSON.stringify(candidates)+'\\nReturn only the requested JSON.';
  const result=await invokeWorkersAILightTask('tone3000-profile-ranking',system,user,'choosing the closest NAM tone',320);
  const tone=tones.find(t=>String(t.id)===String(result?.toneId||''));
  if(!tone)throw new Error('No TONE3000 tone result was relevant enough for this request. Nothing was downloaded or written to the pedal.');
  return {tone,reason:conciseNamRecommendationReason(result.reason)};
 }
 async function chooseNamModel(prompt,tone,models,rejected=[],conversation=''){
  const eligible=models.filter(model=>!rejected.includes(String(model.id))&&Boolean(model.model_url));
  const candidates=sanitizeNamCaptureCandidates(eligible,rejected,18);
  if(!candidates.length)throw new Error('No remaining downloadable A2-Lite captures are available in the selected TONE3000 tone.');
  const toneProfile=sanitizeNamProfileCandidates([tone?.tone||tone],1)[0]||{id:String(tone?.id??'')};
  const selectedTone={id:toneProfile.id,name:toneProfile.name||'',creator:toneProfile.creator||'',tags:toneProfile.tags||[],description:toneProfile.description||'',gear:String(tone?.gear||'amp-cab')};
  const system='Choose the best downloadable A2-Lite NAM capture for this TONE3000 profile and the current user request. The CURRENT USER REQUEST is authoritative. Return JSON only: {"modelId":"123","reason":"alasan singkat Bahasa Indonesia"}. Select only an ID present in CANDIDATES. Downloadable eligibility has already been checked by the app; never invent IDs or capture details. Compare size/weight information and any supplied gain/cab notes. Do not infer boost/OD or cab details when the notes are silent. Let the user override the AI choice in the capture picker. Actual downloaded-file validation is authoritative. Write the reason in Bahasa Indonesia, 1–2 short sentences, maximum 30 words total.';
  const recent=compactNamConversation(conversation);
  const user=(recent?'RECENT CONVERSATION (compact):\\n'+recent+'\\n\\n':'')+'USER REQUEST:\\n'+prompt+'\\nSELECTED TONE (minified JSON):\\n'+JSON.stringify(selectedTone)+'\\nCANDIDATES (minified JSON):\\n'+JSON.stringify(candidates)+'\\nREJECTED MODEL IDS:\\n'+JSON.stringify(rejected)+'\\nReturn only the requested JSON.';
  const result=await invokeWorkersAILightTask('tone3000-capture-selection',system,user,'selecting the closest A2-Lite capture',320);
  const model=models.find(m=>String(m.id)===String(result?.modelId||'')&&m.model_url);
  if(!model||rejected.includes(String(model.id)))throw new Error('AI did not select a valid downloadable candidate from this TONE3000 result.');
  return {model,reason:conciseNamRecommendationReason(result.reason)};
 }
 function renderAiNamCapturePicker(pending,replaceCardId=''){
  pending.phase='captures';
  pending.cardId=replaceCardId||'nam-'+(++namCardSequence);
  const data={
   cardId:pending.cardId,tone:pending.tone,choices:pending.choices,
   selectedId:pending.selected?.model?.id,
   recommendedId:pending.aiSelectedModelId||pending.selected?.model?.id,
   reason:pending.selected?.reason||''
  };
  if(replaceCardId)updateChatCard(replaceCardId,'nam-captures',data);
  else chatCard('nam-captures',data);
 }
 async function loadNamCapturesForChat(toneId){
  const pending=pendingNamSelection,bridge=window.NUXTONE3000Bridge;
  if(!pending||!bridge?.loadTone)throw new Error('The NAM search session is no longer available. Search again.');
  const tone=pending.tones.find(item=>String(item.id)===String(toneId));
  if(!tone)throw new Error('The selected TONE3000 profile is no longer in the current result list.');
  setBusy(true);status('Loading A2 captures for '+tone.name+'…','busy');
  const loadingCardId='nam-loading-'+(++namCardSequence);
  chatCard('nam-captures-loading',{cardId:loadingCardId,tone:{name:tone.name,creator:tone.creator}});
  try{
   const snapshot=await bridge.loadTone(tone.id,{silent:true});
   const candidates=(snapshot?.models||[]).filter(model=>Boolean(model.model_url)&&/^(2|a2)$/.test(String(model.architecture_version??model.architecture??'2').trim().toLowerCase()));
   if(!candidates.length)throw new Error('This profile has no downloadable A2 NAM captures. Choose another profile.');
   let aiChoice=null;
   try{aiChoice=await chooseNamModel(pending.prompt||pending.query,tone,candidates,[],pending.conversation||'');}
   catch(error){message('ai','Capture recommendation was unavailable: '+(error.message||error)+'. All downloadable A2 captures remain available for manual selection.');}
   const selectedModel=aiChoice?.model||candidates[0];
   const choices=candidates.map(model=>({tone,model,snapshot,reason:String(model.id)===String(selectedModel.id)?String(aiChoice?.reason||'AI recommended'):'Available alternative capture',metadata:describeNamCaptureMetadata(tone,model,pending.gear),prepared:null}));
   const selected=choices.find(item=>String(item.model.id)===String(selectedModel.id))||choices[0];
   Object.assign(pending,{tone,snapshot,choices,selected,aiSelectedModelId:String(selected.model.id),phase:'captures'});
   renderAiNamCapturePicker(pending,loadingCardId);
   status('A2 captures are shown in the conversation. Choose one and press Import Selected Capture.','success');
  }catch(error){removeChatCard(loadingCardId);throw error;}
  finally{setBusy(false);}
 }
 async function prepareSelectedNamCapture(cardId){
  const pending=pendingNamSelection,bridge=window.NUXTONE3000Bridge;
  if(!pending||pending.phase!=='captures')throw new Error('Choose a TONE3000 profile and capture first.');
  const card=Array.from(ui.messages.querySelectorAll('[data-ai-nam-card]')).find(node=>node.dataset.aiNamCard===cardId);
  const radio=card?.querySelector('input[data-ai-nam-capture-radio]:checked');
  const selected=pending.choices.find(item=>String(item.model.id)===String(radio?.value||''));
  if(!selected)throw new Error('Select a downloadable A2 capture before importing.');
  if(!bridge?.prepareModel)throw new Error('The TONE3000 A2-Lite validator is unavailable.');
  namImportBusy=true;setBusy(true);status('Downloading and validating '+selected.model.name+' for MG-30 Gen 2…','busy');
  try{
   selected.prepared=await bridge.prepareModel(selected.model.id);
   pending.selected=selected;pending.phase='confirm';pending.confirmationCardId='nam-confirm-'+(++namCardSequence);
   chatCard('nam-confirm',{cardId:pending.confirmationCardId,selected,prepared:selected.prepared});
   status('A2-Lite validation passed. Confirm the transfer to NAM Slot 10 when ready.','success');
  }catch(error){
   message('ai','Capture validation failed: '+(error.message||error)+'. No device data has been changed. Choose another A2 capture.');
   status('NAM validation failed. Slot 10 was not changed.','error');
  }finally{namImportBusy=false;setBusy(false);}
 }
 async function confirmNamTransfer(cardId){
  const pending=pendingNamSelection,bridge=window.NUXTONE3000Bridge,editor=window.MG30AIToneBridge;
  if(!pending||pending.phase!=='confirm'||pending.confirmationCardId!==cardId||!pending.selected?.prepared)throw new Error('The pending NAM confirmation is no longer valid. Select and validate a capture again.');
  if(!editor?.isConnected?.())throw new Error('Connect the MG-30 via USB-MIDI before transferring the selected NAM to slot 10.');
  namImportBusy=true;setBusy(true);status('Reading NAM slot metadata and transferring to slot 10…','busy');
  let resumePrompt='';
  try{
   const result=await bridge.importModel(pending.selected.model.id,{slotNumber:10,confirmOverwrite:false,prepare:false});
   if(result?.cancelled)throw new Error('NAM transfer was canceled. Slot 10 was not changed.');
   if(!result?.success)throw new Error('The NAM transfer did not complete successfully.');
   const amp=editor?.getCatalog?.().find(block=>block.id==='AMP');
   const slotModel=amp?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10);
   if(!slotModel)throw new Error('Transfer returned success, but the NAM Slot 10 selection-only entry is not visible in the MG-30 catalogue.');
   activeNamModelName=slotModel.name;namModeActive=true;activeNamGear=pending.gear;updateNamControlState();
   activeNamContext='TONE3000 NAM capture "'+pending.selected.model.name+'" from tone "'+pending.tone.name+'" was validated and imported into MG-30 NAM slot 10 (previous slot label: "'+(result.currentName||'unknown')+'"). Use exact selection-only AMP model "'+activeNamModelName+'" with no parameters; never modify NAM internals. SOURCE METADATA (TONE3000, supporting evidence only): '+JSON.stringify(pending.selected.metadata)+'.';
   pending.imported=true;pending.phase='imported';pending.importResult=result;
   chatCard('nam-transfer',{success:true,modelName:pending.selected.model.name,message:'Transfer ACKs completed and the NAM Slot 10 selection-only entry is visible in the MG-30 catalogue. Previous slot label: '+(result.currentName||'unavailable')+'.'});
   status('NAM transferred to slot 10. The device completed transfer ACK/readback.','success');
   if(pending.purpose==='create')resumePrompt=pending.prompt;
   else{rememberConversation('assistant','The selected NAM capture is installed in slot 10. I can now create or refine a tone around this capture.');pendingNamSelection=null;}
  }catch(error){
   chatCard('nam-transfer',{success:false,modelName:pending.selected?.model?.name,message:(error.message||error)+' No transfer success is assumed.'});
   status('NAM transfer failed: '+(error.message||error),'error');
  }finally{namImportBusy=false;setBusy(false);}
  if(resumePrompt){ui.prompt.value=resumePrompt;$('aiToneCount').textContent=resumePrompt.length+'/1400';await submit();}
 }
 function cancelNamTransferConfirmation(cardId){
  if(!pendingNamSelection||pendingNamSelection.confirmationCardId!==cardId)return;
  pendingNamSelection.phase='captures';pendingNamSelection.confirmationCardId='';
  message('ai','Transfer canceled. Slot 10 was not changed. Choose another capture or import when ready.');
  status('Transfer canceled. No device data was written.','idle');
 }
 async function automaticNamImportForPrompt(prompt,conversation='',preparedPlan=null){
  const bridge=window.NUXTONE3000Bridge;
  namCaptureType=inferNamCaptureType(prompt,namCaptureType);
  if(namModeActive){activeNamGear=namCaptureType;updateNamControlState();}
  if(!activeNamGear)throw new Error('Choose Amp Only or Amp + Cab in the NAM settings before sending this tone request.');
  if(!bridge?.searchTones||!bridge?.loadTone||!bridge?.prepareModel||!bridge?.importModel)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update MG30 Studio.');
  if(!await bridge.hasSession())throw new Error('TONE3000 account is not authenticated. Open Device → TONE3000 Settings → Connect TONE3000 Account and finish sign-in.');
  if(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt&&pendingNamSelection.gear===activeNamGear){
   const completed=pendingNamSelection;pendingNamSelection=null;
   return {success:true,tone:completed.tone,model:completed.selected.model,slotModel:activeNamModelName,preparedPlan:completed.preparedPlan||null};
  }
  const searchTerms=normalizeNamSearchTerms(preparedPlan?.search_terms)||fallbackNamSearchTerms(prompt);
  if(searchTerms.length<2)throw new Error('The Tone Plan did not provide usable TONE3000 search_terms. Add an amplifier name or a clearer tone description.');
  status('Searching TONE3000 for a fresh NAM profile for this preset…','busy');
  const tones=await bridge.searchTones(searchTerms,{gear:activeNamGear});
  if(!tones.length){const meta=tones.searchMeta||{};throw new Error('TONE3000 catalog returned zero A2 NAM results for '+searchTerms+'. Queries tried: '+(meta.queriesTried||[]).join(' → ')+'. API total for last search: '+Number(meta.total||0)+'. No file was downloaded and no pedal data was changed.');}
  let recommendation=null;
  try{recommendation=await chooseNamTone(prompt,searchTerms,tones,conversation);}
  catch(error){message('ai','Profiles were found, but AI ranking was unavailable: '+(error.message||error)+'. Choose a matching profile manually.');}
  const rows=recommendation?[recommendation.tone,...tones.filter(t=>String(t.id)!==String(recommendation.tone.id))]:tones;
  renderNamSearchResults(rows,searchTerms,recommendation,'create',prompt,conversation,preparedPlan);
  message('ai','Choose a TONE3000 profile below. I will show its A2 capture variants before downloading or transferring anything.');
  status('Fresh NAM search complete. Choose a profile to inspect its A2 captures.','success');
  return {pendingSelection:true};
 }

  async function resolveFreeProviderTeam(){
  const order=await fastestReadyProviderOrder(),team=[];
  for(const provider of order){
   const key=await secret(providerKeyId(provider));
   if(!key)continue;
   try{const model=await fastestReadyModel(provider,key);if(model)team.push({provider,key,model});}
   catch(error){message('ai',providerNames[provider]+' model unavailable: '+(error.message||error));}
  }
  return team;
 }
 async function invokeFreeTeam(team,system,user,stage,preferredProvider='',maxOutputTokens=900){
  const ready=team.filter(item=>!providerInCooldown(item.provider));
  const preferred=ready.find(item=>item.provider===preferredProvider);
  const ordered=preferred?[preferred,...ready.filter(item=>item!==preferred)]:ready.slice();
  let lastError=null;
  for(let index=0;index<ordered.length;index++){
   const member=ordered[index];
   try{
    status(providerNames[member.provider]+' is '+stage+'…','busy');
    const result=await invokeProvider(member.provider,member.key,system,user,member.model,90000,stage,maxOutputTokens);
    return {result,member};
   }catch(error){
    lastError=error;noteProviderFailure(member.provider,error);
    const next=ordered.slice(index+1).find(item=>!providerInCooldown(item.provider));
    if(next)message('ai',providerNames[member.provider]+' failed ('+(error.message||error)+'). Trying '+providerNames[next.provider]+'.');
   }
  }
  throw new Error(lastError?.message||'No available Gemini, Groq or OpenRouter provider completed the explicit Multi-AI task.');
 }
 async function makePlan(prompt,bridge,audioMetrics=null,conversation=''){
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();
  if(!catalog?.length)throw new Error('The MG-30 catalog is unavailable.');
  const localRefinement=Boolean(toneSession.intent&&isLocalToneRefinement(prompt));
  const namPlanGuard=activeNamContext?'\n\nAUTHORITATIVE AMP SOURCE: TONE3000 NAM is installed in MG-30 slot 10. Do not invent or claim any built-in AMP model. The app selects the NAM Slot 10 selection-only entry. Never write NAM internals.':'';
  const deltaGuard=localRefinement?'\n\nDELTA PATCH MODE: This is a focused edit to the CURRENT tone. Return only changed blocks and only changed parameter keys. Keep each block on its current exact model unless the user explicitly asks to change that model. Do not regenerate the chain, resend unaffected parameters, change NAM/IR/MIDI/scene/volume/preset data, or touch unrelated blocks. Use the current snapshot and preserve all other state.':'';
  const system=systemPrompt(catalog,snapshot,false,resolveArtistToneGuidance(prompt,conversation))+namPlanGuard+deltaGuard;
  const singleSystem=system+'\n\n'+toneLeadInstruction(toneSession.intent);
  const singleUser=userText(prompt,null,activeNamContext,conversation)+(audioMetrics?'\n\nMEASURED USB AUDIO:\n'+formatToneAudioMetrics(audioMetrics):'');
  const credential=await secret('chatgpt');
  if(!credential)throw new Error('ChatGPT plan access is not connected. Connect your ChatGPT account; GPT-5.6 discussion and GPT-6 Luna preset creation both use this signed-in session.');
  const model=await fastestReadyModel('chatgpt',credential,'tone-plan');
  const requiresExperts=!localRefinement;
  let providerTeam=[];
  if(requiresExperts){try{providerTeam=await resolveFreeProviderTeam();}catch(error){for(const provider of Object.keys(toneProviderLabels))updateToneMissionProvider(provider,'unavailable','',String(error?.message||'Provider unavailable').slice(0,110));throw error;}}
  if(!requiresExperts){for(const provider of Object.keys(toneProviderLabels))updateToneMissionProvider(provider,'standby','','Tidak diperlukan untuk koreksi lokal');}
  for(const provider of Object.keys(toneProviderLabels)){const available=providerTeam.some(item=>item.provider===provider);if(requiresExperts)updateToneMissionProvider(provider,available?'ready':'unavailable','',available?'Model siap; menunggu giliran':'Belum dikonfigurasi atau tidak tersedia');}
  if(requiresExperts&&providerTeam.length<2)throw new Error('A new preset requires at least two configured external specialist providers. Gemini must be available first, plus at least one of Groq, OpenRouter, or Cloudflare Workers AI. No Tone Plan was generated and no pedal changes were sent.');
  const specialistDispatchContext={providerTeam,successfulProviders:[],providerCursor:{value:0}};
  const orchestrationInstructions=singleSystem+'\n\nGPT-6 LUNA TONE ARCHITECT CONTRACT: You are GPT-6 Luna, the sole Chief Tone Architect and final decision-maker for preset creation. FIRST do your own musical/reference research before delegating: infer the requested artist/song/era, sonic character, playing dynamics, likely rig context, evidence status, assumptions and uncertainties. Tone Researcher is YOUR responsibility and must NEVER be delegated. Do not invent sources, studio credits, exact rigs or citations; distinguish known, reported, inferred and unknown facts. Then, for every new preset, you MUST call at least TWO DIFFERENT technical specialist roles sequentially and receive successful results from TWO DIFFERENT external provider identities before final synthesis. Request exactly one specialist per turn, wait for its actual result, evaluate it, and only then request the next different role. For a typical artist lead preset, use Amp & Cabinet Specialist first and Effects Specialist second; reverse their order only when the request is primarily effects-focused. Guitar & Input Specialist is conditional on relevant guitar/pickup/input details; Tone Calibration Specialist is conditional on meaningful coupled gain/frequency/dynamic interactions; Tone Critic is conditional on material uncertainty, conflict or risk. Gemini is the first specialist provider. If Gemini fails, the same role task falls back sequentially to Groq, OpenRouter, and Cloudflare Workers AI. A second successful specialist MUST use a provider identity different from the first successful specialist; the app enforces this. Never run specialist generations in parallel, never delegate Tone Researcher, and never claim a failed provider completed a role. If fewer than two distinct specialist roles from two provider identities succeed, stop without a Tone Plan. You remain the only Chief and synthesize your own research plus the two specialist findings into the final MG-30 Tone Plan JSON. The exact MG-30 Gen 2 firmware 6.0.x catalogue and validator are authoritative; preserve NAM, IR, MIDI mappings and all unrelated device state.';
  let first=await orchestrateChatGptTonePlan({bridge:window.MG30ChatGPTBridge,model,input:[{role:'user',content:singleUser}],instructions:orchestrationInstructions,toolsEnabled:requiresExperts,requireFirstSpecialist:requiresExperts,maxSpecialistCalls:6,requireSuccessfulSpecialists:requiresExperts,minSuccessfulSpecialists:requiresExperts?2:0,minDistinctSpecialistProviders:requiresExperts?2:0,onEvent:event=>{if(event.type==='chief_research')updateToneMission({chiefState:'researching',stage:'GPT-6 Luna sedang melakukan riset awal'});else if(event.type==='specialist_requested')updateToneMission({chiefState:'delegating',stage:'Luna menugaskan ahli '+event.round+' · '+String(event.role||'').replaceAll('_',' ')});else if(event.type==='specialist_completed')updateToneMission({chiefState:'reviewing',stage:'Luna menilai hasil '+String(event.role||'').replaceAll('_',' ')});else if(event.type==='chief_synthesis')updateToneMission({chiefState:'synthesizing',stage:'GPT-6 Luna sedang menyatukan riset dan hasil dua ahli'});else if(event.type==='complete')updateToneMission({chiefState:'validating',stage:'Memeriksa parameter terhadap katalog MG-30 Gen 2'});},runSpecialist:args=>runToneSpecialistTask(args,{prompt,conversation,catalog,snapshot,model,...specialistDispatchContext})});
  let namSearchTerms=normalizeNamSearchTerms(first?.search_terms);
  if(Array.isArray(first.__aiUsageBreakdown)&&first.__aiUsageBreakdown.length){for(const callUsage of first.__aiUsageBreakdown){const callResult={};if(callUsage.usage)Object.defineProperty(callResult,'__aiUsage',{value:{input_tokens:Number(callUsage.usage.input_tokens??callUsage.usage.prompt_tokens??0),output_tokens:Number(callUsage.usage.output_tokens??callUsage.usage.completion_tokens??0),total_tokens:Number(callUsage.usage.total_tokens??((callUsage.usage.input_tokens??callUsage.usage.prompt_tokens??0)+(callUsage.usage.output_tokens??callUsage.usage.completion_tokens??0)))},enumerable:false});logAiTokenUsage('chatgpt',callUsage.model,callUsage.stage,outputTokenBudgetForStage('building your Tone Plan'),callUsage.instructions,callUsage.input,callResult);}}else logAiTokenUsage('chatgpt',first.__aiModel||model,'building your Tone Plan',outputTokenBudgetForStage('building your Tone Plan'),orchestrationInstructions,singleUser,first);
  if(Array.isArray(first.__specialistRoles)&&first.__specialistRoles.length){const assignments=first.__specialistRoles.map((role,index)=>role.replaceAll('_',' ')+(first.__successfulSpecialistProviders?.[index]?' · '+providerNames[first.__successfulSpecialistProviders[index]]:''));message('ai','GPT-6 Luna completed its own research, then reviewed specialists in sequence: '+assignments.join(' → ')+'.');}
  if(!localRefinement||!toneSession.intent){toneSession.intent=compactToneArchitectIntent(first,prompt);toneSession.sourcePrompt=prompt;}
  let validated;
  updateToneMission({chiefState:'validating',stage:'Memeriksa blok dan parameter terhadap katalog MG-30 Gen 2'});
  try{validated=validateAiTonePlan(first,catalog);}
  catch(validationError){
   correctionUsed=true;
   const ids=new Set((Array.isArray(first?.blocks)?first.blocks:[]).map(block=>String(block?.id||'').trim().toUpperCase()));
   const affectedCatalog=catalog.filter(block=>ids.has(block.id));
   const affectedSnapshot=snapshot.filter(block=>ids.has(block.id));
   const correctionSystem='You are a strict correction agent for the ORIGINAL NUX MG-30 Gen 2 firmware 6.0.x. Fix the catalog/parameter validation error. Return one complete valid Tone Plan JSON only. First compare every proposed parameter key with the exact model parameter list in the supplied catalogue. Copy only exact keys from that model; never assume synonyms such as mix, level, volume, intensity or echo are interchangeable. Do not invent alias mappings. If a requested control has no safe exact equivalent, omit that unsupported control and use only other clearly relevant available controls; if no safe change remains, stop safely rather than inventing a parameter. Preserve unaffected blocks, NAM, IR, MIDI mapping, signal-chain order, preset slot and all unrelated state. Do not add commentary.';
   const correctionUser=JSON.stringify({
    tone_intent:toneSession.intent||null,
    installed_nam:activeNamContext?String(activeNamContext).slice(0,320):null,
    validation_error:String(validationError.message||validationError).slice(0,350),
    previous_invalid_plan:first,
    valid_block_ids:catalog.map(block=>block.id),
    affected_catalog:compactToneContext(affectedCatalog,affectedSnapshot)
   });
   message('ai','The first proposal did not exactly match the MG-30 catalog. Requesting one focused correction for the affected blocks.');
   let corrected;
   corrected=await askNamAIJson(correctionSystem,correctionUser,'correcting the catalog validation');
   try{validated=validateAiTonePlan(corrected,catalog);first=corrected;namSearchTerms=normalizeNamSearchTerms(corrected?.search_terms)||namSearchTerms;}
   catch(secondError){throw new Error('AI could not produce a catalog-valid Tone Plan after one correction. No MIDI changes were sent. '+secondError.message);}
  }
  if(namModeActive&&!activeNamContext){
   try{
    const derivedSearch=await deriveNamSearchQuery(prompt,conversation);
    namSearchTerms=normalizeNamSearchTerms(derivedSearch.query)||namSearchTerms;
   }catch(error){
    namSearchTerms=namSearchTerms||fallbackNamSearchTerms(prompt);
    message('ai','AI TONE3000 search-term generation was unavailable; using the local safe search-term fallback. '+(error.message||error));
   }
  }
  if(namSearchTerms)Object.defineProperty(validated,'search_terms',{value:namSearchTerms,enumerable:false,configurable:false});
  return validated;
 }
 async function submit(){
  if(busy)return;
  const prompt=ui.prompt.value.trim();
  if(!prompt){status('Enter a tone request first.','error');return;}
  const conversation=conversationContextText();
  const contextualToneContinuation=isToneCreationFollowUp(prompt,conversation);
  const intent=classifyAssistantIntent(prompt,conversation);
  activityMode=intent==='consultation'?'discussion':(intent==='tone_create'||intent==='tone_refine')?'tone':'generic';
  toneMission=null;if(activityMode==='tone')beginToneMission(prompt,intent==='tone_create'||!isLocalToneRefinement(prompt));
  const resumePendingTone=Boolean(pendingToneApply&&/\b(lanjutkan|terapkan|apply|pasang|kirim|continue|resume)\b/i.test(prompt));
  const resumesImportedNamPlan=Boolean(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt);
  const keepToneSessionForContinuation=contextualToneContinuation&&Boolean(toneSession.sourcePrompt)&&conversation.includes(toneSession.sourcePrompt);
  if(intent==='tone_create'&&!resumesImportedNamPlan&&!keepToneSessionForContinuation&&!resumePendingTone){toneSession.intent=null;toneSession.architectProvider='';toneSession.sourcePrompt='';pendingToneApply=null;}
  rememberConversation('user',prompt);
  setBusy(true);message('user',prompt);
  let audioMetricsForRequest=lastAudioMetrics&&Date.now()-Number(lastAudioMetrics.measuredAt||0)<10*60*1000?lastAudioMetrics:null;
  try{
   if(audioCaptureActive){const captured=await finishAudioListening({askAi:false});if(captured)audioMetricsForRequest=captured;}
   if(intent==='nam_search'){await searchNamCatalogForPrompt(prompt,conversation);return;}
   if(intent==='audio_analyze'){
    if(!audioMetricsForRequest){
     setAudioPanelExpanded(true);
     const guidance='Saya perlu sampel USB Audio MG-30 terlebih dahulu agar analisis berdasarkan permainan gitar, bukan dugaan dari nama preset. Buka Audio Listening, pilih Analyze Once atau Live Listening, lalu kirim permintaan analisis lagi.';
     message('ai',guidance);rememberConversation('assistant',guidance);status('Capture MG-30 USB Audio before requesting an audio diagnosis.','idle');return;
    }
    await requestAudioDiagnosis(prompt,audioMetricsForRequest,conversation);return;
   }
   const bridge=window.MG30AIToneBridge;
   if(intent==='consultation'){await answerToneConversation(prompt,conversation,bridge);return;}
   if(!bridge)throw new Error('The MG-30 editor bridge is unavailable. Reload MG30 Studio.');
   let preparedPlan=resumePendingTone?validateAiTonePlan(pendingToneApply,bridge.getCatalog?.()||[]):null;
   if(resumePendingTone&&!bridge.isConnected?.()){
    const guidance='Tone Plan sudah siap dan tidak perlu dibuat ulang. Hubungkan MG-30 melalui USB-MIDI, lalu kirim “terapkan tone” atau “lanjutkan”.';
    message('ai',guidance);rememberConversation('assistant',guidance);status('Tone Plan ready; waiting for USB-MIDI connection.','idle');return;
   }
   if(!resumePendingTone&&shouldAutoImportNamForTone(intent,namModeActive,Boolean(activeNamContext))){
    const pendingMatchesThisRequest=Boolean(pendingNamSelection&&pendingNamSelection.prompt===prompt&&pendingNamSelection.gear===activeNamGear);
    const completedPending=Boolean(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt&&pendingNamSelection.gear===activeNamGear);
    if(intent==='tone_create'&&!pendingMatchesThisRequest){
     activeNamContext='';activeNamModelName='';
    }
    if(!completedPending){
     preparedPlan=pendingMatchesThisRequest&&pendingNamSelection?.purpose==='create'?pendingNamSelection.preparedPlan||null:null;
     if(!preparedPlan){
      const tone3000=window.NUXTONE3000Bridge;
      if(!activeNamGear)throw new Error('Choose Amp Only or Amp + Cab in the NAM settings before sending this tone request.');
      if(!tone3000?.searchTones||!tone3000?.loadTone||!tone3000?.prepareModel||!tone3000?.importModel)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update MG30 Studio.');
      if(!await tone3000.hasSession())throw new Error('TONE3000 account is not authenticated. Open Device → TONE3000 Settings → Connect TONE3000 Account and finish sign-in.');
      status('Building the Tone Plan and deriving TONE3000 search terms…','busy');
      preparedPlan=await makePlan(prompt,bridge,audioMetricsForRequest,conversation);
     }
    }
    status(intent==='tone_create'?'Finding a fresh TONE3000 NAM profile for this new preset…':'Finding a TONE3000 NAM profile because no compatible NAM is installed…','busy');
    const namResult=await automaticNamImportForPrompt(prompt,conversation,preparedPlan);
    if(namResult?.pendingConnection||namResult?.pendingSelection)return;
    if(namResult?.preparedPlan)preparedPlan=namResult.preparedPlan;
   }
   if(activityMode==='tone')updateToneMission({chiefState:'validating',stage:'Menyiapkan katalog MG-30 dan memanggil GPT-6 Luna'});
   status(intent==='tone_refine'?'GPT-6 Luna is preparing a focused correction…':'GPT-6 Luna is building your preset…','busy');
   const plan=preparedPlan||await makePlan(prompt,bridge,audioMetricsForRequest,conversation);
   if(activeNamContext){
    const amp=bridge.getCatalog?.().find(block=>block.id==='AMP');
    const installed=amp?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10&&model.name===activeNamModelName);
    if(!installed)throw new Error('The imported NAM is not visible as a verified AMP slot-10 model. No preset changes were sent. Re-read the pedal slot metadata and try again.');
    const currentAmp=bridge.getSnapshot?.().find(block=>block.id==='AMP');
    const existing=plan.blocks.findIndex(block=>block.id==='AMP');
    if(currentAmp?.model===installed.name&&currentAmp.enabled){if(existing>=0)plan.blocks.splice(existing,1);}
    else{const ampChange={id:'AMP',model:installed.name,enabled:true,parameters:{}};if(existing>=0)plan.blocks[existing]=ampChange;else plan.blocks.unshift(ampChange);}
    plan.summary=(plan.summary||'AI tone')+' using the imported NAM capture in slot 10.';
   }
   if(!bridge.isConnected?.()){
    pendingToneApply=plan;
    const summary=(plan.summary||'Tone Plan siap diterapkan.')+'\\nRencana blok: '+plan.blocks.map(block=>block.id+': '+block.model).join(', ');
    const guidance='Tone Plan berhasil disusun ChatGPT dan lolos validasi MG-30 Gen 2. Belum ada MIDI yang dikirim karena pedal belum tersambung.\\n\\n'+summary+'\\n\\nHubungkan MG-30 via USB-MIDI, lalu kirim “terapkan tone” atau “lanjutkan”. Rencana ini akan digunakan kembali tanpa memanggil AI lagi.';
    message('ai',guidance);rememberConversation('assistant',guidance);ui.prompt.value='';$('aiToneCount').textContent='0/1400';status('Tone Plan ready; waiting for USB-MIDI connection.','success');return;
   }
   updateToneMission({chiefState:'applying',stage:'Tone Plan valid · memperbarui editor dan mengirim MIDI'});
   status('Tone Plan validated. Updating the editor and sending MIDI…','busy');
   const result=await bridge.applyPlan(plan);
   pendingToneApply=null;
   last={before:result.before,after:result.after,blocks:result.blocks};ui.undo.disabled=false;
   const appliedSummary=activeNamContext
    ?'Tone updated using the installed TONE3000 NAM capture in slot 10.'
    :(plan.summary||'Tone updated by AI.');
   const appliedNotes=activeNamContext
    ?['The installed NAM capture remained the amp source; only validated non-NAM parameters were updated.']
    :plan.notes;
   const reply=appliedSummary+'\nParameters sent to: '+result.blocks.join(', ')+(appliedNotes.length?'\n'+appliedNotes.join(' · '):'');
   message('ai',reply);rememberConversation('assistant',reply);
   ui.prompt.value='';$('aiToneCount').textContent='0/1400';
   status(intent==='tone_refine'?'Tone refinement complete. Editor and MG-30 were updated through USB-MIDI.':'Done. Editor controls updated and MIDI commands sent. Play your guitar to audition the tone.','success');
   if(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt)pendingNamSelection=null;
  }catch(error){const detail=error?.message||String(error);message('ai','Failed: '+detail);status('Failed: '+detail,'error');}
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
 ui.audioModes.forEach(button=>button.addEventListener('click',()=>setAudioMode(button.dataset.aiAudioMode)));
 ui.audioToggle.addEventListener('click',()=>setAudioPanelExpanded(ui.audioPanel.hidden));
 ui.audioStart.addEventListener('click',()=>{void startAudioListening();});
 ui.audioRefresh.addEventListener('click',()=>{void refreshAudioDeviceStatus();});
 open.addEventListener('click',()=>sheet.classList.contains('on')?closePanel():openPanel());
 $('aiToneClose').addEventListener('click',closePanel);shade.addEventListener('click',closePanel);
 $('aiToneSettingsToggle').addEventListener('click',()=>setSettingsExpanded(!ui.settings.classList.contains('on')));
 sheet.querySelector('.ai-tone-body').addEventListener('click',event=>{if(ui.settings.classList.contains('on')&&!event.target.closest('#aiToneSettingsToggle'))setSettingsExpanded(false);});
 $('aiToneSaveKeys').addEventListener('click',saveKeys);
 $('aiToneRefreshModels').addEventListener('click',()=>{void refreshAllProviderModels(false);});
 ui.usageReset.addEventListener('click',()=>{aiUsage.requests=0;aiUsage.total=0;aiUsage.providers=Object.create(null);aiUsage.models=Object.create(null);aiUsage.tasks=Object.create(null);renderAiUsageMonitor();status('Local AI usage session counters reset. Provider quotas and API usage are unchanged.','success');});
$('aiToneTestChatGPT')?.addEventListener('click',()=>testProvider('chatgpt'));
$('aiToneTestOpenAi')?.addEventListener('click',()=>testProvider('gpt'));$('aiToneTestGemini')?.addEventListener('click',()=>testProvider('gemini'));
$('aiToneTestGroq')?.addEventListener('click',()=>testProvider('groq'));$('aiToneTestOpenRouter')?.addEventListener('click',()=>testProvider('openrouter'));$('aiToneTestCloudflare')?.addEventListener('click',()=>void testWorkersAI());
 // Provider keys are server-managed; no client-side delete buttons are rendered.
 
 ui.autoFallback.checked=localStorage.getItem('mg30-ai-auto-fallback')!=='0';
 ui.autoFallback.addEventListener('change',()=>localStorage.setItem('mg30-ai-auto-fallback',ui.autoFallback.checked?'1':'0'));
 ui.providerSelect.value=mode;ui.providerSelect.addEventListener('change',()=>setMode(ui.providerSelect.value));
 ui.activeModel.addEventListener('change',()=>{const provider=activeModelProvider();if(ui.activeModel.value==='__auto__'){localStorage.setItem('mg30-ai-model-manual-'+provider,'0');delete autoModelHealthCache[provider];}else if(ui.activeModel.value){localStorage.setItem(modelStorageKey(provider),ui.activeModel.value);localStorage.setItem('mg30-ai-model-manual-'+provider,'1');}autoProviderHealthCache.expires=0;});
 $('aiToneUndo').addEventListener('click',undo);
 const handleProviderSelection=()=>{const selected=ui.providerSelect.value;if(selected!==mode)setMode(selected);};
 ui.providerSelect.addEventListener('input',handleProviderSelection);
 ui.providerSelect.addEventListener('change',handleProviderSelection);
 $('aiToneSend').addEventListener('click',()=>{void submit().catch(error=>{const text=error?.message||String(error);message('ai','Failed: '+text);status('Failed: '+text,'error');setBusy(false);});});
 ui.prompt.addEventListener('input',()=>{$('aiToneCount').textContent=ui.prompt.value.length+'/1400';});
 ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('on')&&!busy)closePanel();});
 window.addEventListener('mg30-midi-connection-state',e=>{if(!e.detail?.connected)status('USB-MIDI disconnected. TONE3000 search can still run; connect MG-30 before slot-10 import or live preset send.','idle');else if(!busy)status('MG-30 connected via USB-MIDI.','success');});
 window.addEventListener('mg30-midi-connected',()=>{if(!busy)status('MG-30 connected. AI live editing is ready.','success');});
 window.addEventListener('mg30-chatgpt-session-changed',()=>{void refreshProviderModels('chatgpt',true).then(()=>{renderActiveModelSelect();void keyStates();});});
 setAudioMode('once');void refreshAudioDeviceStatus();setAudioPanelExpanded(false);updateNamControlState();await keyStates();if(window.MG30AIToneBridge?.isConnected?.())status('MG-30 connected via USB-MIDI.','success');
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const startAiToneStudio=()=>{void init().catch(error=>showAiRuntimeError('AI assistant startup',error));};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startAiToneStudio,{once:true});else startAiToneStudio();
}
