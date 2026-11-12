import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

function between(start, end) {
  const first = source.indexOf(start);
  assert.ok(first >= 0, `missing source anchor: ${start}`);
  const last = source.indexOf(end, first + start.length);
  assert.ok(last > first, `missing source end anchor: ${end}`);
  return source.slice(first, last);
}

test('Third-party/User IR swaps only Low Cut and High Cut hardware parameter indexes', () => {
  const controls = between('function parameterControls(', 'function isDiscreteSwitch(');
  assert.match(controls, /block\.id==='IR'\s*&&\s*getModelBaseName\(modelName\)\.trim\(\)\.toLowerCase\(\)==='third-party'/);
  assert.match(controls, /const lowCut=controls\.find\(control=>control\.param==='lowcut'\)/);
  assert.match(controls, /const highCut=controls\.find\(control=>control\.param==='highcut'\)/);
  assert.match(controls, /lowCut\.ccIndex=highCutIndex/);
  assert.match(controls, /highCut\.ccIndex=lowCutIndex/);
  assert.match(source, /\['Third-party','level, lowcut, highcut'\]/);
});

test('User IR cut remap is used consistently for outgoing CC, incoming CC and scene bit slots', () => {
  const outgoing = between('function sendBlockParam(', 'function scheduleHardwareUiRefresh(');
  const incoming = between('function syncIncomingParameterCC(', 'function midiFrame(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.match(outgoing, /const cc=ccs\[control\.ccIndex\]/);
  assert.match(incoming, /item\.ccIndex===pi/);
  assert.match(readBuffer, /const controls=parameterControls\(i,candidate\[i\]\.model\),slots=KNOB_SLOTS\[i\]/);
  assert.match(readBuffer, /bitSlot\(body,slots\[control\.ccIndex\]\)/);
});

test('legacy User IR draft values stay attached to visible Low Cut / High Cut names', () => {
  const values = between('function parameterValueForControl(', 'const delay=');
  assert.match(values, /blockIndex===9/);
  assert.match(values, /control\.param==='lowcut'\)legacyIndex=1/);
  assert.match(values, /control\.param==='highcut'\)legacyIndex=2/);
});

test('external pedal CC80 is treated as the newest scene event', () => {
  const handler = between('function handleMG30MidiMessage(', 'async function connectMG30(');
  assert.match(handler, /cc===80&&value<=2/);
  assert.match(handler, /sceneStateRevision\+\+/);
  assert.match(handler, /lastSceneCommandAt=Date\.now\(\)/);
  assert.match(handler, /activeSceneIndex=value/);
  assert.match(handler, /readActiveBuffer\(\{preserveDraftName:true,skipSceneStatus:true,sceneIndex:value,program:targetSlot\}\)/);
});

test('an in-flight hardware status poll cannot overwrite a newer scene event', () => {
  const poll = between('async function pollHardwareState(', 'function startHardwareStatePolling(');
  assert.match(poll, /const sceneRevisionAtRequest=sceneStateRevision/);
  assert.match(poll, /if\(sceneRevisionAtRequest!==sceneStateRevision\)return/);
  assert.match(poll, /readActiveProgramSceneWithRetry\(\)/);
});

test('a scene change during preset-part readback discards the stale buffer snapshot', () => {
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.match(readBuffer, /const sceneRevisionAtStart=sceneStateRevision/);
  assert.match(readBuffer, /if\(sceneRevisionAtStart!==sceneStateRevision\)return hardwarePresetName/);
  assert.ok(readBuffer.indexOf('sceneRevisionAtStart!==sceneStateRevision') < readBuffer.indexOf('states=candidate'));
});

test('initial USB sync retries scene status and never silently chooses Scene 1 while connected', () => {
  const retry = between('async function readActiveProgramSceneWithRetry(', 'async function readSysExPart(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.match(retry, /attempts=3/);
  assert.match(retry, /readActiveProgramScene\(\)/);
  assert.match(readBuffer, /readActiveProgramSceneWithRetry\(\)/);
  assert.match(readBuffer, /if\(\(\!Number\.isInteger\(sceneIndex\)[\s\S]*?\)\&\&\!midiConnected\)sceneIndex=0/);
  assert.match(readBuffer, /Scene aktif MG-30 belum diketahui/);
  assert.match(readBuffer, /if\(Number\.isInteger\(activeSceneIndex\)&&activeSceneIndex>=0&&activeSceneIndex<=2\)/);
});

test('connection/reconnection invalidates unconfirmed scene state before the first hardware sync', () => {
  const reset = between('function resetHardwareSceneSyncState(', 'let lastAnnouncedActivePresetSlot');
  const connect = between('async function connectMG30(', 'let selected=');
  assert.match(reset, /sceneStateRevision\+\+/);
  assert.match(reset, /activeSceneIndex=null/);
  assert.match(reset, /lastReportedSceneStatus=null/);
  assert.match(reset, /lastReportedProgram=null/);
  assert.equal((connect.match(/resetHardwareSceneSyncState\(\);hardwareSyncBusy=true/g) || []).length, 2);
  assert.match(connect, /finally\{hardwareSyncBusy=false\}/);
});

test('scene UI shows no active scene before hardware scene has been identified', () => {
  const render = between('function renderSceneButtons(', 'function initSceneCopyUI(');
  assert.match(render, /const sceneKnown=Number\.isInteger\(activeSceneIndex\)&&activeSceneIndex>=0&&activeSceneIndex<=2/);
  assert.match(render, /picker\.selectedIndex=sceneKnown\?activeSceneIndex:-1/);
  assert.match(render, /sceneKnown&&activeSceneIndex===i\?'active '/);
});

test('IR factory model CC and packed-scene slot tables remain untouched', () => {
  assert.match(source, /\[66,67,68,69,70,71\], \/\/ IR\/CAB: base CC 66/);
  assert.match(source, /\[76,77,78,79,80,81\],\[83,84\]/);
  assert.match(source, /const MIDI_PARAM_CC=\[/);
  assert.match(source, /const KNOB_SLOTS=\[/);
});
