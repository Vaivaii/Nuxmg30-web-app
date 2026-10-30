import { parseMG30SinglePresetPatch, buildMG30SinglePresetImportPlan } from './mg30-preset-format.js';
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('id-ID').format(n)+' byte';
function init(){
 const input=$('presetImportFile'),choose=$('presetImportChoose'),send=$('presetImportSend'),info=$('presetImportFileInfo'),status=$('presetImportStatus'),slot=$('presetImportTarget');
 if(!input||!choose||!send||!info||!status||!slot)return;
 let parsed=null,file=null,busy=false;
 const api=()=>window.MG30PresetImportBridge;
 const target=()=>{try{return api()?.getTargetLabel?.()||'slot hardware terpilih'}catch{return 'slot hardware terpilih'}};
 const refresh=()=>{slot.textContent='Tujuan: '+target();send.textContent='Impor ke '+target()};
 const message=(s,k='')=>{status.textContent=s;status.classList.remove('ok','warn');if(k)status.classList.add(k)};
 const lock=v=>{busy=v;input.disabled=v;choose.disabled=v;send.disabled=v||!parsed;refresh()};
 choose.addEventListener('click',()=>{if(!busy)input.click()});
 input.addEventListener('change',async()=>{
  file=input.files?.[0]||null;parsed=null;send.disabled=true;
  if(!file){info.textContent='Belum ada file .mg30patch dipilih.';message('Pilih satu file single-preset dari QuickTone.');return}
  info.textContent=file.name+' · '+fmt(file.size);message('Memeriksa struktur .mg30patch…');
  try{
   parsed=parseMG30SinglePresetPatch(new Uint8Array(await file.arrayBuffer()));
   info.textContent=file.name+' · '+fmt(parsed.byteLength)+' · record sumber '+parsed.recordOrdinal+' · 3 scene · IR '+parsed.resourceName;
   message('Valid: 2.048 sampel float32 dan 600 nilai kurva IR terbaca. '+target()+'.','ok');
   send.disabled=false;refresh();
  }catch(e){parsed=null;message(e?.message||'File .mg30patch tidak valid.','warn');send.disabled=true}
 });
 send.addEventListener('click',async()=>{
  if(busy||!parsed||!file)return;
  const b=api();if(!b?.isConnected?.()){message('Hubungkan MG-30 melalui USB-MIDI sebelum impor.','warn');return}
  let plan;
  try{plan=buildMG30SinglePresetImportPlan(parsed,b.getTargetProgram())}
  catch(e){message(e?.message||'Rencana impor tidak valid.','warn');return}
  if(!confirm('Impor '+file.name+' ke '+target()+'?\n\nResource IR "'+parsed.resourceName+'" dikirim ke Third Party / User, lalu tiga scene preset ditulis. Slot tujuan akan ditimpa.\n\nBatch 128 preset belum didukung. Collection dan NAM tidak disentuh. Pastikan sudah mencadangkan data penting.')){message('Impor dibatalkan. Tidak ada data dikirim.');return}
  lock(true);message('Memulai impor QuickTone single-preset…');
  try{
   const result=await b.import(plan,p=>{const d=p.completed||0;message((p.phase||'Memproses')+' · '+d+'/78 ACK')});
   message('Impor selesai ke '+target()+': 78/78 ACK. Tiga scene cocok dengan pembacaan ulang perangkat. IR "'+result.resourceName+'" mendapat ACK semua fase; readback resource IR belum dilakukan.','ok');
  }catch(e){message('Impor tidak selesai: '+(e?.message||e)+' Periksa pedal sebelum mengulangi; transfer terputus dapat meninggalkan resource atau preset parsial.','warn')}
  finally{lock(false);refresh()}
 });
 window.addEventListener('mg30-active-preset-changed',refresh);
 window.addEventListener('mg30-preset-import-target-changed',refresh);
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
