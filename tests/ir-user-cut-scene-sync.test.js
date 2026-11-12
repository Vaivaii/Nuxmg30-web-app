import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

function between(start, end) {
  const first = source.indexOf(start);
  assert.ok(first >= 0, 'missing source anchor: ' + start);
  const last = source.indexOf(end, first + start.length);
  assert.ok(last > first, 'missing source end anchor: ' + end);
  return source.slice(first, last);
}

test('Third-party/User IR swaps only Low Cut and High Cut hardware parameter indexes', () => {
  const controls = between('function parameterControls(', 'function isDiscreteSwitch(');
  assert.ok(controls.includes("block.id==='IR'&&getModelBaseName(modelName).trim().toLowerCase()==='third-party'"));
  assert.ok(controls.includes("const lowCut=controls.find(control=>control.param==='lowcut')"));
  assert.ok(controls.includes("const highCut=controls.find(control=>control.param==='highcut')"));
  assert.ok(controls.includes('lowCut.ccIndex=highCut.ccIndex'));
  assert.ok(controls.includes('highCut.ccIndex=lowCutIndex'));
  assert.ok(source.includes("'Third-party'"));
  assert.ok(source.includes("i<8?'mic, position, level, lowcut, highcut':'level, lowcut, highcut'"));
});

test('User IR cut remap is used consistently for outgoing CC, incoming CC and scene bit slots', () => {
  const outgoing = between('function sendBlockParam(', 'function scheduleHardwareUiRefresh(');
  const incoming = between('function syncIncomingParameterCC(', 'function midiFrame(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.ok(outgoing.includes('const cc=ccs[control.ccIndex]'));
  assert.ok(incoming.includes('item.ccIndex===pi'));
  assert.ok(readBuffer.includes('const controls=parameterControls(i,candidate[i].model),slots=KNOB_SLOTS[i]'));
  assert.ok(readBuffer.includes('bitSlot(body,slots[control.ccIndex])'));
});

test('legacy User IR draft values stay attached to visible Low Cut / High Cut names', () => {
  const values = between('function parameterValueForControl(', 'const delay=');
  assert.ok(values.includes("blockIndex===9&&getModelBaseName(BLOCKS[blockIndex].models[modelIndex][0]).trim().toLowerCase()==='third-party'"));
  assert.ok(values.includes("if(control.param==='lowcut')legacyIndex=1"));
  assert.ok(values.includes("else if(control.param==='highcut')legacyIndex=2"));
});

test('external pedal CC80 is treated as the newest scene event', () => {
  const handler = between('function handleMG30MidiMessage(', 'async function connectMG30(');
  assert.ok(handler.includes('cc===80&&value<=2'));
  assert.ok(handler.includes('sceneStateRevision++'));
  assert.ok(handler.includes('lastSceneCommandAt=Date.now()'));
  assert.ok(handler.includes('activeSceneIndex=value'));
  assert.ok(handler.includes('readActiveBuffer({preserveDraftName:true,skipSceneStatus:true,sceneIndex:value,program:targetSlot})'));
});

test('an in-flight hardware status poll cannot overwrite a newer scene event', () => {
  const poll = between('async function pollHardwareState(', 'function startHardwareStatePolling(');
  assert.ok(poll.includes('const sceneRevisionAtRequest=sceneStateRevision'));
  assert.ok(poll.includes('if(sceneRevisionAtRequest!==sceneStateRevision)return'));
  assert.ok(poll.includes('readActiveProgramSceneWithRetry()'));
});

test('a scene change during preset-part readback discards the stale buffer snapshot', () => {
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.ok(readBuffer.includes('const sceneRevisionAtStart=sceneStateRevision'));
  assert.ok(readBuffer.includes('if(sceneRevisionAtStart!==sceneStateRevision)return hardwarePresetName'));
  assert.ok(readBuffer.indexOf('sceneRevisionAtStart!==sceneStateRevision') < readBuffer.indexOf('states=candidate'));
});

test('initial USB sync retries scene status and never silently chooses Scene 1 while connected', () => {
  const retry = between('async function readActiveProgramSceneWithRetry(', 'async function readSysExPart(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.ok(retry.includes('attempts=3'));
  assert.ok(retry.includes('readActiveProgramScene()'));
  assert.ok(readBuffer.includes('readActiveProgramSceneWithRetry()'));
  assert.ok(readBuffer.includes('if((!Number.isInteger(sceneIndex)||sceneIndex<0||sceneIndex>2)&&!midiConnected)sceneIndex=0;'));
  assert.ok(readBuffer.includes('Scene aktif MG-30 belum diketahui'));
  assert.ok(readBuffer.includes('if(Number.isInteger(activeSceneIndex)&&activeSceneIndex>=0&&activeSceneIndex<=2)'));
});

test('connection/reconnection invalidates unconfirmed scene state before the first hardware sync', () => {
  const reset = between('function resetHardwareSceneSyncState(', 'let lastAnnouncedActivePresetSlot');
  const connect = between('async function connectMG30(', 'let selected=');
  assert.ok(reset.includes('sceneStateRevision++'));
  assert.ok(reset.includes('activeSceneIndex=null'));
  assert.ok(reset.includes('lastReportedSceneStatus=null'));
  assert.ok(reset.includes('lastReportedProgram=null'));
  assert.equal(connect.split('resetHardwareSceneSyncState();hardwareSyncBusy=true').length - 1, 2);
  assert.ok(connect.includes('finally{hardwareSyncBusy=false}'));
});

test('scene UI shows no active scene before hardware scene has been identified', () => {
  const render = between('function renderSceneButtons(', 'function initSceneCopyUI(');
  assert.ok(render.includes('const sceneKnown=Number.isInteger(activeSceneIndex)&&activeSceneIndex>=0&&activeSceneIndex<=2'));
  assert.ok(render.includes('picker.selectedIndex=sceneKnown?activeSceneIndex:-1'));
  assert.ok(render.includes("sceneKnown&&activeSceneIndex===i?'active':'"));
});

test('IR factory model CC and packed-scene slot tables remain unchanged', () => {
  assert.ok(source.includes('[66,67,68,69,70,71], // IR/CAB: base CC 66'));
  assert.ok(source.includes('[76,77,78,79,80,81],[83,84]'));
  assert.ok(source.includes('const MIDI_PARAM_CC=['));
  assert.ok(source.includes('const KNOB_SLOTS=['));
});
