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

test('ChatGPT replaces the former Cloudflare AI role while existing optional providers and SIWC remain', () => {
  const select = ai.match(/<select id="aiToneProviderSelect">[\\s\\S]*?<\\/select>/)?.[0] || '';
  for (const provider of ['chatgpt', 'auto', 'gemini', 'groq', 'openrouter', 'gpt', 'collab']) {
    assert.ok(select.includes('value="' + provider + '"'), 'provider selector lost ' + provider);
  }
  assert.doesNotMatch(select, /value="cloudflare"/);
  for (const id of ['aiToneTestOpenAi', 'aiToneTestGemini', 'aiToneTestGroq', 'aiToneTestOpenRouter', 'aiToneTestChatGPT']) {
    assert.ok(ai.includes(id), 'provider settings lost ' + id);
  }
  assert.doesNotMatch(ai, /id="aiToneTestCloudflare"/);
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

test('ChatGPT remains the selected primary and is not silently replaced by another provider', () => {
  assert.match(ai, /let mode='chatgpt'/);
  assert.match(ai, /const auto=mode==='auto'\|\|mode==='collab'/);
  assert.match(ai, /providerFallbackOrder\(primary='gemini'\)[\s\S]*?\['chatgpt',\.\.\.freePriority\]/);
});

test('Restored conversation composer always wires the Send control', () => {
  assert.match(ai, /\$\('aiToneSend'\)\.addEventListener\('click'/);
  assert.match(ai, /ui\.prompt\.addEventListener\('keydown'/);
});
