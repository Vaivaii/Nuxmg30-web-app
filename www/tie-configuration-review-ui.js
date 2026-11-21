const $ = id => document.getElementById(id);
let snapshot=window.MG30AIToneBridge?.getSignalChainSnapshot?.()||null,focusReturn=null,savedSiblingVisibility=null;
const analyzer=()=>window.MG30TIEAnalyzerBridge?.getResult?.();
const tabs=['overview','chain','gain','tone','report'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sceneName=index=>Number.isInteger(index)&&index>=0&&index<=2?'ABC'[index]:null;
const categoryNames={WAH:'WAH',CMP:'COMP',EFX:'EFX',AMP:'AMP',EQ:'EQ',GATE:'GATE',MOD:'MOD',DLY:'DELAY',RVB:'REVERB',IR:'IR','S/R':'S/R',VOL:'VOL'};
const blockNames={WAH:'Wah',CMP:'Compressor',EFX:'Drive / EFX',AMP:'Amp / NAM',EQ:'EQ',GATE:'Noise Gate',MOD:'Modulation',DLY:'Delay',RVB:'Reverb',IR:'IR / Cabinet','S/R':'Send / Return',VOL:'Volume'};
function allBlocks(){
  const all=snapshot?.blocks||[],result=[],seen=new Set();
  for(const index of snapshot?.order||[]){const block=all.find(item=>item.index===index);if(block&&!seen.has(index)){seen.add(index);result.push(block);}}
  for(const block of all)if(!seen.has(block.index))result.push(block);
  return result;
}
function badgeClass(status){
  const value=String(status||'').toLowerCase();
  if(value==='read'||value==='available'||value==='measured')return 'is-ok';
  if(value==='partial'||value==='estimated')return 'is-warning';
  if(value==='critical'||value==='failed')return 'is-critical';
  return 'is-unavailable';
}
function checkRow(title,description,status,target,icon){
  const tag=target?'button':'div',targetAttr=target?' data-tie-review-target="'+esc(target)+'" type="button"':'';
  return '<'+tag+' class="tie-review-check"'+targetAttr+'><span class="tie-review-check-icon" aria-hidden="true">'+(icon||'⌁')+'</span><span class="tie-review-check-copy"><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span><em class="tie-review-state '+badgeClass(status)+'">'+esc(status)+'</em>'+(target?'<b aria-hidden="true">›</b>':'')+'</'+tag+'>';
}
function setStatus(id,value){const node=$(id);if(node){node.textContent=value;node.className='tie-review-state '+badgeClass(value);}}
function switchTab(name){
  const selected=tabs.includes(name)?name:'overview';
  document.querySelectorAll('[data-tie-review-tab]').forEach(button=>{const active=button.dataset.tieReviewTab===selected;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  document.querySelectorAll('[data-tie-review-panel]').forEach(panel=>{panel.hidden=panel.dataset.tieReviewPanel!==selected;});
  const content=document.querySelector('.tie-review-content');if(content)content.scrollTop=0;
}
function openReview(){
  const page=$('tieConfigurationReview'),chainPage=$('tieChainFlow')?.closest('[data-tie-page-panel]');if(!page||!chainPage)return;
  focusReturn=document.activeElement;savedSiblingVisibility=new Map();
  Array.from(chainPage.children).forEach(node=>{if(node===page)return;savedSiblingVisibility.set(node,node.hidden);node.hidden=true;});
  page.hidden=false;render();switchTab('overview');$('tieReviewBack')?.focus();
}
function closeReview(){
  const page=$('tieConfigurationReview'),chainPage=$('tieChainFlow')?.closest('[data-tie-page-panel]');if(!page||!chainPage)return;
  page.hidden=true;
  if(savedSiblingVisibility)for(const [node,wasHidden] of savedSiblingVisibility.entries())node.hidden=wasHidden;
  savedSiblingVisibility=null;focusReturn?.focus?.();
}
function rowsForBlocks(){
  const blocks=allBlocks();if(!blocks.length)return '<p class="tie-review-empty">No block data is available.</p>';
  return blocks.map(block=>{
    const id=esc(block.id.replace(/[^a-z0-9]/gi,'')),category=categoryNames[block.id]||block.id,model=block.known?block.model:'Not read',status=block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN',svg=window.MG30EditorBlockIcon?window.MG30EditorBlockIcon(block.id):'';
    return '<div class="tie-review-block-level tie-mini-'+id+'"><span class="tie-review-block-icon">'+svg+'</span><span class="tie-review-block-copy"><strong>'+esc(category)+' · '+esc(model)+'</strong><small>'+esc(status)+' · Audio stage level not exposed</small></span><em>Not measured</em><b aria-hidden="true">›</b></div>';
  }).join('');
}
function renderMiniChain(){
  const holder=$('tieReviewChainFlow');if(!holder)return;const blocks=allBlocks();
  if(!blocks.length){holder.innerHTML='<p class="tie-review-empty">No signal chain snapshot is available.</p>';return;}
  holder.innerHTML=blocks.map((block,index)=>{
    const safeId=esc(block.id.replace(/[^a-z0-9]/gi,'')),name=block.known?block.model:'Not read',label=categoryNames[block.id]||block.id,status=block.known?(block.enabled?'ON':'BYPASS'):'UNKNOWN',svg=window.MG30EditorBlockIcon?window.MG30EditorBlockIcon(block.id):'';
    return (index?'<span class="tie-review-chain-arrow" aria-hidden="true">›</span>':'')+'<div class="tie-review-mini-pedal tie-mini-'+safeId+'"><span>'+svg+'</span><strong>'+esc(label)+'</strong><small>'+esc(name)+'</small><em>'+status+'</em></div>';
  }).join('');
}
function drawSpectrum(result){
  const canvas=$('tieReviewSpectrum'),ctx=canvas?.getContext('2d');if(!ctx)return;
  const width=canvas.width,height=canvas.height,left=48,right=12,top=12,bottom=32,plotWidth=width-left-right,plotHeight=height-top-bottom;
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#080e0a';ctx.fillRect(0,0,width,height);ctx.font='10px system-ui';ctx.lineWidth=1;ctx.strokeStyle='#263629';ctx.fillStyle='#91a183';
  const yForDb=value=>top+((0-Math.max(-100,Math.min(0,value)))/100)*plotHeight;
  for(const db of [0,-20,-40,-60,-80,-100]){const y=yForDb(db);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.fillText(String(db),5,y+3);}
  const spectrum=result?.spectrum;
  if(!spectrum?.magnitudeDbfs?.length||!Number.isFinite(spectrum.binWidthHz)){ctx.fillStyle='#91a183';ctx.fillText('No Analyzer spectrum available',left+8,top+20);return;}
  const maxFrequency=Math.max(20,Math.min(20000,spectrum.nyquistHz||result.source?.sampleRateHz/2||20000)),logMax=Math.log(maxFrequency/20),xForHz=hz=>left+(Math.log(Math.max(20,hz)/20)/logMax)*plotWidth;
  for(const hz of [50,100,200,500,1000,2000,5000,10000,20000]){if(hz>maxFrequency)continue;const x=xForHz(hz);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotHeight);ctx.stroke();ctx.fillText(hz>=1000?(hz/1000)+'k':String(hz),x-9,height-9);}
  ctx.beginPath();let started=false;
  for(let bin=1;bin<spectrum.magnitudeDbfs.length;bin++){const hz=bin*spectrum.binWidthHz;if(hz<20||hz>maxFrequency)continue;const x=xForHz(hz),y=yForDb(spectrum.magnitudeDbfs[bin]);if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}
  ctx.strokeStyle='#c5f36b';ctx.lineWidth=1.8;ctx.stroke();
}
function render(){
  snapshot=window.MG30AIToneBridge?.getSignalChainSnapshot?.()||snapshot;
  const result=analyzer(),metrics=result?.metrics||null,blocks=allBlocks(),known=blocks.filter(block=>block.known).length,fullyKnown=blocks.length>0&&known===blocks.length;
  $('tieReviewPresetName').textContent=snapshot?.presetName||'No preset read';
  $('tieReviewPresetMeta').textContent='Preset '+(Number.isInteger(snapshot?.programSlot)?String(Math.floor(snapshot.programSlot/4)+1).padStart(2,'0')+'ABCD'[snapshot.programSlot%4]:'—')+' · Scene '+(sceneName(snapshot?.sceneIndex)||'Not identified');
  $('tieReviewDeviceStatus').textContent=snapshot?.verified?(snapshot.connected?'MG-30 Gen2 · Live Read':'Last device read · disconnected'):(snapshot?.source==='editor-draft'?'Local Draft · not live':'Device data unavailable');
  $('tieReviewEntryStatus').textContent=snapshot?.verified?'Device read':(snapshot?.source==='editor-draft'?'Local draft':'Awaiting data');

  const chainStatus=!blocks.length?'Not read':(fullyKnown?'Read':'Partial'),gainStatus=metrics&&Number.isFinite(metrics.rmsDbfs)&&Number.isFinite(metrics.samplePeakDbfs)?'Partial':'Not measured',toneStatus=result?.spectrum?.magnitudeDbfs?.length?'Available':'Not measured',spectralStatus=metrics?.bandEnergyPct?'Available':'Not measured';
  const checks=[
    ['Signal Chain Check','Order, model and bypass state',chainStatus,'chain','⌁'],
    ['Gain Staging','Selected PCM RMS and sample peak; no per-block level',gainStatus,'gain','∿'],
    ['Tone Configuration','Measured PCM spectrum and band distribution',toneStatus,'tone','≋'],
    ['Preset & Scene Consistency','Cross-scene and cross-preset level comparison','Not measured','scene-card','▱'],
    ['Spectral Balance','Relative low, mid and high band energy',spectralStatus,'tone','▥']
  ];
  $('tieReviewChecks').innerHTML=checks.map(item=>checkRow(...item)).join('');
  $('tieReviewReportChecks').innerHTML=checks.map(item=>checkRow(...item)).join('');
  $('tieReviewOverallTitle').textContent=!snapshot?.verified?'Data device belum terverifikasi':(chainStatus==='Read'?'Konfigurasi terbaca · analisis sebagian':'Analisis konfigurasi belum lengkap');
  $('tieReviewOverall').textContent=!snapshot?.verified
    ?(snapshot?.source==='editor-draft'?'Informasi berasal dari local editor draft, bukan readback pedal. Periksa preset aktif sebelum menyimpulkan kondisi perangkat.':'Belum ada readback preset dari MG-30 Gen 2. Hubungkan perangkat dan baca preset aktif untuk memeriksa konfigurasi aktual.')
    :'Signal chain dibaca dari preset aktif. Gain staging dan spektrum hanya memakai hasil PCM Analyzer yang sudah selesai; level input/output, headroom dan perbandingan Scene belum tersedia.';
  $('tieReviewOverallIcon').textContent=!snapshot?.verified?'!':(chainStatus==='Read'?'✓':'i');
  $('tieReviewOverallIcon').className='tie-review-overall-icon '+(!snapshot?.verified?'is-warning':'is-info');

  const recommendations=[];
  if(!snapshot?.verified)recommendations.push('Read active preset dari pedal untuk memverifikasi urutan blok, model dan bypass state.');
  if(!result)recommendations.push('Pilih WAV atau Quick Record di Analyzer untuk mengukur PCM RMS, sample peak dan distribusi frekuensi.');
  if(metrics?.clipping?.detected)recommendations.push('Sample clipping terdeteksi pada sumber PCM yang dianalisis ('+metrics.clipping.sampleCount+' samples). Sumber atau blok penyebab belum dapat diidentifikasi.');
  if(result&&!metrics?.clipping?.detected)recommendations.push('Tidak ada sample yang melewati threshold clipping pada PCM ini; ini bukan bukti bahwa seluruh jalur pedal bebas clipping.');
  if(!recommendations.length)recommendations.push('Periksa input/output reference dan lakukan capture terkontrol sebelum mengukur headroom antar-stage.');
  $('tieReviewRecommendations').innerHTML=recommendations.map(item=>'<li>'+esc(item)+'</li>').join('');

  const scene=sceneName(snapshot?.sceneIndex);
  $('tieReviewActiveScene').textContent=scene||'Not identified';
  $('tieReviewSceneStatus').textContent='Not measured';
  $('tieReviewSceneBars').innerHTML=['A','B','C'].map(label=>'<div class="tie-review-scene-row '+(scene===label?'is-active':'')+'"><strong>'+label+'</strong><span class="tie-review-scene-track"><i></i></span><em>Not measured</em></div>').join('');
  $('tieReviewSceneLimit').textContent=scene?'Active Scene '+scene+' teridentifikasi. Nilai level Scene lain tidak tersedia dari snapshot saat ini.':'Active Scene belum diidentifikasi dari sumber data yang tersedia.';
  $('tieReviewPresetLimit').textContent='Perbandingan antar-preset belum dijalankan; hanya satu snapshot aktif tersedia.';

  setStatus('tieReviewChainStatus',chainStatus);
  $('tieReviewChainChecks').innerHTML=[
    checkRow('Block order','Current shared preset/editor order',snapshot?.order?.length?'Read':'Not read',null,'⌁'),
    checkRow('Active / bypass',known+' of '+blocks.length+' validated block identities',fullyKnown?'Read':'Partial',null,'◉'),
    checkRow('Model & parameters','Only controls exposed by the selected model',fullyKnown?'Read':'Partial',null,'≋'),
    checkRow('NAM / IR assignment','Available assignment context only',blocks.some(block=>block.known&&(block.nam||block.ir))?'Partial':'Not read',null,'▤'),
    checkRow('Routing consistency','Existing read-only routing result',snapshot?.routing?.verified?'Read':'Not available',null,'⇄')
  ].join('');
  $('tieReviewChainOrder').textContent=blocks.map(block=>block.id+' · '+(block.known?block.model:'Unknown')).join('  →  ')||'Signal chain order unavailable.';
  renderMiniChain();

  $('tieReviewRms').textContent=Number.isFinite(metrics?.rmsDbfs)?metrics.rmsDbfs.toFixed(1)+' dBFS':'Not measured';
  $('tieReviewRmsSource').textContent=result?(result.source?.label||'Selected PCM source')+' · PCM RMS, not live pedal input':'No completed PCM analysis';
  $('tieReviewRmsBar').style.width=Number.isFinite(metrics?.rmsDbfs)?Math.max(0,Math.min(100,((Math.max(-60,Math.min(0,metrics.rmsDbfs))+60)/60)*100))+'%':'0%';
  $('tieReviewHeadroom').textContent='Not measured';$('tieReviewOutput').textContent='Not measured';
  $('tieReviewBlockLevels').innerHTML=rowsForBlocks();
  $('tieReviewGainInterpretation').textContent=metrics
    ?'Selected PCM RMS: '+metrics.rmsDbfs.toFixed(1)+' dBFS; sample peak: '+metrics.samplePeakDbfs.toFixed(1)+' dBFS. Ini mengukur file/Quick Record yang dipilih, bukan input/output live pedal, dan tidak menetapkan headroom.'
    :'No completed PCM Analyzer result. Input level, sample peak, output reference and headroom are not measured.';
  $('tieReviewGainRecommendation').textContent=metrics?.clipping?.detected
    ?'Sample clipping ditemukan pada PCM sumber. Periksa gain saat recording; data ini tidak mengidentifikasi blok MG-30 penyebab clipping.'
    :(metrics?'No sample clipping detected in the selected PCM. Do not change block parameters based on this alone; live input/output references remain unavailable.':'No adjustment recommended until a real PCM source and calibrated input/output reference are available.');

  $('tieReviewToneStatus').textContent=toneStatus;drawSpectrum(result);
  $('tieReviewSpectrumMeta').textContent=result?result.settings.fftSize+' FFT · Hann · '+result.spectrum.binWidthHz.toFixed(2)+' Hz/bin · '+result.spectralFrames+' STFT frames · '+(result.source?.label||'Selected PCM source'):'No Analyzer spectrum available.';
  for(const [id,key] of [['tieReviewLow','low'],['tieReviewMid','mid'],['tieReviewHigh','high']]){const value=metrics?.bandEnergyPct?.[key];$(id).textContent=Number.isFinite(value)?value.toFixed(1)+'%':'—';}
  $('tieReviewToneChecks').innerHTML=[
    checkRow('Frequency balance','Relative band energy from selected PCM source',spectralStatus,null,'≋'),
    checkRow('Potential sharp frequencies','No calibrated or validated sharpness rule','Not measured',null,'⌁'),
    checkRow('EQ & Drive interaction','No block-to-audio-response mapping','Not measured',null,'∿')
  ].join('');
  $('tieReviewReportStatus').textContent=checks.some(item=>item[2]==='Not measured'||item[2]==='Not read')?'PARTIAL':'AVAILABLE';
  $('tieReviewReportMeta').textContent='Preset source: '+(snapshot?.verified?'MG-30 Gen 2 readback':(snapshot?.source==='editor-draft'?'Local draft only':'Not available'))+' · PCM Analyzer: '+(result?'completed local measurement':'not run')+' · Input/output reference, per-block level, headroom and Scene comparison remain not measured.';
}
function navigate(target){if(target==='scene-card'){$('tieReviewSceneConsistency')?.scrollIntoView?.({behavior:'smooth',block:'center'});return;}if(tabs.includes(target))switchTab(target);}
function shareReview(){
  const result=analyzer();
  const content=['MG30 Studio · Configuration Review','Preset: '+(snapshot?.presetName||'Not available'),'Source: '+(snapshot?.verified?'MG-30 Gen 2 device readback':(snapshot?.source==='editor-draft'?'Local editor draft':'Not available')),'Scene: '+(sceneName(snapshot?.sceneIndex)||'Not identified'),'Signal chain: '+(allBlocks().map(block=>block.id+' · '+(block.known?block.model:'Unknown')).join(' → ')||'Not available'),'PCM Analyzer: '+(result?'completed':'not measured'),'Input/output reference, per-block audio level, headroom and cross-scene comparison: not measured.','PDF export: pending implementation.'].join('\n');
  if(navigator.share){void navigator.share({title:'MG30 Studio Configuration Review',text:content}).catch(error=>{if(error?.name!=='AbortError')alert('Share failed: '+(error?.message||String(error)));});}
  else if(navigator.clipboard?.writeText){void navigator.clipboard.writeText(content).then(()=>alert('Review summary copied.'),()=>alert('Sharing and clipboard are unavailable in this WebView.'));}
  else alert('Sharing and clipboard are unavailable in this WebView.');
}
$('tieOpenConfigurationReview')?.addEventListener('click',openReview);
$('tieReviewBack')?.addEventListener('click',closeReview);
document.querySelectorAll('[data-tie-review-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tieReviewTab)));
document.querySelectorAll('[data-tie-review-target]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.tieReviewTarget)));
$('tieReviewAnalyze')?.addEventListener('click',()=>{closeReview();document.querySelector('[data-tie-page="analyzer"]')?.click();});
$('tieReviewCompare')?.addEventListener('click',()=>{closeReview();document.querySelector('[data-tie-page="compare"]')?.click();});
$('tieReviewShare')?.addEventListener('click',shareReview);$('tieReviewShareReport')?.addEventListener('click',shareReview);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('tieConfigurationReview')?.hidden)closeReview();});
window.addEventListener('mg30-tie-analysis-updated',render);
for(const eventName of ['mg30-signal-chain-state-changed','mg30-midi-connection-state','mg30-active-preset-changed'])window.addEventListener(eventName,render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
render();
