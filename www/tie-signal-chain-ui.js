const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const state = { snapshot:null, selectedIndex:null, libraryFiles:null, libraryStatus:'Not queried' };
const BLOCK_NAMES = { WAH:'Wah',CMP:'Compressor',EFX:'Drive / EFX',AMP:'Amp / NAM',EQ:'EQ',GATE:'Noise Gate',MOD:'Modulation',DLY:'Delay',RVB:'Reverb',IR:'IR / Cabinet','S/R':'Send / Return',VOL:'Volume' };
function setText(id,value){const node=$(id);if(node)node.textContent=String(value??'');}
function currentBlock(){return state.snapshot?.blocks?.find(block=>block.index===state.selectedIndex)||null;}
function renderStatus(snapshot){
 const tag=$('tieChainSourceTag'),status=$('tieChainStatus');
 if(!snapshot){tag.textContent='WAITING FOR PRESET STATE';status.textContent='The shared editor snapshot is not available yet.';status.className='tie-chain-status is-warning';return;}
 if(snapshot.verified){
  tag.textContent=snapshot.connected?'LIVE DEVICE READBACK':'LAST DEVICE READBACK';
  status.className='tie-chain-status is-live';
  status.textContent=(snapshot.connected?'Connected to MG-30 · ':'Device disconnected · showing last successful readback · ')+
   'Preset '+(snapshot.programSlot===null?'—':String(Math.floor(snapshot.programSlot/4)+1).padStart(2,'0')+'ABCD'[snapshot.programSlot%4])+
   ' · Scene '+(snapshot.sceneIndex===null?'—':snapshot.sceneIndex+1)+
   ' · Read '+new Date(snapshot.readAt).toLocaleTimeString();
 }else if(snapshot.source==='editor-draft'){
  tag.textContent='LOCAL EDITOR DRAFT';
  status.className='tie-chain-status is-warning';
  status.textContent='Showing the saved editor draft only. This is not verified against the connected pedal; parameter values and bypass states may differ from the device.';
 }else{
  tag.textContent='NO SNAPSHOT';
  status.className='tie-chain-status is-warning';
  status.textContent='No verified device readback or saved editor draft is available. Connect MG-30 Gen 2 and read the active preset.';
 }
 setText('tieChainPresetName',snapshot.presetName||'Unnamed preset');
 setText('tieChainPresetContext','Preset slot '+(snapshot.programSlot??'—')+' · '+(snapshot.sceneIndex===null?'Scene unknown':'Scene '+(snapshot.sceneIndex+1)));
}
function orderedBlocks(snapshot){
 const blocks=snapshot.blocks||[];
 const order=Array.isArray(snapshot.order)?snapshot.order:[];
 const seen=new Set(),result=[];
 for(const index of order){const block=blocks.find(item=>item.index===index);if(block&&!seen.has(index)){seen.add(index);result.push(block);}}
 for(const block of blocks)if(!seen.has(block.index))result.push(block);
 return result;
}
function renderFlow(snapshot){
 const root=$('tieChainFlow');if(!root)return;
 if(!snapshot||snapshot.source==='none'){root.innerHTML='<div class="tie-chain-empty">No preset configuration is available yet. Connect the pedal or load a saved editor draft.</div>';return;}
 const blocks=orderedBlocks(snapshot);
 root.innerHTML=blocks.map((block,index)=>{
  const selected=block.index===state.selectedIndex;
  const label=block.known?escapeHtml(block.model||'Model not identified'):'Not read';
  const status=block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN';
  return (index?'<span class="tie-chain-arrow" aria-hidden="true">→</span>':'')+
   '<button type="button" class="tie-chain-block '+(!block.known?'is-unknown ':'')+(block.known&&!block.enabled?'is-off':'')+'" data-tie-chain-block="'+block.index+'" aria-pressed="'+selected+'">'+
   '<span class="tie-chain-block-icon">'+escapeHtml(block.icon||'◈')+'</span><strong>'+escapeHtml(block.id)+' · '+escapeHtml(BLOCK_NAMES[block.id]||block.id)+'</strong>'+
   '<small>'+label+'</small><small>'+status+'</small></button>';
 }).join('');
 root.querySelectorAll('[data-tie-chain-block]').forEach(button=>button.addEventListener('click',()=>{
  state.selectedIndex=Number(button.dataset.tieChainBlock);renderDetails(state.snapshot);renderFlow(state.snapshot);
 }));
}
function renderDetails(snapshot){
 const block=currentBlock();
 if(!block){setText('tieChainSelectedTitle','No block selected');setText('tieChainBlockState','—');$('tieChainParameters').innerHTML='<p>Select a block in the signal chain to inspect its available controls.</p>';return;}
 setText('tieChainSelectedTitle',(BLOCK_NAMES[block.id]||block.id)+' · '+block.id);
 setText('tieChainBlockState',block.known?(block.enabled?'ACTIVE':'BYPASS'):'NOT READ');
 const params=$('tieChainParameters');
 if(!block.known){params.innerHTML='<p>Block identity and controls are not verified. Read the active preset from the device first.</p>';return;}
 if(!block.parameters.length){params.innerHTML='<p>No parameter controls are exposed for this block in the current editor model.</p>';return;}
 params.innerHTML=block.parameters.map(param=>'<div class="tie-chain-param"><span>'+escapeHtml(param.label)+'</span><strong>'+(param.value===null?'Not read':escapeHtml(param.discrete?String(param.value):String(param.value)))+'</strong></div>').join('');
}
function row(label,value){return '<div class="tie-chain-context-row"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value||'Not available from current snapshot')+'</strong></div>';}
function renderModelContext(snapshot){
 const amp=snapshot?.blocks?.find(block=>block.id==='AMP'),ir=snapshot?.blocks?.find(block=>block.id==='IR');
 const context=$('tieChainModelContext');
 if(!snapshot||snapshot.source==='none'){context.innerHTML='<p>Read a preset to identify the active NAM and IR model.</p>';setText('tieChainModelSource','NOT READ');return;}
 const nam=amp?.nam;
 const irInfo=ir?.ir;
 let markup='';
 if(amp?.known&&nam){
  markup+=row('AMP MODEL',amp.model);
  markup+=row('NAM SLOT','Slot '+String(nam.slot).padStart(2,'0')+' · device ID '+nam.deviceId);
  markup+=row('NAM PROFILE LABEL',nam.profileName);
  markup+=row('NAM FILE','The preset readback does not expose a verified filename.');
  if(nam.mappingEvidence==='provisional-slot-id')markup+=row('NAM MAPPING CONFIDENCE','Provisional slot-to-ID mapping; not independently observed for this slot.');
  else markup+=row('NAM MAPPING CONFIDENCE','Device ID observed in prior device-selection captures.');
 }else if(amp?.known){markup+=row('AMP MODEL',amp.model);markup+=row('NAM','The active amp model is not mapped to a NAM slot.');}
 else markup+=row('AMP / NAM','Not read from device');
 if(irInfo&&ir?.known){
  markup+=row('IR MODEL',ir.model);
  markup+=row('IR SOURCE',irInfo.thirdParty?'Third Party / User':'MG-30 model list');
  if(irInfo.thirdParty){
   markup+=row('USER IR LABEL',irInfo.userName||'No local user IR label saved');
   markup+=row('COLLECTION ASSIGNMENT',irInfo.collectionSlot?'Collection slot '+String(irInfo.collectionSlot).padStart(2,'0')+' mapped to this preset':'No Collection slot assignment recorded for this preset');
  }
 }else markup+=row('IR','IR block identity not verified');
 context.innerHTML=markup;
 setText('tieChainModelSource',snapshot.verified?'READBACK':'LOCAL DRAFT');
 const lib=$('tieChainLibraryContext');
 lib.textContent='NAM Library: '+state.libraryStatus+'. Device preset readback supplies the selected NAM slot ID, not the original .nam filename. IR Collection: assignments are read from the existing mg30-ir-collection-preset-map; no slot is changed.';
}
function diagnostics(snapshot){
 const root=$('tieChainDiagnostics'),tag=$('tieChainDiagnosticTag');
 if(!snapshot||snapshot.source==='none'){tag.textContent='NO DATA';root.innerHTML='<p>Diagnostics are unavailable until an actual editor or device snapshot exists.</p>';return;}
 const active=snapshot.blocks.filter(block=>block.known&&block.enabled);
 const amp=active.find(block=>block.id==='AMP'),drive=active.find(block=>block.id==='EFX');
 const findValue=(block,terms)=>block?.parameters?.find(param=>terms.includes(param.key.toLowerCase())&&param.value!==null)?.value;
 const findings=[];
 const ampGain=findValue(amp,['gain']),driveGain=findValue(drive,['gain','drive','distortion','sensitivity','boost']);
 if(ampGain!==undefined&&driveGain!==undefined&&Number(ampGain)>=70&&Number(driveGain)>=70){
  findings.push({kind:'hypothesis',title:'Potential stacked gain controls',reason:'The active AMP gain ('+ampGain+'/100) and EFX drive/gain control ('+driveGain+'/100) are both high in the editor scale. This is a configuration heuristic, not a measured signal level.',limit:'Cannot confirm clipping, excess loudness or noise without a captured audio signal and calibrated input/output measurements.'});
 }
 if(!snapshot.verified)findings.push({kind:'hypothesis',title:'Device state is not verified',reason:'The displayed chain comes from a saved local editor draft.',limit:'The connected pedal may have a different preset, Scene, bypass state or parameter values.'});
 if(!findings.length)findings.push({kind:'fact',title:'No configuration issue established from available data',reason:'No high-confidence structural issue was detected from the exposed active block configuration.',limit:'No input/output meters, per-block gain measurements, true-peak analysis or noise-floor capture are attached to this preset snapshot. Clipping, headroom and noise diagnoses are therefore withheld.'});
 tag.textContent=snapshot.verified?'CONFIGURATION ONLY':'DRAFT ONLY';
 root.innerHTML=findings.map(item=>'<article class="tie-chain-diagnostic '+(item.kind==='hypothesis'?'is-hypothesis':'')+'"><strong>'+escapeHtml(item.title)+'</strong><p><b>Interpretation:</b> '+escapeHtml(item.reason)+'</p><p><b>Limitation:</b> '+escapeHtml(item.limit)+'</p></article>').join('');
}
function renderDetailsAndContext(snapshot){renderDetails(snapshot);renderModelContext(snapshot);diagnostics(snapshot);}
function render(snapshot){
 state.snapshot=snapshot;
 renderStatus(snapshot);
 renderFlow(snapshot);
 if(state.selectedIndex===null){const first=orderedBlocks(snapshot).find(block=>block.known);state.selectedIndex=first?.index??null;}
 renderDetailsAndContext(snapshot);
}
async function refreshLibraryContext(){
 const api=window.NUXNativeMidi;
 if(!api?.listModels){state.libraryStatus='Android NAM Library API unavailable';renderModelContext(state.snapshot);return;}
 try{
  const result=await api.listModels();
  const files=Array.isArray(result?.files)?result.files:[];
  state.libraryFiles=files;
  state.libraryStatus=files.length+' local NAM file(s) indexed';
 }catch(error){state.libraryStatus='Could not read library: '+(error?.message||String(error));}
 renderModelContext(state.snapshot);
}
async function refreshSnapshot(){
 const bridge=window.MG30AIToneBridge;
 if(!bridge?.refreshSignalChainSnapshot){setText('tieChainStatus','Shared MG-30 preset reader is not available.');return;}
 const button=$('tieChainRefresh');button.disabled=true;button.textContent='Reading…';
 try{const snapshot=await bridge.refreshSignalChainSnapshot();render(snapshot);setText('tieChainStatus','Active preset and Scene read successfully. Signal Chain view is read-only; no device write was performed.');$('tieChainStatus').className='tie-chain-status is-live';}
 catch(error){setText('tieChainStatus',error?.message||String(error));$('tieChainStatus').className='tie-chain-status is-warning';}
 finally{button.disabled=false;button.textContent='Read active preset';}
}
$('tieChainRefresh')?.addEventListener('click',()=>void refreshSnapshot());
document.querySelectorAll('[data-tie-open-analysis]').forEach(button=>button.addEventListener('click',()=>{
 const page=button.dataset.tieOpenAnalysis;
 document.querySelector('[data-tie-page="'+page+'"]')?.click();
}));
for(const eventName of ['mg30-signal-chain-state-changed','mg30-midi-connection-state','mg30-midi-connected','mg30-active-preset-changed','mg30-user-ir-name-changed','mg30-collection-ir-mapped','mg30-nam-names-sync']){
 window.addEventListener(eventName,()=>{
  const bridge=window.MG30AIToneBridge;
  if(bridge?.getSignalChainSnapshot)render(bridge.getSignalChainSnapshot());
  if(eventName==='mg30-midi-connection-state'||eventName==='mg30-midi-connected'||eventName==='mg30-nam-names-sync')void refreshLibraryContext();
 });
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const bridge=window.MG30AIToneBridge;if(bridge?.getSignalChainSnapshot)render(bridge.getSignalChainSnapshot());}});
if(window.MG30AIToneBridge?.getSignalChainSnapshot)render(window.MG30AIToneBridge.getSignalChainSnapshot());
void refreshLibraryContext();
