import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeToneAudioSamples, formatToneAudioMetrics } from '../www/ai-audio-analysis.js';
function sine(frequency,sampleRate=48000,seconds=1,amplitude=0.25){
  const output=new Float32Array(Math.floor(sampleRate*seconds));
  for(let i=0;i<output.length;i+=1)output[i]=amplitude*Math.sin(2*Math.PI*frequency*i/sampleRate);
  return output;
}
test('measures a clean guitar-band sine wave',()=>{
  const metrics=analyzeToneAudioSamples([sine(440)],48000);
  assert.equal(metrics.sampleRate,48000);assert.equal(metrics.channels,1);
  assert.ok(Math.abs(metrics.spectralCentroidHz-440)<45);
  assert.ok(metrics.rmsDbfs<0&&metrics.peakDbfs<0);
  assert.match(formatToneAudioMetrics(metrics),/centroid/);
});
test('separates upper-frequency energy from low-frequency energy',()=>{
  const low=analyzeToneAudioSamples([sine(180)],48000),high=analyzeToneAudioSamples([sine(5200)],48000);
  assert.ok(low.bandsPct.low>high.bandsPct.low);
  assert.ok(high.bandsPct.highMid>low.bandsPct.highMid);
});
test('rejects silence and captures shorter than the minimum useful duration',()=>{
  assert.throws(()=>analyzeToneAudioSamples([new Float32Array(48000)],48000),/No usable guitar signal/);
  assert.throws(()=>analyzeToneAudioSamples([new Float32Array(2000)],48000),/too short/);
});
test('aggregates stereo channel energy without cancelling opposite-phase channels',()=>{
  const left=sine(440),right=sine(440).map(value=>-value);
  const metrics=analyzeToneAudioSamples([left,right],48000);
  assert.ok(Math.abs(metrics.spectralCentroidHz-440)<45);assert.equal(metrics.channels,2);
});
