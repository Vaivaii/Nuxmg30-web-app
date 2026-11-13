import { registerPlugin } from '@capacitor/core';
const SecureStore=registerPlugin('MG30SecureStore');
const OPENAI_MODEL='gpt-6-astra',GEMINI_MODEL='gemini-3.8-flash';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));

export function validateAiTonePlan(plan,catalog){
 if(!plan||typeof plan!=='object'||!Array.isArray(plan.blocks)||plan.blocks.length<1||plan.blocks.length>9)throw new Error('Tone Plan AI tidak valid atau tidak berisi perubahan.');
 const seen=new Set(),blocks=[];
 for(const p of plan.blocks){
  const id=String(p?.id||'').trim().toUpperCase(),block=catalog.find(x=>x.id===id);
  if(seen.has(id))throw new Error('Blok '+id+' duplikat.');
  seen.add(id);
  if(!block)throw new Error('Blok '+id+' tidak diizinkan.');
  const modelName=String(p.model||'').trim(),model=block.models.find(x=>x.name===modelName);
  if(!model)throw new Error('Model '+modelName+' tidak ada di katalog '+id+'.');
  if(p.enabled!==undefined&&typeof p.enabled!=='boolean')throw new Error('Status ON/OFF '+id+' tidak valid.');
  if(!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters))throw new Error('Parameter '+id+' tidak valid.');
  const allowed=new Map(model.parameters.map(x=>[x.key,x])),parameters={};
  for(const [key,raw] of Object.entries(p.parameters)){
   const d=allowed.get(key),v=Number(raw);
   if(!d)throw new Error('Parameter '+key+' tidak tersedia pada '+id+'/'+modelName+'.');
   if(!Number.isFinite(v))throw new Error('Nilai '+key+' bukan angka.');
   if(d.kind==='discrete'?!d.choices.some(x=>Number(x.value)===v):v<0||v>100)throw new Error('Nilai '+id+'.'+key+' di luar pilihan/rentang.');
   parameters[key]=v;
  }
  if(modelName!==block.currentModel){
   const missing=model.parameters.filter(x=>!Object.prototype.hasOwnProperty.call(parameters,x.key));
   if(missing.length)throw new Error('Ganti model '+id+' harus menyertakan semua parameter: '+missing.map(x=>x.key).join(', '));
  }
  if(!Object.keys(parameters).length&&modelName===block.currentModel&&p.enabled===undefined)throw new Error('Blok '+id+' tidak memiliki perubahan.');
  blocks.push({id,model:modelName,enabled:p.enabled,parameters});
 }
 return {summary:String(plan.summary||'Tone diperbarui oleh AI.').slice(0,420),blocks,notes:Array.isArray(plan.notes)?plan.notes.map(x=>String(x).slice(0,180)).slice(0,5):[]};
}
function parseJson(text){
 const s=String(text||'').trim(),a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a<0||b<=a)throw new Error('Respons AI tidak berisi JSON Tone Plan.');
 return JSON.parse(s.slice(a,b+1));
}
function outputText(data){
 if(typeof data?.output_text==='string')return data.output_text;
 const a=[];for(const item of data?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')a.push(c.text);
 if(!a.length)throw new Error('GPT tidak memberikan output teks.');return a.join('\n');
}
function geminiOutput(data){
 const a=data?.candidates?.[0]?.content?.parts||[],s=a.map(x=>x?.text||'').filter(Boolean).join('\n');
 if(!s)throw new Error('Gemini tidak memberikan output teks.');return s;
}
async function postJson(url,options){
 const ctl=new AbortController(),timer=window.setTimeout(()=>ctl.abort(),90000);
 try{
  const r=await fetch(url,{...options,signal:ctl.signal}),raw=await r.text();let data={};
  try{data=raw?JSON.parse(raw):{}}catch{data={rawText:raw}}
  if(!r.ok)throw new Error(data?.error?.message||data?.message||('HTTP '+r.status));
  return data;
 }catch(e){if(e?.name==='AbortError')throw new Error('Permintaan AI melewati batas waktu 90 detik.');throw e;}
 finally{window.clearTimeout(timer);}
}
function systemPrompt(catalog,snapshot,review){
 const lines=[
 'You are a live tone editor for the original NUX MG-30 Gen 2 firmware 6.0.x, never MKII.',
 'Return only JSON: {"summary":"Indonesian summary","blocks":[{"id":"AMP","model":"Deluxe Rvb","enabled":true,"parameters":{"gain":35}}],"notes":[]}.',
 'Only include blocks you intend to change. Use exact block ids, model names and parameter keys from the app catalog.',
 'Rotary/selector values are normalized 0..100. Discrete controls must use an exact numeric choice from the catalog.',
 'When changing model, include every writable parameter for that model. When keeping the current model, include only parameters to change.',
 'Never invent models, parameter names, effect identifiers, MIDI CC values or unsupported features.',
 'Never change IR/User/Third Party/Collection IR, NAM, Send/Return, Volume, scene, preset slot, MIDI mapping or signal-chain order.',
 'Do not output MIDI, SysEx, preset bytes or import instructions. The app validates and writes parameter changes through its current editor path.',
 'Preserve every block not listed. Provide sensible moderate tone settings. Keep summary and notes in Indonesian.'
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
 if(/401|unauthorized|invalid.*key|api key not valid/i.test(s))return provider+': API key ditolak.';
 if(/429|quota|rate.?limit|resource_exhausted/i.test(s))return provider+': kuota/rate limit tercapai; tidak ada perubahan pedal dikirim.';
 if(/failed to fetch|network|cors|internet/i.test(s))return provider+': jaringan/provider tidak dapat dijangkau; tidak ada perubahan pedal dikirim.';
 return provider+': '+s;
}
function style(){
 if($('aiToneCss'))return;
 const s=document.createElement('style');s.id='aiToneCss';
 s.textContent='.ai-tone-midi-transaction #page-editor{pointer-events:none!important;opacity:.92}.ai-tone-open{border-color:#769b3d!important;color:#c5f36b!important;background:#c5f36b12!important}.ai-tone-backdrop{position:fixed;inset:0;z-index:12000;background:#0009;opacity:0;pointer-events:none;transition:opacity .2s}.ai-tone-backdrop.on{opacity:1;pointer-events:auto}.ai-tone-sheet{position:fixed;z-index:12001;left:50%;bottom:0;transform:translate(-50%,105%);width:min(720px,100%);max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #3b4935;border-bottom:0;border-radius:22px 22px 0 0;background:linear-gradient(155deg,#172018,#0d1210);box-shadow:0 -18px 70px #000a;transition:transform .24s ease;padding-bottom:env(safe-area-inset-bottom,0px)}.ai-tone-sheet.on{transform:translate(-50%,0)}.ai-tone-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #2d382b}.ai-tone-head strong{font-size:14px}.ai-tone-head small{display:block;color:#96a28e;font-size:10px}.ai-tone-body{padding:12px 14px;overflow:auto}.ai-tone-provider-row{display:flex;gap:7px;margin-bottom:10px}.ai-tone-provider{flex:1;border:1px solid #354331;border-radius:10px;background:#101710;color:#aeb9a5;padding:9px 5px;font-size:11px;font-weight:750}.ai-tone-provider.on{border-color:#9cc84f;background:#c5f36b16;color:#d8f8a1}.ai-tone-status{font-size:11px;color:#aab5a2;margin:7px 1px 10px;min-height:17px}.ai-tone-status[data-state=success]{color:#b9ec7b}.ai-tone-status[data-state=error]{color:#ff938c}.ai-tone-messages{display:flex;flex-direction:column;gap:8px;max-height:190px;overflow:auto;margin-bottom:10px}.ai-tone-message{max-width:94%;padding:10px 12px;border:1px solid #303c2b;border-radius:13px;background:#141c14;color:#e1e9dc;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.ai-tone-message.user{align-self:flex-end;background:#24311d;border-color:#516b32}.ai-tone-message.ai{align-self:flex-start}.ai-tone-message small{display:block;color:#9ead91;font-size:9px;font-weight:800;margin-bottom:4px}.ai-tone-prompt{width:100%;min-height:76px;max-height:150px;resize:vertical;border:1px solid #3b4934;border-radius:13px;background:#0b110d;color:#f1f5ed;padding:12px;font:13px/1.45 system-ui}.ai-tone-compose{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:8px}.ai-tone-hint{color:#819078;font-size:10px}.ai-tone-send{border:1px solid #b7e65e;border-radius:11px;background:#c5f36b;color:#12170c;font-weight:850;padding:10px 15px}.ai-tone-undo{border:1px solid #536142;border-radius:10px;background:#192218;color:#dce8d2;padding:9px 12px;font-size:11px}.ai-tone-send:disabled,.ai-tone-undo:disabled{opacity:.4}.ai-tone-icon{border:1px solid #33402e;border-radius:10px;background:#121912;color:#dce8d2;padding:9px 12px}.ai-tone-settings{display:none;border:1px solid #354330;border-radius:13px;background:#101710;padding:12px;margin:2px 0 12px}.ai-tone-settings.on{display:block}.ai-tone-settings h4{margin:0 0 5px;font-size:12px}.ai-tone-settings p{margin:0 0 10px;color:#9ca992;font-size:10px;line-height:1.45}.ai-tone-key-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ai-tone-key-field label{display:block;color:#b8c5af;font-size:10px;margin:0 0 5px}.ai-tone-key-field input{width:100%;min-width:0;border:1px solid #3b4934;border-radius:9px;background:#090e0b;color:#edf3e8;padding:9px;font-size:11px}.ai-tone-key-state{display:block;color:#9baa91;font-size:9px;margin-top:5px;min-height:13px}.ai-tone-setting-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ai-tone-setting-actions button{border:1px solid #3d4a35;border-radius:9px;background:#192218;color:#dce8d2;padding:8px 10px;font-size:10px}.ai-tone-setting-actions .primary{background:#c5f36b;color:#10160b}.ai-tone-note{margin-top:9px!important;color:#d3c18d!important;font-size:9px!important}@media(max-width:520px){.ai-tone-key-grid{grid-template-columns:1fr}.ai-tone-messages{max-height:145px}.ai-tone-provider{font-size:10px}}';
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
 '<div class="ai-tone-head"><div><strong>✦ AI Live Tone Assistant</strong><small>Perintah langsung ke editor · MG-30 Gen 2</small></div><div><button class="ai-tone-icon" id="aiToneSettingsToggle" type="button">⚙</button> <button class="ai-tone-icon" id="aiToneClose" type="button">×</button></div></div>',
 '<div class="ai-tone-body"><div class="ai-tone-settings" id="aiToneSettings"><h4>API Provider</h4><p>API key disimpan terenkripsi di perangkat Android menggunakan Android Keystore.</p>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiOpenAiKey">OpenAI API Key (GPT)</label><input id="aiOpenAiKey" type="password" autocomplete="off" placeholder="sk-…"><span class="ai-tone-key-state" id="aiOpenAiKeyState">Belum diperiksa</span></div>',
 '<div class="ai-tone-key-field"><label for="aiGeminiKey">Gemini API Key</label><input id="aiGeminiKey" type="password" autocomplete="off" placeholder="AIza…"><span class="ai-tone-key-state" id="aiGeminiKeyState">Belum diperiksa</span></div></div>',
 '<div class="ai-tone-key-grid"><div class="ai-tone-key-field"><label for="aiOpenAiModel">Model GPT</label><input id="aiOpenAiModel" value="gpt-6-astra"></div><div class="ai-tone-key-field"><label for="aiGeminiModel">Model Gemini</label><input id="aiGeminiModel" value="gemini-3.8-flash"></div></div>',
 '<div class="ai-tone-setting-actions"><button class="primary" id="aiToneSaveKeys" type="button">Simpan API Key</button><button id="aiToneTestOpenAi" type="button">Tes GPT</button><button id="aiToneTestGemini" type="button">Tes Gemini</button><button id="aiToneDeleteOpenAi" type="button">Hapus GPT</button><button id="aiToneDeleteGemini" type="button">Hapus Gemini</button></div>',
 '<p class="ai-tone-note">Enkripsi melindungi key saat tersimpan. Saat permintaan, key digunakan sementara dan dikirim langsung ke provider. Distribusi publik sebaiknya memakai gateway backend.</p></div>',
 '<div class="ai-tone-provider-row"><button class="ai-tone-provider on" data-ai-provider="gpt" type="button">GPT</button><button class="ai-tone-provider" data-ai-provider="gemini" type="button">Gemini</button><button class="ai-tone-provider" data-ai-provider="collab" type="button">GPT + Gemini</button></div>',
 '<div class="ai-tone-status" id="aiToneStatus" data-state="idle" role="status">Menunggu koneksi MG-30.</div>',
 '<div class="ai-tone-messages" id="aiToneMessages"><div class="ai-tone-message ai"><small>AI ASSISTANT</small>Ketik karakter tone yang kamu inginkan. Hasil tervalidasi langsung mengubah kontrol editor dan mengirim parameter melalui USB-MIDI. Tidak ada tombol Apply.</div></div>',
 '<textarea class="ai-tone-prompt" id="aiTonePrompt" maxlength="1400" placeholder="Contoh: Buat tone blues rock warm, sedikit breakup, gain rendah-menengah, mid terasa, delay pendek dan reverb tipis."></textarea>',
 '<div class="ai-tone-compose"><button class="ai-tone-undo" id="aiToneUndo" type="button" disabled>↶ Undo AI Changes</button><div><span class="ai-tone-hint" id="aiToneCount">0/1400</span> <button class="ai-tone-send" id="aiToneSend" type="button">Kirim ↗</button></div></div>',
 '<p class="ai-tone-hint">Save to Device tetap dilakukan melalui tombol Save editor. Status sukses menunjukkan pengiriman MIDI selesai, bukan ACK/readback penuh dari pedal.</p></div>'
 ].join('');
 document.body.append(shade,sheet);
 const ui={status:$('aiToneStatus'),messages:$('aiToneMessages'),prompt:$('aiTonePrompt'),send:$('aiToneSend'),undo:$('aiToneUndo'),settings:$('aiToneSettings'),gpt:$('aiOpenAiKey'),gemini:$('aiGeminiKey'),gptModel:$('aiOpenAiModel'),geminiModel:$('aiGeminiModel')};
 let mode='gpt',busy=false,last=null;const history=[];
 const status=(text,state)=>{ui.status.textContent=text;ui.status.dataset.state=state||'idle';};
 const message=(role,text)=>{history.push({role,text:String(text)});while(history.length>12)history.shift();ui.messages.innerHTML=history.map(x=>'<div class="ai-tone-message '+x.role+'"><small>'+(x.role==='user'?'KAMU':'AI TONE STUDIO')+'</small>'+esc(x.text)+'</div>').join('');ui.messages.scrollTop=ui.messages.scrollHeight;};
 const setBusy=v=>{busy=!!v;ui.send.disabled=busy;ui.prompt.disabled=busy;document.querySelectorAll('[data-ai-provider]').forEach(b=>b.disabled=busy);ui.undo.disabled=busy||!last;};
 const setMode=v=>{mode=v;document.querySelectorAll('[data-ai-provider]').forEach(b=>b.classList.toggle('on',b.dataset.aiProvider===v));};
 const openPanel=()=>{shade.classList.add('on');sheet.classList.add('on');open.classList.add('ai-tone-open');open.setAttribute('aria-expanded','true');window.setTimeout(()=>ui.prompt.focus(),150);};
 const closePanel=()=>{shade.classList.remove('on');sheet.classList.remove('on');open.classList.remove('ai-tone-open');open.setAttribute('aria-expanded','false');};
 async function keyStates(){
  try{const v=await Promise.all([SecureStore.getSecret({provider:'openai'}),SecureStore.getSecret({provider:'gemini'})]);
   $('aiOpenAiKeyState').textContent=v[0]?.configured?'Tersimpan terenkripsi':'Belum ada API key';$('aiGeminiKeyState').textContent=v[1]?.configured?'Tersimpan terenkripsi':'Belum ada API key';
  }catch(e){$('aiOpenAiKeyState').textContent='Secure storage tidak tersedia';$('aiGeminiKeyState').textContent='Secure storage tidak tersedia';status(e.message,'error');}
 }
 async function saveKeys(){
  try{if(ui.gpt.value.trim())await SecureStore.setSecret({provider:'openai',value:ui.gpt.value.trim()});if(ui.gemini.value.trim())await SecureStore.setSecret({provider:'gemini',value:ui.gemini.value.trim()});
   ui.gpt.value='';ui.gemini.value='';await keyStates();status('API key tersimpan terenkripsi di perangkat.','success');
  }catch(e){status(e.message||'Gagal menyimpan API key.','error');}
 }
 async function deleteKey(p){try{await SecureStore.deleteSecret({provider:p});await keyStates();status('API key '+p+' dihapus.','success');}catch(e){status(e.message,'error');}}
 async function testProvider(p){
  setBusy(true);status('Menguji API '+p+'…','busy');
  try{const k=await secret(p);if(!k)throw new Error('API key belum disimpan.');
   const prompt='Return exactly {"status":"ok"}.';
   if(p==='openai')await openai(k,prompt,prompt,ui.gptModel.value.trim());else await gemini(k,prompt,prompt,ui.geminiModel.value.trim());
   status('API '+p+' berhasil merespons.','success');
  }catch(e){status(niceError(e,p),'error');}finally{setBusy(false);}
 }
 async function makePlan(prompt,bridge){
  const catalog=bridge.getCatalog(),snapshot=bridge.getSnapshot();if(!catalog?.length)throw new Error('Katalog MG-30 tidak tersedia.');
  const sys=systemPrompt(catalog,snapshot,false);
  if(mode==='gpt'){const k=await secret('openai');if(!k)throw new Error('GPT API key belum disimpan.');status('GPT menyusun Tone Plan…','busy');return validateAiTonePlan(await openai(k,sys,userText(prompt),ui.gptModel.value.trim()),catalog);}
  if(mode==='gemini'){const k=await secret('gemini');if(!k)throw new Error('Gemini API key belum disimpan.');status('Gemini menyusun Tone Plan…','busy');return validateAiTonePlan(await gemini(k,sys,userText(prompt),ui.geminiModel.value.trim()),catalog);}
  const g=await secret('openai'),m=await secret('gemini');if(!g||!m)throw new Error('Mode kolaborasi membutuhkan kedua API key.');
  status('GPT membuat rancangan awal…','busy');const first=validateAiTonePlan(await openai(g,sys,userText(prompt),ui.gptModel.value.trim()),catalog);
  status('Gemini mengevaluasi dan menyempurnakan rancangan GPT…','busy');
  return validateAiTonePlan(await gemini(m,systemPrompt(catalog,snapshot,true),userText(prompt,first),ui.geminiModel.value.trim()),catalog);
 }
 async function submit(){
  if(busy)return;const prompt=ui.prompt.value.trim();if(!prompt){status('Tulis instruksi tone terlebih dahulu.','error');return;}
  const bridge=window.MG30AIToneBridge;if(!bridge?.isConnected?.()){status('Gagal: MG-30 terputus. AI belum dipanggil dan tidak ada parameter yang diubah.','error');return;}
  setBusy(true);message('user',prompt);status('Memeriksa koneksi USB-MIDI…','busy');
  try{const plan=await makePlan(prompt,bridge);if(!bridge.isConnected())throw new Error('Koneksi MG-30 terputus sebelum perubahan dikirim.');
   status('Tone Plan valid. Memperbarui editor dan mengirim MIDI…','busy');const result=await bridge.applyPlan(plan);
   last={before:result.before,after:result.after,blocks:result.blocks};ui.undo.disabled=false;
   message('ai',plan.summary+'\nParameter dikirim ke blok '+result.blocks.join(', ')+(plan.notes.length?'\n'+plan.notes.join(' · '):''));
   ui.prompt.value='';$('aiToneCount').textContent='0/1400';status('Selesai. Kontrol editor diperbarui dan perintah MIDI terkirim. Coba mainkan gitar.','success');
  }catch(e){message('ai','Gagal: '+(e.message||e));status('Gagal: '+(e.message||e),'error');}
  finally{setBusy(false);ui.undo.disabled=!last;}
 }
 async function undo(){
  if(busy||!last)return;const bridge=window.MG30AIToneBridge;if(!bridge?.isConnected?.()){status('Undo gagal: MG-30 tidak terhubung.','error');return;}
  setBusy(true);status('Memeriksa tweak manual dan menjalankan Undo…','busy');
  try{const r=await bridge.restoreBlocks(last.before,last.after,last.blocks);
   if(r.restored.length)message('ai','Undo berhasil: '+r.restored.join(', '));
   if(r.skipped.length)message('ai','Tidak mengubah blok yang sudah ditweak manual: '+r.skipped.join(', '));
   last=null;status(r.restored.length?'Undo selesai.':'Tidak ada blok yang aman di-Undo tanpa menimpa tweak manual.',r.restored.length?'success':'error');
  }catch(e){status('Undo gagal: '+e.message,'error');}
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
 window.addEventListener('mg30-midi-connection-state',e=>{if(!e.detail?.connected)status('USB-MIDI terputus. AI berhenti sampai pedal tersambung kembali.','error');else if(!busy)status('MG-30 terhubung via USB-MIDI.','success');});
 window.addEventListener('mg30-midi-connected',()=>{if(!busy)status('MG-30 tersambung. AI siap live editing.','success');});
 await keyStates();if(window.MG30AIToneBridge?.isConnected?.())status('MG-30 terhubung via USB-MIDI.','success');
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});else void init();
}
