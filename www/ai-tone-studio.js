import { registerPlugin } from '@capacitor/core';
const SecureStore=registerPlugin('MG30SecureStore');
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
async function postJson(url,options){
 const ctl=new AbortController(),timer=window.setTimeout(()=>ctl.abort(),90000);
 try{
  const r=await fetch(url,{...options,signal:ctl.signal}),raw=await r.text();let data={};
  try{data=raw?JSON.parse(raw):{}}catch{data={rawText:raw}}
  if(!r.ok)throw new Error(data?.error?.message||data?.message||('HTTP '+r.status));
  return data;
 }catch(e){if(e?.name==='AbortError')throw new Error('The AI request timed out after 90 seconds.');throw e;}
 finally{window.clearTimeout(timer);}
}
function systemPrompt(catalog,snapshot,review){
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
 'Preserve every block not listed. Provide sensible moderate tone settings. Keep the summary and notes in English. Always respond in English, regardless of the language used in the user prompt.'
 ];
 if(review)lines.push('You are the Gemini reviewer in collaboration mode. Critique the GPT proposal for tone balance and catalog correctness, then return the complete final changed-block proposal, not commentary only.');
 return lines.join('\n')+'\n\nAPP CATALOG:\n'+JSON.stringify(catalog)+'\n\nCURRENT EDITOR:\n'+JSON.stringify(snapshot);
}
function userText(prompt,candidate,namContext){return 'USER REQUEST:\n'+prompt+(namContext?'\n\nINSTALLED NAM CONTEXT:\n'+namContext:'')+(candidate?'\n\nGPT PROPOSAL TO REVIEW:\n'+JSON.stringify(candidate):'')+'\n\nReturn final JSON only.';}
async function secret(provider){const r=await SecureStore.getSecret({provider});return String(r?.value||'');}
async function openai(key,sys,user,model){
 if(!model)throw new Error('Choose an available GPT model in AI Settings.');
 const d=await postJson('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
 body:JSON.stringify({model,input:[{role:'system',content:[{type:'input_text',text:sys}]},{role:'user',content:[{type:'input_text',text:user}]}],text:{format:{type:'json_object'}},max_output_tokens:2600})});
 return parseJson(outputText(d));
}
async function gemini(key,sys,user,model){
 if(!model)throw new Error('Choose an available Gemini model in AI Settings.');
 const m=encodeURIComponent(model);
 const d=await postJson('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
 body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{responseMimeType:'application/json',temperature:.35,maxOutputTokens:2600}})});
 return parseJson(geminiOutput(d));
}
function compatibleChatText(data,provider){
 const content=data?.choices?.[0]?.message?.content;
 const text=typeof content==='string'?content:Array.isArray(content)?content.map(part=>part?.text||'').filter(Boolean).join('\n'):'';
 if(!text.trim())throw new Error((provider==='groq'?'Groq':'OpenRouter')+' returned no text output.');
 return text;
}
async function openAiCompatible(key,sys,user,model,provider){
 if(!model)throw new Error('Choose an available '+(provider==='groq'?'Groq':'OpenRouter')+' model in AI Settings.');
 const base=provider==='groq'?'https://api.groq.com/openai/v1':'https://openrouter.ai/api/v1';
 const data=await postJson(base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
 body:JSON.stringify({model,messages:[{role:'system',content:sys},{role:'user',content:user}],response_format:{type:'json_object'},temperature:.35,max_tokens:2600})});
 return parseJson(compatibleChatText(data,provider));
}
async function getProviderJson(url,headers){
 const ctl=new AbortController(),timer=window.setTimeout(()=>ctl.abort(),30000);
 try{
  const response=await fetch(url,{method:'GET',headers,signal:ctl.signal});
  const raw=await response.text();let body={};
  try{body=raw?JSON.parse(raw):{};}catch{body={rawText:raw};}
  if(!response.ok)throw new Error(body?.error?.message||body?.message||body?.error_description||('HTTP '+response.status));
  return body;
 }catch(error){if(error?.name==='AbortError')throw new Error('Model list request timed out.');throw error;}
 finally{window.clearTimeout(timer);}
}
function isTextChatModel(id){
 return Boolean(id)&&!/(embed|whisper|audio|speech|transcri|\btts\b|image|video|moderation|guard|rerank|realtime|robotics)/i.test(id);
}
export async function listAiProviderModels(provider,key){
 if(!key)throw new Error('Save this provider API key before loading its models.');
 let rows=[];
 if(provider==='gpt'){
  const body=await getProviderJson('https://api.openai.com/v1/models',{Authorization:'Bearer '+key});
  rows=(body.data||[]).filter(row=>/^(gpt-|o[134]-|chatgpt-)/i.test(row.id||'')&&isTextChatModel(row.id)).map(row=>({id:row.id,name:row.id}));
 }else if(provider==='gemini'){
  const body=await getProviderJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',{'x-goog-api-key':key});
  rows=(body.models||[]).filter(row=>(row.supportedGenerationMethods||[]).includes('generateContent')&&isTextChatModel(row.name||''))
   .map(row=>({id:String(row.name||'').replace(/^models\//,''),name:row.displayName||String(row.name||'').replace(/^models\//,'')}));
 }else if(provider==='groq'){
  const body=await getProviderJson('https://api.groq.com/openai/v1/models',{Authorization:'Bearer '+key});
  rows=(body.data||[]).filter(row=>isTextChatModel(row.id||'')).map(row=>({id:row.id,name:row.id}));
 }else if(provider==='openrouter'){
  const body=await getProviderJson('https://openrouter.ai/api/v1/models',{Authorization:'Bearer '+key});
  rows=(body.data||[]).filter(row=>isTextChatModel(row.id||'')&&Number(row?.pricing?.prompt)===0&&Number(row?.pricing?.completion)===0)
   .map(row=>({id:row.id,name:row.name||row.id}));
  rows.unshift({id:'openrouter/free',name:'Auto Free Model Router'});
 }else throw new Error('Unknown AI provider.');
 const seen=new Set();
 return rows.filter(row=>row.id&&!seen.has(row.id)&&seen.add(row.id)).slice(0,100);
}
export function providerFallbackOrder(primary='gemini'){
 const priority=['gemini','groq','openrouter','gpt'];
 const first=priority.includes(primary)?primary:'gemini';
 return [first,...priority.filter(provider=>provider!==first)];
}
export function isRetryableProviderError(error){
 const value=String(error?.message||error||'');
 return /\b(408|425|429|498|500|502|503|504)\b|rate.?limit|resource_exhausted|overloaded|capacity.?exceeded|temporarily unavailable|timed? out|network|failed to fetch|server busy/i.test(value);
}
function niceError(e,provider){
 const s=String(e?.message||e||'Unknown error');
 if(/401|unauthorized|invalid.*key|api key not valid/i.test(s))return provider+': API key was rejected.';
 if(/429|quota|rate.?limit|resource_exhausted/i.test(s))return provider+': quota or rate limit reached; no pedal changes were sent.';
 if(/failed to fetch|network|cors|internet/i.test(s))return provider+': network or provider unavailable; no pedal changes were sent.';
 return provider+': '+s;
}
function style(){
 if($('aiToneCss'))return;
 const s=document.createElement('style');s.id='aiToneCss';
 s.textContent='.ai-tone-midi-transaction #page-editor{pointer-events:none!important;opacity:.92}.ai-tone-open{border-color:#769b3d!important;color:#c5f36b!important;background:#c5f36b12!important}.ai-tone-backdrop{position:fixed;inset:0;z-index:12000;background:#0009;opacity:0;pointer-events:none;transition:opacity .2s}.ai-tone-backdrop.on{opacity:1;pointer-events:auto}.ai-tone-sheet{--ai-tone-max-height:82dvh;position:fixed;z-index:12001;left:50%;bottom:0;transform:translate(-50%,105%);width:min(720px,100%);height:auto;min-height:0;max-height:var(--ai-tone-max-height);display:flex;flex-direction:column;overflow:hidden;border:1px solid #3b4935;border-bottom:0;border-radius:22px 22px 0 0;background:linear-gradient(155deg,#172018,#0d1210);box-shadow:0 -18px 70px #000a;transition:transform .24s ease;padding-bottom:env(safe-area-inset-bottom,0px)}.ai-tone-sheet.on{transform:translate(-50%,0)}.ai-tone-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #2d382b}.ai-tone-head strong{font-size:18px;letter-spacing:.1px}.ai-tone-head small{display:block;color:#96a28e;font-size:10px}.ai-tone-body{padding:12px 14px;flex:0 1 auto;min-height:0;max-height:calc(var(--ai-tone-max-height) - 66px);overflow-y:auto;overscroll-behavior:contain}.ai-tone-provider-row{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.ai-tone-provider{flex:1 1 28%;min-width:82px;border:1px solid #354331;border-radius:10px;background:#101710;color:#aeb9a5;padding:11px 5px;font-size:13px;font-weight:800}.ai-tone-provider.on{border-color:#9cc84f;background:#c5f36b16;color:#d8f8a1}.ai-tone-status{display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.4;color:#aab5a2;margin:7px 1px 10px;min-height:38px;padding:8px 11px;border:1px solid #303c2b;border-radius:11px;background:#0e150f}.ai-tone-status[data-state=busy]{color:#d8f4ac;border-color:#607d39;background:#172316}.ai-tone-status[data-state=busy]::before{content:"";width:16px;height:16px;flex:0 0 16px;border:2px solid #526044;border-top-color:#c5f36b;border-radius:50%;animation:aiToneSpin .8s linear infinite}@keyframes aiToneSpin{to{transform:rotate(360deg)}}.ai-tone-status[data-state=success]{color:#b9ec7b}.ai-tone-status[data-state=error]{color:#ff938c}.ai-tone-messages{display:flex;flex-direction:column;gap:10px;min-height:0;max-height:28dvh;overflow-y:auto;overscroll-behavior:contain;margin-bottom:10px;padding:2px 1px;scrollbar-width:thin}.ai-tone-message{max-width:96%;padding:12px 14px;border:1px solid #303c2b;border-radius:13px;background:#141c14;color:#e1e9dc;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.ai-tone-message.user{align-self:flex-end;background:#24311d;border-color:#516b32}.ai-tone-message.ai{align-self:flex-start}.ai-tone-message small{display:block;color:#9ead91;font-size:10px;font-weight:850;letter-spacing:.45px;margin-bottom:5px}.ai-tone-prompt{width:100%;min-height:62px;max-height:120px;resize:vertical;border:1px solid #3b4934;border-radius:13px;background:#0b110d;color:#f1f5ed;padding:12px;font:13px/1.45 system-ui}.ai-tone-compose{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:8px}.ai-tone-hint{color:#819078;font-size:10px}.ai-tone-send{border:1px solid #b7e65e;border-radius:11px;background:#c5f36b;color:#12170c;font-weight:850;padding:10px 15px}.ai-tone-undo{border:1px solid #536142;border-radius:10px;background:#192218;color:#dce8d2;padding:9px 12px;font-size:11px}.ai-tone-send:disabled,.ai-tone-undo:disabled{opacity:.55}.ai-tone-send:disabled{cursor:progress}#aiToneOpenButton{min-width:62px;min-height:48px;padding:10px 13px!important;font-size:17px!important;font-weight:950!important;letter-spacing:.2px}.ai-tone-icon{border:1px solid #33402e;border-radius:10px;background:#121912;color:#dce8d2;padding:9px 12px}.ai-tone-settings{display:none;border:1px solid #354330;border-radius:13px;background:#101710;padding:12px;margin:2px 0 12px}.ai-tone-settings.on{display:block}.ai-tone-settings h4{margin:0 0 5px;font-size:12px}.ai-tone-settings p{margin:0 0 10px;color:#9ca992;font-size:10px;line-height:1.45}.ai-tone-key-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ai-tone-key-field label{display:block;color:#b8c5af;font-size:10px;margin:0 0 5px}.ai-tone-key-field input,.ai-tone-key-field select{width:100%;min-width:0;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8;padding:9px;font-size:11px}.ai-tone-model-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ai-tone-fallback-toggle{display:flex;align-items:center;gap:9px;margin-top:10px;padding:9px;border:1px solid #354330;border-radius:9px;background:#0d150e;color:#dce8d2;font-size:11px}.ai-tone-fallback-toggle input{accent-color:#c5f36b;width:17px;height:17px}.ai-tone-fallback-toggle small{display:block;margin-top:3px;color:#9ca992;font-size:9px;line-height:1.4}.ai-tone-key-state{display:block;color:#9baa91;font-size:9px;margin-top:5px;min-height:13px}.ai-tone-setting-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ai-tone-setting-actions button{border:1px solid #3d4a35;border-radius:9px;background:#192218;color:#dce8d2;padding:8px 10px;font-size:10px}.ai-tone-setting-actions .primary{background:#c5f36b;color:#10160b}.ai-tone-note{margin-top:9px!important;color:#d3c18d!important;font-size:9px!important}@media(max-width:520px){.ai-tone-key-grid,.ai-tone-model-grid{grid-template-columns:1fr}.ai-tone-sheet{--ai-tone-max-height:84dvh;height:auto;min-height:0;max-height:var(--ai-tone-max-height)}.ai-tone-body{max-height:calc(var(--ai-tone-max-height) - 62px)}.ai-tone-messages{min-height:0;max-height:25dvh}.ai-tone-provider{font-size:12px}}';
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
 '<div class="ai-tone-body"><div class="ai-tone-settings" id="aiToneSettings"><h4>AI Providers & Models</h4><p>Provider API keys are encrypted on this Android device with Android Keystore. Model lists are loaded from each provider using the saved key.</p>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiOpenAiKey">OpenAI API Key (GPT)</label><input id="aiOpenAiKey" type="password" autocomplete="off" placeholder="sk-…"><span class="ai-tone-key-state" id="aiOpenAiKeyState">Not checked</span></div><div class="ai-tone-key-field"><label for="aiGeminiKey">Gemini API Key</label><input id="aiGeminiKey" type="password" autocomplete="off" placeholder="AIza…"><span class="ai-tone-key-state" id="aiGeminiKeyState">Not checked</span></div></div>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiGroqKey">Groq API Key</label><input id="aiGroqKey" type="password" autocomplete="off" placeholder="Groq API key"><span class="ai-tone-key-state" id="aiGroqKeyState">Not checked</span></div><div class="ai-tone-key-field"><label for="aiOpenRouterKey">OpenRouter API Key</label><input id="aiOpenRouterKey" type="password" autocomplete="off" placeholder="OpenRouter API key"><span class="ai-tone-key-state" id="aiOpenRouterKeyState">Not checked</span></div></div>',
 '<div class="ai-tone-model-grid"><div class="ai-tone-key-field"><label for="aiGeminiModel">Gemini Model</label><select id="aiGeminiModel" data-ai-model="gemini"><option value="">Save key to load models</option></select></div><div class="ai-tone-key-field"><label for="aiGroqModel">Groq Model</label><select id="aiGroqModel" data-ai-model="groq"><option value="">Save key to load models</option></select></div><div class="ai-tone-key-field"><label for="aiOpenRouterModel">OpenRouter Free Model</label><select id="aiOpenRouterModel" data-ai-model="openrouter"><option value="">Save key to load models</option></select></div><div class="ai-tone-key-field"><label for="aiOpenAiModel">GPT Model</label><select id="aiOpenAiModel" data-ai-model="gpt"><option value="">Save key to load models</option></select></div></div>',
 '<label class="ai-tone-fallback-toggle"><input id="aiToneAutoFallback" type="checkbox" checked><span><strong>Automatic fallback</strong><small>Gemini → Groq → OpenRouter → GPT when a provider is temporarily busy</small></span></label>',
 '<div class="ai-tone-setting-actions"><button class="primary" id="aiToneSaveKeys" type="button">Save API Keys</button><button id="aiToneRefreshModels" type="button">Refresh Models</button><button id="aiToneTestOpenAi" type="button">Test GPT</button><button id="aiToneTestGemini" type="button">Test Gemini</button><button id="aiToneTestGroq" type="button">Test Groq</button><button id="aiToneTestOpenRouter" type="button">Test OpenRouter</button><button id="aiToneDeleteOpenAi" type="button">Delete GPT</button><button id="aiToneDeleteGemini" type="button">Delete Gemini</button><button id="aiToneDeleteGroq" type="button">Delete Groq</button><button id="aiToneDeleteOpenRouter" type="button">Delete OpenRouter</button></div>',
 '<p class="ai-tone-note">Free-model quotas still apply. Fallback handles temporary rate-limit, capacity, timeout, network and server failures only. Invalid keys and invalid requests are not retried. API keys are sent directly to providers during requests.</p></div>',
'<div class="ai-tone-provider-row"><button class="ai-tone-provider" data-ai-provider="gpt" type="button">GPT</button><button class="ai-tone-provider on" data-ai-provider="gemini" type="button">Gemini</button><button class="ai-tone-provider" data-ai-provider="groq" type="button">Groq</button><button class="ai-tone-provider" data-ai-provider="openrouter" type="button">OpenRouter</button><button class="ai-tone-provider" data-ai-provider="collab" type="button">GPT + Gemini</button></div>',
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
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),gpt:$('aiOpenAiKey'),gemini:$('aiGeminiKey'),groq:$('aiGroqKey'),openrouter:$('aiOpenRouterKey'),gptModel:$('aiOpenAiModel'),geminiModel:$('aiGeminiModel'),groqModel:$('aiGroqModel'),openrouterModel:$('aiOpenRouterModel'),autoFallback:$('aiToneAutoFallback'),findNam:$('aiToneFindNam'),namWizard:$('aiToneNamWizard'),namResults:$('aiToneNamResults')};
 let mode='gemini',busy=false,last=null,namFlowActive=false,namImportBusy=false,namModeActive=false,activeNamGear='',activeNamContext='',activeNamModelName='',pendingNamSelection=null;const history=[];
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';ui.status.setAttribute('aria-busy',state==='busy'?'true':'false');};
 const message=(role,text)=>{history.push({role,text:String(text)});while(history.length>12)history.shift();ui.messages.innerHTML=history.map(x=>'<div class="ai-tone-message '+x.role+'"><small>'+(x.role==='user'?'YOU':'AI TONE STUDIO')+'</small>'+esc(x.text)+'</div>').join('');ui.messages.scrollTop=ui.messages.scrollHeight;};
 const setBusy=v=>{busy=!!v;ui.send.disabled=busy;ui.send.textContent=busy?'Working…':'Send ↗';ui.prompt.disabled=busy;ui.findNam.disabled=busy||namImportBusy;document.querySelectorAll('[data-ai-provider],[data-ai-model]').forEach(b=>b.disabled=busy);ui.autoFallback.disabled=busy;ui.undo.disabled=busy||!last;ui.namWizard.querySelectorAll('button').forEach(b=>b.disabled=busy);ui.namResults.querySelectorAll('button').forEach(b=>b.disabled=busy);};
 const setMode=v=>{mode=v;document.querySelectorAll('[data-ai-provider]').forEach(b=>b.classList.toggle('on',b.dataset.aiProvider===v));};
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
  message('ai','Automatic TONE3000 NAM mode is ready ('+capture+'). Press Send with your tone request. AI will search, choose an A2-Lite capture, download, validate and import it to slot 10 before creating the preset.');
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
 ui.namResults.addEventListener('click',async event=>{
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
 const modelSelects={gpt:ui.gptModel,gemini:ui.geminiModel,groq:ui.groqModel,openrouter:ui.openrouterModel};
 const modelStorageKey=p=>'mg30-ai-model-'+p;
 function selectedModel(p){return String(modelSelects[p]?.value||localStorage.getItem(modelStorageKey(p))||'').trim();}
 async function refreshProviderModels(provider,quiet=true){
  const select=modelSelects[provider];if(!select)return [];
  const saved=selectedModel(provider),stored=await secret(providerKeyId(provider));
  if(!stored){select.replaceChildren();const o=document.createElement('option');o.value='';o.textContent='Save API key to load models';select.append(o);select.disabled=true;return [];}
  select.disabled=true;
  try{
   const models=await listAiProviderModels(provider,stored);
   if(!models.length)throw new Error('No text-generation models were returned by '+providerNames[provider]+'.');
   select.replaceChildren();
   for(const row of models){const o=document.createElement('option');o.value=row.id;o.textContent=row.name===row.id?row.id:(row.name+' · '+row.id);select.append(o);}
   let chosen=models.some(row=>row.id===saved)?saved:'';
   if(!chosen){
    if(provider==='openrouter')chosen=models.some(row=>row.id==='openrouter/free')?'openrouter/free':models[0].id;
    else if(provider==='gemini')chosen=(models.find(row=>/flash/i.test(row.id)&&!/live|image|tts|audio/i.test(row.id))||models[0]).id;
    else if(provider==='groq')chosen=(models.find(row=>/openai\/gpt-oss-20b/i.test(row.id))||models[0]).id;
    else chosen=(models.find(row=>/mini/i.test(row.id))||models[0]).id;
   }
   select.value=chosen;select.disabled=false;localStorage.setItem(modelStorageKey(provider),chosen);return models;
  }catch(error){
   select.replaceChildren();const o=document.createElement('option');o.value=saved;o.textContent=saved?'Saved model (list refresh failed): '+saved:'Could not load models — tap Refresh Models';select.append(o);select.value=saved;select.disabled=!saved;
   if(!quiet)status(providerNames[provider]+' model list failed: '+(error.message||error),'error');
   return [];
  }
 }
 async function refreshAllProviderModels(quiet=true){
  await Promise.all(['gpt','gemini','groq','openrouter'].map(provider=>refreshProviderModels(provider,quiet)));
 }
 async function keyStates(){
  try{
   const providers=['gpt','gemini','groq','openrouter'];
   const values=await Promise.all(providers.map(provider=>SecureStore.getSecret({provider:providerKeyId(provider)})));
   providers.forEach((provider,index)=>{const id=provider==='gpt'?'aiOpenAiKeyState':provider==='gemini'?'aiGeminiKeyState':provider==='groq'?'aiGroqKeyState':'aiOpenRouterKeyState';$(id).textContent=values[index]?.configured?'Encrypted on this device':'No API key saved';});
   await refreshAllProviderModels(true);
  }catch(error){['aiOpenAiKeyState','aiGeminiKeyState','aiGroqKeyState','aiOpenRouterKeyState'].forEach(id=>{if($(id))$(id).textContent='Secure storage unavailable';});status(error.message,'error');}
 }
 async function saveKeys(){
  try{
   const fields={gpt:ui.gpt,gemini:ui.gemini,groq:ui.groq,openrouter:ui.openrouter};let saved=0;
   for(const [provider,input] of Object.entries(fields)){if(input.value.trim()){await SecureStore.setSecret({provider:providerKeyId(provider),value:input.value.trim()});input.value='';saved++;}}
   await keyStates();status(saved?'API keys securely saved. Provider model lists refreshed.':'No new key entered; checking saved keys and model lists.','success');
  }catch(error){status(error.message||'Failed to save API keys.','error');}
 }
 async function deleteKey(provider){
  try{await SecureStore.deleteSecret({provider:providerKeyId(provider)});await keyStates();status(providerNames[provider]+' API key deleted.','success');}
  catch(error){status(error.message,'error');}
 }
 async function invokeProvider(provider,key,system,user,model){
  if(provider==='gpt')return openai(key,system,user,model);
  if(provider==='gemini')return gemini(key,system,user,model);
  return openAiCompatible(key,system,user,model,provider);
 }
 async function testProvider(provider){
  setBusy(true);status('Testing '+providerNames[provider]+' API…','busy');
  try{
   const key=await secret(providerKeyId(provider));if(!key)throw new Error(providerNames[provider]+' API key has not been saved.');
   await invokeProvider(provider,key,'Return exactly {"status":"ok"}.','Return exactly {"status":"ok"}.',selectedModel(provider));
   status(providerNames[provider]+' API responded successfully.','success');
  }catch(error){status(niceError(error,provider),'error');}
  finally{setBusy(false);}
 }
 async function askNamAIJson(system,user,stage){
  if(mode==='collab'){
   const g=await secret('openai'),m=await secret('gemini');
   if(!g||!m)throw new Error('Collaboration mode requires both GPT and Gemini API keys.');
   status('GPT is '+stage+'…','busy');const draft=await openai(g,system,user,selectedModel('gpt'));
   status('Gemini is reviewing GPT’s '+stage+'…','busy');
   return gemini(m,system+'\nYou are the Gemini reviewer. Verify the proposal against the supplied data, correct unsupported assumptions, and return the same JSON schema only.',user+'\n\nGPT PROPOSAL:\n'+JSON.stringify(draft),selectedModel('gemini'));
  }
  const auto=ui.autoFallback.checked,order=auto?providerFallbackOrder(mode):[mode],missing=[];
  let lastError=null;
  for(let index=0;index<order.length;index++){
   const provider=order[index],key=await secret(providerKeyId(provider));
   if(!key){if(provider===mode)throw new Error(providerNames[provider]+' API key has not been saved.');missing.push(providerNames[provider]+' key');continue;}
   const model=selectedModel(provider);
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
    message('ai',providerNames[provider]+' is temporarily busy ('+(error.message||error)+'). Switching to '+providerNames[next]+'.');
    status(providerNames[provider]+' unavailable. Trying '+providerNames[next]+'…','busy');
   }
  }
  if(lastError)throw new Error('All configured fallback providers were unavailable. Last error: '+(lastError.message||lastError));
  throw new Error('No configured AI provider/model is available. Save a Gemini, Groq, OpenRouter, or GPT API key. Missing: '+missing.join(', '));
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
  const candidates=models.filter(m=>!rejected.includes(String(m.id))).slice(0,18).map(m=>({id:String(m.id),name:m.name,size:m.size,architecture:m.architecture_version??m.architecture,description:m.description,downloadable:Boolean(m.model_url)}));
  if(!candidates.length)throw new Error('No remaining downloadable A2-Lite captures are available in the selected TONE3000 tone.');
  const system='Choose the best downloadable A2-Lite NAM capture for the requested guitar tone from this one TONE3000 tone pack. Return JSON only: {"modelId":"123","reason":"short English reason"}. Select only an ID from CANDIDATES. Do not choose a model without a download URL. Prefer size lite; the file will still be validated against the MG-30 Gen-2 A2-Lite 1,871-weight format before device writes.';
  const result=await askNamAIJson(system,'USER REQUEST:\\n'+prompt+'\\nSELECTED TONE:\\n'+JSON.stringify({name:tone.tone?.name||tone.name,creator:tone.tone?.creator||tone.creator,description:tone.tone?.description||tone.description,gear:tone.gear})+'\\nCANDIDATES:\\n'+JSON.stringify(candidates)+'\\nREJECTED MODEL IDS:\\n'+JSON.stringify(rejected),'selecting the closest A2-Lite capture');
  const model=models.find(m=>String(m.id)===String(result?.modelId||'')&&m.model_url);
  if(!model||rejected.includes(String(model.id)))throw new Error('AI did not select a valid downloadable candidate from this TONE3000 result.');
  return {model,reason:String(result.reason||'')};
 }
 async function automaticNamImportForPrompt(prompt){
  const bridge=window.NUXTONE3000Bridge;
  if(!activeNamGear)throw new Error('Choose Amp Only or Amp + Cab in the NAM source menu before sending this tone request.');
  if(!bridge?.searchTones||!bridge?.loadTone||!bridge?.prepareModel||!bridge?.importModel)throw new Error('The automatic TONE3000 NAM integration is unavailable. Update the AI Studio app.');
  if(!await bridge.hasSession())throw new Error('TONE3000 account is not authenticated. The Publishable Key identifies this app only; it does not sign in your account. Open Device → TONE3000 Settings → Connect TONE3000 Account, finish sign-in, then press Send again.');
  let selected=pendingNamSelection&&pendingNamSelection.prompt===prompt&&pendingNamSelection.gear===activeNamGear?pendingNamSelection.selected:null;
  if(!selected){
   const intent=await deriveNamSearchQuery(prompt);
   message('ai','Searching TONE3000 for “'+intent.query+'” ('+(activeNamGear==='amp'?'Amp Only':'Amp + Cab')+', NAM A2 Lite).');
   status('Searching the TONE3000 NAM catalog…','busy');
   const tones=await bridge.searchTones(intent.query,{gear:activeNamGear});
   if(!tones.length)throw new Error('TONE3000 returned no matching NAM A2 Lite tones for “'+intent.query+'”. Try a more specific amp name or another capture type.');
   const selection=await chooseNamTone(prompt,intent.query,tones);
   message('ai','Selected TONE3000 tone: '+selection.tone.name+(selection.tone.creator?' by @'+selection.tone.creator:'')+'. '+selection.reason);
   const choices=[selection.tone,...tones.filter(t=>String(t.id)!==String(selection.tone.id))].slice(0,3);
   let lastError=null;
   for(const toneChoice of choices){
    status('Loading A2-Lite capture metadata for '+toneChoice.name+'…','busy');
    let snapshot;
    try{snapshot=await bridge.loadTone(toneChoice.id,{silent:true});}catch(error){lastError=error;continue;}
    const candidates=(snapshot?.models||[]).filter(model=>{
     const arch=String(model.architecture_version??model.architecture??'2').trim().toLowerCase();
     const size=String(model.size?.name||model.size?.label||model.size||'').trim().toLowerCase();
     return Boolean(model.model_url)&&/^(2|a2)$/.test(arch)&&(!size||size==='lite');
    });
    if(!candidates.length){lastError=new Error('No downloadable A2-Lite captures in '+toneChoice.name+'.');continue;}
    const rejected=[];
    for(let attempt=0;attempt<Math.min(3,candidates.length);attempt++){
     const choice=await chooseNamModel(prompt,snapshot,candidates,rejected);
     status('Downloading '+choice.model.name+' in the background and checking MG-30 A2-Lite compatibility…','busy');
     try{
      const prepared=await bridge.prepareModel(choice.model.id);
      selected={tone:toneChoice,model:choice.model,prepared,snapshot,reason:choice.reason};break;
     }catch(error){rejected.push(String(choice.model.id));lastError=error;message('ai','Capture '+choice.model.name+' did not pass A2-Lite preflight. Trying another candidate. '+(error.message||error));}
    }
    if(selected)break;
   }
   if(!selected)throw new Error('No candidate from the top TONE3000 results passed the MG-30 Gen-2 A2-Lite validator. '+(lastError?.message||'Try another search phrase.'));
   pendingNamSelection={prompt,gear:activeNamGear,selected};
   message('ai','A2-Lite validation passed: '+selected.model.name+' ('+selected.prepared.weightBytes.toLocaleString()+' weight bytes). Download is ready for slot 10.');
  }else{
   message('ai','Resuming the validated NAM download prepared for slot 10: '+selected.model.name+'.');
  }
  const editor=window.MG30AIToneBridge;
  if(!editor?.isConnected?.()){
   status('NAM found and validated. Connect the MG-30 using USB-MIDI, then press Send again to transfer to slot 10 and build the live preset. No pedal data has been written yet.','success');
   return {pendingConnection:true};
  }
  status('Checking slot 10 and asking before overwrite if occupied…','busy');
  const imported=await bridge.importModel(selected.model.id,{slotNumber:10,confirmOverwrite:true,prepare:false});
  if(imported?.cancelled){pendingNamSelection=null;throw new Error('NAM import canceled. Slot 10 was not changed and no preset was sent.');}
  if(!imported?.success)throw new Error('The automatic NAM import did not complete.');
  pendingNamSelection=null;
  const amp=editor.getCatalog?.().find(block=>block.id==='AMP');
  const slotModel=amp?.models?.find(model=>model.kind==='nam-slot-selection'&&model.slot===10);
  if(!slotModel)throw new Error('NAM imported, but the editor cannot verify AMP NAM Slot 10. No AI preset parameters were sent. Re-read slot metadata.');
  activeNamModelName=slotModel.name;
  activeNamContext='TONE3000 NAM capture "'+selected.model.name+'" from tone "'+selected.tone.name+'" was downloaded, validated as MG-30 Gen-2 A2-Lite, and imported into slot 10. The AMP block must use the exact selection-only model "'+activeNamModelName+'" with no parameters. Never modify NAM internals. Build the requested sound around this capture; adjust only the other permitted tone blocks.';
  message('ai','Imported '+selected.model.name+' from '+selected.tone.name+' into NAM Slot 10. A copy is retained in NAM Library. I will now build the requested preset around this capture.');
  status('NAM installed in slot 10. Building the preset around the imported amp…','busy');
  namModeActive=false;
  return {success:true,tone:selected.tone,model:selected.model,slotModel:slotModel.name};
 }
 async function makePlan(prompt,bridge){
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();if(!catalog?.length)throw new Error('The MG-30 catalog is unavailable.');
  const proposal=await askNamAIJson(systemPrompt(catalog,snapshot,false),userText(prompt,null,activeNamContext),'building your Tone Plan');
  return validateAiTonePlan(proposal,catalog);
 }
 async function submit(){
  if(busy)return;const prompt=ui.prompt.value.trim();if(!prompt){status('Enter a tone request first.','error');return;}
  const bridge=window.MG30AIToneBridge;if(!bridge){status('The MG-30 editor bridge is unavailable. Reload MG30 Studio.','error');return;}if(!namModeActive&&!bridge.isConnected?.()){status('Failed: MG-30 is disconnected. Connect USB-MIDI before generating a built-in amp live preset.','error');return;}
  setBusy(true);message('user',prompt);status(namModeActive?'Preparing the TONE3000 NAM search…':'Checking USB-MIDI connection…','busy');
  try{
   if(namModeActive){const namResult=await automaticNamImportForPrompt(prompt);if(namResult?.pendingConnection)return;}
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
 $('aiToneSettingsToggle').addEventListener('click',()=>{ui.settings.classList.toggle('on');if(ui.settings.classList.contains('on'))void refreshAllProviderModels(true);});
 $('aiToneSaveKeys').addEventListener('click',saveKeys);
 $('aiToneRefreshModels').addEventListener('click',()=>{void refreshAllProviderModels(false);});
 $('aiToneTestOpenAi').addEventListener('click',()=>testProvider('gpt'));$('aiToneTestGemini').addEventListener('click',()=>testProvider('gemini'));
 $('aiToneTestGroq').addEventListener('click',()=>testProvider('groq'));$('aiToneTestOpenRouter').addEventListener('click',()=>testProvider('openrouter'));
 $('aiToneDeleteOpenAi').addEventListener('click',()=>deleteKey('gpt'));$('aiToneDeleteGemini').addEventListener('click',()=>deleteKey('gemini'));
 $('aiToneDeleteGroq').addEventListener('click',()=>deleteKey('groq'));$('aiToneDeleteOpenRouter').addEventListener('click',()=>deleteKey('openrouter'));
 Object.entries(modelSelects).forEach(([provider,select])=>select.addEventListener('change',()=>{if(select.value)localStorage.setItem(modelStorageKey(provider),select.value);}));
 ui.autoFallback.checked=localStorage.getItem('mg30-ai-auto-fallback')!=='0';
 ui.autoFallback.addEventListener('change',()=>localStorage.setItem('mg30-ai-auto-fallback',ui.autoFallback.checked?'1':'0'));
 $('aiToneUndo').addEventListener('click',undo);$('aiToneSend').addEventListener('click',submit);
 ui.prompt.addEventListener('input',()=>{$('aiToneCount').textContent=ui.prompt.value.length+'/1400';});
 ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 document.querySelectorAll('[data-ai-provider]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.aiProvider)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('on')&&!busy)closePanel();});
 window.addEventListener('mg30-midi-connection-state',e=>{if(!e.detail?.connected)status('USB-MIDI disconnected. TONE3000 search can still run; connect MG-30 before slot-10 import or live preset send.','idle');else if(!busy)status('MG-30 connected via USB-MIDI.','success');});
 window.addEventListener('mg30-midi-connected',()=>{if(!busy)status('MG-30 connected. AI live editing is ready.','success');});
 await keyStates();if(window.MG30AIToneBridge?.isConnected?.())status('MG-30 connected via USB-MIDI.','success');
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});else void init();
}
