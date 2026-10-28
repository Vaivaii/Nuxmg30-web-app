// Experimental NUX MG-30 Gen 2 IR transfer. Protocol is reconstructed from two QuickTone captures.
// Matching both captures validates packet synthesis offline only; hardware audio acceptance remains unverified.
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
export function buildMG30IRTransferPlan({samples,fileName,irName,parameter=71}){if(!samples||samples.length<N)throw Error('Pilih WAV yang valid dahulu.');const param=Number(parameter);if(!Number.isInteger(param)||param<0||param>127)throw Error('Parameter transfer harus bilangan 0–127.');const name=safeName(irName||fileName||'Custom IR'),gain=gainFor(samples.subarray? samples.subarray(0,N):samples),wave=waveformFrames(samples,param,gain),curve=curveFrames(curveFor(wave.wire),param),frames=[...wave.frames,nameFrame(name,param),...curve];if(frames.length!==75)throw Error('Rencana transfer harus berisi 75 paket.');return{name,parameter:param,gain,frames}}
function waitAck(input,cmd,timeout=3000){let timer,done=false,handler=()=>{},cancel=()=>{};const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);input.removeEventListener('midimessage',handler)};const promise=new Promise((resolve,reject)=>{handler=e=>{const d=Array.from(e?.data||[]);if(d.length<8||d[0]!==240||d[1]!==67||d[2]!==88||d[3]!==112||d[4]!==cmd||d[5]!==3||d[d.length-1]!==247)return;cleanup();resolve({status:d[6]})};cancel=()=>{cleanup();resolve(null)};input.addEventListener('midimessage',handler);timer=setTimeout(()=>{cleanup();reject(Error('Timeout ACK untuk fase '+cmd.toString(16)))},timeout)});return{promise,cancel}}
async function sendFrame(conn,frame,cmd,label){const p=waitAck(conn.input,cmd);try{await conn.output.send(frame)}catch(e){p.cancel();throw Error('Pengiriman '+label+' gagal: '+(e?.message||e))}const ack=await p.promise;if(!ack)throw Error('ACK dibatalkan: '+label);return ack}
export async function sendMG30IRTransfer(conn,plan,onProgress=()=>{}){if(!conn?.input?.addEventListener||!conn?.output?.send||plan?.frames?.length!==75)throw Error('Koneksi MIDI/rencana IR belum siap.');const phases=[['waveform',16,0,64],['name',9,64,65],['curve',17,65,75]];let done=0;for(const[phase,cmd,start,end]of phases)for(let i=start;i<end;i++){const ack=await sendFrame(conn,plan.frames[i],cmd,phase+' '+(i-start+1)+'/'+(end-start));const phaseCompleted=i-start+1,finalFrame=i===end-1;const expected=phase==='name'?0:(finalFrame?3:2);if(ack.status!==expected)throw Error('ACK '+phase+' '+phaseCompleted+'/'+(end-start)+' berstatus '+ack.status+', padahal capture QuickTone menunjukkan '+expected+'. Transfer dihentikan; cek slot/perangkat dan jangan anggap impor berhasil.');done++;onProgress({phase,phaseCompleted,phaseTotal:end-start,completed:done,total:75,ackStatus:ack.status,expectedStatus:expected})}return{success:true,completedFrames:done,totalFrames:75,name:plan.name,parameter:plan.parameter}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function initUI(){
 const $=id=>document.getElementById(id);
 const file=$('irTransferFileInput');
 const required=['irTransferSendBtn','irTransferValidateBtn','irTransferPreview','irTransferStatus','irTransferChooseBtn'];
 if(!file||required.some(id=>!$(id)))return;
 let selectedFile=null,prepared=null,busy=false;
 const status=(message,kind='')=>{
   const n=$('irTransferStatus');
   n.textContent=message;
   n.classList.remove('ok','warn');
   if(kind)n.classList.add(kind);
 };
 const preview=(message,kind='')=>{
   const n=$('irTransferPreview');
   n.textContent=message;
   n.classList.remove('ok','warn');
   if(kind)n.classList.add(kind);
 };
 const progress=(pct,label)=>{
   $('irTransferProgressBar').style.width=Math.max(0,Math.min(100,pct))+'%';
   $('irTransferProgressLabel').textContent=label||'';
 };
 const busySet=value=>{
   busy=value;
   $('irTransferValidateBtn').disabled=value||!selectedFile;
   $('irTransferChooseBtn').disabled=value;
   $('irTransferSendBtn').disabled=value||!prepared;
   $('irTransferName').disabled=value;
   $('irTransferParameter').disabled=value;
   file.disabled=value;
 };
 const invalidate=(message='Paket belum divalidasi. Tekan Validasi & siapkan paket untuk memeriksa WAV.')=>{
   prepared=null;
   $('irTransferValidateBtn').disabled=busy||!selectedFile;
   $('irTransferSendBtn').disabled=true;
   preview(message);
   progress(0,'Belum dimulai');
 };
 const nextPaint=()=>new Promise(resolve=>setTimeout(resolve,30));

 $('irTransferChooseBtn').addEventListener('click',()=>file.click());
 file.addEventListener('change',()=>{
   selectedFile=file.files&&file.files[0]||null;
   invalidate(selectedFile
     ?'File dipilih. Tekan “Validasi & siapkan paket” untuk memeriksa format dan menyusun paket.'
     :'Belum ada file yang dipilih. Pilih file WAV terlebih dahulu.');
   if(!selectedFile){
     $('irTransferFileTitle').textContent='Pilih file IR WAV';
     $('irTransferFileMeta').textContent='WAV 48 kHz · PCM16/24/32 atau Float32';
     status('Belum ada file WAV.');
     return;
   }
   $('irTransferFileTitle').textContent=selectedFile.name;
   $('irTransferFileMeta').textContent=(selectedFile.size/1024).toFixed(1)+' KB · siap divalidasi';
   if(!$('irTransferName').dataset.edited){
     try{$('irTransferName').value=safeName(selectedFile.name);}
     catch{$('irTransferName').value='Custom IR';}
   }
   status('File dipilih: '+selectedFile.name+'. Belum ada data yang dikirim ke pedal.','ok');
 });
 $('irTransferName').addEventListener('input',()=>{
   $('irTransferName').dataset.edited='1';
   invalidate();
 });
 $('irTransferParameter').addEventListener('input',()=>invalidate());

 $('irTransferValidateBtn').addEventListener('click',async()=>{
   if(busy)return;
   if(!selectedFile){
     preview('Validasi gagal: pilih file WAV terlebih dahulu.','warn');
     status('Pilih file WAV terlebih dahulu.','warn');
     return;
   }
   busySet(true);
   preview('Validasi berjalan: membaca file WAV…');
   status('Validasi berjalan di perangkat ini. Tidak ada data yang dikirim ke MG-30.');
   progress(0,'Membaca file WAV…');
   await nextPaint();
   try{
     const wav=readMG30IRWav(await selectedFile.arrayBuffer());
     preview('WAV terbaca: '+wav.description+' · '+wav.count.toLocaleString('id-ID')+' frame. Menghitung normalisasi dan kurva…');
     progress(20,'Menghitung paket secara lokal…');
     await nextPaint();
     const plan=buildMG30IRTransferPlan({
       samples:wav.samples,
       fileName:selectedFile.name,
       irName:$('irTransferName').value,
       parameter:Number($('irTransferParameter').value)
     });
     prepared={wav,plan};
     const detail=wav.description+' · '+wav.count.toLocaleString('id-ID')+' frame · '+(wav.count/wav.rate).toFixed(2)+' detik · 75 paket · gain '+plan.gain.toPrecision(8)+' · nama "'+plan.name+'" · argumen transfer '+plan.parameter+' (0x'+plan.parameter.toString(16).toUpperCase().padStart(2,'0')+')';
     preview('VALIDASI BERHASIL\n'+detail,'ok');
     progress(100,'75 paket disiapkan secara lokal · belum dikirim');
     status('Validasi berhasil. Paket hanya disiapkan di aplikasi; belum ada perubahan pada MG-30.','ok');
   }catch(error){
     prepared=null;
     const message=error&&error.message?error.message:String(error||'Kesalahan tidak diketahui');
     preview('VALIDASI GAGAL\n'+message,'warn');
     status('Validasi gagal: '+message,'warn');
     progress(0,'Validasi gagal');
   }finally{
     busySet(false);
   }
 });

 $('irTransferSendBtn').addEventListener('click',async()=>{
   if(!prepared||busy)return;
   if(!window.NUXNativeMidi?.available){
     status('Pengiriman IR memerlukan APK Android MG30 Studio dengan USB-MIDI native.','warn');
     preview('Paket sudah divalidasi, tetapi pengiriman hanya tersedia di APK Android.');
     return;
   }
   const p=prepared.plan;
   const warning='Kirim IR "'+p.name+'" ke MG-30 Gen 2?\n\n75 pesan SysEx. Argumen transfer '+p.parameter+' (0x'+p.parameter.toString(16).toUpperCase()+') diamati pada format protokol, tetapi maknanya dan target slotnya belum diketahui. Nilai ini BUKAN nomor slot yang terverifikasi. Hanya lanjut bila siap menguji dan punya cadangan.\n\nJika transfer terputus, data dapat terkirim sebagian. Lanjutkan?';
   if(!confirm(warning)){
     status('Pengiriman dibatalkan. Tidak ada pesan IR baru yang dikirim.');
     return;
   }
   busySet(true);
   progress(0,'Menyambungkan USB-MIDI…');
   preview('Pengiriman berjalan. Jangan cabut kabel OTG atau matikan pedal.');
   status('Menyambungkan ke MG-30…');
   await nextPaint();
   try{
     const conn=await window.NUXNativeMidi.connect();
     status('Mengirim paket satu per satu dan menunggu ACK. Jangan cabut USB OTG.');
     const result=await sendMG30IRTransfer(conn,p,info=>{
       progress(info.completed/75*100,info.phase+': '+info.phaseCompleted+'/'+info.phaseTotal+' · total '+info.completed+'/75 · ACK '+info.ackStatus);
       status('Transfer berlangsung: '+info.completed+' dari 75 paket telah mendapat respons.');
     });
     progress(100,'75/75 paket mendapat respons');
     preview('TRANSFER SELESAI\nSemua 75 paket mendapat ACK. Ini hanya mengonfirmasi respons protokol, bukan membuktikan isi IR atau slot tujuan. Uji suara pada pedal sebelum dipakai.','ok');
     status('Semua paket mendapat ACK untuk "'+result.name+'". Hasil audio dan target slot belum diverifikasi.','ok');
   }catch(error){
     const message=error&&error.message?error.message:String(error||'Kesalahan tidak diketahui');
     preview('TRANSFER BERHENTI\n'+message+'\nData mungkin sudah terkirim sebagian. Jangan anggap IR berhasil.','warn');
     status('Transfer berhenti: '+message+'. Jangan anggap IR berhasil; data mungkin parsial.','warn');
   }finally{
     busySet(false);
   }
 });
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI,{once:true});else initUI()}
