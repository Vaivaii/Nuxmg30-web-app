import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tone3000 = readFileSync(new URL('../www/tone3000.js', import.meta.url), 'utf8');
const aiStudio = readFileSync(new URL('../www/ai-tone-studio.js', import.meta.url), 'utf8');
const secureStore = readFileSync(new URL('../native-android/MG30SecureStorePlugin.java', import.meta.url), 'utf8');
const namTransfer = readFileSync(new URL('../www/nam-transfer.js', import.meta.url), 'utf8');

test('TONE3000 OAuth uses the one existing Publishable Key and PKCE flow for both capture types', () => {
  assert.match(tone3000, /const SecureStore = registerPlugin\('MG30SecureStore'\)/);
  assert.match(tone3000, /code_challenge_method: 'S256'/);
  assert.match(tone3000, /prompt: 'select_tone'/);
  assert.match(tone3000, /format: 'nam'/);
  assert.match(tone3000, /architecture: '2'/);
  assert.match(tone3000, /options\.gear === 'amp' \? 'amp'/);
  assert.match(tone3000, /options\.gear === 'amp-cab' \? 'amp-cab'/);
  assert.match(tone3000, /window\.NUXTONE3000Bridge/);
  assert.doesNotMatch(aiStudio, /t3k_pub_|oauth\/token|code_verifier/);
});

test('TONE3000 OAuth tokens and transient PKCE values migrate to Android secure storage', () => {
  assert.match(tone3000, /AUTH_FIELDS = \['access_token', 'refresh_token', 'expires_at', 'code_verifier', 'state', 'redirect_uri'\]/);
  assert.match(tone3000, /SecureStore\.getSecret\(\{ provider: 'tone3000' \}\)/);
  assert.match(tone3000, /SecureStore\.setSecret\(\{ provider: 'tone3000'/);
  assert.match(tone3000, /Remove plaintext tokens\/PKCE values only after secure storage was read or migration succeeded/);
  assert.match(tone3000, /localStorage\.removeItem\(PREFIX \+ key\)/);
  assert.match(secureStore, /"tone3000"\.equals\(value\)/);
  assert.match(secureStore, /AndroidKeyStore/);
  assert.match(secureStore, /AES\/GCM\/NoPadding/);
});

test('AI NAM bridge reads current slot-10 metadata and requires confirmation before overwrite', () => {
  assert.match(tone3000, /async function importTone3000ModelForAI/);
  assert.match(tone3000, /options\.slotNumber \?\? 10/);
  assert.match(tone3000, /slotNumber !== 10/);
  assert.match(tone3000, /readMG30NAMSlotNames\(connection/);
  assert.match(tone3000, /const slot = scan\.slots\.find\(row => row\.slotNumber === 10\)/);
  assert.match(tone3000, /if \(!slot\?\.received\) throw new Error/);
  assert.match(tone3000, /Current device label:/);
  assert.match(tone3000, /This will overwrite slot 10/);
  assert.match(tone3000, /sendModel\(index, null, \{ confirmed: true, connection, slotNumber: 10 \}\)/);
  assert.match(tone3000, /window\.NUXTONE3000Bridge = Object\.freeze/);
});

test('AI NAM flow asks Built-in vs TONE3000, then Amp Only vs Amp + Cab', () => {
  assert.match(aiStudio, /data-ai-nam-source="builtin"/);
  assert.match(aiStudio, /data-ai-nam-source="nam"/);
  assert.match(aiStudio, /data-ai-nam-gear="amp"/);
  assert.match(aiStudio, /data-ai-nam-gear="amp-cab"/);
  assert.match(aiStudio, /mg30-tone3000-catalogue-loaded/);
  assert.match(aiStudio, /Validate & Import to Slot 10/);
  assert.match(aiStudio, /window\.NUXTONE3000Bridge/);
});

test('AI import cannot bypass the validated original MG-30 Gen 2 A2-Lite transfer codec', () => {
  assert.match(tone3000, /extractMG30A2LiteWeights\(modelBytes\)/);
  assert.match(tone3000, /buildMG30A2LiteTransferPlan\(weightBytes, rawLabel, slotNumber\)/);
  assert.match(tone3000, /sendMG30A2LiteTransfer\(connection, plan/);
  assert.match(namTransfer, /const WEIGHT_COUNT = 1871/);
  assert.match(namTransfer, /A2-Lite WaveNet/i);
  assert.match(namTransfer, /1,871 bobot/);
  assert.match(namTransfer, /does not read back model weights/i);
});

test('AI slot-10 destination leaves manual NAM import target selection unchanged', () => {
  assert.match(tone3000, /const slotNumber = Number\(options\.slotNumber \?\? \$\('t3kTargetSlot'\)/);
  assert.match(tone3000, /const slotNumber = Number\(options\.slotNumber \?\? 10\)/);
  assert.match(aiStudio, /bridge\.importModel\(modelId,\{slotNumber:10,confirmOverwrite:true\}\)/);
});
