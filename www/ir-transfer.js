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
  '<div class="ir-collection-toolbar"><span class="slot-note" id="irManagerCollectionCount">Belum disinkronkan</span><button class="btn primary" id="irManagerSyncCollection" type="button">Sinkronkan dari MG-30</button><button class="btn ghost" id="irManagerToggleSlots" type="button" aria-expanded="true">Sembunyikan slot</button></div>'+
  '<p class="ir-current-preset-ir-note">Kotak nomor merah menandai IR Collection yang digunakan preset terpilih.</p>'+
  '<div class="ir-collection-grid" id="irManagerCollectionGrid"></div>'+
  '<p class="ir-manager-footnote">Nama dan status slot dibaca dari MG-30. Tombol Gunakan di User tersedia bila WAV sumber juga disimpan oleh MG30 Studio.</p>'+
  '<div class="ir-manager-status" id="irManagerCollectionStatus" role="status" aria-live="polite">Pilih slot Collection untuk menambahkan IR.</div>'+
 '</section>'+
 '<input class="hidden" type="file" id="irManagerFileInput" accept=".wav,audio/wav,audio/x-wav">';
 root.appendChild(ui);
 const fileInput=$('irManagerFileInput'),userButton=$('irManagerUserImport'),grid=$('irManagerCollectionGrid');
 const userStatus=$('irManagerUserStatus'),collectionStatus=$('irManagerCollectionStatus'),countLabel=$('irManagerCollectionCount'),toggle=$('irManagerToggleSlots'),syncButton=$('irManagerSyncCollection');
 let pendingTarget=null,busy=false,syncBusy=false,slotCache=new Map(),deviceSlots=new Map(),lastUserName='';
 let lastSyncAt=0;
 const IR_PRESET_COLLECTION_MAP_KEY='mg30-ir-collection-preset-map';
 function readDraftProgramSlot(){
  try{
   const draft=JSON.parse(localStorage.getItem('mg30-draft')||'null');
   const slot=Number(draft?.targetSlot);
   return Number.isInteger(slot)&&slot>=0&&slot<=127?slot:0;
  }catch{return 0}
 }
 let activePresetProgramSlot=readDraftProgramSlot();
 function currentPresetProgramSlot(){
  activePresetProgramSlot=readDraftProgramSlot();
  return activePresetProgramSlot;
 }
 function presetProgramLabel(programSlot){
  const slot=Math.max(0,Math.min(127,Number(programSlot)||0));
  return String(Math.floor(slot/4)+1).padStart(2,'0')+'ABCD'[slot%4];
 }
 function readPresetCollectionAssignments(){
  try{
   const value=JSON.parse(localStorage.getItem(IR_PRESET_COLLECTION_MAP_KEY)||'{}');
   return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {}}
 }
 const DB_NAME='mg30-studio-ir-collection-v1',STORE='slots';
 const setMessage=(node,message,kind='')=>{node.textContent=message;node.classList.remove('ok','warn');if(kind)node.classList.add(kind)};
 function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(Error('Penyimpanan lokal tidak tersedia di perangkat ini.'));return}const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Tidak bisa membuka penyimpanan lokal.'))})}
 async function readSlot(slot){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(slot);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Gagal membaca slot lokal.'))})}finally{db.close()}}
 async function writeSlot(record){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Gagal menyimpan WAV ke penyimpanan lokal.'));tx.onabort=()=>reject(tx.error||Error('Penyimpanan lokal dibatalkan.'))})}finally{db.close()}}
 async function useCollectionSlotOnDevice(slot,programSlotOverride=null){
  if(busy||syncBusy)return;
  const programSlot=Number.isInteger(programSlotOverride)&&programSlotOverride>=0&&programSlotOverride<=127?programSlotOverride:currentPresetProgramSlot();
  const device=deviceSlots.get(slot);
  if(!device?.read||!device?.stable||!device.occupied){setMessage(collectionStatus,'Slot '+String(slot).padStart(2,'0')+' belum terverifikasi berisi IR di perangkat.','warn');return}
  if(!window.NUXNativeMidi?.available){setMessage(collectionStatus,'Gunakan IR langsung dari Collection memerlukan APK Android dan USB OTG.','warn');return}
  const slotIndex=slot-1,slotLabel=String(slot).padStart(2,'0');
  const request=Uint8Array.from([0xf0,0x43,0x58,0x70,0x6e,0x01,slotIndex,0,0,0,0,0,0,0xf7]);
  let connection;
  setBusy(true);setMessage(collectionStatus,'Meminta MG-30 memakai IR Collection slot '+slotLabel+'…');
  try{
   connection=await window.NUXNativeMidi.connect();
   const response=new Promise((resolve,reject)=>{
    let settled=false,timer;
    const cleanup=()=>{if(settled)return;settled=true;clearTimeout(timer);connection.input.removeEventListener('midimessage',onMessage)};
    const onMessage=event=>{
     const data=Array.from(event?.data||[]);
     // Captured QuickTone 2.6.7.16 response is 15 bytes:
     // F0 43 58 70 6E 02 [index] 00 00 00 00 00 00 00 F7.
     // The old 14-byte check rejected the real reply, so the pedal executed
     // Use but the app timed out before syncing the cabinet name.
     if(data.length!==15||data[0]!==0xf0||data[1]!==0x43||data[2]!==0x58||data[3]!==0x70||data[4]!==0x6e||data[5]!==0x02||data[6]!==slotIndex||data[14]!==0xf7)return;
     cleanup();resolve(true);
    };
    connection.input.addEventListener('midimessage',onMessage);
    timer=setTimeout(()=>{cleanup();reject(Error('Timeout menunggu respons 6E/02 dari MG-30 untuk slot '+slotLabel+'.'))},1800);
   });
   try{await connection.output.send(request)}catch(error){throw Error('Gagal mengirim perintah Gunakan: '+(error?.message||error))}
   await response;
   const name=device.name||('Collection '+slotLabel);
   try{localStorage.setItem('mg30-user-ir-name',name)}catch{}
   window.dispatchEvent(new CustomEvent('mg30-user-ir-name-changed',{detail:{name,sourceSlot:slot,programSlot,directDeviceUse:true}}));
   setMessage(collectionStatus,'MG-30 merespons Gunakan untuk Collection slot '+slotLabel+'. Nama cabinet diperbarui menjadi "'+name+'". Periksa slot Third Party/User pada perangkat.','ok');
  }catch(error){setMessage(collectionStatus,'Gunakan langsung gagal: '+(error?.message||error)+' WAV lokal tidak diubah.','warn')}
  finally{setBusy(false)}
 }
 function slotCard(slot){
  const card=document.createElement('article');card.className='ir-collection-slot';card.dataset.slot=String(slot);
  card.innerHTML='<div class="ir-collection-slot-head"><span class="ir-collection-slot-number">'+String(slot).padStart(2,'0')+'</span><span class="ir-collection-slot-status" data-slot-status>Belum dicatat</span></div>'+
   '<div class="ir-collection-slot-name" data-slot-name>Slot Collection '+String(slot).padStart(2,'0')+'</div>'+
   '<div class="ir-collection-slot-file" data-slot-file>Belum ada WAV lokal</div>'+
   '<div class="ir-collection-slot-actions"><button class="btn primary" type="button" data-slot-import>Import WAV</button><button class="btn" type="button" data-slot-use disabled>Gunakan di User</button></div>';
  card.querySelector('[data-slot-import]').addEventListener('click',()=>{if(busy)return;pendingTarget={type:'collection',slot};fileInput.value='';fileInput.click()});
  card.querySelector('[data-slot-use]').addEventListener('click',async()=>{
   if(busy||syncBusy)return;
   const programSlot=currentPresetProgramSlot();
   let record=slotCache.get(slot);
   if(!record){try{record=await readSlot(slot);if(record)slotCache.set(slot,record)}catch(e){setMessage(collectionStatus,e.message||'Gagal membaca WAV lokal.','warn');return}}
   if(record?.blob){pendingTarget={type:'user',sourceSlot:slot,programSlot,entry:record};processImport(record.blob,{type:'user',name:record.name,fileName:record.fileName,sourceSlot:slot,programSlot,entry:record});return}
   const device=deviceSlots.get(slot);
   if(device?.read&&device?.stable&&device.occupied){void useCollectionSlotOnDevice(slot,programSlot);return}
   setMessage(collectionStatus,'WAV sumber lokal tidak tersedia dan slot perangkat belum terbaca stabil. Sinkronkan Collection terlebih dahulu.','warn');
  });
  return card;
 }
 const cardNodes=new Map();
 for(let slot=1;slot<=24;slot++){const card=slotCard(slot);grid.appendChild(card);cardNodes.set(slot,card)}
 function updateSlotCard(slot,record){
  const card=cardNodes.get(slot);if(!card)return;
  const name=card.querySelector('[data-slot-name]'),status=card.querySelector('[data-slot-status]'),file=card.querySelector('[data-slot-file]'),use=card.querySelector('[data-slot-use]');
  const local=slotCache.get(slot)||record||null,device=deviceSlots.get(slot);
  if(device?.read&&device.occupied){
   card.classList.add('is-filled');name.textContent=device.name||local?.name||('Collection slot '+String(slot).padStart(2,'0'));
   status.textContent='Dari MG-30';file.textContent=local?.blob?'WAV lokal tersedia · CRC '+device.crcHex:'IR tersimpan di perangkat'+(device.crcHex?' · CRC '+device.crcHex:'');
  }else if(device?.read&&!device.occupied){
   card.classList.toggle('is-filled',!!local?.blob);name.textContent=local?.blob?(local.name||local.fileName):('Slot Collection '+String(slot).padStart(2,'0'));
   status.textContent=local?.blob?'Kosong di pedal':'Kosong di MG-30';file.textContent=local?.blob?'WAV lokal tersimpan':'Slot perangkat kosong';
  }else if(device&&!device.read){
   if(local?.blob){card.classList.add('is-filled');name.textContent=local.name||local.fileName||('IR Slot '+slot);status.textContent='Sinkronisasi gagal';file.textContent=device.error||'Metadata perangkat tidak terbaca';}
   else{card.classList.remove('is-filled');name.textContent='Slot Collection '+String(slot).padStart(2,'0');status.textContent='Gagal dibaca';file.textContent=device.error||'Perangkat tidak memberi balasan metadata';}
  }else if(local){
   card.classList.add('is-filled');name.textContent=local.name||local.fileName||('IR Slot '+slot);status.textContent='WAV lokal · belum sinkron';file.textContent=local.fileName||'WAV tersimpan';
  }else{
   card.classList.remove('is-filled');name.textContent='Slot Collection '+String(slot).padStart(2,'0');status.textContent='Belum dibaca';file.textContent='Belum ada data perangkat';
  }
  use.disabled=!(local?.blob||(device?.read&&device?.stable&&device?.occupied));use.title=local?.blob?'Mengirim WAV sumber lokal melalui jalur User yang sudah teruji.':(device?.read&&device?.stable&&device?.occupied?'Meminta MG-30 memakai item Collection langsung melalui request 6E/01 yang teramati pada QuickTone.':'WAV sumber lokal dan metadata perangkat belum tersedia.');
 }
 function updateCurrentPresetIRMarker(){
  const assignments=readPresetCollectionAssignments();
  const stored=Number(assignments[String(activePresetProgramSlot)]);
  const usedSlot=Number.isInteger(stored)&&stored>=1&&stored<=24?stored:0;
  for(const [slot,card] of cardNodes){
   const number=card.querySelector('.ir-collection-slot-number');
   if(!number)continue;
   const active=slot===usedSlot;
   number.classList.toggle('is-used-in-current-preset',active);
   if(active){
    number.title='Digunakan oleh preset '+presetProgramLabel(activePresetProgramSlot);
    number.setAttribute('aria-label','IR Collection slot '+String(slot).padStart(2,'0')+' digunakan oleh preset '+presetProgramLabel(activePresetProgramSlot));
   }else{
    number.removeAttribute('title');
    number.removeAttribute('aria-label');
   }
  }
 }
 function savePresetCollectionAssignment(programSlot,sourceSlot){
  if(!Number.isInteger(programSlot)||programSlot<0||programSlot>127)return;
  const assignments=readPresetCollectionAssignments();
  const slot=Number(sourceSlot);
  if(Number.isInteger(slot)&&slot>=1&&slot<=24)assignments[String(programSlot)]=slot;
  else delete assignments[String(programSlot)];
  try{localStorage.setItem(IR_PRESET_COLLECTION_MAP_KEY,JSON.stringify(assignments))}
  catch(error){setMessage(collectionStatus,'Penanda IR tersimpan gagal: '+(error?.message||error),'warn');return}
  updateCurrentPresetIRMarker();
 }
 window.addEventListener('mg30-active-preset-changed',event=>{
  const programSlot=Number(event?.detail?.programSlot);
  if(!Number.isInteger(programSlot)||programSlot<0||programSlot>127)return;
  activePresetProgramSlot=programSlot;
  updateCurrentPresetIRMarker();
 });
 window.addEventListener('mg30-user-ir-name-changed',event=>{
  const detail=event?.detail||{};
  const explicitProgram=Number(detail.programSlot);
  const programSlot=Number.isInteger(explicitProgram)&&explicitProgram>=0&&explicitProgram<=127?explicitProgram:currentPresetProgramSlot();
  savePresetCollectionAssignment(programSlot,detail.sourceSlot);
 });
 updateCurrentPresetIRMarker();
 function renderSlotCount(){
  const records=[...deviceSlots.values()];
  const occupied=records.filter(x=>x.read&&x.stable&&x.occupied).length;
  const read=records.filter(x=>x.read&&x.stable).length;
  countLabel.textContent=syncBusy?(read+'/24 slot stabil · membaca…'):(read===24?occupied+' IR di perangkat · 24/24 slot stabil':(read?read+'/24 slot stabil dibaca':'Menunggu sinkronisasi perangkat'));
 }
 toggle.addEventListener('click',()=>{const collapsed=!grid.classList.contains('collapsed');grid.classList.toggle('collapsed',collapsed);toggle.textContent=collapsed?'Tampilkan 24 slot':'Sembunyikan slot';toggle.setAttribute('aria-expanded',String(!collapsed))});
 function setBusy(on){
  busy=on;userButton.disabled=on||syncBusy;syncButton.disabled=on||syncBusy;
  grid.querySelectorAll('button').forEach(button=>{
   const slotNode=button.closest('[data-slot]');
   const slot=slotNode?Number(slotNode.dataset.slot):0;
   const local=slot?slotCache.get(slot):null;
   const device=slot?deviceSlots.get(slot):null;
   // Keep the device-backed Collection action enabled after sync; don't reduce
   // eligibility to a local WAV file. For device-only entries, Use is the
   // captured 6E/01 direct operation and cabinet-name sync runs after 6E/02.
   const canUseCollection=Boolean(local?.blob||(device?.read&&device?.stable&&device?.occupied));
   const isUseButton=button.hasAttribute('data-slot-use');
   button.disabled=on||syncBusy||(isUseButton&&!canUseCollection);
  });
  toggle.disabled=on||syncBusy;
 }
 function packMetadata36(raw){
  const bytes=raw instanceof Uint8Array?raw:Uint8Array.from(raw||[]);
  if(bytes.length!==36)throw Error('Payload metadata IR harus 36 byte.');
  const out=new Uint8Array(54);let j=0;
  for(let i=0;i<36;i+=2){const word=(bytes[i]<<8)|bytes[i+1];out[j++]=(word>>>14)&3;out[j++]=(word>>>7)&0x7f;out[j++]=word&0x7f}
  return out;
 }
 function unpackMetadata36(packed){
  if(packed.length!==54)throw Error('Balasan metadata IR bukan 54 byte terpaket.');
  const out=new Uint8Array(36);let j=0;
  for(let i=0;i<54;i+=3){const word=((packed[i]&3)<<14)|((packed[i+1]&0x7f)<<7)|(packed[i+2]&0x7f);out[j++]=(word>>>8)&0xff;out[j++]=word&0xff}
  return out;
 }
 function buildCollectionMetadataQuery(slotIndex,shape='short'){
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>23)throw Error('Indeks Collection harus 0–23.');
  const header=[0xf0,0x43,0x58,0x70,0x6c,0x00,slotIndex];
  // 6C/01 is the observed Collection NAME write; 6C/00 is its read/query counterpart.
  // Start with the compact request, then allow the fixed-width metadata request as fallback.
  if(shape==='metadata')return Uint8Array.from([...header,...packMetadata36(new Uint8Array(36)),0xf7]);
  return Uint8Array.from([...header,0,0,0,0,0,0,0xf7]);
 }
 function decodeCollectionMetadata(raw,slotIndex){
  if(raw[0]!==0xf0||raw[1]!==0x43||raw[2]!==0x58||raw[3]!==0x70||raw[4]!==0x6c||raw[5]!==0x02||raw[6]!==slotIndex||raw[raw.length-1]!==0xf7)throw Error('Balasan 6C/02 tidak cocok dengan indeks Collection yang diminta.');
  if(raw.length!==62)throw Error('Panjang balasan 6C/02 tidak cocok: '+raw.length+' byte.');
  const data=unpackMetadata36(Uint8Array.from(raw.slice(7,-1)));
  const crcBytes=data.slice(0,4);
  const occupied=crcBytes.some(value=>value!==0)||data.slice(4).some(value=>value!==0);
  const nameBytes=data.slice(4,36);let name='';
  for(const value of nameBytes){if(value===0)break;name+=value>=0x20&&value<=0x7e?String.fromCharCode(value):'_'}
  return {slot:slotIndex+1,index:slotIndex,read:true,occupied,crcHex:crcBytes.some(value=>value!==0)?Array.from(crcBytes).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase():'',name:name.trim(),metadata:Array.from(data)};
 }
 function waitCollectionMetadata(connection,slotIndex,timeoutMs=350){
  return new Promise((resolve,reject)=>{
   let done=false,timer;
   const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);connection.input.removeEventListener('midimessage',onMessage)};
   const onMessage=e=>{
    const bytes=Array.from(e?.data||[]);
    if(bytes.length<8||bytes[0]!==0xf0||bytes[1]!==0x43||bytes[2]!==0x58||bytes[3]!==0x70||bytes[4]!==0x6c||bytes[5]!==0x02||bytes[6]!==slotIndex||bytes[bytes.length-1]!==0xf7)return;
    try{const decoded=decodeCollectionMetadata(bytes,slotIndex);cleanup();resolve(decoded)}catch(error){cleanup();reject(error)}
   };
   connection.input.addEventListener('midimessage',onMessage);
   timer=setTimeout(()=>{cleanup();reject(Error('Timeout membaca nama/CRC Collection slot '+String(slotIndex+1).padStart(2,'0')+' (6C/02 tidak merespons).'))},timeoutMs);
  });
 }
 async function sendCollectionMetadataQuery(connection,slotIndex,shape){
  // Match QuickTone's observed Collection slot-selection step first:
  // CC 66 (0x42), value 0 selects displayed slot 01; value 4 selects slot 05.
  // This is a read/navigation operation; it does not write IR waveform/name/curve.
  try{
   await connection.output.send(Uint8Array.from([0xB0,0x42,slotIndex]));
   await new Promise(resolve=>setTimeout(resolve,35));
  }catch(error){throw Error('Gagal memilih Collection slot '+String(slotIndex+1).padStart(2,'0')+' melalui CC 66: '+(error?.message||error))}
  const request=buildCollectionMetadataQuery(slotIndex,shape);
  const pending=waitCollectionMetadata(connection,slotIndex,900);
  try{await connection.output.send(request)}catch(error){pending.catch(()=>{});throw Error('Gagal mengirim query 6C/00: '+(error?.message||error))}
  return await pending;
 }
 let collectionQueryShape=null;
 async function readCollectionSlotFromDevice(connection,slotIndex){
  if(!connection?.input?.addEventListener||!connection?.output?.send)throw Error('Koneksi USB-MIDI belum siap.');
  const shapes=collectionQueryShape?[collectionQueryShape]:['short','metadata'];
  let lastError;
  for(const shape of shapes){
   try{
    const reply=await sendCollectionMetadataQuery(connection,slotIndex,shape);
    if(!collectionQueryShape)collectionQueryShape=shape;
    return {...reply,queryShape:shape};
   }catch(error){lastError=error}
  }
  throw lastError||Error('Query metadata Collection gagal.');
 }
 async function syncCollectionFromDevice({connection=null,slotIndices=null,silent=false}={}){
  if(busy||syncBusy)return;
  if(!window.NUXNativeMidi?.available){setMessage(collectionStatus,'Sinkronisasi Collection memerlukan APK Android dan kabel USB OTG.','warn');return}
  const indices=Array.isArray(slotIndices)?slotIndices:Array.from({length:24},(_,i)=>i);
  const rounds=[Array(indices.length).fill(null),Array(indices.length).fill(null)];
  const errors=[Array(indices.length).fill(null),Array(indices.length).fill(null)];
  syncBusy=true;setBusy(true);syncButton.textContent='Menyinkronkan…';syncButton.setAttribute('aria-busy','true');
  setMessage(collectionStatus,'Menghubungkan ke MG-30 untuk membaca nama/CRC Collection dengan pola sinkronisasi NAM (2 putaran)…');
  let conn=connection,success=0,empty=0;
  try{
   if(!conn)conn=await window.NUXNativeMidi.connect();
   for(let round=0;round<2;round++){
    for(let i=0;i<indices.length;i++){
     const idx=indices[i];
     countLabel.textContent='Putaran '+(round+1)+'/2 · slot '+String(idx+1).padStart(2,'0')+'/'+String(indices.length).padStart(2,'0');
     setMessage(collectionStatus,'Sinkronisasi dua arah Collection: putaran '+(round+1)+'/2 · membaca slot '+String(idx+1).padStart(2,'0')+'…');
     try{
      const record=await readCollectionSlotFromDevice(conn,idx);
      rounds[round][i]=Uint8Array.from(record.metadata);
     }catch(error){errors[round][i]=error?.message||String(error)}
    }
   }
   if(!rounds[0].some(Boolean)){
    deviceSlots.clear();
    for(let i=0;i<indices.length;i++){
     const idx=indices[i],error=errors[0][i]||'Tidak ada balasan metadata pada putaran pertama.';
     deviceSlots.set(idx+1,{slot:idx+1,index:idx,read:false,stable:false,error});
    }
    for(const idx of indices)updateSlotCard(idx+1,slotCache.get(idx+1)||null);
    renderSlotCount();
    setMessage(collectionStatus,'Tidak ada satu pun balasan 6C/02 pada putaran pertama. Sinkronisasi dihentikan agar tidak menunggu putaran kedua dengan query yang belum terkonfirmasi. Periksa progres slot dan pesan gagal pada kartu.','warn');
    return;
   }
   deviceSlots.clear();
   for(let i=0;i<indices.length;i++){
    const idx=indices[i],first=rounds[0][i],second=rounds[1][i];
    if(!first||!second){
     const error=errors[1][i]||errors[0][i]||'Slot tidak mendapat metadata pada kedua putaran.';
     deviceSlots.set(idx+1,{slot:idx+1,index:idx,read:false,stable:false,error});
     continue;
    }
    if(first.length!==second.length||first.some((value,j)=>value!==second[j])){
     deviceSlots.set(idx+1,{slot:idx+1,index:idx,read:false,stable:false,error:'Metadata berbeda antara putaran 1 dan 2.'});
     continue;
    }
    const record=decodeCollectionMetadata(Uint8Array.from([0xf0,0x43,0x58,0x70,0x6c,0x02,idx,...packMetadata36(Uint8Array.from(second)),0xf7]),idx);
    const stable={...record,stable:true,readRounds:2,queryShape:collectionQueryShape};
    deviceSlots.set(idx+1,stable);success++;if(!stable.occupied)empty++;
   }
   for(const idx of indices)updateSlotCard(idx+1,slotCache.get(idx+1)||null);
   renderSlotCount();
   lastSyncAt=Date.now();
   const failed=indices.length-success;
   const firstErrors=[...deviceSlots.values()].filter(row=>!row.stable).slice(0,3).map(row=>'slot '+String(row.slot).padStart(2,'0')+': '+row.error);
   const detail='Sinkronisasi dua putaran selesai: '+success+'/'+indices.length+' slot stabil · '+empty+' kosong · '+failed+' gagal/tidak stabil.'+(firstErrors.length?' Rincian: '+firstErrors.join(' | '):'');
   setMessage(collectionStatus,detail,failed?'warn':'ok');
   if(success===indices.length)window.dispatchEvent(new CustomEvent('mg30-collection-synced',{detail:{slots:[...deviceSlots.values()]}}));
  }catch(error){setMessage(collectionStatus,'Sinkronisasi Collection gagal: '+(error?.message||error),'warn')}
  finally{syncBusy=false;setBusy(false);syncButton.textContent='Sinkronkan dari MG-30';syncButton.removeAttribute('aria-busy');renderSlotCount()}
 }
 async function readCollectionSlotStable(connection,slotIndex){
  const first=await readCollectionSlotFromDevice(connection,slotIndex);
  await new Promise(resolve=>setTimeout(resolve,35));
  const second=await readCollectionSlotFromDevice(connection,slotIndex);
  const a=Uint8Array.from(first.metadata),b=Uint8Array.from(second.metadata);
  if(a.length!==b.length||a.some((value,index)=>value!==b[index])){
   throw Error('Metadata Collection slot '+String(slotIndex+1).padStart(2,'0')+' berubah di antara dua pembacaan.');
  }
  return {...second,stable:true,readRounds:2};
 }
 syncButton.addEventListener('click',()=>void syncCollectionFromDevice());
 window.addEventListener('mg30-nam-sync-complete',()=>{void syncCollectionFromDevice({silent:true})});
 function safeDisplayName(value){try{return safeName(value||'Custom IR')}catch{return 'Custom IR'}}
 async function processImport(blob,target){
  if(busy)return;
  const programSlot=Number.isInteger(target.programSlot)&&target.programSlot>=0&&target.programSlot<=127?target.programSlot:currentPresetProgramSlot();
  if(!window.NUXNativeMidi?.available){setMessage(target.type==='user'?userStatus:collectionStatus,'Transfer IR hanya tersedia di APK Android. Sambungkan MG-30 melalui USB OTG.','warn');return}
  const statusNode=target.type==='user'?userStatus:collectionStatus;
  const slot=target.slot||0,slotLabel=String(slot).padStart(2,'0');
  const name=safeDisplayName(target.name||target.fileName||blob.name||'Custom IR');
  const fileName=target.fileName||blob.name||name+'.wav';
  setBusy(true);setMessage(statusNode,'Memvalidasi WAV…');userButton.querySelector('strong').textContent='Memvalidasi WAV…';
  try{
   const wav=readMG30IRWav(await blob.arrayBuffer());
   const parameter=target.type==='collection'?slot-1:71;
   const plan=buildMG30IRTransferPlan({samples:wav.samples,fileName,irName:name,parameter,target:target.type});
   const commands=target.type==='collection'?{waveform:0x6A,name:0x6C,curve:0x6B}:{waveform:0x10,name:0x09,curve:0x11};
   const p=plan.parameter,enc=enc16(p),wf=plan.frames[0],nf=plan.frames[64],cf=plan.frames[65];
   if(plan.frames.length!==75||wf[4]!==commands.waveform||nf[4]!==commands.name||cf[4]!==commands.curve||wf[6]!==enc[0]||wf[7]!==enc[1]||wf[8]!==enc[2]||nf[6]!==p||cf[6]!==enc[0]||cf[7]!==enc[1]||cf[8]!==enc[2])throw Error('Validasi paket gagal. Tidak ada data yang dikirim.');
   if(target.type==='collection'){
    const existing=slotCache.get(slot);
    const warning='Import "'+name+'" ke Collection slot '+slotLabel+'?'+(existing?'\n\nSlot ini memiliki salinan WAV yang dikelola aplikasi. Mengimpor akan mengganti isi slot tersebut pada perangkat.':'')+'\n\nWAV valid. Transfer akan dimulai setelah konfirmasi.';
    if(!confirm(warning)){setMessage(statusNode,'Import dibatalkan. Tidak ada data IR dikirim.');return}
   }else{
    const warning='Import "'+name+'" ke Third Party / User pada MG-30 Gen 2?\n\nWAV valid. Setelah konfirmasi, aplikasi langsung mengirim IR melalui jalur User yang sudah teruji.';
    if(!confirm(warning)){setMessage(statusNode,'Import dibatalkan. Tidak ada data IR dikirim.');return}
   }
   setMessage(statusNode,'WAV valid. Menghubungkan dan mengirim IR…');
   const conn=await window.NUXNativeMidi.connect();
   const result=await sendMG30IRTransfer(conn,plan,info=>{setMessage(statusNode,'Mengirim '+info.completed+'/75 paket…')});
   if(!result?.success||result.completedFrames!==75)throw Error('Transfer belum lengkap. Jangan anggap IR berhasil.');
   if(target.type==='collection'){
    const record={slot,name,fileName,blob,updatedAt:new Date().toISOString(),source:'MG30 Studio'};
    try{await writeSlot(record);slotCache.set(slot,record);updateSlotCard(slot,record);renderSlotCount();setMessage(statusNode,'Transfer selesai ke Collection slot '+slotLabel+'. Membaca ulang nama/CRC dari perangkat…');try{const deviceRecord=await readCollectionSlotStable(conn,slot-1);deviceSlots.set(slot,deviceRecord);updateSlotCard(slot);renderSlotCount();setMessage(statusNode,'Collection slot '+slotLabel+' tersinkron dari perangkat: '+(deviceRecord.occupied?(deviceRecord.name||name):'slot dinyatakan kosong')+'. WAV sumber tersimpan lokal.','ok')}catch(readError){setMessage(statusNode,'Transfer masuk ke Collection slot '+slotLabel+', tetapi readback stabil nama/CRC gagal: '+(readError.message||'kesalahan')+'. WAV lokal tetap disimpan.','warn')}}
    catch(e){setMessage(statusNode,'Transfer ke slot '+slotLabel+' mendapat respons, tetapi WAV sumber tidak tersimpan lokal. Tombol Gunakan tidak tersedia setelah sesi ini: '+(e.message||'kesalahan penyimpanan'),'warn')}
   }else{
    lastUserName=name;
    try{localStorage.setItem('mg30-user-ir-name',name)}catch{}
    window.dispatchEvent(new CustomEvent('mg30-user-ir-name-changed',{detail:{name,sourceSlot:target.sourceSlot||null,programSlot}}));
    if(target.sourceSlot)setMessage(userStatus,'WAV sumber Collection slot '+String(target.sourceSlot).padStart(2,'0')+' dikirim ke Third Party / User melalui jalur User yang sudah teruji. Nama cabinet disinkronkan ke '+name+'. Periksa suara IR pada perangkat.','ok');
    else setMessage(userStatus,'Transfer selesai: "'+name+'" dikirim ke Third Party / User. Nama cabinet disinkronkan. Periksa suara IR pada perangkat.','ok');
   }
  }catch(error){const msg=error?.message||String(error||'Kesalahan tidak diketahui');setMessage(statusNode,'Import gagal: '+msg,'warn')}
  finally{setBusy(false);userButton.querySelector('strong').textContent='Import IR WAV ke User'}
 } fileInput.addEventListener('change',()=>{const blob=fileInput.files&&fileInput.files[0];const target=pendingTarget;pendingTarget=null;if(!blob||!target)return;const name=target.type==='user'?(target.name||safeDisplayName(blob.name)):safeDisplayName(blob.name);processImport(blob,{...target,name,fileName:blob.name})});
 userButton.addEventListener('click',()=>{if(busy)return;pendingTarget={type:'user',programSlot:currentPresetProgramSlot()};fileInput.value='';fileInput.click()});
 async function restoreLocalSlots(){for(let slot=1;slot<=24;slot++){try{const record=await readSlot(slot);if(record)slotCache.set(slot,record)}catch(e){setMessage(collectionStatus,'Penyimpanan lokal tidak dapat dibaca: '+(e.message||'kesalahan'),'warn');break}updateSlotCard(slot,slotCache.get(slot)||null)}renderSlotCount()}
 restoreLocalSlots();
}if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI,{once:true});else initUI()}
