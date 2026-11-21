import { cloudApiRequest } from './cloud-api.js';
import { analyzeToneAudioSamples, formatToneAudioMetrics, selectUsbInputChannels } from './ai-audio-analysis.js';
import { createToneDspSession, processToneDspChunk, getToneDspLiveSummary, toAiToneDspPayload } from './ai-live-tone-dsp.js';

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

export function toneMissionArtworkMarkup(role='tone_architect',state='working'){
 const value=String(role||'tone_architect').toLowerCase();
 const kind=/amp|cabinet/.test(value)?'amp':/effect|pedal|modulation|delay|reverb/.test(value)?'pedal':/guitar|input|pickup/.test(value)?'guitar':/calibration|balance|meter|engineer/.test(value)?'meter':/critic|review/.test(value)?'critic':'chief';
 const safeState=['working','completed','standby','fallback','unavailable'].includes(String(state))?String(state):'standby';
 const labels={amp:'Amp and cabinet specialist',pedal:'Effects pedal specialist',guitar:'Guitar and input specialist',meter:'Tone calibration specialist',critic:'Tone critic',chief:'GPT-6 Luna tone architect'};
 const artwork={
  amp:'<rect class="mission-cabinet" x="18" y="11" width="124" height="88" rx="7"/><rect class="mission-panel" x="23" y="16" width="114" height="22" rx="3"/><rect class="mission-grille" x="24" y="41" width="112" height="53" rx="3"/><path class="mission-mesh" d="M29 45v45M35 45v45M41 45v45M47 45v45M53 45v45M59 45v45M65 45v45M71 45v45M77 45v45M83 45v45M89 45v45M95 45v45M101 45v45M107 45v45M113 45v45M119 45v45M125 45v45M29 51h102M29 58h102M29 65h102M29 72h102M29 79h102M29 86h102"/><circle class="mission-speaker-ring" cx="80" cy="68" r="23"/><circle class="mission-speaker" cx="80" cy="68" r="17"/><circle class="mission-speaker-cap" cx="80" cy="68" r="5"/><path class="mission-panel-line" d="M28 22h12M111 22h8"/><circle class="mission-amp-knob" cx="48" cy="27" r="4"/><circle class="mission-amp-knob" cx="61" cy="27" r="4"/><circle class="mission-amp-knob" cx="74" cy="27" r="4"/><circle class="mission-amp-knob" cx="87" cy="27" r="4"/><circle class="mission-amp-knob" cx="100" cy="27" r="4"/><circle class="mission-amp-light" cx="127" cy="27" r="2.5"/><path class="mission-amp-feet" d="M27 99v4M133 99v4"/>',
  pedal:'<rect class="mission-pedal-body" x="48" y="7" width="64" height="96" rx="11"/><rect class="mission-pedal-face" x="54" y="13" width="52" height="83" rx="7"/><circle class="mission-pedal-knob" cx="67" cy="27" r="5"/><circle class="mission-pedal-knob" cx="80" cy="27" r="5"/><circle class="mission-pedal-knob" cx="93" cy="27" r="5"/><circle class="mission-pedal-led" cx="98" cy="44" r="2.5"/><path class="mission-pedal-wave" d="M60 54l5-5 5 10 6-14 6 14 6-8 7 3"/><circle class="mission-pedal-switch" cx="80" cy="80" r="8"/><circle class="mission-pedal-switch-core" cx="80" cy="80" r="3"/>',
  guitar:'<path class="mission-guitar-neck" d="M77 9h9v50h-9z"/><path class="mission-guitar-head" d="M75 5h13v10H75z"/><path class="mission-guitar-body" d="M78 53c-15-14-32-7-34 9-2 10 3 18 13 20-3 11 4 18 15 13 9 8 20 4 22-6 12 1 19-8 16-19-3-13-17-23-32-17z"/><path class="mission-guitar-guard" d="M77 64c-6-6-14-1-12 6 1 5 6 8 12 6 4 6 11 4 12-2 1-5-4-9-12-10z"/><path class="mission-guitar-string" d="M78 9v77M80 9v77M82 9v77M84 9v77"/><path class="mission-guitar-fret" d="M75 20h13M75 27h13M75 34h13M75 41h13M75 48h13"/>',
  meter:'<rect class="mission-meter-shell" x="21" y="10" width="118" height="88" rx="8"/><rect class="mission-meter-screen" x="29" y="18" width="102" height="70" rx="4"/><path class="mission-meter-grid" d="M37 32h86M37 48h86M37 64h86M37 80h86"/><rect class="mission-meter-bar" x="43" y="58" width="10" height="22" rx="2"/><rect class="mission-meter-bar b2" x="61" y="43" width="10" height="37" rx="2"/><rect class="mission-meter-bar b3" x="79" y="27" width="10" height="53" rx="2"/><rect class="mission-meter-bar b4" x="97" y="49" width="10" height="31" rx="2"/>',
  critic:'<rect class="mission-critic-board" x="25" y="9" width="75" height="90" rx="6"/><path class="mission-critic-line" d="M38 30h48M38 46h48M38 62h32"/><path class="mission-critic-check" d="M32 29l3 3 6-7M32 45l3 3 6-7M32 61l3 3 6-7"/><circle class="mission-critic-lens" cx="106" cy="70" r="18"/><path class="mission-critic-handle" d="M119 83l12 12"/>',
  chief:'<rect class="mission-chief-node" x="14" y="38" width="32" height="30" rx="7"/><rect class="mission-chief-node" x="64" y="38" width="32" height="30" rx="7"/><rect class="mission-chief-node" x="114" y="38" width="32" height="30" rx="7"/><path class="mission-chief-line" d="M46 53h18M96 53h18M80 20v18M30 20h100"/><circle class="mission-chief-dot" cx="80" cy="20" r="5"/><path class="mission-chief-spark" d="M30 47l5 6-5 6M80 47l5 6-5 6M130 47l5 6-5 6"/>'
 };
 return '<svg class="ai-tone-mission-art ai-tone-art-'+kind+'" data-state="'+safeState+'" viewBox="0 0 160 112" role="img" aria-label="'+labels[kind]+'" xmlns="http://www.w3.org/2000/svg"><title>'+labels[kind]+'</title><ellipse class="mission-shadow" cx="80" cy="106" rx="59" ry="3.5"/><g class="mission-object">'+artwork[kind]+'</g></svg>';
}

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
 return {summary:String(plan.summary||'Tone updated by AI.').slice(0,420),blocks,notes:Array.isArray(plan.notes)?plan.notes.map(x=>String(x).slice(0,180)).slice(0,5):[],completePresetState:plan.completePresetState===true};
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
export async function orchestrateChatGptTonePlan({bridge,model,input,instructions,runSpecialist,toolsEnabled=true,maxOutputTokens=1350,maxSpecialistCalls=6,requireFirstSpecialist=false,requireSuccessfulSpecialists=false,minSuccessfulSpecialists=0,minDistinctSpecialistProviders=0,onEvent=null}){
 if(!bridge?.sendResponse)throw new Error('ChatGPT native SIWC connection is unavailable.');
 const initialInput=Array.isArray(input)?input.slice():[];
 const tools=toolsEnabled?[toneSpecialistToolDefinition()]:undefined;
 const minSpecialists=Math.max(0,Math.min(6,Math.floor(Number(minSuccessfulSpecialists)||0)));
 const minProviders=Math.max(0,Math.min(minSpecialists,Math.floor(Number(minDistinctSpecialistProviders)||0)));
 const emit=event=>{if(typeof onEvent==='function'){try{onEvent(event);}catch{}}};
 const usageBreakdown=[],specialistRoles=[],successfulSpecialistRoles=[],successfulSpecialistProviders=[];
 emit({type:'chief_research',stage:'GPT-6 Luna is researching the requested tone.'});
 let response=await bridge.sendResponse({model,input:initialInput,instructions,maxOutputTokens,parallelToolCalls:false,...(tools?{tools}:{})});
 let nextInput=initialInput.slice(),round=0;
 while(true){
  const calls=Array.isArray(response?.toolCalls)?response.toolCalls:(Array.isArray(response?.outputItems)?response.outputItems.filter(item=>item?.type==='function_call'):[]);
  const hasCalls=calls.length>0;
  usageBreakdown.push({stage:hasCalls?'GPT-6 Luna · Sequential specialist routing '+(round+1):'GPT-6 Luna · Final synthesis',model:response?.model||model,usage:response?.usage||null,instructions:String(instructions||''),input:JSON.stringify(nextInput||[])});
  if(!hasCalls){
   if(round===0&&requireFirstSpecialist)throw new Error('GPT-6 Luna did not delegate a required specialist task. No Tone Plan was generated and no device changes were sent.');
   if(successfulSpecialistRoles.length<minSpecialists)throw new Error('GPT-6 Luna completed only '+successfulSpecialistRoles.length+' of '+minSpecialists+' required specialist tasks. No Tone Plan was generated and no pedal changes were sent.');
   if(successfulSpecialistProviders.length<minProviders)throw new Error('Only '+successfulSpecialistProviders.length+' distinct specialist provider(s) succeeded; '+minProviders+' are required. No Tone Plan was generated and no pedal changes were sent.');
   emit({type:'chief_synthesis',stage:'GPT-6 Luna is reviewing specialist findings and synthesizing the Tone Plan.'});
   break;
  }
  if(!toolsEnabled||calls.length!==1)throw new Error('The GPT-6 Luna orchestrator must request exactly one specialist per turn. Parallel or disabled tool calls are rejected. No device changes were sent.');
  if(round>=Math.max(1,Math.min(6,Number(maxSpecialistCalls)||6)))throw new Error('The GPT-6 Luna orchestrator exceeded the six-specialist sequential task budget. No device changes were sent.');
  const call=calls[0];
  if(call?.name!=='delegate_tone_specialist'||!call.call_id)throw new Error('GPT-6 Luna requested an unsupported MG-30 specialist tool. No device changes were sent.');
  let args;try{args=JSON.parse(String(call.arguments||''));}catch{throw new Error('GPT-6 Luna returned invalid specialist task arguments. No device changes were sent.');}
  const role=String(args?.role||'');
  if(!TONE_SPECIALIST_ROLES.includes(role))throw new Error('GPT-6 Luna selected an unsupported MG-30 specialist role. No device changes were sent.');
  if(specialistRoles.includes(role))throw new Error('GPT-6 Luna repeated specialist role '+role+' without a distinct approved re-check. No device changes were sent.');
  if(!Array.isArray(args.blockIds)||args.blockIds.length>4||typeof args.focus!=='string'||typeof args.brief!=='string'||typeof args.candidatePlan!=='string')throw new Error('GPT-6 Luna returned an incomplete specialist task contract. No device changes were sent.');
  specialistRoles.push(role);emit({type:'specialist_requested',role,round:round+1,stage:'GPT-6 Luna assigned '+role.replaceAll('_',' ')});
  let specialistResult;
  try{specialistResult=await runSpecialist(args);if(!specialistResult||typeof specialistResult!=='object')throw new Error('Specialist returned no structured result.');if(requireSuccessfulSpecialists&&specialistResult.ok===false)throw new Error(String(specialistResult.error||'Specialist did not complete successfully.'));}
  catch(error){specialistResult={ok:false,role,error:String(error?.message||error).slice(0,300),fallback:'All configured providers were tried for this same role task. Never claim that this specialist completed successfully.'};if(requireSuccessfulSpecialists)throw new Error('Tone Architect specialist '+role.replaceAll('_',' ')+' failed across all configured provider fallbacks. No Tone Plan was generated and no pedal changes were sent. '+specialistResult.error);}
  if(specialistResult?.ok!==false){successfulSpecialistRoles.push(role);const provider=String(specialistResult.provider||'').trim();if(provider&&!successfulSpecialistProviders.includes(provider))successfulSpecialistProviders.push(provider);emit({type:'specialist_completed',role,provider,round:round+1,stage:role.replaceAll('_',' ')+' completed by '+(provider||'configured provider')});}
  else emit({type:'specialist_failed',role,round:round+1,stage:role.replaceAll('_',' ')+' failed'});
  const returnedItems=Array.isArray(response.outputItems)?response.outputItems.slice():[{type:'function_call',call_id:call.call_id,name:call.name,arguments:String(call.arguments||'{}')}];
  if(!returnedItems.some(item=>item?.type==='function_call'&&item?.call_id===call.call_id))returnedItems.push({type:'function_call',call_id:call.call_id,name:call.name,arguments:String(call.arguments||'{}')});
  nextInput.push(...returnedItems);nextInput.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(specialistResult).slice(0,12000)});round++;
  const quotaPending=successfulSpecialistRoles.length<minSpecialists||successfulSpecialistProviders.length<minProviders;
  const nextInstruction=quotaPending?'\n\nMANDATORY SPECIALIST QUOTA: Complete at least '+minSpecialists+' successful specialist roles using '+minProviders+' distinct external providers. Current successes: '+successfulSpecialistRoles.length+' roles and '+successfulSpecialistProviders.length+' providers. You MUST request exactly one different technical specialist role now; do not return the final Tone Plan until both minimums are met. Ensure the next specialist uses a provider identity not already successful. Luna performs the Tone Researcher responsibility herself; never delegate Tone Researcher.':'\n\nSEQUENTIAL SPECIALIST HANDOFF: Evaluate the latest result before any next action. The mandatory specialist/provider quota is met. You may now synthesize, or request another different specialist only when it materially improves confidence or addresses a real uncertainty. Never run specialists in parallel or let specialists communicate directly. Luna owns all initial musical/reference research; never delegate Tone Researcher. Tone Critic and Guitar & Input Specialist are conditional. Return the final MG-30 Tone Plan JSON only when your quality gate is satisfied. You remain the sole Chief and final decision authority.';
  response=await bridge.sendResponse({model,input:nextInput.slice(),instructions:String(instructions||'')+nextInstruction,maxOutputTokens,parallelToolCalls:false,...(tools?{tools}:{})});
 }
 if(requireFirstSpecialist&&!successfulSpecialistRoles.length)throw new Error('No required GPT-6 Luna specialist completed successfully. No Tone Plan was generated and no device changes were sent.');
 if(successfulSpecialistRoles.length<minSpecialists)throw new Error('The minimum of '+minSpecialists+' successful specialist tasks was not met. No Tone Plan was generated and no device changes were sent.');
 if(successfulSpecialistProviders.length<minProviders)throw new Error('The minimum of '+minProviders+' distinct specialist providers was not met. No Tone Plan was generated and no device changes were sent.');
 const plan=parseJson(response?.text||'');
 const usageRows=usageBreakdown.filter(row=>row.usage);
 if(usageRows.length){const usage={input_tokens:0,output_tokens:0,total_tokens:0};for(const row of usageRows){usage.input_tokens+=Number(row.usage.input_tokens??row.usage.prompt_tokens??0);usage.output_tokens+=Number(row.usage.output_tokens??row.usage.completion_tokens??0);usage.total_tokens+=Number(row.usage.total_tokens??((row.usage.input_tokens??row.usage.prompt_tokens??0)+(row.usage.output_tokens??row.usage.completion_tokens??0)));}Object.defineProperty(plan,'__aiUsage',{value:usage,enumerable:false});}
 Object.defineProperty(plan,'__aiModel',{value:response?.model||model,enumerable:false});Object.defineProperty(plan,'__aiUsageBreakdown',{value:usageBreakdown,enumerable:false});Object.defineProperty(plan,'__orchestratorCalls',{value:usageBreakdown.length,enumerable:false});Object.defineProperty(plan,'__specialistRoles',{value:specialistRoles.slice(),enumerable:false});Object.defineProperty(plan,'__successfulSpecialistRoles',{value:successfulSpecialistRoles.slice(),enumerable:false});Object.defineProperty(plan,'__successfulSpecialistProviders',{value:successfulSpecialistProviders.slice(),enumerable:false});
 if(specialistRoles.length)Object.defineProperty(plan,'__specialistRole',{value:specialistRoles[0],enumerable:false});emit({type:'complete',stage:'GPT-6 Luna completed and validated the specialist handoffs.'});return plan;
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
export function resolveArtistToneGuidance(prompt,conversation=''){
 const current=String(prompt||'');
 const currentGuidance=artistToneGuidance(current);
 const currentNamesTarget=/\b(john\s*mayer|john\s*petrucci|petrucci|satriani|dream\s*theater|jazz|blues|metal|country|funk|ambient|progressive rock)\b/i.test(current)
  ||/\b(?:tone|preset|patch|sound|suara)\s+(?!ini\b|itu\b|tadi\b|tersebut\b|sekarang\b|baru\b|it\b|that\b|this\b|now\b)[\p{L}\d-]+(?:\s+[\p{L}\d-]+)?/iu.test(current);
 if(currentNamesTarget||!isToneCreationFollowUp(current,conversation))return currentGuidance;
 return artistToneGuidance(conversation)||currentGuidance;
}
export function responseLanguageInstruction(){
 return 'LANGUAGE POLICY: Use Bahasa Indonesia by default for all natural-language responses. If the latest USER REQUEST is clearly written in English or another language, respond in the same language as the USER REQUEST. If the message is mixed or the language is unclear, use Bahasa Indonesia. This applies to summaries, explanations, diagnosis, recommendations, questions and follow-up conversation. Keep JSON keys, technical identifiers, exact device model names and UI labels unchanged.';
}
export function findDefaultGeminiModel(models){
 const rows=Array.isArray(models)?models:[];
 const match=rows.find(row=>/gemini[\s_-]*3[.]1[\s_-]*flash[\s_-]*lite/i.test(String(row?.id||'')+' '+String(row?.name||'')));
 return match?String(match.id||''):'';
}
export function inferNamCaptureType(prompt,fallback='amp-cab'){
 const value=String(prompt||'').toLowerCase();
 if(/\b(amp\s*only|head\s*only|without\s+(a\s+)?cab(?:inet)?|no\s+cab(?:inet)?|amp\s+saja|tanpa\s+cab(?:inet)?|head\s+only)\b/i.test(value))return 'amp';
 if(/\b(amp\s*(?:\+|and|plus)\s*cab(?:inet)?|head\s*(?:\+|and|plus)\s*cab(?:inet)?|with\s+(a\s+)?cab(?:inet)?|amp\s*\+\s*cab|amp\s+cabinet|head\s*\+\s*cab)\b/i.test(value))return 'amp-cab';
 return fallback==='amp'?'amp':'amp-cab';
}
export function shouldAutoImportNamForTone(intent,namModeEnabled,hasInstalledNamContext){
 if(!namModeEnabled)return false;
 if(intent==='tone_create')return true;
 return intent==='tone_refine'&&!hasInstalledNamContext;
}
export function estimateTokenCount(text){return Math.max(1,Math.ceil(String(text||'').length/4));}
function compactNamText(value,maxLength=100){
 if(value===null||value===undefined)return '';
 if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value).trim().slice(0,maxLength);
 if(Array.isArray(value))return value.map(item=>compactNamText(item,40)).filter(Boolean).join(', ').slice(0,maxLength);
 if(typeof value==='object')return compactNamText(value.name??value.label??value.title??value.value??'',maxLength);
 return '';
}
export function sanitizeNamProfileCandidates(tones,limit=12){
 return (Array.isArray(tones)?tones:[]).slice(0,Math.max(0,limit)).map(tone=>{
  const item={id:String(tone?.id??tone?.tone_id??'')};
  const name=compactNamText(tone?.title??tone?.name??tone?.tone_name,100);
  const creator=compactNamText(tone?.creator??tone?.username,60);
  const tags=(Array.isArray(tone?.tags)?tone.tags:[]).map(tag=>compactNamText(tag,32)).filter(Boolean).slice(0,8);
  const description=compactNamText(tone?.description,100);
  if(name)item.name=name;
  if(creator)item.creator=creator;
  if(tags.length)item.tags=tags;
  if(description)item.description=description;
  return item;
 }).filter(item=>item.id);
}
export function sanitizeNamCaptureCandidates(models,rejected=[],limit=18){
 const blocked=new Set((Array.isArray(rejected)?rejected:[]).map(id=>String(id)));
 return (Array.isArray(models)?models:[]).filter(model=>!blocked.has(String(model?.id??''))).slice(0,Math.max(0,limit)).map(model=>{
  const item={id:String(model?.id??model?.model_id??'')};
  const name=compactNamText(model?.name,90);
  const rawSize=model?.weights??model?.weight_count??model?.weightCount??model?.size;
  const size=Array.isArray(rawSize)?rawSize.length:(rawSize&&typeof rawSize==='object'?(rawSize.count??rawSize.length??rawSize.weights??''):rawSize);
  const notes=[model?.notes,model?.capture_notes,model?.gain_character,model?.gain,model?.cab_character,model?.cabinet_character,model?.cab,model?.cabinet,model?.description]
   .map(value=>compactNamText(value,60)).filter(Boolean);
  if(name)item.name=name;
  if(size!==null&&size!==undefined&&size!=='')item.size=typeof size==='number'?size:compactNamText(size,40);
  if(notes.length)item.notes=[...new Set(notes)].join('; ').slice(0,120);
  return item;
 }).filter(item=>item.id);
}
export function normalizeNamSearchTerms(value){
 const raw=Array.isArray(value)?value.join(' '):String(value||'');
 return raw.replace(/[\r\n]+/g,' ').replace(/[^\p{L}\p{N} .+_-]/gu,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).slice(0,5).join(' ').slice(0,60);
}
export function conciseNamRecommendationReason(value){
 const source=String(value||'').replace(/\s+/g,' ').trim();
 if(!source)return '';
 const sentences=(source.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[source]).slice(0,2).join(' ').trim();
 return sentences.split(/\s+/).filter(Boolean).slice(0,30).join(' ').replace(/\s+([,.;!?])/g,'$1');
}
function fallbackNamSearchTerms(prompt){
 const stop=new Set(['buat','buatkan','bikin','tolong','please','create','build','make','generate','design','guitar','gitar','tone','suara','sound','preset','profile','profil','amp','amplifier','yang','untuk','dengan','the','and','for','a','an','me','my']);
 const words=String(prompt||'').replace(/[^\p{L}\p{N} .+_-]/gu,' ').split(/\s+/).filter(word=>word&&!stop.has(word.toLowerCase()));
 return (words.length?words:String(prompt||'').split(/\s+/)).slice(0,5).join(' ').slice(0,60);
}

export function outputTokenBudgetForStage(stage){const v=String(stage||'').toLowerCase();if(v.includes('testing '))return 64;if(v.includes('deriving tone3000 search terms'))return 180;if(v.includes('choosing the closest nam tone')||v.includes('selecting the closest a2-lite capture'))return 320;if(v.includes('defining the musical direction'))return 260;if(v.includes('analyzing the captured mg-30 usb audio')||v.includes('answering your tone question'))return 520;if(v.includes('correcting the catalog validation')||v.includes('checking a material conflict'))return 850;if(v.includes('building your tone plan')||v.includes('synthesizing the final tone plan'))return 1350;return 700;}
export function isComplexToneRequest(prompt){const v=String(prompt||'').toLowerCase();if(v.length>=240)return true;return /\b(dual[- ]amp|two amps|multi[- ]scene|multiple scenes|multi[- ]layer|layered tone|clean (?:and|\+) lead|rhythm and lead|verse and chorus|intro.*solo|switch(?:ing)? between|three different tones|blend(?:ed|ing)? (?:two|multiple)|hybrid rig|full arrangement|complex signal chain|studio production|detailed signal chain)\b/i.test(v);}

export function selectChatGptAutoModel(models,task='discussion'){
 const rows=(Array.isArray(models)?models:[]).filter(row=>row?.id);
 if(!rows.length)return '';
 const normalized=row=>String(row.id+' '+(row.name||'')).toLowerCase().replace(/[_ ]+/g,'-');
 const find=pattern=>rows.find(row=>pattern.test(normalized(row)))?.id||'';
 if(task==='tone-plan')return find(/gpt-6-luna/)||'';
 return find(/gpt-5[.-]6-luna/)||'';
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
export function compactNamConversation(value,maxLength=600){
 const source=String(value||'').replace(/\s+/g,' ').trim();
 return source.length>maxLength?'…'+source.slice(-maxLength):source;
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
 const question=/\b(apa|apakah|kenapa|mengapa|bagaimana|gimana|jelaskan|bedanya|perbedaan|what|why|how|explain|difference|does|do you|can you explain|should i|menurutmu)\b/i.test(value)||/[?？]$/.test(value);
 const reviewQuestion=question&&(
  /\b(apakah|apa|menurutmu|menurut anda|what|anything|any|should i|do you think)\b[\s\S]{0,100}\b(ada|perlu|bisa|could|should|need|needs|to)\b[\s\S]{0,70}\b(diperbaiki|improv(?:e|ed|ement)|fix(?:ed)?|adjust(?:ed)?|tweak(?:ed)?|diubah|ditingkatkan|kurang|better)\b/i.test(value)||
  /\b(apa yang kurang|apa kekurangannya|ada yang kurang|anything to improve|anything to fix|what could be improved|what needs improvement)\b/i.test(value)
 );
 if(analysis&&audioTopic&&!change)return 'audio_analyze';
 if(reviewQuestion)return 'consultation';
 if(change)return 'tone_refine'; if(isToneCreationFollowUp(prompt,conversation))return 'tone_create';
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
export function shouldRetryNoNamSpecialistError(error,namModeEnabled,provider){
 if(namModeEnabled!==false||!['gemini','openrouter'].includes(String(provider||'')))return false;
 const status=Number(error?.upstreamStatus||error?.status||0);
 if([500,502,503,504].includes(status))return true;
 return /provider did not return a json tone plan|returned no structured json result|does not contain a json tone plan|unexpected end of json input|invalid json response/i.test(String(error?.message||error||''));
}
export function toneSnapshotFingerprint(snapshot){
 const rows=Array.isArray(snapshot)?snapshot:[];
 return JSON.stringify(rows.map(block=>({
  id:String(block?.id||'').trim().toUpperCase(),
  model:String(block?.model||''),
  enabled:Boolean(block?.enabled),
  parameters:Object.fromEntries(Object.entries(block?.parameters||{}).sort(([a],[b])=>a.localeCompare(b)))
 })));
}
export function toneProposalApprovalCommand(prompt){
 const value=String(prompt||'').toLowerCase().replace(/\s+/g,' ').trim().replace(/[.!。]+$/,'');
 return /^(?:(?:setuju|approve|approved)(?:\s+(?:terapkan|apply|laksanakan|kirim))?|(?:terapkan|apply|laksanakan|kirim)(?:\s+(?:perubahan|proposal|rekomendasi|tweak)(?:\s+(?:itu|ini|tadi))?|\s+(?:itu|ini|tadi))?|(?:apply|accept)\s+(?:changes|proposal|tweak)|lanjutkan(?:\s+(?:perubahan|proposal))?)$/.test(value);
}
export function toneProposalCancelCommand(prompt){
 return /^(?:batal|batalkan|jangan dulu|jangan diterapkan|cancel|discard|tolak proposal)[.!。]*$/i.test(String(prompt||'').trim());
}

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
 'HARDWARE WHITELIST: The complete APP CATALOG below is the only source of valid block IDs, model names and writable parameter IDs. Copy every identifier exactly. Artist rigs, commercial amplifier names and external gear are musical references only, never MG-30 model names unless the exact name appears in this catalogue. If a requested sound has no exact or close catalogue option, select the closest exact listed model or explain the limitation; never fabricate a model.',
 'PARAMETER WHITELIST: Every parameter key must exist under the exact chosen model in APP CATALOG. Do not copy a key from another model in the same block. Do not infer an alias, dropdown choice, CC, block ID or value. If unsure, omit the change and explain it in notes.',
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
function userText(prompt,candidate,namContext,conversation=''){const recent=compactNamConversation(conversation,1200);return (recent?'RECENT RELEVANT CONVERSATION (compact):\n'+recent+'\n\n':'')+'USER REQUEST:\n'+prompt+(namContext?'\n\nINSTALLED NAM CONTEXT:\n'+namContext:'')+(candidate?'\n\nGPT PROPOSAL TO REVIEW:\n'+JSON.stringify(candidate):'')+'\n\nReturn final JSON only.';}
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
 return 'GPT-6 LUNA · TONE ARCHITECT CHIEF: You are GPT-6 Luna, the sole researcher, orchestrator, preset engineer and final decision-maker. '+state+' Do the musical/reference research yourself before consulting external technical specialists. Do not hand the Tone Researcher responsibility to another provider. Then consult at least two distinct technical specialists sequentially, on two different provider identities, before creating a new preset. Evaluate their findings, reconcile disagreement and synthesize one catalogue-valid MG-30 Gen 2 firmware 6.0.x Tone Plan. Never invent model names or parameter keys. Preserve unaffected blocks, NAM, IR mappings, MIDI mappings, signal-chain order and unrelated device state. Set review_required=true only for material conflicts, low confidence, uncertain mapping or coupled changes; include a short review_reason and confidence (0..1). Return the normal Tone Plan JSON only.';
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
  
  audioStyle.textContent += '.ai-tone-mission-visual{display:flex;align-items:center;justify-content:center;flex:0 0 76px;width:76px;height:56px;margin:0 2px 0 0;border:1px solid rgba(157,205,91,.24);border-radius:12px;background:linear-gradient(145deg,#172519,#0e1710);box-shadow:inset 0 1px 0 #ffffff0b,0 3px 12px #0003}.ai-tone-mission-art{display:block;width:72px;height:52px;overflow:visible;color:#c5f36b}.ai-tone-mission-art .mission-shell,.ai-tone-mission-art .mission-meter{fill:#172319;stroke:#789b55;stroke-width:1.5}.ai-tone-mission-art .mission-face{fill:#0d150f;stroke:#435b37;stroke-width:1}.ai-tone-mission-art .mission-grille,.ai-tone-mission-art .mission-grid{fill:none;stroke:#4f6743;stroke-width:1.1;opacity:.75}.ai-tone-mission-art .mission-cone{fill:#263d29;stroke:#a8d46b;stroke-width:2}.ai-tone-mission-art .mission-center,.ai-tone-mission-art .mission-footswitch{fill:#111b13;stroke:#c5f36b;stroke-width:1.6}.ai-tone-mission-art .mission-light{fill:#c5f36b;filter:drop-shadow(0 0 3px #c5f36b)}.ai-tone-mission-art .mission-knob{fill:#263b28;stroke:#b6d78b;stroke-width:1.4}.ai-tone-mission-art .mission-wave,.ai-tone-mission-art .mission-string,.ai-tone-mission-art .mission-fret,.ai-tone-mission-art .mission-handle{fill:none;stroke:#c5f36b;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.ai-tone-mission-art .mission-neck,.ai-tone-mission-art .mission-head,.ai-tone-mission-art .mission-body{fill:#233b28;stroke:#a6cb75;stroke-width:1.5}.ai-tone-mission-art .mission-pickguard{fill:#101911;stroke:#c5f36b;stroke-width:1}.ai-tone-mission-art .mission-bar{fill:#c5f36b;transform-box:fill-box;transform-origin:bottom center}.ai-tone-mission-art .mission-check{fill:none;stroke:#c5f36b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.ai-tone-mission-art .mission-lens{fill:#1a2b1d;stroke:#c5f36b;stroke-width:1.8}.ai-tone-mission-art .mission-node{fill:#1c3020;stroke:#8eae5e;stroke-width:1.4}.ai-tone-mission-art .mission-spark{fill:none;stroke:#d6f69c;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.ai-tone-mission-art[data-state=working] .mission-pulse{animation:aiToneArtPulse 1.3s ease-in-out infinite}.ai-tone-mission-art[data-state=working] .mission-light{animation:aiToneArtLed .9s ease-in-out infinite alternate}.ai-tone-art-pedal[data-state=working] .mission-knob{animation:aiToneArtKnob 1.8s ease-in-out infinite alternate}.ai-tone-art-guitar[data-state=working] .mission-string{stroke-dasharray:3 3;animation:aiToneArtString .65s linear infinite}.ai-tone-art-meter[data-state=working] .mission-bar{animation:aiToneArtMeter .8s ease-in-out infinite alternate}.ai-tone-art-meter[data-state=working] .mission-bar.delay-1{animation-delay:.17s}.ai-tone-art-meter[data-state=working] .mission-bar.delay-2{animation-delay:.31s}.ai-tone-art-meter[data-state=working] .mission-bar.delay-3{animation-delay:.45s}.ai-tone-art-critic[data-state=working] .mission-lens{animation:aiToneArtInspect 2s ease-in-out infinite}.ai-tone-art-chief[data-state=working] .mission-wave{stroke-dasharray:4 4;animation:aiToneArtFlow 1.1s linear infinite}.ai-tone-mission-art[data-state=completed] .mission-light{fill:#d7f5a2}.ai-tone-mission-art[data-state=fallback]{filter:saturate(.65);opacity:.84}.ai-tone-mission-art[data-state=standby],.ai-tone-mission-art[data-state=unavailable]{opacity:.58;filter:saturate(.55)}@keyframes aiToneArtPulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.12);opacity:1}}@keyframes aiToneArtLed{from{opacity:.45}to{opacity:1}}@keyframes aiToneArtKnob{from{transform:rotate(-12deg)}to{transform:rotate(16deg)}}@keyframes aiToneArtString{to{stroke-dashoffset:-12}}@keyframes aiToneArtMeter{from{transform:scaleY(.48)}to{transform:scaleY(1)}}@keyframes aiToneArtInspect{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-2px)}}@keyframes aiToneArtFlow{to{stroke-dashoffset:-16}}@media(prefers-reduced-motion:reduce){.ai-tone-mission-art *{animation:none!important}}@media(max-width:520px){.ai-tone-mission-chief{gap:8px;padding:8px}.ai-tone-mission-visual{flex-basis:66px;width:66px;height:50px}.ai-tone-mission-art{width:62px;height:46px}}';
  audioStyle.textContent += ".ai-tone-activity.ai-tone-mission{width:100%;max-width:100%;padding:11px;border-radius:18px;background:linear-gradient(155deg,#17251a 0%,#101912 100%);border-color:#607b47;gap:10px}.ai-tone-mission-head{min-height:24px}.ai-tone-mission-head>strong{font-size:12px;letter-spacing:.08em;color:#edf5e4}.ai-tone-mission-live{padding:5px 9px;border:1px solid #78934f;border-radius:999px;background:#1d2b19;color:#c5f36b!important}.ai-tone-mission-live[data-state=error]{border-color:#895448;background:#2a1a17;color:#ffab98!important}.ai-tone-mission-hero{overflow:hidden;border:1px solid #405b39;border-radius:15px;background:radial-gradient(ellipse at 50% 58%,#31472a 0%,#19281c 54%,#111a13 100%);padding:7px 10px 11px}.ai-tone-mission-visual{display:flex;align-items:center;justify-content:center;width:100%;height:118px;min-height:118px}.ai-tone-mission-art{display:block;width:min(100%,190px);height:112px;overflow:visible}.ai-tone-mission-art .mission-shadow{fill:#0008;filter:blur(2px)}.ai-tone-mission-art .mission-cabinet,.ai-tone-mission-art .mission-pedal-body,.ai-tone-mission-art .mission-meter-shell,.ai-tone-mission-art .mission-critic-board{fill:#202c20;stroke:#9ab86b;stroke-width:2}.ai-tone-mission-art .mission-panel,.ai-tone-mission-art .mission-pedal-face,.ai-tone-mission-art .mission-meter-screen{fill:#0d150f;stroke:#6f8b4f;stroke-width:1.4}.ai-tone-mission-art .mission-grille{fill:#172219;stroke:#748e58;stroke-width:1.1}.ai-tone-mission-art .mission-mesh,.ai-tone-mission-art .mission-meter-grid,.ai-tone-mission-art .mission-critic-line{fill:none;stroke:#58734b;stroke-width:.8;opacity:.8}.ai-tone-mission-art .mission-speaker-ring{fill:#202c20;stroke:#c5f36b;stroke-width:2.3}.ai-tone-mission-art .mission-speaker{fill:#101911;stroke:#7e9e59;stroke-width:1.5}.ai-tone-mission-art .mission-speaker-cap{fill:#273b27;stroke:#c5f36b;stroke-width:1.5}.ai-tone-mission-art .mission-amp-knob,.ai-tone-mission-art .mission-pedal-knob{fill:#c6cbb4;stroke:#526747;stroke-width:1.3}.ai-tone-mission-art .mission-panel-line,.ai-tone-mission-art .mission-amp-feet{stroke:#b4cb86;stroke-width:1.5;stroke-linecap:round}.ai-tone-mission-art .mission-amp-light,.ai-tone-mission-art .mission-pedal-led,.ai-tone-mission-art .mission-chief-dot{fill:#c5f36b;filter:drop-shadow(0 0 3px #c5f36b)}.ai-tone-mission-art .mission-pedal-body{fill:#17231a;stroke:#b0ca79;stroke-width:2}.ai-tone-mission-art .mission-pedal-wave,.ai-tone-mission-art .mission-guitar-string,.ai-tone-mission-art .mission-guitar-fret,.ai-tone-mission-art .mission-critic-check,.ai-tone-mission-art .mission-critic-handle,.ai-tone-mission-art .mission-chief-line,.ai-tone-mission-art .mission-chief-spark{fill:none;stroke:#c5f36b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.ai-tone-mission-art .mission-pedal-switch{fill:#263727;stroke:#c5f36b;stroke-width:2}.ai-tone-mission-art .mission-pedal-switch-core{fill:#0e170f;stroke:#85a65e;stroke-width:1}.ai-tone-mission-art .mission-guitar-neck,.ai-tone-mission-art .mission-guitar-head,.ai-tone-mission-art .mission-guitar-body{fill:#704a27;stroke:#d4b27a;stroke-width:2}.ai-tone-mission-art .mission-guitar-guard{fill:#d6d9c5;stroke:#6d8652;stroke-width:1.5}.ai-tone-mission-art .mission-guitar-string{stroke:#f3eed8;stroke-width:.9}.ai-tone-mission-art .mission-guitar-fret{stroke:#d8d6c7;stroke-width:1}.ai-tone-mission-art .mission-meter-bar{fill:#c5f36b;transform-box:fill-box;transform-origin:bottom center}.ai-tone-mission-art .mission-meter-bar.b2{opacity:.85}.ai-tone-mission-art .mission-meter-bar.b3{opacity:.7}.ai-tone-mission-art .mission-meter-bar.b4{opacity:.9}.ai-tone-mission-art .mission-critic-lens{fill:#1a2b1d;stroke:#c5f36b;stroke-width:2}.ai-tone-mission-art .mission-chief-node{fill:#223825;stroke:#b3d67c;stroke-width:2}.ai-tone-mission-art[data-state=working] .mission-object{transform-box:fill-box;transform-origin:50% 92%;animation:aiToneAmpSway 2.8s ease-in-out infinite}.ai-tone-art-pedal[data-state=working] .mission-object{animation:aiTonePedalRock 2.4s ease-in-out infinite}.ai-tone-art-guitar[data-state=working] .mission-object{animation:aiToneGuitarSway 3.1s ease-in-out infinite}.ai-tone-art-meter[data-state=working] .mission-object{animation:aiToneMeterRock 2.6s ease-in-out infinite}.ai-tone-art-critic[data-state=working] .mission-object{animation:aiToneCriticRock 2.8s ease-in-out infinite}.ai-tone-art-chief[data-state=working] .mission-object{animation:aiToneChiefSway 2.8s ease-in-out infinite}.ai-tone-mission-art[data-state=working] .mission-object *{animation:none!important}.ai-tone-mission-art[data-state=fallback] .mission-object{filter:saturate(.65)}.ai-tone-mission-art[data-state=standby],.ai-tone-mission-art[data-state=unavailable]{opacity:.62;filter:saturate(.55)}.ai-tone-mission-art[data-state=completed] .mission-amp-light,.ai-tone-mission-art[data-state=completed] .mission-pedal-led{fill:#d7f5a2}.ai-tone-mission-hero-copy{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;padding:0 4px}.ai-tone-mission-hero-copy strong{color:#f0f6e8;font-size:13px}.ai-tone-mission-hero-copy span{color:#e0ead6;font-size:11px;line-height:1.35;overflow-wrap:anywhere}.ai-tone-mission-hero-copy small{color:#aebda4;font-size:9px;line-height:1.35}.ai-tone-mission-progress{display:flex;flex-direction:column;gap:6px;padding:0 2px}.ai-tone-mission-progress>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#bdcbb2;font-size:10px}.ai-tone-mission-progress strong{font-weight:750;color:#e4eedb}.ai-tone-progress-track{height:7px;overflow:hidden;border-radius:99px;background:#354338}.ai-tone-progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9ccc4f,#d0f680);box-shadow:0 0 9px #c5f36b66;transition:width .3s ease}.ai-tone-mission-specialists{display:flex;flex-direction:column;gap:6px}.ai-tone-mission-specialist{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:42px;padding:7px 9px;border:1px solid #354b35;border-radius:11px;background:#19261b}.ai-tone-specialist-mark{display:flex;align-items:center;justify-content:center;width:21px;height:21px;border:1px solid #647d4c;border-radius:50%;color:#9eb98a;font-size:13px;font-weight:900}.ai-tone-specialist-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.ai-tone-specialist-copy strong{overflow:hidden;color:#e4eddd;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.ai-tone-specialist-copy small{overflow:hidden;color:#9cab92;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.ai-tone-specialist-status{font-size:8px;font-weight:850;letter-spacing:.35px;color:#a5b497}.ai-tone-mission-specialist[data-state=completed]{border-color:#53754a}.ai-tone-mission-specialist[data-state=completed] .ai-tone-specialist-mark,.ai-tone-mission-specialist[data-state=completed] .ai-tone-specialist-status{color:#c5f36b}.ai-tone-mission-specialist[data-state=working]{border-color:#98bf59;background:#223320}.ai-tone-mission-specialist[data-state=working] .ai-tone-specialist-mark{border-color:#c5f36b;color:#c5f36b;animation:aiToneStatusPulse 1.3s ease-in-out infinite}.ai-tone-mission-specialist[data-state=working] .ai-tone-specialist-status{color:#d4f59b}.ai-tone-mission-specialist[data-state=fallback]{border-color:#895448}.ai-tone-mission-specialist[data-state=fallback] .ai-tone-specialist-mark,.ai-tone-mission-specialist[data-state=fallback] .ai-tone-specialist-status{color:#ffab98}.ai-tone-mission-empty{padding:8px;color:#9cab92;font-size:10px}.ai-tone-diagnostics{border-top:1px solid #3d5138;padding-top:8px}.ai-tone-diagnostics summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;color:#dbe7d1;font-size:10px;font-weight:750;list-style:none}.ai-tone-diagnostics summary::-webkit-details-marker{display:none}.ai-tone-diagnostics summary:after{content:\"⌄\";color:#c5f36b;font-size:16px}.ai-tone-diagnostics summary small{margin-left:auto;color:#87987c;font-size:8px;font-weight:500}.ai-tone-diagnostic-list{display:flex;flex-direction:column;gap:5px;margin-top:8px}.ai-tone-diagnostic-provider{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;padding:7px 8px;border:1px solid #324330;border-radius:8px;background:#141f16}.ai-tone-diagnostic-provider strong{color:#dce8d3;font-size:9px}.ai-tone-diagnostic-provider>span{color:#aebda4;font-size:8px;font-weight:800}.ai-tone-diagnostic-provider small,.ai-tone-diagnostic-provider p{grid-column:1/-1;margin:0;color:#8f9e87;font-size:8px;line-height:1.35;overflow-wrap:anywhere}.ai-tone-diagnostic-provider[data-state=completed]>span{color:#c5f36b}.ai-tone-diagnostic-provider[data-state=fallback]>span{color:#ffab98}.ai-tone-diagnostic-error{margin-top:8px;padding:8px;border:1px solid #75463b;border-radius:8px;background:#241916}.ai-tone-diagnostic-error strong{color:#ffb7a4;font-size:9px}.ai-tone-diagnostic-error p{margin:4px 0 0;color:#d6b8ae;font-size:9px;line-height:1.4;overflow-wrap:anywhere}.ai-tone-discussion-label{display:flex;align-items:center;justify-content:space-between;gap:8px}.ai-tone-waveform{display:flex;align-items:center;justify-content:flex-start;gap:3px;height:31px;padding:0 2px;color:#c5f36b}.ai-tone-waveform i{display:block;width:3px;height:8px;border-radius:999px;background:#c5f36b;transform:scaleY(.55);transform-origin:center;animation:aiToneWave 1.05s ease-in-out infinite}.ai-tone-waveform i:nth-child(2n){animation-delay:.12s}.ai-tone-waveform i:nth-child(3n){animation-delay:.24s}.ai-tone-waveform i:nth-child(4n){animation-delay:.36s}.ai-tone-waveform i:nth-child(5n){animation-delay:.48s}.ai-tone-discussion .ai-tone-activity>small{color:#aebda4;font-size:9px}.ai-tone-generic:before{animation:aiToneSpin .8s linear infinite}@keyframes aiToneAmpSway{0%,100%{transform:translateY(0) rotate(-.55deg)}50%{transform:translateY(-1px) rotate(.55deg)}}@keyframes aiTonePedalRock{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(3deg) translateY(-1px)}}@keyframes aiToneGuitarSway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}@keyframes aiToneMeterRock{0%,100%{transform:rotate(-.8deg)}50%{transform:rotate(.8deg)}}@keyframes aiToneCriticRock{0%,100%{transform:rotate(-.7deg)}50%{transform:rotate(.7deg)}}@keyframes aiToneChiefSway{0%,100%{transform:translateY(0) rotate(-.4deg)}50%{transform:translateY(-1px) rotate(.4deg)}}@keyframes aiToneStatusPulse{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.1);opacity:1}}@keyframes aiToneWave{0%,100%{transform:scaleY(.35);opacity:.62}50%{transform:scaleY(1);opacity:1}}@media(prefers-reduced-motion:reduce){.ai-tone-waveform i,.ai-tone-mission-art .mission-object,.ai-tone-mission-specialist .ai-tone-specialist-mark{animation:none!important}.ai-tone-progress-track i{transition:none}}@media(max-width:420px){.ai-tone-mission-visual{height:106px;min-height:106px}.ai-tone-mission-art{height:100px;width:min(100%,170px)}.ai-tone-mission-hero{padding:5px 8px 9px}.ai-tone-specialist-copy strong{font-size:9px}.ai-tone-mission-specialist{min-height:39px;padding:6px 7px}.ai-tone-specialist-status{font-size:7px}}";
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
 '<div hidden><select id="aiToneProviderSelect"><option value="chatgpt" selected>Task-based ChatGPT routing</option></select><label><span id="aiToneActiveModelLabel">Model by task</span><select id="aiToneActiveModel" disabled><option value="__auto__">GPT-5.6 discussion / GPT-6 Luna preset</option></select></label></div>'+
 '<div class="ai-tone-status ai-tone-status-accessible" id="aiToneStatus" data-state="idle" role="status" aria-live="polite" aria-busy="false">AI ready. MG-30 connection is required for live tone assistance.</div>'+
 '<section class="ai-tone-nam-panel" id="aiToneNamPanel"><div class="ai-tone-nam-panel-head"><div><strong>TONE3000 NAM</strong><small>Optional NAM search mode for amp captures</small></div><button class="ai-tone-nam-action" id="aiToneFindNam" type="button" aria-pressed="false">OFF</button></div><div class="ai-tone-nam-gear-row" role="group" aria-label="NAM capture type"><button class="ai-tone-nam-choice" type="button" data-ai-nam-gear="amp" aria-pressed="false">Amp Only</button><button class="ai-tone-nam-choice active" type="button" data-ai-nam-gear="amp-cab" aria-pressed="true">Amp + Cab</button></div><small class="ai-tone-nam-mode-status" id="aiToneNamModeStatus">TONE3000 NAM mode OFF · Built-in MG-30 amps remain selected by default.</small></section>'+
 '<div class="ai-tone-nam-wizard" id="aiToneNamWizard" hidden></div><div class="ai-tone-nam-results" id="aiToneNamResults" hidden></div></div><div class="ai-tone-scroll-area" id="aiToneScrollArea"><div class="ai-tone-body">',
 '<div class="ai-tone-messages" id="aiToneMessages"><div class="ai-tone-message ai"><small>AI ASSISTANT</small>Describe the tone you want. Validated results update the editor controls and send parameters over USB-MIDI immediately. There is no Apply step.</div></div>',
 "</div></div><section class=\"ai-tone-audio-panel\" id=\"aiToneAudioPanel\" hidden> <div class=\"ai-tone-audio-head\"><div><strong>⌁ AUDIO LISTENING <span class=\"ai-tone-audio-indicator\" id=\"aiToneAudioDevice\" data-state=\"checking\" role=\"status\" aria-label=\"Checking MG-30 USB Audio connection; phone microphone is not used\"></span></strong></div><button class=\"ai-tone-audio-refresh\" id=\"aiToneAudioRefresh\" type=\"button\">Refresh</button></div> <div class=\"ai-tone-audio-modes\" role=\"group\" aria-label=\"Audio listening mode\"><button class=\"active\" data-ai-audio-mode=\"once\" type=\"button\">Analyze Once</button><button data-ai-audio-mode=\"live\" type=\"button\">Live Listening</button></div> <button class=\"ai-tone-audio-start\" id=\"aiToneAudioStart\" type=\"button\" disabled>Start Listening</button> <div class=\"ai-tone-dsp-live\" id=\"aiToneDspLiveReadout\" hidden>DSP waiting for PCM data…</div> <div class=\"ai-tone-audio-meter\" id=\"aiToneAudioMeter\" aria-hidden=\"true\"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div> <div class=\"ai-tone-audio-status ai-tone-audio-status-accessible\" id=\"aiToneAudioStatus\" role=\"status\" aria-live=\"polite\">Ready to capture</div></section>",
 '<div class="ai-tone-composer">',
'<textarea class="ai-tone-prompt" id="aiTonePrompt" maxlength="1400" placeholder="Ask anything about your tone…"></textarea>',
'<div class="ai-tone-compose"><button class="ai-tone-undo" id="aiToneUndo" type="button" disabled>↶ Undo AI Changes</button><div><span class="ai-tone-hint" id="aiToneCount">0/1400</span> <button class="ai-tone-send" id="aiToneSend" type="button">Send ↗</button></div></div>',
'</div>'
 ].join('');
 document.body.append(shade,sheet);
 flushAiRuntimeErrors();
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),providerSelect:$('aiToneProviderSelect'),activeModel:$('aiToneActiveModel'),activeModelLabel:$('aiToneActiveModelLabel'),autoFallback:$('aiToneAutoFallback'),findNam:$('aiToneFindNam'),namWizard:$('aiToneNamWizard'),namResults:$('aiToneNamResults'),namModeStatus:$('aiToneNamModeStatus'),namGearButtons:sheet.querySelectorAll('[data-ai-nam-gear]'),providerSummary:$('aiToneProviderSummary'),usageSummary:$('aiToneUsageSummary'),usageTotal:$('aiToneUsageTotal'),usageRequests:$('aiToneUsageRequests'),usageProviders:$('aiToneUsageProviderRows'),usageAgents:$('aiToneUsageAgentRows'),usageReset:$('aiToneUsageReset'),audioToggle:$('aiToneAudioToggle'),audioPanel:$('aiToneAudioPanel'),audioDevice:$('aiToneAudioDevice'),audioRefresh:$('aiToneAudioRefresh'),audioStart:$('aiToneAudioStart'),audioStatus:$('aiToneAudioStatus'),audioMeter:$('aiToneAudioMeter'),audioDspReadout:$('aiToneDspLiveReadout'),audioModes:sheet.querySelectorAll('[data-ai-audio-mode]')};
 let mode='chatgpt',busy=false,last=null,namFlowActive=false,namImportBusy=false,namModeActive=false,namCaptureType='amp-cab',activeNamGear='',activeNamContext='',activeNamModelName='',pendingNamSelection=null,namSearchOnlyActive=false,namSearchPrompt='';const history=[],dialogueContext=[];
 let activityMode='generic',toneMission=null;
 const toneProviderLabels={gemini:'Gemini',groq:'Groq',openrouter:'OpenRouter',cloudflare:'Cloudflare Workers AI'};
 const beginToneMission=(prompt,requiresExperts=true)=>{toneMission={prompt:String(prompt||''),chiefState:'researching',stage:'GPT-6 Luna sedang melakukan riset awal',activeRole:'amp_cabinet_specialist',completed:0,required:requiresExperts?2:0,providers:Object.fromEntries(Object.keys(toneProviderLabels).map(provider=>[provider,{state:'standby',role:'',detail:'Waiting for turn'}]))};activityMode='tone';};
 const updateToneMission=(patch={})=>{if(toneMission){Object.assign(toneMission,patch);renderActivity();}};
 const updateToneMissionProvider=(provider,state,role='',detail='')=>{if(!toneMission||!toneMission.providers[provider])return;toneMission.providers[provider]={state,role:String(role||''),detail:String(detail||'')};if(state==='working'||state==='fallback')toneMission.activeRole=role||toneMission.activeRole;if(state==='completed'){toneMission.completed++;toneMission.activeRole='tone_architect';}renderActivity();};
 const renderToneMissionActivity=()=>{
  if(!toneMission)return '<div>GPT-6 Luna is preparing your preset…</div>';
  const error=ui.status.dataset.state==='error';
  const stateLabel=error?'STOPPED':toneMission.chiefState==='synthesizing'?'SYNTHESIZING':toneMission.chiefState==='validating'?'VALIDATING':toneMission.chiefState==='applying'?'APPLYING':'WORKING';
  const providerEntries=Object.entries(toneMission.providers);
  const roleNames={amp_cabinet_specialist:'Amp & Cabinet',effects_specialist:'Effects',guitar_input_specialist:'Guitar & Input',tone_calibration_specialist:'Tone Calibration',tone_critic:'Tone Critic'};
  const roleOrder=['amp_cabinet_specialist','effects_specialist','guitar_input_specialist','tone_calibration_specialist','tone_critic'];
  const roles=[...new Set(providerEntries.map(([,item])=>item.role).filter(Boolean))].sort((a,b)=>roleOrder.indexOf(a)-roleOrder.indexOf(b));
  const roleRows=roles.map(role=>{
   const attempts=providerEntries.filter(([,item])=>item.role===role);
   const completed=attempts.find(([,item])=>item.state==='completed');
   const working=attempts.find(([,item])=>item.state==='working');
   const failed=error&&attempts.some(([,item])=>item.state==='fallback');
   const state=completed?'completed':working?'working':failed?'fallback':attempts.some(([,item])=>item.state==='fallback')?'fallback':'ready';
   const stateText=completed?'COMPLETED':working?'WORKING':failed?'FAILED':state==='fallback'?'RETRYING':'QUEUED';
   const providerText=completed?'Completed by '+toneProviderLabels[completed[0]]:working?'Running on '+toneProviderLabels[working[0]]:attempts.map(([id,item])=>toneProviderLabels[id]+(item.state==='fallback'?' · retry':'')).join(' → ');
   return '<div class="ai-tone-mission-specialist" data-state="'+state+'"><span class="ai-tone-specialist-mark" aria-hidden="true">'+(completed?'✓':working?'●':failed?'!':'·')+'</span><div class="ai-tone-specialist-copy"><strong>'+esc(roleNames[role]||role.replaceAll('_',' '))+'</strong><small>'+esc(providerText||'Waiting for assignment')+'</small></div><span class="ai-tone-specialist-status">'+stateText+'</span></div>';
  }).join('');
  const providerRows=providerEntries.map(([id,item])=>{
   const label={standby:'STANDBY',ready:'READY',working:'WORKING',fallback:'FALLBACK',completed:'COMPLETED',unavailable:'UNAVAILABLE'}[item.state]||'UNKNOWN';
   return '<div class="ai-tone-diagnostic-provider" data-state="'+esc(item.state)+'"><strong>'+esc(toneProviderLabels[id])+'</strong><span>'+label+'</span><small>'+esc(item.role?item.role.replaceAll('_',' '):item.detail||'Not selected')+'</small>'+(item.detail&&item.role?'<p>'+esc(item.detail)+'</p>':'')+'</div>';
  }).join('');
  const artState=error?'fallback':ui.status.dataset.state==='busy'?'working':'standby';
  const artRole=toneMission.activeRole==='tone_architect'?'amp_cabinet_specialist':toneMission.activeRole||'amp_cabinet_specialist';
  const progress=Number(toneMission.required)>0?Math.min(100,Math.round(Number(toneMission.completed||0)/Number(toneMission.required)*100)):0;
  const progressLabel=Number(toneMission.required)>0?Number(toneMission.completed||0)+' / '+Number(toneMission.required||0)+' specialists completed':'Local tone refinement';
  const task=String(toneMission.prompt||'').replace(/\s+/g,' ').trim().slice(0,110);
  const diagnosticError=toneMission.error?'<div class="ai-tone-diagnostic-error"><strong>Execution details</strong><p>'+esc(toneMission.error)+'</p></div>':'';
  return '<div class="ai-tone-mission-head"><strong>AI MISSION CONTROL</strong><span class="ai-tone-mission-live" data-state="'+(error?'error':'working')+'">'+stateLabel+'</span></div>'+
   '<div class="ai-tone-mission-hero"><div class="ai-tone-mission-visual">'+toneMissionArtworkMarkup(artRole,artState)+'</div><div class="ai-tone-mission-hero-copy"><strong>GPT-6 Luna · Chief</strong><span>'+esc(task||toneMission.stage)+'</span><small>'+esc(toneMission.stage)+'</small></div></div>'+
   '<div class="ai-tone-mission-progress"><div><strong>'+progressLabel+'</strong><span>'+progress+'%</span></div><div class="ai-tone-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><i style="width:'+progress+'%"></i></div></div>'+
   '<div class="ai-tone-mission-specialists">'+(roleRows||'<div class="ai-tone-mission-empty">Waiting for specialist assignments…</div>')+'</div>'+
   '<details class="ai-tone-diagnostics"><summary><span>Provider diagnostics</span><small>'+providerEntries.length+' configured providers · View details</small></summary><div class="ai-tone-diagnostic-list">'+providerRows+'</div>'+diagnosticError+'</details>';
 };
 const renderActivity=()=>{
  let activity=ui.messages.querySelector('.ai-tone-activity');
  const isBusy=ui.status.dataset.state==='busy',keepFailedMission=activityMode==='tone'&&toneMission&&ui.status.dataset.state==='error';
  if(isBusy||keepFailedMission){
   if(!activity){activity=document.createElement('div');activity.setAttribute('role','status');}
   activity.className='ai-tone-activity '+(activityMode==='discussion'?'ai-tone-discussion':activityMode==='tone'?'ai-tone-mission':'ai-tone-generic');
   if(activityMode==='discussion')activity.innerHTML='<div class="ai-tone-discussion-label"><strong>GPT-5.6 Luna</strong><span>COMPOSING</span></div><div class="ai-tone-waveform" role="img" aria-label="AI is composing a response">'+Array.from({length:13},()=>'<i></i>').join('')+'</div><small>'+esc(ui.status.textContent)+'</small>';
   else if(activityMode==='tone'){activity.innerHTML=renderToneMissionActivity();if(keepFailedMission)activity.classList.add('has-error');}
   else activity.textContent=ui.status.textContent;
   if(!activity.isConnected)ui.messages.appendChild(activity);
   const scrollArea=$('aiToneScrollArea');if(scrollArea)scrollArea.scrollTop=scrollArea.scrollHeight;
  }else if(activity)activity.remove();
 };
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';ui.status.setAttribute('aria-busy',state==='busy'?'true':'false');renderActivity();};
 const renderAudioAnalysisCard=item=>{
  const data=item.data||{},report=data.report||{},metrics=report.metrics||{},interpretation=data.interpretation||null;
  const measuredAt=report.measuredAt?new Date(report.measuredAt).toLocaleString('id-ID'):'Waktu tidak tersedia';
  const value=(number,unit='')=>number===null||number===undefined||!Number.isFinite(Number(number))?'—':String(number)+unit;
  const cell=(label,number,unit,state,reason='')=>{
   const copy=state==='measured'?value(number,unit):state==='estimated'?value(number,unit):'—';
   const stateLabel=state==='measured'?'Measured':state==='estimated'?'Estimated':state==='unavailable'?'Unavailable':'Not measured';
   return '<div class="ai-dsp-metric"><small>'+esc(label)+'</small><strong>'+esc(copy)+'</strong><span data-state="'+esc(state||'not_measured')+'">'+stateLabel+'</span>'+(reason?'<em>'+esc(reason)+'</em>':'')+'</div>';
  };
  const bins=Array.isArray(report.spectrum?.bins)?report.spectrum.bins:[];
  const bars=[];
  const validBins=bins.filter(row=>Number(row.frequencyHz)>=20&&Number(row.frequencyHz)<=Math.min(20000,Number(report.spectrum?.nyquistHz)||20000));
  const count=64;
  for(let i=0;i<count;i++){
   const low=20*Math.pow(1000,i/count),high=20*Math.pow(1000,(i+1)/count);
   const values=validBins.filter(row=>Number(row.frequencyHz)>=low&&Number(row.frequencyHz)<high).map(row=>Number(row.magnitudeDbfs)).filter(Number.isFinite);
   const level=values.length?Math.max(...values):-120;
   const height=Math.max(2,Math.min(100,((level+96)/96)*100));
   bars.push('<i style="--dsp-bar-height:'+height.toFixed(1)+'%"></i>');
  }
  const bands=metrics.bandsPct||{};
  const bandText=[['Sub-bass',bands.subBass],['Low',bands.low],['Low-mid',bands.lowMid],['Mid',bands.mid],['High-mid',bands.highMid],['High',bands.high]]
   .filter(row=>Number.isFinite(Number(row[1]))).map(row=>'<span>'+esc(row[0])+' <b>'+esc(row[1])+'%</b></span>').join('');
  const observations=Array.isArray(interpretation?.observations)?interpretation.observations:[];
  const recommendations=Array.isArray(interpretation?.recommendations)?interpretation.recommendations:[];
  const limitationRows=[...(Array.isArray(report.analysis?.limitations)?report.analysis.limitations:[]),...(Array.isArray(interpretation?.limitations)?interpretation.limitations:interpretation?.limitations?[interpretation.limitations]:[])];
  const observationHtml=observations.map(row=>'<li><strong>'+esc(row.area||'Observation')+'</strong><span>'+esc(row.finding||'')+'</span>'+(row.evidence?'<small>Evidence: '+esc(row.evidence)+'</small>':'')+'</li>').join('');
  const recommendationHtml=recommendations.map(row=>{
   if(typeof row==='string')return '<li>'+esc(row)+'</li>';
   const action=String(row.action||row.recommendation||row.text||'');
   const target=row.target||row.parameter||row.area||'';
   return '<li>'+(target?'<strong>'+esc(target)+': </strong>':'')+esc(action)+(row.reason?'<small>'+esc(row.reason)+'</small>':'')+(row.evidence?'<small>DSP evidence: '+esc(row.evidence)+'</small>':'')+'</li>';
  }).join('');
  return '<section class="ai-dsp-result-card">'+
   '<header class="ai-dsp-result-head"><div class="ai-dsp-result-icon">∿</div><div><strong>DSP Analysis Result</strong><small>'+esc(measuredAt)+' · '+esc(report.source?.durationSeconds??report.durationSeconds??'—')+' s capture</small></div><span>LOCAL DSP</span></header>'+
   '<section class="ai-dsp-section"><h4>Key Measurements</h4><div class="ai-dsp-grid">'+
    cell('RMS Level',metrics.rmsDbfs,' dBFS','measured')+
    cell('Sample Peak',metrics.samplePeakDbfs,' dBFS','measured')+
    cell('Crest Factor',metrics.crestFactorDb,' dB','measured')+
    cell('Noise Floor',null,'','unavailable',metrics.noiseFloor?.reason||'No validated estimator')+
    cell('Dynamic Range',null,'','not_measured',metrics.dynamicRange?.reason||'Not measured')+
    cell('Latency',null,'','not_measured',metrics.latency?.reason||'Not measured')+
   '</div><div class="ai-dsp-clipping" data-clipped="'+String(Boolean(metrics.clipping?.detected))+'"><span>Clipping detection</span><strong>'+(metrics.clipping?.detected?'Detected · '+Number(metrics.clipping.sampleCount||0)+' samples':'Not detected')+'</strong><small>Sample threshold '+esc(metrics.clipping?.threshold??0.999)+'</small></div></section>'+
   '<section class="ai-dsp-section"><div class="ai-dsp-section-title"><h4>Spectrum Analysis</h4><span>'+esc(report.spectrum?.status==='measured'?'Measured FFT':'Unavailable')+'</span></div>'+
    '<div class="ai-dsp-spectrum" role="img" aria-label="Measured FFT spectrum from MG-30 USB Audio">'+(bars.length?bars.join(''):'<span>Spectrum unavailable</span>')+'</div>'+
    '<div class="ai-dsp-spectrum-axis"><span>20 Hz</span><span>160 Hz</span><span>630 Hz</span><span>2.5 kHz</span><span>10 kHz</span><span>'+esc(Math.round(Number(report.spectrum?.nyquistHz)||0))+' Hz</span></div>'+
    '<div class="ai-dsp-band-list">'+bandText+'</div>'+
    '<small class="ai-dsp-spectrum-note">Centroid '+esc(value(metrics.spectralCentroidHz,' Hz'))+' · 85% roll-off '+esc(value(metrics.rolloff85Hz,' Hz'))+' · '+esc(report.analysis?.fftFrames??0)+' FFT frames</small></section>'+
   '<section class="ai-dsp-section"><h4>AI Interpretation</h4>'+(interpretation?'<p class="ai-dsp-summary">'+esc(interpretation.summary||'No summary returned.')+'</p>'+(observationHtml?'<ul class="ai-dsp-observations">'+observationHtml+'</ul>':''):'<p class="ai-dsp-summary">'+esc(data.aiError||'AI interpretation has not been requested. DSP measurements are available locally.')+'</p>')+'</section>'+
   '<section class="ai-dsp-recommendations"><h4>✦ Recommendations</h4>'+(recommendationHtml?'<ul>'+recommendationHtml+'</ul>':'<p>No AI recommendations available.</p>')+'</section>'+
   (limitationRows.length?'<section class="ai-dsp-limitations"><strong>Measurement & interpretation limits</strong><ul>'+limitationRows.map(row=>'<li>'+esc(row)+'</li>').join('')+'</ul></section>':'')+
   '</section>';
 };
 const renderNamChatCard=item=>{
  if(item.type==='audio-analysis')return renderAudioAnalysisCard(item);
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
 let pendingToneApply=null,pendingToneProposal=null;
 const rememberConversation=(role,text)=>{const value=String(text||'').trim();if(!value)return;dialogueContext.push({role,text:value.slice(0,1400)});while(dialogueContext.length>8)dialogueContext.shift();};
 const conversationContextText=()=>dialogueContext.slice(-8).map(turn=>(turn.role==='user'?'User':'Assistant')+': '+turn.text).join('\\n');
 let audioMode='once',audioCaptureActive=false,audioBusy=false,audioCaptureTimer=0,audioPollTimer=0,audioCaptureStartedAt=0,lastAudioMetrics=null,audioDspSession=null,audioDspOffsetBytes=0,audioDspPollBusy=false,audioDspActiveMask=3,audioDspRequestedMask=3;
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
 function decodePcm24Chunk(base64,channelCount){
  if(typeof atob!=='function')throw new Error('Base64 decoding is unavailable in this WebView.');
  const raw=atob(String(base64||''));
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const frameBytes=channelCount*3;
  if(!frameBytes||bytes.length%frameBytes!==0)throw new Error('Native PCM chunk is not aligned to complete 24-bit audio frames.');
  const frames=bytes.length/frameBytes;
  const channels=Array.from({length:channelCount},()=>new Float32Array(frames));
  for(let frame=0;frame<frames;frame++){
   for(let channel=0;channel<channelCount;channel++){
    const offset=frame*frameBytes+channel*3;
    let sample=bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16);
    if(sample&0x800000)sample|=0xff000000;
    channels[channel][frame]=sample/8388608;
   }
  }
  return channels;
 }
 async function pumpLiveToneDsp(recorder){
  if(!audioDspSession||audioDspPollBusy||!audioCaptureActive)return;
  audioDspPollBusy=true;
  try{
   const chunk=await recorder.readToneAnalysisPcmChunk?.({offsetBytes:audioDspOffsetBytes,maxBytes:49152});
   if(chunk&&Number(chunk.bytesRead)>0){
    if(Number(chunk.offsetBytes)!==audioDspOffsetBytes)throw new Error('USB PCM stream offset changed; live DSP stopped to avoid a discontinuous measurement.');
    const allChannels=decodePcm24Chunk(chunk.pcm24Base64,Number(chunk.channels)||audioDspSession.metadata.channelCount);
    const selected=selectUsbInputChannels(allChannels,audioDspActiveMask,audioDspRequestedMask);
    processToneDspChunk(audioDspSession,selected);
    audioDspOffsetBytes=Number(chunk.nextOffsetBytes)||audioDspOffsetBytes+Number(chunk.bytesRead);
   }
   const live=getToneDspLiveSummary(audioDspSession);
   if(ui.audioDspReadout){
    ui.audioDspReadout.hidden=false;
    ui.audioDspReadout.textContent='LOCAL DSP · '+live.spectralFrames+' FFT frames · RMS '+(live.rmsDbfs===null?'—':live.rmsDbfs.toFixed(1)+' dBFS')+' · Peak '+(live.samplePeakDbfs===null?'—':live.samplePeakDbfs.toFixed(1)+' dBFS');
   }
  }catch(error){
   if(ui.audioDspReadout){ui.audioDspReadout.hidden=false;ui.audioDspReadout.textContent='LIVE DSP PAUSED · '+String(error?.message||error);}
  }finally{audioDspPollBusy=false;}
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
  const payload=toAiToneDspPayload(metrics,96);
  const system='You interpret a structured LOCAL DSP report for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' DSP has already measured the audio. You are NOT an audio measurement engine and must NEVER calculate, estimate, replace, or invent RMS, sample peak, crest factor, FFT bins, spectrum, frequency-band percentages, clipping, noise floor, dynamic range, latency, or any other DSP metric. Treat every field provenance/status literally: measured values are evidence; unavailable and not_measured fields must remain unavailable/not measured. The capture is from MG-30 USB input channels selected by the report and may contain a host-loopback mix. It describes the performance and signal path, not a calibrated amp-only frequency response. Explain likely tone characteristics only when supported by the supplied measurements; acknowledge that pickups, playing technique, guitar volume and gain staging affect the result. Do not claim to have heard timbre that cannot be derived from these measurements. Make practical EQ/parameter recommendations cautiously and tie each recommendation to specific measured evidence. This is READ ONLY: do not create a Tone Plan, preset, MIDI command, parameter write, or hardware change. Return JSON only with keys: summary (string), observations (array of {area,finding,evidence,confidence}), recommendations (array of {target,action,reason,evidence}), limitations (array of strings).';
  const user=(conversation?'RECENT CONVERSATION:\\n'+conversation+'\\n\\n':'')+
   'USER QUESTION:\\n'+String(question||'Explain this DSP analysis and suggest improvements.')+
   '\\n\\nAUTHORITATIVE DSP REPORT (JSON; already measured locally):\\n'+JSON.stringify(payload)+
   '\\n\\nInterpret this report only. Do not infer missing measurements or send any device changes.';
  try{
   const result=await askNamAIJson(system,user,'interpreting local MG-30 DSP measurements');
   status('AI interpretation complete. DSP values remain unchanged; no device parameters were changed.','success');
   return result;
  }catch(error){
   status('AI interpretation failed: '+(error?.message||error),'error');
   throw error;
  }
 }
 async function finishAudioListening(options={}){
  const askAi=options.askAi!==false,discard=Boolean(options.discard);
  if(!audioCaptureActive)return lastAudioMetrics;
  audioCaptureActive=false;stopAudioTimers();audioBusy=true;
  ui.audioStart.disabled=true;ui.audioStart.textContent='Processing Audio…';
  ui.audioModes.forEach(button=>button.disabled=true);
  setAudioMeter([],false);setAudioStatus('Stopping USB capture and preparing local DSP analysis…','busy');
  const recorder=window.NUXStudioRecorder;let take=null,metrics=null,interpretation=null,aiError='';
  try{
   take=await recorder.stopToneAnalysis();
   if(!take?.path)throw new Error('The MG-30 USB capture stopped without producing a WAV file.');
   if(!discard){
    setAudioStatus('Running shared local DSP over captured PCM…','busy');
    metrics=await decodeToneAnalysisTake(take);
    metrics.measuredAt=Date.now();
    metrics.route='MG-30 USB input channels 1–2';
    lastAudioMetrics=metrics;
    if(askAi){
     setAudioStatus('DSP complete · sending structured measurements to the existing AI provider…','busy');
     try{
      interpretation=await requestAudioDiagnosis('Analisis tone gitar saya berdasarkan hasil DSP USB Audio MG-30 ini. Jelaskan karakter yang didukung data dan berikan rekomendasi tanpa mengubah perangkat.',metrics);
     }catch(error){aiError=String(error?.message||error); }
    }
    chatCard('audio-analysis',{report:metrics,interpretation,aiError});
    rememberConversation('assistant','DSP analysis saved. RMS '+metrics.metrics.rmsDbfs+' dBFS; sample peak '+metrics.metrics.samplePeakDbfs+' dBFS. AI interpretation: '+(interpretation?.summary||aiError||'not requested')+'.');
    setAudioStatus(interpretation?'DSP analysis and AI interpretation complete.':'DSP analysis complete; AI interpretation unavailable.','success');
    setAudioPanelExpanded(false);
   }else{
    lastAudioMetrics=null;
    setAudioStatus('Listening stopped. Temporary audio was discarded.','idle');
   }
  }catch(error){
   setAudioStatus(error?.message||'USB audio DSP analysis failed.','error');
   message('ai','USB audio DSP analysis failed: '+(error?.message||error));
   if(discard)lastAudioMetrics=null;
  }finally{
   if(take?.path){try{await recorder.deleteToneAnalysisTake(take.path);}catch(_){}}
   audioDspSession=null;audioDspOffsetBytes=0;audioDspPollBusy=false;
   if(ui.audioDspReadout){ui.audioDspReadout.hidden=true;ui.audioDspReadout.textContent='';}
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
   if(typeof recorder.readToneAnalysisPcmChunk!=='function')throw new Error('The native PCM chunk reader is unavailable. Install the latest Android APK before using continuous Live DSP.');
   const ready=await refreshAudioDeviceStatus();
   if(!ready)throw new Error('MG-30 USB Audio input is not detected. Connect the pedal and refresh.');
   if(recorder.isRecording?.())throw new Error('Another USB Audio recording is already active. Stop Quick Record or the DAW recording first.');
   const opened=await recorder.startToneAnalysis({channelIndexMask:3});
   if(!opened?.recording)throw new Error('Android did not confirm MG-30 USB Audio capture.');
   audioDspActiveMask=Number(opened.channelIndexMask)||3;
   audioDspRequestedMask=Number(opened.requestedChannelIndexMask)||3;
   const selectedChannelCount=audioDspRequestedMask.toString(2).replace(/0/g,'').length;
   audioDspSession=createToneDspSession({
    sampleRateHz:Number(opened.sampleRate)||48000,
    channelCount:selectedChannelCount,
    channelIndexMask:audioDspRequestedMask,
    source:'NUX MG-30 USB Audio',
    captureMode:audioMode==='live'?'live-listening':'analyze-once'
   },{fftSize:2048,hopSize:1024});
   audioDspOffsetBytes=0;audioDspPollBusy=false;
   audioCaptureActive=true;audioCaptureStartedAt=Date.now();
   ui.audioStart.textContent='Stop & Analyze';ui.audioStart.disabled=false;
   ui.audioModes.forEach(button=>button.disabled=true);setAudioMeter([],true);
   ui.audioDspReadout.hidden=false;ui.audioDspReadout.textContent='LOCAL DSP · waiting for the first PCM chunk…';
   setAudioStatus(audioMode==='once'?'Listening for 7 seconds… Play a short phrase or chord.':'Live Listening · continuous local DSP active. Play freely, then press Stop & Analyze.','busy');
   audioPollTimer=window.setInterval(async()=>{
    try{
     const stats=await recorder.getToneAnalysisStats();
     if(!audioCaptureActive||!stats?.recording)return;
     const peaks=(stats.channelWaveforms||[]).flatMap(channel=>Array.isArray(channel.peaks)?channel.peaks:[]);
     const peak=Math.max(0,...peaks.map(Number));
     const bars=Array.from({length:32},(_,index)=>Math.max(6,Math.min(100,Math.round(peak*100))));
     setAudioMeter(bars,true);
     await pumpLiveToneDsp(recorder);
     const seconds=Math.max(0,Number(stats.durationSeconds)||((Date.now()-audioCaptureStartedAt)/1000));
     const progress=audioDspSession?getToneDspLiveSummary(audioDspSession):null;
     if(audioMode==='once')setAudioStatus('Listening · '+Math.max(0,Math.ceil(7-seconds))+' seconds remaining…','busy');
     else setAudioStatus('Live Listening · '+seconds.toFixed(1)+' s · '+(progress?.spectralFrames||0)+' DSP FFT frames','busy');
    }catch(error){
     if(ui.audioDspReadout){ui.audioDspReadout.hidden=false;ui.audioDspReadout.textContent='DSP monitor issue · '+String(error?.message||error);}
    }
   },220);
   audioCaptureTimer=window.setTimeout(()=>{void finishAudioListening({askAi:true});},audioMode==='once'?7000:120000);
  }catch(error){
   audioDspSession=null;
   ui.audioDspReadout.hidden=true;
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
  const system='You are GPT-5.6 Luna, the conversational guitar-tone partner for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' This is a DISCUSSION / TONE REVIEW turn, never a preset-generation or device-edit request. Answer in natural prose. Use the recent discussion to understand which current preset and sound the user means. Read the supplied live MG-30 snapshot and exact hardware catalogue before recommending anything. When asked “apa yang perlu diperbaiki?”, evaluate the existing active block models, enabled states and current parameter values, then offer specific, modest recommendations using only parameter IDs that exist on the exact selected hardware models. Distinguish what can be inferred from the editor state from what would require an audio recording/listening test; never claim to have heard the tone unless audio evidence is supplied. Do not generate JSON, a Tone Plan, MIDI, or make device changes. Do not call specialists for discussion. Tell the user they can ask for a focused proposal when ready; changes require a separate explicit approval step.';
  const catalog=bridge?.getCatalog?.()||[];
  const snapshot=bridge?.getSnapshot?.()||[];
  const hardware=compactToneContext(catalog,snapshot);
  const recent=compactNamConversation(conversation,1400);
  const hardwareText=JSON.stringify(hardware);
  const user=(recent?'RECENT DISCUSSION:\n'+recent+'\n\n':'')+
   (hardwareText&&hardwareText!=='{}'?'AUTHORITATIVE LIVE MG-30 HARDWARE CATALOG + CURRENT EDITOR STATE (exact IDs, models, parameter whitelist and values):\n'+hardwareText+'\n\n':'')+
   'LATEST USER MESSAGE:\n'+String(prompt||'').slice(0,700)+'\n\nAnswer as a tone discussion only. Make recommendations in prose; no device writes.';
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
async function invokeWorkersAILightTask(task,system,user,stage,maxOutputTokens=520){
  // NAM query work is intentionally pinned to Workers AI; it must not consume GPT-6 Luna tokens.
  try{
   status('Cloudflare Workers AI is '+stage+'…','busy');
   const result=await invokeWorkerLightTask('cloudflare',task,system,user,stage,maxOutputTokens,WORKERS_AI_MODEL);
   logAiTokenUsage('cloudflare',result?.__aiModel||WORKERS_AI_MODEL,stage,maxOutputTokens,system,user,result);
   return result;
  }catch(error){
   noteProviderFailure('cloudflare',error);
   logAiTokenUsage('cloudflare',WORKERS_AI_MODEL,stage,maxOutputTokens,system,user,null,error);
   throw error;
  }
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
    ?models.map(model=>({name:model.name,kind:model.kind||'',slot:model.slot??null,parameters:(model.parameters||[]).map(parameter=>parameter.kind==='discrete'?{key:parameter.key,kind:'discrete',choices:(parameter.choices||[]).map(choice=>choice.value)}:{key:parameter.key,kind:'range',min:0,max:100})}))
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
    maxTokens:640,
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
  const system='You are the '+role.replaceAll('_',' ')+' specialist for the original NUX MG-30 Gen 2 firmware 6.0.x (not MKII). '+responseLanguageInstruction()+' '+spec.purpose+' You are advisory only. ChatGPT is the orchestrator and final decision authority. HARDWARE WHITELIST: use only exact block IDs and exact model names present in device_context.models; never output a real-world/reference amp name as an MG-30 model name. If the closest device model is not listed, do not invent one; return an empty recommendation and explain the limitation. Never invent parameter IDs or values. Return compact JSON only using this shape: '+spec.output+' Keep the response within '+spec.maxTokens+' output tokens.';
  const user={
   current_request:String(context.prompt||'').slice(0,700),
   recent_context:compactNamConversation(context.conversation||'',900),
   focus:String(args?.focus||'').slice(0,140),
   specialist_brief:String(args?.brief||'').slice(0,600),
   device_context:deviceContext,
   candidate_plan:candidate
  };
  const requestText=JSON.stringify(user);
  const invokeSpecialistWithNoNamRetry=async member=>{
   const invoke=(retry=false)=>{
    if(!retry)return invokeWorkerLightTask(member.provider,'tone-specialist',system,requestText,'specialist '+role,spec.maxTokens,member.model,role);
    const retryBudget=Math.min(1024,spec.maxTokens+160);
    const retrySystem=system.replace(/Keep the response within \d+ output tokens\./,'Keep the response within '+retryBudget+' output tokens.')+'\n\nRECOVERY RETRY: The previous response was temporarily unavailable or was not a complete JSON object. Return exactly one compact, syntactically valid JSON object matching the schema above. No Markdown, commentary, code fences or extra keys. Keep text fields short, use empty arrays when there is no supported finding, and close every JSON object and array.';
    return invokeWorkerLightTask(member.provider,'tone-specialist',retrySystem,requestText,'specialist '+role+' · NAM-OFF retry',retryBudget,member.model,role);
   };
   try{return await invoke(false);}
   catch(error){
    if(!shouldRetryNoNamSpecialistError(error,context.namModeEnabled,member.provider))throw error;
    status(providerNames[member.provider]+' returned a temporary or incomplete specialist response. Retrying once before fallback…','busy');
    await new Promise(resolve=>setTimeout(resolve,400));
    return invoke(true);
   }
  };
  const team=Array.isArray(context.providerTeam)?context.providerTeam:await resolveFreeProviderTeam();
  if(team.length<2)throw new Error('At least two distinct specialist providers must be configured for a new preset.');
  const successfulProviders=Array.isArray(context.successfulProviders)?context.successfulProviders:[];
  const cursor=context.providerCursor&&typeof context.providerCursor==='object'?context.providerCursor:{value:0};
  const start=((Number(cursor.value)||0)%team.length+team.length)%team.length;
  const providerOrder=[...team.slice(start),...team.slice(0,start)];
  const ordered=providerOrder.filter(member=>!successfulProviders.includes(member.provider)),failures=[];
  const expertNumber=successfulProviders.length+1;
  updateToneMission({chiefState:'delegating',stage:'Specialist '+expertNumber+' · '+role.replaceAll('_',' '),activeRole:role});
  for(let index=0;index<ordered.length;index++){
   const member=ordered[index];
   if(providerInCooldown(member.provider)){failures.push(member.provider+': temporary cooldown');updateToneMissionProvider(member.provider,'fallback',role,'Sedang cooldown; dilewati');continue;}
   try{
    updateToneMissionProvider(member.provider,'working',role,'Menjalankan tugas ahli '+expertNumber);
    status(providerNames[member.provider]+' is executing specialist '+expertNumber+' · '+role.replaceAll('_',' ')+'…','busy');
    const findings=await invokeSpecialistWithNoNamRetry(member);
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
    updateToneMissionProvider(member.provider,'fallback',role,String(error?.message||'Provider request failed').slice(0,220));
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
async function askLunaNamJson(system,user,stage,maxOutputTokens=256){
  const credential=await secret('chatgpt');
  if(!credential)throw new Error('ChatGPT/GPT-6 Luna is not connected; NAM candidates remain available for manual selection.');
  const model=await fastestReadyModel('chatgpt',credential,'tone-plan');
  if(!model)throw new Error('No GPT-6 Luna model is available for NAM validation.');
  const result=await requestChatGptConversation({
   bridge:window.MG30ChatGPTBridge,model,system,user,maxOutputTokens
  });
  const parsed=parseJson(result.reply);
  const usageResult={};
  if(result.__aiUsage)Object.defineProperty(usageResult,'__aiUsage',{value:result.__aiUsage,enumerable:false});
  logAiTokenUsage('chatgpt',result.__aiModel||model,stage,maxOutputTokens,system,user,usageResult);
  return parsed;
}
 async function deriveNamSearchQuery(prompt,conversation=''){
  const system='You select search terms for the TONE3000 NAM catalog. The CURRENT USER TONE REQUEST is authoritative. Use recent conversation only to resolve ambiguity; never reuse a previous artist or amp search query when the current request names a different artist or target. Return JSON only: {"query":"short search phrase","reason":"brief reason in the same language as the USER REQUEST"}. Extract 2–5 useful words focused on amplifier make/model or searchable amp family/style. For artist/song tone requests, infer a plausible amp family only when justified by the requested sound; do not claim an exact real-world rig. Do not use generic words like preset, guitar tone, live, or effects. Keep query under 60 characters.';
  try{
   const recent=compactNamConversation(conversation,700);
   const user=(recent?'RECENT RELEVANT CONVERSATION (compact):\n'+recent+'\n\n':'')+'USER TONE REQUEST:\n'+prompt;
   const result=await invokeWorkersAILightTask('tone3000-search-terms',system,user,'deriving TONE3000 search terms',180);
   const query=String(result?.query||'').trim().replace(/\s+/g,' ').slice(0,60);
   if(query.length<2)throw new Error('Workers AI returned no useful TONE3000 search phrase.');
   return {query,reason:String(result?.reason||''),source:'workers-ai'};
  }catch(error){
   const query=fallbackNamSearchTerms(prompt);
   if(query.length<2)throw error;
   message('ai','Workers AI could not derive the NAM search phrase; using the local safe query fallback. '+String(error?.message||error).slice(0,180));
   return {query,reason:'',source:'local-fallback'};
  }
 }
 async function chooseNamTone(prompt,searchQuery,tones,conversation=''){
  const candidates=sanitizeNamProfileCandidates(tones,12);
  const system='Choose the single best TONE3000 NAM tone pack for the current user request. The CURRENT USER REQUEST is authoritative; recent conversation may clarify preferences but must never override a newly named artist, amp or target. Return JSON only: {"toneId":"123","reason":"alasan singkat Bahasa Indonesia"}. Select only an ID present in CANDIDATES. Prefer a direct amplifier make/model or clearly relevant amp family. If none are meaningfully relevant return {"toneId":"","reason":"tidak ada profil yang cukup relevan"}. Never invent tone details not present in the candidate fields. Write the reason in Bahasa Indonesia, 1–2 short sentences, maximum 30 words total. Keep the reason concise and factual.';
  const recent=compactNamConversation(conversation);
  const user=(recent?'RECENT CONVERSATION (compact):\\n'+recent+'\\n\\n':'')+'USER REQUEST:\\n'+prompt+'\\nAI SEARCH QUERY:\\n'+searchQuery+'\\nCANDIDATES (minified JSON):\\n'+JSON.stringify(candidates)+'\\nReturn only the requested JSON.';
  const result=await askLunaNamJson(system,user,'Luna validating TONE3000 NAM profile',256);
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
  const result=await askLunaNamJson(system,user,'Luna validating A2-Lite capture',256);
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
  if(bridge.isConnected?.()){
   if(typeof bridge.refreshSnapshot!=='function')throw new Error('MG-30 editor readback is unavailable. Connect again or update MG30 Studio before creating a preset.');
   await bridge.refreshSnapshot();
  }
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();
  if(!catalog?.length)throw new Error('The MG-30 catalog is unavailable.');
  const localRefinement=Boolean(toneSession.intent&&isLocalToneRefinement(prompt));
  const namPlanGuard=activeNamContext?'\n\nAUTHORITATIVE AMP SOURCE: TONE3000 NAM is installed in MG-30 slot 10. Do not invent or claim any built-in AMP model. The app selects the NAM Slot 10 selection-only entry. Never write NAM internals.':'';
  const deltaGuard=localRefinement?'\n\nDELTA PATCH MODE: This is a focused edit to the CURRENT tone. Return only changed blocks and only changed parameter keys. Keep each block on its current exact model unless the user explicitly asks to change that model. Do not regenerate the chain, resend unaffected parameters, change NAM/IR/MIDI/scene/volume/preset data, or touch unrelated blocks. Use the current snapshot and preserve all other state.':'';
  const system=systemPrompt(catalog,snapshot,false,resolveArtistToneGuidance(prompt,conversation))+namPlanGuard+deltaGuard;
  const completePresetGuard=localRefinement?'\n\nLOCAL REFINEMENT: Return only requested delta blocks. Every unlisted managed block must remain unchanged.':'\n\nNEW PRESET: Return the catalog-valid blocks needed for this tone. The app will turn every other managed effect block OFF while preserving its exact current model. Do not touch IR, Send/Return, Volume, scene, preset slot, MIDI mappings or signal-chain order.';
  const namSearchRoutingGuard=namModeActive&&!activeNamContext?'\n\nNAM SEARCH ROUTING: Do not generate, infer or include TONE3000 search_terms in this Tone Plan. A separate Cloudflare Workers AI light task will derive the compact TONE3000 catalog query from the current user request and relevant context. Spend your output budget on musical intent and the MG-30 preset only.':'';
  const singleSystem=system+'\n\n'+toneLeadInstruction(toneSession.intent)+completePresetGuard+namSearchRoutingGuard;
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
  const specialistDispatchContext={providerTeam,successfulProviders:[],providerCursor:{value:0},namModeEnabled:Boolean(namModeActive)};
  const orchestrationInstructions=singleSystem+'\n\nGPT-6 LUNA TONE ARCHITECT CONTRACT: You are GPT-6 Luna, the sole Chief Tone Architect and final decision-maker for preset creation. FIRST do your own musical/reference research before delegating: infer the requested artist/song/era, sonic character, playing dynamics, likely rig context, evidence status, assumptions and uncertainties. Tone Researcher is YOUR responsibility and must NEVER be delegated. Do not invent sources, studio credits, exact rigs or citations; distinguish known, reported, inferred and unknown facts. Then, for every new preset, you MUST call at least TWO DIFFERENT technical specialist roles sequentially and receive successful results from TWO DIFFERENT external provider identities before final synthesis. Request exactly one specialist per turn, wait for its actual result, evaluate it, and only then request the next different role. For a typical artist lead preset, use Amp & Cabinet Specialist first and Effects Specialist second; reverse their order only when the request is primarily effects-focused. Guitar & Input Specialist is conditional on relevant guitar/pickup/input details; Tone Calibration Specialist is conditional on meaningful coupled gain/frequency/dynamic interactions; Tone Critic is conditional on material uncertainty, conflict or risk. Gemini is the first specialist provider. If Gemini fails, the same role task falls back sequentially to Groq, OpenRouter, and Cloudflare Workers AI. A second successful specialist MUST use a provider identity different from the first successful specialist; the app enforces this. Never run specialist generations in parallel, never delegate Tone Researcher, and never claim a failed provider completed a role. If fewer than two distinct specialist roles from two provider identities succeed, stop without a Tone Plan. You remain the only Chief and synthesize your own research plus the two specialist findings into the final MG-30 Tone Plan JSON. The exact MG-30 Gen 2 firmware 6.0.x catalogue and validator are authoritative; preserve NAM, IR, MIDI mappings and all unrelated device state.';
  let first=await orchestrateChatGptTonePlan({bridge:window.MG30ChatGPTBridge,model,input:[{role:'user',content:singleUser}],instructions:orchestrationInstructions,toolsEnabled:requiresExperts,requireFirstSpecialist:requiresExperts,maxSpecialistCalls:6,requireSuccessfulSpecialists:requiresExperts,minSuccessfulSpecialists:requiresExperts?2:0,minDistinctSpecialistProviders:requiresExperts?2:0,onEvent:event=>{if(event.type==='chief_research')updateToneMission({chiefState:'researching',stage:'GPT-6 Luna sedang melakukan riset awal',activeRole:'tone_architect'});else if(event.type==='specialist_requested')updateToneMission({chiefState:'delegating',stage:'Luna menugaskan ahli '+event.round+' · '+String(event.role||'').replaceAll('_',' '),activeRole:event.role||'tone_architect'});else if(event.type==='specialist_completed')updateToneMission({chiefState:'reviewing',stage:'Luna menilai hasil '+String(event.role||'').replaceAll('_',' '),activeRole:'tone_architect'});else if(event.type==='chief_synthesis')updateToneMission({chiefState:'synthesizing',stage:'GPT-6 Luna sedang menyatukan riset dan hasil dua ahli',activeRole:'tone_architect'});else if(event.type==='complete')updateToneMission({chiefState:'validating',stage:'Memeriksa parameter terhadap katalog MG-30 Gen 2',activeRole:'tone_architect'});},runSpecialist:args=>runToneSpecialistTask(args,{prompt,conversation,catalog,snapshot,model,...specialistDispatchContext})});
  let namSearchTerms='';
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
   try{validated=validateAiTonePlan(corrected,catalog);first=corrected;}
   catch(secondError){throw new Error('AI could not produce a catalog-valid Tone Plan after one correction. No MIDI changes were sent. '+secondError.message);}
  }
  if(namModeActive&&!activeNamContext){
   const derivedSearch=await deriveNamSearchQuery(prompt,conversation);
   namSearchTerms=normalizeNamSearchTerms(derivedSearch.query)||fallbackNamSearchTerms(prompt);
  }
  validated.completePresetState=!localRefinement;
  if(namSearchTerms)Object.defineProperty(validated,'search_terms',{value:namSearchTerms,enumerable:false,configurable:false});
  return validated;
 }

 function toneCatalogFingerprint(catalog){
  return JSON.stringify((Array.isArray(catalog)?catalog:[]).map(block=>({
   id:String(block?.id||'').trim().toUpperCase(),
   currentModel:String(block?.currentModel||''),
   models:(block?.models||[]).map(model=>({
    name:String(model?.name||''),kind:String(model?.kind||''),slot:model?.slot??null,
    parameters:(model?.parameters||[]).map(parameter=>({
     key:String(parameter?.key||''),kind:String(parameter?.kind||'range'),
     choices:(parameter?.choices||[]).map(choice=>Number(choice.value))
    }))
   }))
  })));
 }
 function renderToneProposalText(proposal){
  const plan=proposal?.plan||{},baseline=proposal?.baselineSnapshot||[];
  const rows=(plan.blocks||[]).map(block=>{
   const id=String(block.id||'').toUpperCase();
   const current=baseline.find(item=>String(item?.id||'').toUpperCase()===id);
   const changes=Object.entries(block.parameters||{}).map(([key,value])=>{
    const before=current?.parameters?.[key];
    return key+': '+(before===undefined?'(nilai belum terbaca)':before)+' → '+value;
   });
   if(block.enabled!==undefined&&Boolean(block.enabled)!==Boolean(current?.enabled))changes.push('Status: '+(current?.enabled?'ON':'OFF')+' → '+(block.enabled?'ON':'OFF'));
   return id+' · '+block.model+(changes.length?'\n  '+changes.join('\n  '):'');
  });
  const noteRows=Array.isArray(plan.notes)?plan.notes.filter(Boolean).map(note=>'• '+String(note)):[];
  return 'USULAN TWEAK PRESET AKTIF\n'+String(plan.summary||'Perubahan kecil pada tone saat ini.')+
   '\n\nPerubahan yang diusulkan:\n'+(rows.length?rows.join('\n\n'):'Tidak ada perubahan parameter yang tervalidasi.')+
   (noteRows.length?'\n\nCatatan:\n'+noteRows.join('\n'):'')+
   '\n\nBelum ada MIDI yang dikirim dan preset belum diubah.\nKetik SETUJU atau TERAPKAN PERUBAHAN untuk menerapkan usulan ini. Ketik BATALKAN untuk membuangnya.';
 }
 async function makeToneRefinementProposal(prompt,bridge,conversation=''){
  if(!bridge?.isConnected?.())throw new Error('Hubungkan MG-30 melalui USB-MIDI dahulu agar saya dapat membaca preset aktif sebelum membuat usulan tweak.');
  if(typeof bridge.refreshSnapshot!=='function')throw new Error('Readback MG-30 tidak tersedia. Tidak ada usulan yang dibuat.');
  await bridge.refreshSnapshot();
  const catalog=bridge.getCatalog?.()||[],snapshot=bridge.getSnapshot?.()||[];
  if(!catalog.length||!snapshot.length)throw new Error('Katalog atau snapshot preset aktif MG-30 kosong. Sinkronkan perangkat sebelum meminta tweak.');
  const baselineSnapshot=clone(snapshot),snapshotSignature=toneSnapshotFingerprint(baselineSnapshot),catalogSignature=toneCatalogFingerprint(catalog);
  const system=systemPrompt(catalog,snapshot,false)+
   '\n\nCURRENT PRESET REFINEMENT — PROPOSAL ONLY. You are GPT-6 Luna. Do not create a new preset, do not redesign the signal chain, and do not call external specialists. Evaluate only the currently active MG-30 edit buffer. Return a small delta Tone Plan proposal using the exact current block models. Keep all block models unchanged. Do not change block ON/OFF unless the user explicitly asks for it. Do not add, remove, reorder or replace blocks. Do not create new preset state. Every block ID, model name and parameter key must be copied exactly from the supplied live catalog. Every parameter must belong to that exact current model. If a parameter is not present, do not invent it. Preserve NAM/AMP slot 10, IR, Send/Return, Volume, scenes, MIDI mappings, signal-chain order, preset slot and all unrelated settings. Keep completePresetState false. The output is only a recommendation; no MIDI or device write will occur now. Include short Indonesian notes explaining each musical recommendation.';
  const recent=compactNamConversation(conversation,1400);
  const user=(recent?'RECENT TONE DISCUSSION:\n'+recent+'\n\n':'')+
   'CURRENT PRESET BASELINE (authoritative live snapshot):\n'+JSON.stringify(snapshot)+
   '\n\nCURRENT USER REQUEST:\n'+String(prompt||'').slice(0,700)+
   '\n\nReturn only a delta Tone Plan with one or more exact current block IDs and exact current models. Recommend only the smallest useful changes.';
  let raw;
  raw=await askLunaNamJson(system,user,'GPT-6 Luna proposing a focused current-tone refinement',720);
  let validated;
  try{
   validated=validateAiTonePlan(raw,catalog);
  }catch(error){
   const correctionSystem=system+'\n\nCORRECTION: The previous proposal failed exact hardware catalogue validation. Return a corrected delta only. Use only exact current block IDs, exact current model names and parameter keys listed below. Do not change any model. Omit any unsupported or uncertain control. If there is no valid useful delta, return one safe supported small change or state the limitation in notes without fabricating a parameter.';
   const correctionUser=JSON.stringify({
    original_request:prompt,
    validation_error:String(error?.message||error).slice(0,400),
    invalid_proposal:raw,
    authoritative_catalog:compactToneContext(catalog,snapshot)
   });
   const corrected=await askLunaNamJson(correctionSystem,correctionUser,'correcting the focused tone refinement proposal',720);
   validated=validateAiTonePlan(corrected,catalog);
  }
  const currentById=new Map(snapshot.map(block=>[String(block?.id||'').toUpperCase(),block]));
  for(const change of validated.blocks){
   const id=String(change.id||'').toUpperCase(),current=currentById.get(id);
   if(!current)throw new Error('Usulan menyentuh blok '+id+' yang tidak ada pada snapshot aktif.');
   if(String(change.model||'')!==String(current.model||''))throw new Error('Usulan mencoba mengganti model '+id+'. Untuk menjaga preset aktif, tweak hanya boleh mengubah parameter pada model yang sedang digunakan.');
   if(activeNamContext&&id==='AMP')throw new Error('AMP/NAM slot 10 dikunci selama tweak. Usulan tidak boleh mengubah sumber AMP NAM.');
  }
  if(validated.completePresetState)throw new Error('Proposal refinement tidak boleh menjadi preset lengkap.');
  validated.completePresetState=false;
  if(!validated.blocks.length)throw new Error('GPT-6 Luna tidak menemukan perubahan parameter yang valid untuk diusulkan.');
  return {plan:validated,baselineSnapshot,snapshotSignature,catalogSignature,createdAt:Date.now(),prompt:String(prompt||'')};
 }
 async function applyPendingToneProposal(bridge){
  const proposal=pendingToneProposal;
  if(!proposal)throw new Error('Tidak ada usulan tweak yang menunggu persetujuan.');
  if(!bridge?.isConnected?.())throw new Error('Hubungkan MG-30 via USB-MIDI dahulu. Usulan tetap tersimpan dan belum diterapkan.');
  await bridge.refreshSnapshot();
  const liveSnapshot=bridge.getSnapshot?.()||[],liveCatalog=bridge.getCatalog?.()||[];
  if(toneSnapshotFingerprint(liveSnapshot)!==proposal.snapshotSignature){
   pendingToneProposal=null;
   throw new Error('Preset atau parameter pada MG-30 sudah berubah sejak usulan dibuat. Usulan lama dibatalkan agar tidak menimpa perubahan baru. Minta analisis/usulan baru dari preset yang sekarang.');
  }
  if(toneCatalogFingerprint(liveCatalog)!==proposal.catalogSignature){
   pendingToneProposal=null;
   throw new Error('Katalog hardware berubah sejak usulan dibuat. Usulan lama dibatalkan; buat usulan baru berdasarkan katalog terkini.');
  }
  const plan=validateAiTonePlan(proposal.plan,liveCatalog);
  if(plan.completePresetState||plan.blocks.some(block=>{
   const current=liveSnapshot.find(item=>String(item?.id||'').toUpperCase()===String(block.id||'').toUpperCase());
   return !current||String(block.model||'')!==String(current.model||'')||(activeNamContext&&String(block.id).toUpperCase()==='AMP');
  }))throw new Error('Usulan tidak lagi memenuhi aturan delta-only hardware. Tidak ada MIDI yang dikirim.');
  const result=await bridge.applyPlan(plan);
  pendingToneProposal=null;
  last={before:result.before,after:result.after,blocks:result.blocks};
  ui.undo.disabled=false;
  const rows=(result.blockResults||[]).map(item=>item.id+' '+(item.enabled?'ON':'OFF')+' ('+item.status+')').join(' · ');
  const reply='Usulan tweak telah diterapkan.\nReadback MG-30: '+(result.verified?'cocok dan terverifikasi':'belum terverifikasi')+'\n'+(rows||'Tidak ada blok berubah.');
  message('ai',reply);rememberConversation('assistant',reply);
  status(result.verified?'Tweak diterapkan dan diverifikasi melalui readback MG-30.':'Perintah tweak terkirim; readback belum terverifikasi.','success');
  return result;
 }
 async function submit(){
  if(busy)return;
  const prompt=ui.prompt.value.trim();
  if(!prompt){status('Enter a tone request first.','error');return;}
  const conversation=conversationContextText();
  if(pendingToneProposal&&toneProposalCancelCommand(prompt)){
   rememberConversation('user',prompt);message('user',prompt);
   pendingToneProposal=null;
   const reply='Usulan tweak dibatalkan. Tidak ada MIDI yang dikirim dan preset aktif tidak berubah.';
   message('ai',reply);rememberConversation('assistant',reply);
   ui.prompt.value='';$('aiToneCount').textContent='0/1400';status('Usulan dibatalkan.','idle');return;
  }
  if(pendingToneProposal&&toneProposalApprovalCommand(prompt)){
   rememberConversation('user',prompt);message('user',prompt);
   setBusy(true);status('Memeriksa ulang preset aktif sebelum menerapkan usulan…','busy');
   try{
    await applyPendingToneProposal(window.MG30AIToneBridge);
    ui.prompt.value='';$('aiToneCount').textContent='0/1400';
   }catch(error){
    const detail=String(error?.message||error);
    message('ai',detail);
    status('Usulan belum diterapkan: '+detail,'error');
   }finally{setBusy(false);ui.undo.disabled=!last;}
   return;
  }
  const contextualToneContinuation=isToneCreationFollowUp(prompt,conversation);
  const intent=classifyAssistantIntent(prompt,conversation);
  activityMode=intent==='consultation'?'discussion':intent==='tone_create'?'tone':intent==='tone_refine'?'refinement':'generic';
  toneMission=null;if(activityMode==='tone')beginToneMission(prompt,true);
  const resumePendingTone=Boolean(pendingToneApply&&/\b(lanjutkan|terapkan|apply|pasang|kirim|continue|resume)\b/i.test(prompt));
  const resumesImportedNamPlan=Boolean(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt);
  const keepToneSessionForContinuation=contextualToneContinuation&&Boolean(toneSession.sourcePrompt)&&conversation.includes(toneSession.sourcePrompt);
  if(intent==='tone_create'&&!resumesImportedNamPlan&&!keepToneSessionForContinuation&&!resumePendingTone){toneSession.intent=null;toneSession.architectProvider='';toneSession.sourcePrompt='';pendingToneApply=null;pendingToneProposal=null;}
  rememberConversation('user',prompt);
  setBusy(true);message('user',prompt);status(activityMode==='discussion'?'GPT-5.6 Luna is thinking…':activityMode==='tone'?'GPT-6 Luna is preparing your preset…':activityMode==='refinement'?'GPT-6 Luna is preparing a tweak proposal…':'AI is processing your request…','busy');
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
   if(intent==='tone_refine'){
    status('GPT-6 Luna is reading the active MG-30 preset and preparing a proposal…','busy');
    const proposal=await makeToneRefinementProposal(prompt,bridge,conversation);
    pendingToneProposal=proposal;
    const proposalText=renderToneProposalText(proposal);
    message('ai',proposalText);rememberConversation('assistant',proposalText);
    ui.prompt.value='';$('aiToneCount').textContent='0/1400';
    status('Usulan tweak siap. Menunggu persetujuan; belum ada MIDI yang dikirim.','success');
    return;
   }
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
    const ampChange={id:'AMP',model:installed.name,enabled:true,parameters:{}};
    if(existing>=0)plan.blocks[existing]=ampChange;else plan.blocks.unshift(ampChange);
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
   const statusLabels={applied:'Diterapkan',disabled:'Dimatikan',unchanged:'Tidak berubah',unverified:'Belum terverifikasi'};
   const blockReport=(result.blockResults||[]).map(item=>item.id+' '+(item.enabled?'ON':'OFF')+' ('+(statusLabels[item.status]||item.status)+')').join(' · ');
   const reply=appliedSummary+'\nReadback perangkat: '+(result.verified?'cocok dengan target':'belum terverifikasi')+'\nStatus blok: '+(blockReport||'tidak ada perubahan')+(appliedNotes.length?'\n'+appliedNotes.join(' · '):'');
   message('ai',reply);rememberConversation('assistant',reply);
   ui.prompt.value='';$('aiToneCount').textContent='0/1400';
   status(result.verified?(intent==='tone_refine'?'Tone refinement applied and verified by MG-30 readback.':'Preset applied and verified by MG-30 readback.'):'Tone commands sent; device state is unverified.','success');
   if(pendingNamSelection?.imported&&pendingNamSelection.prompt===prompt)pendingNamSelection=null;
  }catch(error){const detail=String(error?.message||error).slice(0,1800);if(activityMode==='tone'&&toneMission){toneMission.error=detail;const quorumFailure=/All unused specialist providers failed role|requires at least two configured external specialist providers/i.test(detail);message('ai',quorumFailure?'Preset not created: the specialist team could not complete the required research. No Tone Plan was generated and no preset changes were applied.':'Preset creation stopped. Open Mission Control → Provider diagnostics for the reason.');status(quorumFailure?'Preset creation stopped: specialist quorum not reached.':'Preset creation failed. See Mission Control diagnostics.','error');}else{message('ai','Failed: '+detail);status('Failed: '+detail,'error');}}
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
