import { registerPlugin } from '@capacitor/core';
const SecureStore=registerPlugin('MG30SecureStore');
const OPENAI_MODEL='gpt-6-luna',GEMINI_MODEL='gemini-3.8-flash';
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
  if(!Object.keys(parameters).length&&modelName===block.currentModel&&p.enabled===undefined)throw new Error('Block '+id+' has no changes.');
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
 'Never change IR/User/Third Party/Collection IR, NAM, Send/Return, Volume, scene, preset slot, MIDI mapping or signal-chain order.',
 'Do not output MIDI, SysEx, preset bytes or import instructions. The app validates and writes parameter changes through its current editor path.',
 'Preserve every block not listed. Provide sensible moderate tone settings. Keep the summary and notes in English. Always respond in English, regardless of the language used in the user prompt.'
 ];
 if(review)lines.push('You are the Gemini reviewer in collaboration mode. Critique the GPT proposal for tone balance and catalog correctness, then return the complete final changed-block proposal, not commentary only.');
 return lines.join('\n')+'\n\nAPP CATALOG:\n'+JSON.stringify(catalog)+'\n\nCURRENT EDITOR:\n'+JSON.stringify(snapshot);
}
function userText(prompt,candidate){return 'USER REQUEST:\n'+prompt+(candidate?'\n\nGPT PROPOSAL TO REVIEW:\n'+JSON.stringify(candidate):'')+'\n\nReturn final JSON only.';}
async function secret(provider){const r=await SecureStore.getSecret({provider});return String(r?.value||'');}
async function openai(key,sys,user,model){
 const d=await postJson('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
 body:JSON.stringify({model:model||OPENAI_MODEL,input:[{role:'system',content:[{type:'input_text',text:sys}]},{role:'user',content:[{type:'input_text',text:user}]}],text:{format:{type:'json_object'}},max_output_tokens:2600})});
 return parseJson(outputText(d));
}
async function gemini(key,sys,user,model){
 const m=encodeURIComponent(model||GEMINI_MODEL);
 const d=await postJson('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
 body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{responseMimeType:'application/json',temperature:.35,maxOutputTokens:2600}})});
 return parseJson(geminiOutput(d));
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
 s.textContent='.ai-tone-midi-transaction #page-editor{pointer-events:none!important;opacity:.92}.ai-tone-open{border-color:#769b3d!important;color:#c5f36b!important;background:#c5f36b12!important}.ai-tone-backdrop{position:fixed;inset:0;z-index:12000;background:#0009;opacity:0;pointer-events:none;transition:opacity .2s}.ai-tone-backdrop.on{opacity:1;pointer-events:auto}.ai-tone-sheet{position:fixed;z-index:12001;left:50%;bottom:0;transform:translate(-50%,105%);width:min(720px,100%);height:88dvh;min-height:74dvh;max-height:96dvh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #3b4935;border-bottom:0;border-radius:22px 22px 0 0;background:linear-gradient(155deg,#172018,#0d1210);box-shadow:0 -18px 70px #000a;transition:transform .24s ease;padding-bottom:env(safe-area-inset-bottom,0px)}.ai-tone-sheet.on{transform:translate(-50%,0)}.ai-tone-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #2d382b}.ai-tone-head strong{font-size:18px;letter-spacing:.1px}.ai-tone-head small{display:block;color:#96a28e;font-size:10px}.ai-tone-body{padding:12px 14px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}.ai-tone-provider-row{display:flex;gap:7px;margin-bottom:10px}.ai-tone-provider{flex:1;border:1px solid #354331;border-radius:10px;background:#101710;color:#aeb9a5;padding:11px 5px;font-size:13px;font-weight:800}.ai-tone-provider.on{border-color:#9cc84f;background:#c5f36b16;color:#d8f8a1}.ai-tone-status{display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.4;color:#aab5a2;margin:7px 1px 10px;min-height:38px;padding:8px 11px;border:1px solid #303c2b;border-radius:11px;background:#0e150f}.ai-tone-status[data-state=busy]{color:#d8f4ac;border-color:#607d39;background:#172316}.ai-tone-status[data-state=busy]::before{content:"";width:16px;height:16px;flex:0 0 16px;border:2px solid #526044;border-top-color:#c5f36b;border-radius:50%;animation:aiToneSpin .8s linear infinite}@keyframes aiToneSpin{to{transform:rotate(360deg)}}.ai-tone-status[data-state=success]{color:#b9ec7b}.ai-tone-status[data-state=error]{color:#ff938c}.ai-tone-messages{display:flex;flex-direction:column;gap:10px;min-height:190px;max-height:38dvh;overflow-y:auto;overscroll-behavior:contain;margin-bottom:12px;padding:2px 1px}.ai-tone-message{max-width:96%;padding:12px 14px;border:1px solid #303c2b;border-radius:13px;background:#141c14;color:#e1e9dc;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.ai-tone-message.user{align-self:flex-end;background:#24311d;border-color:#516b32}.ai-tone-message.ai{align-self:flex-start}.ai-tone-message small{display:block;color:#9ead91;font-size:10px;font-weight:850;letter-spacing:.45px;margin-bottom:5px}.ai-tone-prompt{width:100%;min-height:92px;max-height:150px;resize:vertical;border:1px solid #3b4934;border-radius:13px;background:#0b110d;color:#f1f5ed;padding:12px;font:13px/1.45 system-ui}.ai-tone-compose{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:8px}.ai-tone-hint{color:#819078;font-size:10px}.ai-tone-send{border:1px solid #b7e65e;border-radius:11px;background:#c5f36b;color:#12170c;font-weight:850;padding:10px 15px}.ai-tone-undo{border:1px solid #536142;border-radius:10px;background:#192218;color:#dce8d2;padding:9px 12px;font-size:11px}.ai-tone-send:disabled,.ai-tone-undo:disabled{opacity:.55}.ai-tone-send:disabled{cursor:progress}#aiToneOpenButton{min-width:62px;min-height:48px;padding:10px 13px!important;font-size:17px!important;font-weight:950!important;letter-spacing:.2px}.ai-tone-icon{border:1px solid #33402e;border-radius:10px;background:#121912;color:#dce8d2;padding:9px 12px}.ai-tone-settings{display:none;border:1px solid #354330;border-radius:13px;background:#101710;padding:12px;margin:2px 0 12px}.ai-tone-settings.on{display:block}.ai-tone-settings h4{margin:0 0 5px;font-size:12px}.ai-tone-settings p{margin:0 0 10px;color:#9ca992;font-size:10px;line-height:1.45}.ai-tone-key-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ai-tone-key-field label{display:block;color:#b8c5af;font-size:10px;margin:0 0 5px}.ai-tone-key-field input{width:100%;min-width:0;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8;padding:9px;font-size:11px}.ai-tone-key-state{display:block;color:#9baa91;font-size:9px;margin-top:5px;min-height:13px}.ai-tone-setting-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ai-tone-setting-actions button{border:1px solid #3d4a35;border-radius:9px;background:#192218;color:#dce8d2;padding:8px 10px;font-size:10px}.ai-tone-setting-actions .primary{background:#c5f36b;color:#10160b}.ai-tone-note{margin-top:9px!important;color:#d3c18d!important;font-size:9px!important}@media(max-width:520px){.ai-tone-key-grid{grid-template-columns:1fr}.ai-tone-sheet{height:91dvh;min-height:84dvh}.ai-tone-messages{min-height:165px;max-height:34dvh}.ai-tone-provider{font-size:12px}}';
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
 '<div class="ai-tone-body"><div class="ai-tone-settings" id="aiToneSettings"><h4>API Provider</h4><p>API keys are encrypted on this Android device with Android Keystore.</p>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiOpenAiKey">OpenAI API Key (GPT)</label><input id="aiOpenAiKey" type="password" autocomplete="off" placeholder="sk-…"><span class="ai-tone-key-state" id="aiOpenAiKeyState">Not checked</span></div>',
 '<div class="ai-tone-key-field"><label for="aiGeminiKey">Gemini API Key</label><input id="aiGeminiKey" type="password" autocomplete="off" placeholder="AIza…"><span class="ai-tone-key-state" id="aiGeminiKeyState">Not checked</span></div></div>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiOpenAiModel">GPT Model</label><input id="aiOpenAiModel" value="gpt-6-luna"></div><div class="ai-tone-key-field"><label for="aiGeminiModel">Gemini Model</label><input id="aiGeminiModel" value="gemini-3.8-flash"></div></div>',
 '<div class="ai-tone-setting-actions"><button class="primary" id="aiToneSaveKeys" type="button">Save API Keys</button><button id="aiToneTestOpenAi" type="button">Test GPT</button><button id="aiToneTestGemini" type="button">Test Gemini</button><button id="aiToneDeleteOpenAi" type="button">Delete GPT</button><button id="aiToneDeleteGemini" type="button">Delete Gemini</button></div>',
 '<p class="ai-tone-note">Encryption protects API keys at rest. During requests, keys are used temporarily and sent directly to the provider. Public distribution should use a backend gateway.</p></div>',
 '<div class="ai-tone-provider-row"><button class="ai-tone-provider on" data-ai-provider="gpt" type="button">GPT</button><button class="ai-tone-provider" data-ai-provider="gemini" type="button">Gemini</button><button class="ai-tone-provider" data-ai-provider="collab" type="button">GPT + Gemini</button></div>',
 '<div class="ai-tone-status" id="aiToneStatus" data-state="idle" role="status" aria-live="polite" aria-busy="false">Waiting for MG-30 connection.</div>',
 '<div class="ai-tone-nam-toolbar"><button class="ai-tone-nam-action" id="aiToneFindNam" type="button">Find a TONE3000 NAM</button></div>',
 '<div class="ai-tone-nam-wizard" id="aiToneNamWizard" hidden></div>',
 '<div class="ai-tone-nam-results" id="aiToneNamResults" hidden></div>',
 '<div class="ai-tone-messages" id="aiToneMessages"><div class="ai-tone-message ai"><small>AI ASSISTANT</small>Describe the tone you want. Validated results update the editor controls and send parameters over USB-MIDI immediately. There is no Apply step.</div></div>',
 '<textarea class="ai-tone-prompt" id="aiTonePrompt" maxlength="1400" placeholder="Example: Create a warm blues-rock tone with mild breakup, low-to-medium gain, present mids, short delay, and light reverb."></textarea>',
 '<div class="ai-tone-compose"><button class="ai-tone-undo" id="aiToneUndo" type="button" disabled>↶ Undo AI Changes</button><div><span class="ai-tone-hint" id="aiToneCount">0/1400</span> <button class="ai-tone-send" id="aiToneSend" type="button">Send ↗</button></div></div>',
 '<p class="ai-tone-hint">Use the editor’s Save to Device button to store the tone. Success confirms MIDI commands were sent; it does not confirm full pedal ACK/readback.</p></div>'
 ].join('');
 document.body.append(shade,sheet);
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),gpt:$('aiOpenAiKey'),gemini:$('aiGeminiKey'),gptModel:$('aiOpenAiModel'),geminiModel:$('aiGeminiModel'),findNam:$('aiToneFindNam'),namWizard:$('aiToneNamWizard'),namResults:$('aiToneNamResults')};
 let mode='gpt',busy=false,last=null,namFlowActive=false,namImportBusy=false;const history=[];
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';ui.status.setAttribute('aria-busy',state==='busy'?'true':'false');};
 const message=(role,text)=>{history.push({role,text:String(text)});while(history.length>12)history.shift();ui.messages.innerHTML=history.map(x=>'<div class="ai-tone-message '+x.role+'"><small>'+(x.role==='user'?'YOU':'AI TONE STUDIO')+'</small>'+esc(x.text)+'</div>').join('');ui.messages.scrollTop=ui.messages.scrollHeight;};
 const setBusy=v=>{busy=!!v;ui.send.disabled=busy;ui.send.textContent=busy?'Working…':'Send ↗';ui.prompt.disabled=busy;ui.findNam.disabled=busy||namImportBusy;document.querySelectorAll('[data-ai-provider]').forEach(b=>b.disabled=busy);ui.undo.disabled=busy||!last;ui.namWizard.querySelectorAll('button').forEach(b=>b.disabled=busy);ui.namResults.querySelectorAll('button').forEach(b=>b.disabled=busy);};
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
 async function beginNamSelection(gear){
  const bridge=window.NUXTONE3000Bridge;
  if(!bridge?.startSelection)throw new Error('The TONE3000 integration bridge is unavailable.');
  namFlowActive=true;ui.namResults.hidden=true;
  ui.namWizard.hidden=false;
  ui.namWizard.innerHTML='<p>Opening TONE3000 Select with the '+(gear==='amp'?'Amp Only':'Amp + Cab')+' filter. Complete the selection in TONE3000 and return to MG30 Studio. Compatible model candidates will appear here.</p>';
  message('ai','Opening TONE3000. Select a tone, then return here to review its A2 model candidates. The selected file will be validated before any pedal write.');
  setBusy(true);status('Opening TONE3000 Select…','busy');
  try{await bridge.startSelection({gear});status('TONE3000 Select opened. Waiting for your tone selection…','success');}
  catch(error){namFlowActive=false;ui.namWizard.hidden=true;throw error;}
  finally{setBusy(false);}
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
   namFlowActive=false;ui.namWizard.hidden=true;
   ui.prompt.value='Use a built-in MG-30 amp model, not a NAM capture. ';ui.prompt.focus();
   message('ai','Built-in MG-30 Amp selected. Describe the sound you want, then send your tone request.');return;
  }
  if(source==='nam'){showNamGearChoice();message('ai','TONE3000 NAM selected. Choose Amp Only or Amp + Cab.');return;}
  const gear=event.target.closest('[data-ai-nam-gear]')?.dataset.aiNamGear;
  if(gear==='amp'||gear==='amp-cab'){
   try{await beginNamSelection(gear);}catch(error){status('TONE3000 could not start: '+(error.message||error),'error');message('ai','TONE3000 selection failed: '+(error.message||error));}
  }
 });
 ui.namResults.addEventListener('click',async event=>{
  const button=event.target.closest('[data-ai-nam-import]');if(!button||namImportBusy)return;
  const modelId=button.dataset.aiNamImport,bridge=window.NUXTONE3000Bridge;
  if(!bridge?.importModel){status('The TONE3000 import bridge is unavailable.','error');return;}
  namImportBusy=true;setBusy(true);status('Checking slot 10 and preparing the NAM download…','busy');
  try{
   const result=await bridge.importModel(modelId,{slotNumber:10,confirmOverwrite:true});
   if(result?.cancelled){message('ai','NAM import canceled. Slot 10 was not changed.');status('Import canceled.','idle');return;}
   if(!result?.success)throw new Error('The NAM import did not complete.');
   namFlowActive=false;ui.namWizard.hidden=true;
   message('ai','Imported '+(result.modelName||'the selected NAM')+' to MG-30 slot 10. A copy is retained in NAM Library. The device protocol confirms write ACKs and slot metadata/name, but does not read back model weights; audition the sound on the pedal.');
   status('NAM imported to slot 10. Play the guitar to verify the capture.','success');
  }catch(error){message('ai','NAM import failed: '+(error.message||error));status('NAM import failed: '+(error.message||error),'error');}
  finally{namImportBusy=false;setBusy(false);}
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
 async function keyStates(){
  try{const v=await Promise.all([SecureStore.getSecret({provider:'openai'}),SecureStore.getSecret({provider:'gemini'})]);
   $('aiOpenAiKeyState').textContent=v[0]?.configured?'Encrypted on this device':'No API key saved';$('aiGeminiKeyState').textContent=v[1]?.configured?'Encrypted on this device':'No API key saved';
  }catch(e){$('aiOpenAiKeyState').textContent='Secure storage unavailable';$('aiGeminiKeyState').textContent='Secure storage unavailable';status(e.message,'error');}
 }
 async function saveKeys(){
  try{if(ui.gpt.value.trim())await SecureStore.setSecret({provider:'openai',value:ui.gpt.value.trim()});if(ui.gemini.value.trim())await SecureStore.setSecret({provider:'gemini',value:ui.gemini.value.trim()});
   ui.gpt.value='';ui.gemini.value='';await keyStates();status('API keys securely saved on this device.','success');
  }catch(e){status(e.message||'Failed to save API keys.','error');}
 }
 async function deleteKey(p){try{await SecureStore.deleteSecret({provider:p});await keyStates();status('The '+p+' API key was deleted.','success');}catch(e){status(e.message,'error');}}
 async function testProvider(p){
  setBusy(true);status('Testing '+p+' API…','busy');
  try{const k=await secret(p);if(!k)throw new Error('API key has not been saved.');
   const prompt='Return exactly {"status":"ok"}.';
   if(p==='openai')await openai(k,prompt,prompt,ui.gptModel.value.trim());else await gemini(k,prompt,prompt,ui.geminiModel.value.trim());
   status('The '+p+' API responded successfully.','success');
  }catch(e){status(niceError(e,p),'error');}finally{setBusy(false);}
 }
 async function makePlan(prompt,bridge){
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();if(!catalog?.length)throw new Error('The MG-30 catalog is unavailable.');
  const sys=systemPrompt(catalog,snapshot,false);
  if(mode==='gpt'){const k=await secret('openai');if(!k)throw new Error('The GPT API key has not been saved.');status('GPT is building your Tone Plan…','busy');return validateAiTonePlan(await openai(k,sys,userText(prompt),ui.gptModel.value.trim()),catalog);}
  if(mode==='gemini'){const k=await secret('gemini');if(!k)throw new Error('The Gemini API key has not been saved.');status('Gemini is building your Tone Plan…','busy');return validateAiTonePlan(await gemini(k,sys,userText(prompt),ui.geminiModel.value.trim()),catalog);}
  const g=await secret('openai'),m=await secret('gemini');if(!g||!m)throw new Error('Collaboration mode requires both API keys.');
  status('GPT is drafting the initial tone…','busy');const first=validateAiTonePlan(await openai(g,sys,userText(prompt),ui.gptModel.value.trim()),catalog);
  status('Gemini is reviewing and refining GPT’s draft…','busy');
  return validateAiTonePlan(await gemini(m,systemPrompt(catalog,snapshot,true),userText(prompt,first),ui.geminiModel.value.trim()),catalog);
 }
 async function submit(){
  if(busy)return;const prompt=ui.prompt.value.trim();if(!prompt){status('Enter a tone request first.','error');return;}
  const bridge=window.MG30AIToneBridge;if(!bridge?.isConnected?.()){status('Failed: MG-30 is disconnected. AI was not called and no parameters were changed.','error');return;}
  setBusy(true);message('user',prompt);status('Checking USB-MIDI connection…','busy');
  try{const plan=await makePlan(prompt,bridge);if(!bridge.isConnected())throw new Error('The MG-30 disconnected before changes could be sent.');
   status('Tone Plan validated. Updating the editor and sending MIDI…','busy');const result=await bridge.applyPlan(plan);
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
 $('aiToneSettingsToggle').addEventListener('click',()=>ui.settings.classList.toggle('on'));
 $('aiToneSaveKeys').addEventListener('click',saveKeys);
 $('aiToneTestOpenAi').addEventListener('click',()=>testProvider('openai'));$('aiToneTestGemini').addEventListener('click',()=>testProvider('gemini'));
 $('aiToneDeleteOpenAi').addEventListener('click',()=>deleteKey('openai'));$('aiToneDeleteGemini').addEventListener('click',()=>deleteKey('gemini'));
 $('aiToneUndo').addEventListener('click',undo);$('aiToneSend').addEventListener('click',submit);
 ui.prompt.addEventListener('input',()=>{$('aiToneCount').textContent=ui.prompt.value.length+'/1400';});
 ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 document.querySelectorAll('[data-ai-provider]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.aiProvider)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('on')&&!busy)closePanel();});
 window.addEventListener('mg30-midi-connection-state',e=>{if(!e.detail?.connected)status('USB-MIDI disconnected. AI operations are paused until the pedal reconnects.','error');else if(!busy)status('MG-30 connected via USB-MIDI.','success');});
 window.addEventListener('mg30-midi-connected',()=>{if(!busy)status('MG-30 connected. AI live editing is ready.','success');});
 await keyStates();if(window.MG30AIToneBridge?.isConnected?.())status('MG-30 connected via USB-MIDI.','success');
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});else void init();
}
