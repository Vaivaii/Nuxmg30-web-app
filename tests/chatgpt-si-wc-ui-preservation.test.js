import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ai = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../www/ai-audio-analysis.js', import.meta.url), 'utf8');
const account = readFileSync(new URL('../www/chatgpt-account.js', import.meta.url), 'utf8');

test('Restored AI Live Tone Assistant keeps the audio listening and local analysis UI', () => {
  assert.match(ai, /from '\.\/ai-audio-analysis\.js'/);
  for (const id of ['aiToneAudioToggle', 'aiToneAudioPanel', 'aiToneAudioStart', 'aiToneAudioRefresh', 'aiToneAudioStatus']) {
    assert.ok(ai.includes(id), 'missing audio UI element ' + id);
  }
  assert.match(ai, /data-ai-audio-mode=\\?"once\\?"/);
  assert.match(ai, /data-ai-audio-mode=\\?"live\\?"/);
  assert.match(audio, /analyzeToneAudioSamples/);
  assert.match(ai, /requestAudioDiagnosis/);
});

test('ChatGPT conversation and preset modes are fixed to their task-specific Luna models', () => {
  const select = ai.match(/<select id="aiToneProviderSelect">[\s\S]*?<\/select>/)?.[0] || '';
  assert.match(select, /value="chatgpt" selected/);
  assert.doesNotMatch(select, /value="auto"|value="gemini"|value="groq"|value="openrouter"|value="cloudflare"|value="collab"/);
  assert.doesNotMatch(ai, /ai-tone-routing-strip|DISKUSI BIASA|<small>SPECIALIST<\/small>/);
  assert.match(ai, /GPT-5\.6 Luna/);
  assert.match(ai, /CREATE PRESET/);
  assert.match(ai, /GPT-6 Luna/);
  assert.match(ai, /GPT-5\.6 discussion \/ GPT-6 Luna preset/);
  for (const id of ['aiToneTestOpenAi', 'aiToneTestGemini', 'aiToneTestGroq', 'aiToneTestOpenRouter', 'aiToneTestChatGPT', 'aiToneTestCloudflare']) {
    assert.ok(ai.includes(id), 'provider settings lost ' + id);
  }
});

test('ChatGPT SIWC runs through the native bridge rather than the Cloudflare AI proxy', () => {
  assert.match(html, /src="\.\/chatgpt-account\.js"/);
  assert.match(account, /window\.MG30ChatGPTBridge = MG30ChatGPTBridge/);
  assert.match(ai, /async function chatgpt\([\s\S]*?bridge\.sendResponse/);
  assert.match(ai, /if\(provider==='chatgpt'\)result=await chatgpt/);
  assert.match(ai, /provider === 'chatgpt'[\s\S]*?MG30ChatGPTBridge\?\.listModels/);
  assert.match(ai, /if \(provider === 'chatgpt'\)[\s\S]*?MG30ChatGPTBridge\?\.getSession/);
});

test('ChatGPT model discovery does not depend on Cloud Account login', () => {
  const start = ai.indexOf('async function keyStates()');
  const end = ai.indexOf('\n}', start);
  const body = ai.slice(start, end);
  assert.ok(body.indexOf("await refreshProviderModels('chatgpt',true)") >= 0);
  assert.ok(body.indexOf("await refreshProviderModels('chatgpt',true)") < body.indexOf('getCloudAiStatus(true)'));
});

test('ChatGPT task router cannot be changed to an external provider from the composer', () => {
  assert.match(ai, /let mode='chatgpt'/);
  assert.match(ai, /const next='chatgpt'/);
  assert.match(ai, /if\(provider==='chatgpt'\)\{select\.value='__auto__';select\.disabled=true/);
  assert.match(ai, /const toneTask=activityMode==='tone'/);
  assert.match(ai, /GPT-5\.6 discussion \/ GPT-6 Luna preset/);
});

test('Restored conversation composer always wires the Send control', () => {
  assert.match(ai, /\$\('aiToneSend'\)\.addEventListener\('click'/);
  assert.match(ai, /ui\.prompt\.addEventListener\('keydown'/);
});
