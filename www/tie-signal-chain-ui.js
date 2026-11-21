const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const state = { snapshot:null, selectedIndex:null, libraryStatus:'Not queried' };
const BLOCK_NAMES = { WAH:'Wah',CMP:'Compressor',EFX:'Drive / EFX',AMP:'Amp / NAM',EQ:'EQ',GATE:'Noise Gate',MOD:'Modulation',DLY:'Delay',RVB:'Reverb',IR:'IR / Cabinet','S/R':'Send / Return',VOL:'Volume' };
const CATEGORY_NAMES = { WAH:'WAH',CMP:'COMP',EFX:'EFX',AMP:'AMP',EQ:'EQ',GATE:'GATE',MOD:'MOD',DLY:'DELAY',RVB:'REVERB',IR:'IR','S/R':'S/R',VOL:'VOL' };
function setText(id,value){const node=$(id);if(node)node.textContent=String(value??'');}
function currentBlock(){return state.snapshot?.blocks?.find(block=>block.index===state.selectedIndex)||null;}
function slotLabel(snapshot){
  if(!Number.isInteger(snapshot?.programSlot))return '—';
  return String(Math.floor(snapshot.programSlot/4)+1).padStart(2,'0')+'ABCD'[snapshot.programSlot%4];
}
function orderedBlocks(snapshot){
  const blocks=snapshot?.blocks||[],order=Array.isArray(snapshot?.order)?snapshot.order:[],seen=new Set(),result=[];
  for(const index of order){const block=blocks.find(item=>item.index===index);if(block&&!seen.has(index)){seen.add(index);result.push(block);}}
  for(const block of blocks)if(!seen.has(block.index))result.push(block);
  return result;
}
function renderStatus(snapshot){
  const tag=$('tieChainSourceTag'),status=$('tieChainStatus');
  if(!snapshot){tag.textContent='WAITING FOR PRESET STATE';status.textContent='The shared editor snapshot is not available yet.';status.className='tie-chain-status is-warning';return;}
  if(snapshot.verified){
    tag.textContent=snapshot.connected?'LIVE FROM DEVICE':'LAST DEVICE READ';
    status.className='tie-chain-status is-live';
    status.textContent=(snapshot.connected?'Connected to MG-30 Gen 2':'Device disconnected · showing last successful readback')+' · Preset '+slotLabel(snapshot)+' · Scene '+(snapshot.sceneIndex===null?'—':'ABC'[snapshot.sceneIndex])+' · Read '+(snapshot.readAt?new Date(snapshot.readAt).toLocaleTimeString():'time unavailable');
  }else if(snapshot.source==='editor-draft'){
    tag.textContent='LOCAL DRAFT';status.className='tie-chain-status is-warning';
    status.textContent='Showing the saved editor draft only. This is not verified against the connected pedal; model, parameter and bypass values may differ from the device.';
  }else{
    tag.textContent='NO SNAPSHOT';status.className='tie-chain-status is-warning';
    status.textContent='No verified device readback or saved editor draft is available. Connect MG-30 Gen 2 and read the active preset.';
  }
  setText('tieChainPresetName',snapshot.presetName||'Unnamed preset');
  setText('tieChainPresetContext','Preset '+slotLabel(snapshot)+' · Scene '+(snapshot.sceneIndex===null?'Not identified':'ABC'[snapshot.sceneIndex])+' · '+(snapshot.verified?'Device readback':'Local editor draft'));
}
function renderFlow(snapshot){
  const root=$('tieChainFlow');if(!root)return;
  if(!snapshot||snapshot.source==='none'){root.innerHTML='<div class="tie-chain-empty">No preset configuration is available yet. Connect the pedal or load a saved editor draft.</div>';return;}
  const blocks=orderedBlocks(snapshot);
  root.innerHTML=blocks.map((block,index)=>{
    const selected=block.index===state.selectedIndex,label=block.known?(block.model||'Model not identified'):'Not read',status=block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN';
    const safeId=escapeHtml(block.id.replace(/[^a-z0-9]/gi,'')),category=escapeHtml(CATEGORY_NAMES[block.id]||block.id);
    const svg=window.MG30EditorBlockIcon?window.MG30EditorBlockIcon(block.id):'';
    return (index?'<span class="tie-chain-arrow" aria-hidden="true">›</span>':'')+
      '<button type="button" class="tie-chain-block tie-block-'+safeId+' '+(!block.known?'is-unknown ':'')+(block.known&&!block.enabled?'is-off':'')+
      '" data-tie-chain-block="'+block.index+'" aria-pressed="'+selected+'" aria-label="'+category+', '+escapeHtml(label)+', '+status+'">'+
      '<span class="tie-chain-block-icon" aria-hidden="true">'+svg+'</span><strong>'+category+'</strong><small>'+escapeHtml(label)+'</small><small class="tie-chain-block-state">'+status+'</small></button>';
  }).join('');
  root.querySelectorAll('[data-tie-chain-block]').forEach(button=>button.addEventListener('click',()=>{
    state.selectedIndex=Number(button.dataset.tieChainBlock);renderDetailsAndContext(state.snapshot);renderFlow(state.snapshot);
  }));
}
function parameterMarkup(param){
  if(param.discrete){
    const selected=param.value===null?null:(param.choices||[]).find(choice=>Number(choice.value)===Number(param.value));
    return '<div class="tie-knob-discrete"><span>'+escapeHtml(param.label)+'</span><strong>'+escapeHtml(selected?selected.label:'Not read')+'</strong></div>';
  }
  if(param.value===null||!Number.isFinite(Number(param.value))){
    return '<div class="tie-knob tie-knob-unread"><span class="tie-knob-dial"><i></i></span><label>'+escapeHtml(param.label)+'</label><output>Not read</output></div>';
  }
  const value=Math.max(0,Math.min(100,Number(param.value))),angle=-135+value*2.7;
  return '<div class="tie-knob"><span class="tie-knob-dial" style="--tie-knob-angle:'+angle+'deg;--tie-knob-value:'+(value*.75)+'%"><i></i></span><label>'+escapeHtml(param.label)+'</label><output>'+value.toFixed(0)+'</output></div>';
}
function renderDetails(){
  const block=currentBlock(),params=$('tieChainParameters'),artwork=$('tieChainSelectedArtwork');
  if(!block){
    setText('tieChainSelectedTitle','No block selected');setText('tieChainBlockState','—');setText('tieChainSelectedCategory','BLOCK');setText('tieChainSelectedMeta','No selected model');
    $('tieChainSelectedData').innerHTML='<span>Model</span><strong>Not read</strong><span>Type</span><strong>Not read</strong><span>Status</span><strong>Not read</strong>';
    artwork.innerHTML='<div class="tie-chain-empty">Select a known block to display its local model artwork.</div>';params.innerHTML='<p class="tie-chain-empty">No selected block.</p>';return;
  }
  const category=CATEGORY_NAMES[block.id]||block.id,model=block.known?(block.model||'Model not identified'):'Not read',type=BLOCK_NAMES[block.id]||block.id,status=block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN';
  setText('tieChainSelectedTitle',type+' — '+block.id);setText('tieChainBlockState',status);setText('tieChainSelectedCategory',category);setText('tieChainSelectedMeta',model);
  $('tieChainSelectedData').innerHTML='<span>Model</span><strong>'+escapeHtml(model)+'</strong><span>Type</span><strong>'+escapeHtml(type)+'</strong><span>Status</span><strong>'+escapeHtml(status)+'</strong>';
  const art=block.known&&window.MG30EditorGearArtwork?window.MG30EditorGearArtwork(block.id,block.model):'';
  artwork.innerHTML=art||'<div class="tie-art-unavailable"><span>MODEL ARTWORK</span><strong>'+escapeHtml(category)+'</strong><small>Artwork is not available for this selected model.</small></div>';
  if(!block.known){params.innerHTML='<p class="tie-chain-empty">Block identity and parameters are not verified. Read the active preset from the device first.</p>';return;}
  if(!block.parameters?.length){params.innerHTML='<p class="tie-chain-empty">No parameter controls are exposed for this model in the current Editor catalog.</p>';return;}
  params.innerHTML=block.parameters.map(parameterMarkup).join('');
}
function row(label,value){return '<div class="tie-chain-context-row"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value||'Not available from current snapshot')+'</strong></div>';}
function renderModelContext(snapshot){
  const amp=snapshot?.blocks?.find(block=>block.id==='AMP'),ir=snapshot?.blocks?.find(block=>block.id==='IR'),context=$('tieChainModelContext');
  if(!context)return;
  if(!snapshot||snapshot.source==='none'){context.innerHTML='<p>Read a preset to identify the active NAM and IR model.</p>';setText('tieChainModelSource','NOT READ');return;}
  let markup='';
  if(amp?.known&&amp.nam){
    markup+=row('AMP MODEL',amp.model)+row('NAM SLOT','Slot '+String(amp.nam.slot).padStart(2,'0')+' · device ID '+amp.nam.deviceId)+row('NAM PROFILE LABEL',amp.nam.profileName)+row('NAM FILE','Preset readback does not expose a verified filename.');
    markup+=row('NAM MAPPING CONFIDENCE',amp.nam.mappingEvidence==='provisional-slot-id'?'Provisional slot-to-ID mapping; not independently observed for this slot.':'Device ID observed in prior device-selection captures.');
  }else if(amp?.known)markup+=row('AMP MODEL',amp.model)+row('NAM','The active amp model is not mapped to a NAM slot.');
  else markup+=row('AMP / NAM','Not read from device');
  if(ir?.known&&ir.ir){
    markup+=row('IR MODEL',ir.model)+row('IR SOURCE',ir.ir.thirdParty?'Third Party / User':'MG-30 model list');
    if(ir.ir.thirdParty)markup+=row('USER IR LABEL',ir.ir.userName||'No local user IR label saved')+row('COLLECTION ASSIGNMENT',ir.ir.collectionSlot?'Collection slot '+String(ir.ir.collectionSlot).padStart(2,'0')+' mapped to this preset':'No Collection slot assignment recorded for this preset');
  }else markup+=row('IR','IR block identity not verified');
  context.innerHTML=markup;setText('tieChainModelSource',snapshot.verified?'DEVICE READ':'LOCAL DRAFT');
  const lib=$('tieChainLibraryContext');
  if(lib)lib.textContent='NAM Library: '+state.libraryStatus+'. Preset readback supplies the selected NAM slot ID, not a verified .nam filename. IR Collection assignment is read from the existing local map; no slot is changed.';
}
function diagnostics(snapshot){
  const root=$('tieChainDiagnostics'),tag=$('tieChainDiagnosticTag');if(!root||!tag)return;
  if(!snapshot||snapshot.source==='none'){tag.textContent='NO DATA';root.innerHTML='<p>Diagnostics are unavailable until an actual editor or device snapshot exists.</p>';return;}
  const active=(snapshot.blocks||[]).filter(block=>block.known&&block.enabled),amp=active.find(block=>block.id==='AMP'),drive=active.find(block=>block.id==='EFX');
  const findValue=(block,terms)=>block?.parameters?.find(param=>terms.includes(param.key.toLowerCase())&&param.value!==null)?.value;
  const ampGain=findValue(amp,['gain']),driveGain=findValue(drive,['gain','drive','distortion','sensitivity','boost']),findings=[];
  if(ampGain!==undefined&&driveGain!==undefined&&Number(ampGain)>=70&&Number(driveGain)>=70){
    findings.push({kind:'hypothesis',title:'Potential stacked gain controls',reason:'AMP gain ('+ampGain+'/100) and EFX drive/gain ('+driveGain+'/100) are both high on the Editor scale. This is a configuration heuristic, not a measured signal level.',limit:'Cannot confirm clipping, output level or noise without captured audio and calibrated references.'});
  }
  if(!snapshot.verified)findings.push({kind:'hypothesis',title:'Device state is not verified',reason:'The displayed chain comes from a saved local Editor draft.',limit:'The connected pedal may have a different preset, Scene, bypass state or parameter values.'});
  if(!findings.length)findings.push({kind:'fact',title:'No high-confidence configuration issue established',reason:'No high-confidence structural issue was detected from the exposed active block configuration.',limit:'No input/output meters, per-block gain measurements, true-peak analysis or noise-floor capture are attached to this snapshot. Clipping, headroom and noise diagnoses are withheld.'});
  tag.textContent=snapshot.verified?'CONFIGURATION ONLY':'DRAFT ONLY';
  root.innerHTML=findings.map(item=>'<article class="tie-chain-diagnostic '+(item.kind==='hypothesis'?'is-hypothesis':'')+'"><strong>'+escapeHtml(item.title)+'</strong><p><b>Interpretation:</b> '+escapeHtml(item.reason)+'</p><p><b>Limitation:</b> '+escapeHtml(item.limit)+'</p></article>').join('');
}
function renderDetailsAndContext(snapshot){renderDetails();renderModelContext(snapshot);diagnostics(snapshot);}
function render(snapshot){
  state.snapshot=snapshot;renderStatus(snapshot);renderFlow(snapshot);
  if(state.selectedIndex===null||!snapshot?.blocks?.some(block=>block.index===state.selectedIndex)){const order=orderedBlocks(snapshot);state.selectedIndex=order.find(block=>block.id==='AMP'&&block.known)?.index??order.find(block=>block.known)?.index??null;}
  renderDetailsAndContext(snapshot);
}
async function refreshLibraryContext(){
  const api=window.NUXNativeMidi;
  if(!api?.listModels){state.libraryStatus='Android NAM Library API unavailable';renderModelContext(state.snapshot);return;}
  try{const result=await api.listModels(),files=Array.isArray(result?.files)?result.files:[];state.libraryStatus=files.length+' local NAM file(s) indexed';}
  catch(error){state.libraryStatus='Could not read library: '+(error?.message||String(error));}
  renderModelContext(state.snapshot);
}
async function refreshSnapshot(){
  const bridge=window.MG30AIToneBridge,button=$('tieChainRefresh');
  if(!bridge?.refreshSignalChainSnapshot){setText('tieChainStatus','Shared MG-30 preset reader is not available.');return;}
  button.disabled=true;button.textContent='Reading…';
  try{const snapshot=await bridge.refreshSignalChainSnapshot();render(snapshot);setText('tieChainStatus','Active preset and Scene read successfully. Signal Chain view is read-only; no device write was performed.');$('tieChainStatus').className='tie-chain-status is-live';}
  catch(error){setText('tieChainStatus',error?.message||String(error));$('tieChainStatus').className='tie-chain-status is-warning';}
  finally{button.disabled=false;button.textContent='Read Active Preset';}
}
$('tieChainRefresh')?.addEventListener('click',()=>void refreshSnapshot());
document.querySelectorAll('[data-tie-open-analysis]').forEach(button=>button.addEventListener('click',()=>document.querySelector('[data-tie-page="'+button.dataset.tieOpenAnalysis+'"]')?.click()));
for(const eventName of ['mg30-signal-chain-state-changed','mg30-midi-connection-state','mg30-midi-connected','mg30-active-preset-changed','mg30-user-ir-name-changed','mg30-collection-ir-mapped','mg30-nam-names-sync']){
  window.addEventListener(eventName,()=>{
    const bridge=window.MG30AIToneBridge;if(bridge?.getSignalChainSnapshot)render(bridge.getSignalChainSnapshot());
    if(eventName==='mg30-midi-connection-state'||eventName==='mg30-midi-connected'||eventName==='mg30-nam-names-sync')void refreshLibraryContext();
  });
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const bridge=window.MG30AIToneBridge;if(bridge?.getSignalChainSnapshot)render(bridge.getSignalChainSnapshot());}});
if(window.MG30AIToneBridge?.getSignalChainSnapshot)render(window.MG30AIToneBridge.getSignalChainSnapshot());
void refreshLibraryContext();
