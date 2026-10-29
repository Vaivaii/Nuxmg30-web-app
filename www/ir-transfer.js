// NUX MG-30 Gen 2 IR transfer. User 10/09/11 is hardware-tested; Collection 6A/6C/6B remains experimental.
// The WAV payload generator is shared; Collection audio acceptance has not yet been verified on hardware.
const PREFIX=[0xF0,0x43,0x58,0x70], N=2048, FFT=16384, W=600, H=305, SENT=-99999, f32=Math.fround;
const bytesOf=x=>x instanceof Uint8Array?x:x instanceof ArrayBuffer?new Uint8Array(x):ArrayBuffer.isView(x)?new Uint8Array(x.buffer,x.byteOffset,x.byteLength):(()=>{throw Error('Data byte WAV tidak valid.')})();
function enc16(v){if(!Number.isInteger(v)||v<0||v>65535)throw Error('Nilai uint16 tidak valid.');const w=((v&255)<<8)|(v>>>8);return[(w>>>14)&3,(w>>>7)&127,w&127]}
function safeName(s){s=String(s||'Custom IR').replace(/\\/g,'/').split('/').pop().replace(/\.wav$/i,'').trim();if(s.normalize)s=s.normalize('NFKD').replace(/\p{M}/gu,'');s=Array.from(s,c=>{let n=c.charCodeAt(0);return n>=32&&n<=126?c:'_'}).join('').slice(0,20).trim();if(!s)throw Error('Nama IR kosong atau tidak valid.');return s}
function resampleMonoTo48k(input,sourceRate,targetCount){
 if(sourceRate===48000)return input.slice(0,targetCount);
 const output=new Float32Array(targetCount);
 const ratio=48000/sourceRate;
 const cutoff=Math.min(1,ratio)*0.94;
 const radius=18;
 const sinc=x=>Math.abs(x)<1e-8?1:Math.sin(Math.PI*x)/(Math.PI*x);
 for(let i=0;i<targetCount;i++){
  const center=i/ratio;
  const left=Math.max(0,Math.floor(center)-radius+1);
  const right=Math.min(input.length-1,Math.floor(center)+radius);
  let sum=0,weight=0;
  for(let k=left;k<=right;k++){
   const distance=center-k;
   const normalized=distance/radius;
   if(Math.abs(normalized)>=1)continue;
   const window=0.5+0.5*Math.cos(Math.PI*normalized);
   const w=cutoff*sinc(distance*cutoff)*window;
   sum+=input[k]*w;
   weight+=w;
  }
  output[i]=f32(weight!==0?sum/weight:input[Math.min(input.length-1,Math.round(center))]||0);
 }
 return output;
}
export function readMG30IRWav(input){
 const b=bytesOf(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength),tag=o=>String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3]);
 if(b.length<44||tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('File bukan WAV RIFF yang valid. Pastikan file benar-benar WAV, bukan file audio lain yang hanya diganti ekstensi.');
 let off=12,fmt=null,dp=-1,ds=0;
 while(off+8<=b.length){
  const id=tag(off),sz=v.getUint32(off+4,true),st=off+8;
  if(st+sz>b.length)throw Error('Chunk WAV terpotong atau ukuran file tidak sesuai.');
  if(id==='fmt '){
   if(sz<16)throw Error('Header format WAV terlalu pendek.');
   fmt={format:v.getUint16(st,true),channels:v.getUint16(st+2,true),rate:v.getUint32(st+4,true),align:v.getUint16(st+12,true),bits:v.getUint16(st+14,true)};
   if(fmt.format===65534&&sz>=40)fmt.format=v.getUint16(st+24,true);
  }
  if(id==='data'){dp=st;ds=sz}
  off=st+sz+(sz&1);
 }
 if(!fmt||dp<0)throw Error('Chunk fmt/data tidak ditemukan dalam WAV.');
 const supportedFormat=[1,3].includes(fmt.format);
 const supportedBits=[8,16,24,32].includes(fmt.bits)&&(fmt.format!==3||fmt.bits===32);
 const supportedRate=Number.isFinite(fmt.rate)&&fmt.rate>=8000&&fmt.rate<=192000;
 if(!supportedFormat||!supportedRate||![1,2].includes(fmt.channels)||!supportedBits){
  throw Error('Format WAV tidak didukung. Terdeteksi: format '+fmt.format+', '+fmt.channels+' kanal, '+fmt.rate+' Hz, '+fmt.bits+' bit. Dukungan: PCM 8/16/24/32-bit atau Float32, mono/stereo, sample rate 8–192 kHz.');
 }
 const bps=fmt.bits/8;
 if(fmt.align!==fmt.channels*bps||!fmt.align||ds%fmt.align)throw Error('Struktur WAV tidak konsisten: blockAlign atau ukuran data tidak cocok dengan kanal/bit-depth.');
 const count=ds/fmt.align;
 const targetCount=Math.round(count*48000/fmt.rate);
 if(count<=0||targetCount<N)throw Error('WAV terlalu pendek. Setelah dikonversi ke 48 kHz tersedia sekitar '+targetCount+' frame; dibutuhkan sedikitnya '+N+' frame.');
 const mono=new Float32Array(count);
 for(let i=0;i<count;i++){
  // QuickTone's second known stereo capture matches the FIRST (left) channel,
  // not an average of both channels. Keep the original channel convention.
  const p=dp+i*fmt.align;
  let x;
  if(fmt.format===3)x=v.getFloat32(p,true);
  else if(fmt.bits===8)x=(b[p]-128)/128;
  else if(fmt.bits===16)x=v.getInt16(p,true)/32768;
  else if(fmt.bits===24){x=b[p]|(b[p+1]<<8)|(b[p+2]<<16);if(x&0x800000)x-=0x1000000;x/=8388608}
  else x=v.getInt32(p,true)/2147483648;
  if(!Number.isFinite(x))throw Error('Sampel WAV tidak valid pada frame '+i+'.');
  mono[i]=f32(x);
 }
 // The observed MG-30 import path consumes 2048 float32 samples. Normalize the
 // first 2048 frames to the 48 kHz clock used by the matching QuickTone capture.
 const samples=resampleMonoTo48k(mono,fmt.rate,N);
 return{
  samples,count,rate:fmt.rate,channels:fmt.channels,format:fmt.format,bits:fmt.bits,
  normalizedRate:48000,normalizedFrames:targetCount,
  description:(fmt.channels===1?'Mono':'Stereo · kanal kiri dipakai')+' · '+(fmt.format===3?'Float32':'PCM '+fmt.bits+'-bit')+' · '+fmt.rate+' Hz'+(fmt.rate!==48000?' → 48 kHz':'')
 };
}
function fft(samples){const re=new Float32Array(FFT),im=new Float32Array(FFT);for(let i=0;i<N;i++)re[i]=f32(samples[i]);let j=0;for(let i=1;i<FFT;i++){let bit=FFT>>>1;while(j&bit){j^=bit;bit>>>=1}j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let size=2;size<=FFT;size<<=1){const half=size>>>1,step=-2*Math.PI/size;for(let k=0;k<half;k++){const wr=f32(Math.cos(step*k)),wi=f32(Math.sin(step*k));for(let start=k;start<FFT;start+=size){const o=start+half,r=re[o],q=im[o],tr=f32(f32(r*wr)-f32(q*wi)),ti=f32(f32(r*wi)+f32(q*wr)),ur=re[start],ui=im[start];re[start]=f32(ur+tr);im[start]=f32(ui+ti);re[o]=f32(ur-tr);im[o]=f32(ui-ti)}}}return{re,im}}
function gainFor(samples){const {re,im}=fft(samples);let min=Infinity,max=-Infinity;for(let i=136;i<1024;i++){const p=f32(f32(re[i]*re[i])+f32(im[i]*im[i]));if(p<min)min=p;if(p>max)max=p}if(!(min>0&&max>0&&Number.isFinite(min+max)))throw Error('Tidak dapat menghitung normalisasi WAV.');return Math.pow(10,-.5*(Math.log10(Math.sqrt(min))+Math.log10(Math.sqrt(max))))}
function curveFor(samples){const{re,im}=fft(samples),logs=new Float32Array(FFT/2);for(let i=0;i<logs.length;i++){const mag=f32(Math.sqrt(Math.max(0,f32(f32(re[i]*re[i])+f32(im[i]*im[i])))));logs[i]=f32(f32(Math.log(Math.max(Number(mag),1e-300)))*f32(20))}
 const vals=new Float32Array(W),scale=f32(24000/8192),xmin=f32(20/scale),xmax=f32(22000/scale),logStep=f32(f32(f32(Math.log(Number(xmax))-f32(Math.log(Number(xmin)))))/f32(W)),step=f32(Math.exp(Number(logStep)));let idx=Math.trunc(xmin),th=xmin;
 for(let p=0;p<W;p++){let m=SENT;while(th>f32(idx)){if(idx<0||idx>=logs.length)throw Error('Bin FFT kurva di luar rentang.');if(logs[idx]>m)m=f32(logs[idx]);idx++}vals[p]=m;th=f32(th*step)}
 let i=0;while(i<W){if(vals[i]!==SENT){i++;continue}let j=i+1;while(j<W&&vals[j]===SENT)j++;if(i===0){if(j<W){const first=f32(vals[j]);for(let k=0;k<j;k++)vals[k]=first}i=j;continue}if(j>=W)break;const left=f32(vals[i-1]),right=f32(vals[j]),inc=f32(f32(right-left)/f32(j-i+1));for(let k=i;k<j;k++)vals[k]=f32(left+f32(f32(k-(i-1))*inc));i=j}
 let mn=f32(0),mx=f32(0);for(const x of vals){if(x<mn)mn=f32(x);if(x>mx)mx=f32(x)}const den=f32(mx-mn),out=new Uint16Array(W);if(den!==0)for(let k=0;k<W;k++)out[k]=Math.trunc(f32(f32(f32(vals[k]-mn)/den)*f32(H)))&65535;return out
}
function frameHeader(cmd,param,offset){return[...PREFIX,cmd,1,...enc16(param),...enc16(offset)]}
function waveformFrames(samples,param,gain){const wire=new Float32Array(N);for(let i=0;i<N;i++)wire[i]=f32(samples[N-1-i]*gain);const dv=new DataView(wire.buffer),frames=[];for(let f=0;f<64;f++){const out=frameHeader(0x10,param,f*32);for(let i=0;i<64;i++)out.push(...enc16(dv.getUint16((f*64+i)*2,true)));out.push(0xF7);if(out.length!==205)throw Error('Panjang paket waveform tidak cocok.');frames.push(Uint8Array.from(out))}return{frames,wire}}
function nameFrame(name,param){const b=new Uint8Array(32),enc=new TextEncoder().encode(safeName(name));b.set(enc.subarray(0,20));const out=[...PREFIX,0x09,0x01,param,0,2,0,0,0,0];for(let i=0;i<32;i+=2)out.push(...enc16(b[i]|(b[i+1]<<8)));out.push(0xF7);if(out.length!==62)throw Error('Panjang paket nama tidak cocok.');return Uint8Array.from(out)}
function curveFrames(curve,param){const v=new Uint16Array(640);v.set(curve);const frames=[];for(let f=0;f<10;f++){const out=frameHeader(0x11,param,f*64);for(let i=f*64;i<(f+1)*64;i++)out.push(...enc16(v[i]));out.push(0xF7);if(out.length!==205)throw Error('Panjang paket kurva tidak cocok.');frames.push(Uint8Array.from(out))}return frames}
export function buildMG30IRTransferPlan({samples,fileName,irName,parameter=1,target='user'}){if(!samples||samples.length<N)throw Error('Pilih WAV yang valid dahulu.');const param=Number(parameter);if(!Number.isInteger(param)||param<0||param>127)throw Error('Parameter transfer harus bilangan 0–127.');const name=safeName(irName||fileName||'Custom IR'),gain=gainFor(samples.subarray?samples.subarray(0,N):samples),wave=waveformFrames(samples,param,gain),curve=curveFrames(curveFor(wave.wire),param),frames=[...wave.frames,nameFrame(name,param),...curve],mode=target==='collection'?'collection':'user',commands=mode==='collection'?{waveform:0x6A,name:0x6C,curve:0x6B}:{waveform:0x10,name:0x09,curve:0x11};if(frames.length!==75)throw Error('Rencana transfer harus berisi 75 paket.');for(let i=0;i<64;i++)frames[i][4]=commands.waveform;frames[64][4]=commands.name;for(let i=65;i<75;i++)frames[i][4]=commands.curve;return{name,parameter:param,target:mode,commands,gain,frames}}
function waitAck(input,cmd,timeout=3000){let timer,done=false,handler=()=>{},cancel=()=>{};const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);input.removeEventListener('midimessage',handler)};const promise=new Promise((resolve,reject)=>{handler=e=>{const d=Array.from(e?.data||[]);if(d.length<8||d[0]!==240||d[1]!==67||d[2]!==88||d[3]!==112||d[4]!==cmd||d[5]!==3||d[d.length-1]!==247)return;cleanup();resolve({status:d[6]})};cancel=()=>{cleanup();resolve(null)};input.addEventListener('midimessage',handler);timer=setTimeout(()=>{cleanup();reject(Error('Timeout ACK untuk fase '+cmd.toString(16)))},timeout)});return{promise,cancel}}
async function sendFrame(conn,frame,cmd,label){const p=waitAck(conn.input,cmd);try{await conn.output.send(frame)}catch(e){p.cancel();throw Error('Pengiriman '+label+' gagal: '+(e?.message||e))}const ack=await p.promise;if(!ack)throw Error('ACK dibatalkan: '+label);return ack}
async function sendMG30IRTransfer(conn,plan,onProgress=()=>{}){if(!conn?.input?.addEventListener||!conn?.output?.send||plan?.frames?.length!==75)throw Error('Koneksi MIDI/rencana IR belum siap.');const commands=plan.target==='collection'?{waveform:0x6A,name:0x6C,curve:0x6B}:{waveform:0x10,name:0x09,curve:0x11};const phases=[['waveform',commands.waveform,0,64],['name',commands.name,64,65],['curve',commands.curve,65,75]];let done=0;for(const[phase,cmd,start,end]of phases)for(let i=start;i<end;i++){const ack=await sendFrame(conn,plan.frames[i],cmd,phase+' '+(i-start+1)+'/'+(end-start));const phaseCompleted=i-start+1,finalFrame=i===end-1;const expected=phase==='name'?0:(finalFrame?3:2);if(ack.status!==expected)throw Error('ACK '+phase+' '+phaseCompleted+'/'+(end-start)+' berstatus '+ack.status+', padahal capture QuickTone menunjukkan '+expected+'. Transfer dihentikan; cek slot/perangkat dan jangan anggap impor berhasil.');done++;onProgress({phase,phaseCompleted,phaseTotal:end-start,completed:done,total:75,ackStatus:ack.status,expectedStatus:expected})}return{success:true,completedFrames:done,totalFrames:75,name:plan.name,parameter:plan.parameter,target:plan.target}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function initUI(){
 const $=id=>document.getElementById(id),root=$('ir-import-content');
 if(!root)return;
 const legacy=root.querySelector('.ir-import-panel');if(legacy)legacy.classList.add('hidden');
 const legacyHero=root.querySelector(':scope > .hero');if(legacyHero)legacyHero.classList.add('hidden');
 const old=$('ir-manager-ui');if(old)old.remove();
 const ui=document.createElement('div');ui.id='ir-manager-ui';ui.className='ir-manager-grid';
 ui.innerHTML=
 '<section class="ir-manager-card">'+
  '<div class="ir-manager-card-head"><div><h3>Third Party / User IR</h3><p>Upload langsung ke jalur User yang sudah teruji.</p></div><span class="chip">USER</span></div>'+
  '<button class="ir-manager-upload" id="irManagerUserImport" type="button"><span class="studio-file-icon">IR</span><span class="ir-manager-upload-copy"><strong>Import IR WAV ke User</strong><small>Memvalidasi file lalu langsung mengirim ke MG-30.</small></span><span class="studio-file-arrow">↗</span></button>'+
  '<div class="ir-manager-status" id="irManagerUserStatus" role="status" aria-live="polite">Belum ada import melalui MG30 Studio.</div>'+
 '</section>'+
 '<section class="ir-manager-card">'+
  '<div class="ir-manager-card-head"><div><h3>Collection IR</h3><p>Import ke slot Collection 01–24. Pilih slot, lalu WAV otomatis divalidasi dan dikirim.</p></div><span class="chip">24 SLOT</span></div>'+
  '<div class="ir-collection-toolbar"><span class="slot-note" id="irManagerCollectionCount">0 slot dikelola aplikasi</span><button class="btn ghost" id="irManagerToggleSlots" type="button" aria-expanded="true">Sembunyikan slot</button></div>'+
  '<div class="ir-collection-grid" id="irManagerCollectionGrid"></div>'+
  '<p class="ir-manager-footnote">Daftar ini mencatat WAV yang diimpor melalui MG30 Studio. Isi Collection yang dibuat langsung melalui QuickTone tidak dibaca otomatis.</p>'+
  '<div class="ir-manager-status" id="irManagerCollectionStatus" role="status" aria-live="polite">Pilih slot Collection untuk menambahkan IR.</div>'+
 '</section>'+
 '<input class="hidden" type="file" id="irManagerFileInput" accept=".wav,audio/wav,audio/x-wav">';
 root.appendChild(ui);
 const fileInput=$('irManagerFileInput'),userButton=$('irManagerUserImport'),grid=$('irManagerCollectionGrid');
 const userStatus=$('irManagerUserStatus'),collectionStatus=$('irManagerCollectionStatus'),countLabel=$('irManagerCollectionCount'),toggle=$('irManagerToggleSlots');
 let pendingTarget=null,busy=false,slotCache=new Map(),lastUserName='';
 const DB_NAME='mg30-studio-ir-collection-v1',STORE='slots';
 const setMessage=(node,message,kind='')=>{node.textContent=message;node.classList.remove('ok','warn');if(kind)node.classList.add(kind)};
 function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(Error('Penyimpanan lokal tidak tersedia di perangkat ini.'));return}const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Tidak bisa membuka penyimpanan lokal.'))})}
 async function readSlot(slot){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(slot);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Gagal membaca slot lokal.'))})}finally{db.close()}}
 async function writeSlot(record){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Gagal menyimpan WAV ke penyimpanan lokal.'));tx.onabort=()=>reject(tx.error||Error('Penyimpanan lokal dibatalkan.'))})}finally{db.close()}}
 function slotCard(slot){
  const card=document.createElement('article');card.className='ir-collection-slot';card.dataset.slot=String(slot);
  card.innerHTML='<div class="ir-collection-slot-head"><span class="ir-collection-slot-number">'+String(slot).padStart(2,'0')+'</span><span class="ir-collection-slot-status" data-slot-status>Belum dicatat</span></div>'+
   '<div class="ir-collection-slot-name" data-slot-name>Slot Collection '+String(slot).padStart(2,'0')+'</div>'+
   '<div class="ir-collection-slot-file" data-slot-file>Belum ada WAV lokal</div>'+
   '<div class="ir-collection-slot-actions"><button class="btn primary" type="button" data-slot-import>Import WAV</button><button class="btn" type="button" data-slot-use disabled>Gunakan di User</button></div>';
  card.querySelector('[data-slot-import]').addEventListener('click',()=>{if(busy)return;pendingTarget={type:'collection',slot};fileInput.value='';fileInput.click()});
  card.querySelector('[data-slot-use]').addEventListener('click',async()=>{if(busy)return;let record=slotCache.get(slot);if(!record){try{record=await readSlot(slot);if(record)slotCache.set(slot,record)}catch(e){setMessage(collectionStatus,e.message||'Gagal membaca WAV lokal.','warn');return}}if(!record?.blob){setMessage(collectionStatus,'WAV sumber untuk slot '+String(slot).padStart(2,'0')+' tidak tersedia di aplikasi.','warn');return}pendingTarget={type:'user',sourceSlot:slot,entry:record};processImport(record.blob,{type:'user',name:record.name,fileName:record.fileName,sourceSlot:slot,entry:record})});
  return card;
 }
 const cardNodes=new Map();
 for(let slot=1;slot<=24;slot++){const card=slotCard(slot);grid.appendChild(card);cardNodes.set(slot,card)}
 function updateSlotCard(slot,record){
  const card=cardNodes.get(slot);if(!card)return;
  const name=card.querySelector('[data-slot-name]'),status=card.querySelector('[data-slot-status]'),file=card.querySelector('[data-slot-file]'),use=card.querySelector('[data-slot-use]');
  if(record){card.classList.add('is-filled');name.textContent=record.name||record.fileName||('IR Slot '+slot);status.textContent='WAV lokal';file.textContent=record.fileName||'WAV tersimpan';use.disabled=!record.blob;use.title='Mengirim ulang WAV sumber tersimpan melalui jalur User yang sudah teruji.'}
  else{card.classList.remove('is-filled');name.textContent='Slot Collection '+String(slot).padStart(2,'0');status.textContent='Belum dicatat';file.textContent='Belum ada WAV lokal';use.disabled=true;use.title='Import WAV melalui aplikasi terlebih dahulu.'}
 }
 function renderSlotCount(){const count=slotCache.size;countLabel.textContent=count+' dari 24 slot dikelola aplikasi'}
 toggle.addEventListener('click',()=>{const collapsed=!grid.classList.contains('collapsed');grid.classList.toggle('collapsed',collapsed);toggle.textContent=collapsed?'Tampilkan 24 slot':'Sembunyikan slot';toggle.setAttribute('aria-expanded',String(!collapsed))});
 function setBusy(on){busy=on;userButton.disabled=on;grid.querySelectorAll('button').forEach(b=>b.disabled=on||(b.hasAttribute('data-slot-use')&&!slotCache.get(Number(b.closest('[data-slot]').dataset.slot))));toggle.disabled=on}
 function safeDisplayName(value){try{return safeName(value||'Custom IR')}catch{return 'Custom IR'}}
 async function processImport(blob,target){
  if(busy)return;
  if(!window.NUXNativeMidi?.available){setMessage(target.type==='user'?userStatus:collectionStatus,'Transfer IR hanya tersedia di APK Android. Sambungkan MG-30 melalui USB OTG.','warn');return}
  const statusNode=target.type==='user'?userStatus:collectionStatus;
  const slot=target.slot||0,slotLabel=String(slot).padStart(2,'0');
  const name=safeDisplayName(target.name||target.fileName||blob.name||'Custom IR');
  const fileName=target.fileName||blob.name||name+'.wav';
  if(target.type==='collection'){
   const existing=slotCache.get(slot);
   if(existing&&!confirm('Ganti IR yang dikelola aplikasi pada slot Collection '+slotLabel+'? Slot perangkat bisa tertimpa.')){setMessage(statusNode,'Import dibatalkan. Slot tidak diubah.');return}
   if(!confirm('Import "'+name+'" ke Collection slot '+slotLabel+'? Ini akan menulis slot Collection tersebut pada MG-30.')){setMessage(statusNode,'Import dibatalkan. Slot tidak diubah.');return}
  }else if(!confirm('Import "'+name+'" ke Third Party / User pada MG-30 Gen 2?')){setMessage(statusNode,'Import dibatalkan. Tidak ada data dikirim.');return}
  setBusy(true);setMessage(statusNode,'Memvalidasi WAV…');userButton.querySelector('strong').textContent=target.type==='user'?'Memvalidasi WAV…':'Import IR WAV ke User';
  try{
   const wav=readMG30IRWav(await blob.arrayBuffer());
   const parameter=target.type==='collection'?slot-1:71;
   const plan=buildMG30IRTransferPlan({samples:wav.samples,fileName,irName:name,parameter,target:target.type});
   const commands=target.type==='collection'?{waveform:0x6A,name:0x6C,curve:0x6B}:{waveform:0x10,name:0x09,curve:0x11};
   const p=plan.parameter,enc=enc16(p),wf=plan.frames[0],nf=plan.frames[64],cf=plan.frames[65];
   if(plan.frames.length!==75||wf[4]!==commands.waveform||nf[4]!==commands.name||cf[4]!==commands.curve||wf[6]!==enc[0]||wf[7]!==enc[1]||wf[8]!==enc[2]||nf[6]!==p||cf[6]!==enc[0]||cf[7]!==enc[1]||cf[8]!==enc[2])throw Error('Validasi paket gagal. Tidak ada data yang dikirim.');
   setMessage(statusNode,'WAV valid. Menghubungkan dan mengirim IR…');
   const conn=await window.NUXNativeMidi.connect();
   const result=await sendMG30IRTransfer(conn,plan,info=>{setMessage(statusNode,'Mengirim '+info.completed+'/75 paket…')});
   if(!result?.success||result.completedFrames!==75)throw Error('Transfer belum lengkap. Jangan anggap IR berhasil.');
   if(target.type==='collection'){
    const record={slot,name,fileName,blob,updatedAt:new Date().toISOString(),source:'MG30 Studio'};
    try{await writeSlot(record);slotCache.set(slot,record);updateSlotCard(slot,record);renderSlotCount();setMessage(statusNode,'Transfer selesai ke Collection slot '+slotLabel+'. WAV sumber tersimpan lokal; periksa item/hasil IR pada perangkat.','ok')}
    catch(e){setMessage(statusNode,'Transfer ke slot '+slotLabel+' mendapat respons, tetapi WAV sumber tidak tersimpan lokal. Tombol Gunakan tidak tersedia setelah sesi ini: '+(e.message||'kesalahan penyimpanan'),'warn')}
   }else{
    lastUserName=name;
    setMessage(userStatus,'Transfer selesai: "'+name+'" dikirim ke Third Party / User. Periksa nama dan hasil IR pada perangkat.','ok');
    if(target.sourceSlot)setMessage(userStatus,'WAV sumber dari Collection slot '+String(target.sourceSlot).padStart(2,'0')+' dikirim ke Third Party / User memakai jalur User yang sudah teruji. Periksa nama dan hasil IR pada perangkat.','ok');
   }
  }catch(error){const msg=error?.message||String(error||'Kesalahan tidak diketahui');setMessage(statusNode,'Import gagal: '+msg,'warn')}
  finally{setBusy(false);userButton.querySelector('strong').textContent='Import IR WAV ke User'}
 }
 fileInput.addEventListener('change',()=>{const blob=fileInput.files&&fileInput.files[0];const target=pendingTarget;pendingTarget=null;if(!blob||!target)return;const name=target.type==='user'?(target.name||safeDisplayName(blob.name)):safeDisplayName(blob.name);processImport(blob,{...target,name,fileName:blob.name})});
 userButton.addEventListener('click',()=>{if(busy)return;pendingTarget={type:'user'};fileInput.value='';fileInput.click()});
 async function restoreLocalSlots(){for(let slot=1;slot<=24;slot++){try{const record=await readSlot(slot);if(record)slotCache.set(slot,record)}catch(e){setMessage(collectionStatus,'Penyimpanan lokal tidak dapat dibaca: '+(e.message||'kesalahan'),'warn');break}updateSlotCard(slot,slotCache.get(slot)||null)}renderSlotCount()}
 restoreLocalSlots();
}if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI,{once:true});else initUI()}
