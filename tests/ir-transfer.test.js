import test from 'node:test';
import assert from 'node:assert/strict';
import { readMG30IRWav, buildMG30IRTransferPlan } from '../www/ir-transfer.js';

function makeWav({rate=48000,channels=1,frames=4096}={}) {
  const dataBytes=frames*channels*2;
  const out=new Uint8Array(44+dataBytes);
  const v=new DataView(out.buffer);
  const tag=(offset,value)=>{for(let i=0;i<value.length;i++)out[offset+i]=value.charCodeAt(i)};
  tag(0,'RIFF');v.setUint32(4,out.length-8,true);tag(8,'WAVE');
  tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,channels,true);v.setUint32(24,rate,true);
  v.setUint32(28,rate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);
  tag(36,'data');v.setUint32(40,dataBytes,true);
  let seed=0x12345678;
  for(let i=0;i<frames*channels;i++){
    seed=(1664525*seed+1013904223)>>>0;
    v.setInt16(44+i*2,((seed>>>16)&0xffff)-32768,true);
  }
  return out;
}

test('QuickTone WAV import accepts 48 kHz and uses first 2048 frames',()=>{
  const parsed=readMG30IRWav(makeWav({rate:48000,channels:2,frames:4096}));
  assert.equal(parsed.rate,48000);
  assert.equal(parsed.channels,2);
  assert.equal(parsed.samples.length,2048);
  assert.equal(parsed.normalizedFrames,4096);
  assert.equal(parsed.description.includes('kanal kiri dipakai'),true);
});

test('QuickTone WAV import rejects non-48 kHz instead of silently resampling',()=>{
  assert.throws(()=>readMG30IRWav(makeWav({rate:44100})),/sample rate tepat 48 kHz/);
});

test('QuickTone WAV import rejects less than 2048 frames',()=>{
  assert.throws(()=>readMG30IRWav(makeWav({rate:48000,frames:2047})),/dibutuhkan sedikitnya 2048 frame/);
});

test('User import plan uses captured parameter 1 and User SysEx commands',()=>{
  const wav=readMG30IRWav(makeWav({rate:48000,channels:1,frames:4096}));
  const plan=buildMG30IRTransferPlan({samples:wav.samples,fileName:'test.wav',parameter:1,target:'user'});
  assert.equal(plan.parameter,1);
  assert.equal(plan.frames.length,75);
  assert.equal(plan.frames[0][4],0x10);
  assert.equal(plan.frames[64][4],0x09);
  assert.equal(plan.frames[65][4],0x11);
  assert.equal(plan.frames[0][6],0);
  assert.equal(plan.frames[0][7],2);
  assert.equal(plan.frames[0][8],0);
});

test('Collection protocol mapping remains unchanged',()=>{
  const wav=readMG30IRWav(makeWav({rate:48000,channels:1,frames:4096}));
  const plan=buildMG30IRTransferPlan({samples:wav.samples,fileName:'collection.wav',parameter:3,target:'collection'});
  assert.equal(plan.parameter,3);
  assert.equal(plan.frames[0][4],0x6A);
  assert.equal(plan.frames[64][4],0x6C);
  assert.equal(plan.frames[65][4],0x6B);
});
