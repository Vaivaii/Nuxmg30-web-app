import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');
test('AI Live Tone Assistant exposes Analyze Once and Live Listening controls',async()=>{
 const ai=await read('../www/ai-tone-studio.js');
 assert.match(ai,/data-ai-audio-mode/);assert.match(ai,/Analyze Once/);assert.match(ai,/Live Listening/);
 assert.match(ai,/Start Listening/);assert.match(ai,/Stop & Analyze/);assert.match(ai,/requestAudioDiagnosis/);
 assert.ok(ai.includes('makePlan(prompt,bridge,audioMetricsForRequest,conversation)'));
});
test('AI tone listening uses native MG-30 USB capture and safe temporary-file cleanup',async()=>{
 const main=await read('../www/main.js'),java=await read('../native-android/MG30AudioPlugin.java');
 assert.match(main,/startToneAnalysisCapture/);assert.match(main,/captureMode: 'multichannel', channelIndexMask/);
 assert.match(main,/inspectToneAnalysisInput/);assert.match(main,/deleteToneAnalysisTake/);
 assert.ok(java.includes('public void deleteTake(PluginCall call)'));
 assert.ok(java.includes('getMusicDirectory().getCanonicalFile()'));
});
test('Audio Listening UI states that the phone microphone is not used',async()=>{
 const ai=await read('../www/ai-tone-studio.js');assert.match(ai,/phone microphone is not used/i);
});
