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

test('Third-party/User IR keeps original parameter order until its hardware mapping is proven', () => {
  const controls = between('function parameterControls(', 'function isDiscreteSwitch(');
  assert.ok(controls.includes("block.models[modelIndex][1].split(',').map((raw,ccIndex)"));
  assert.ok(controls.includes('return {param,label:param.toUpperCase(),ccIndex}'));
  assert.ok(!controls.includes("getModelBaseName(modelName).trim().toLowerCase()==='third-party'"));
  assert.ok(source.includes("'Third-party'"));
  assert.ok(source.includes("i<8?'mic, position, level, lowcut, highcut':'level, lowcut, highcut'"));
});

test('User IR send, receive and scene read use one shared hardware parameter index', () => {
  const outgoing = between('function sendBlockParam(', 'function scheduleHardwareUiRefresh(');
  const incoming = between('function syncIncomingParameterCC(', 'function midiFrame(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.ok(outgoing.includes('const cc=ccs[control.ccIndex]'));
  assert.ok(incoming.includes('item.ccIndex===pi'));
  assert.ok(readBuffer.includes('const controls=parameterControls(i,candidate[i].model),slots=KNOB_SLOTS[i]'));
  assert.ok(readBuffer.includes('bitSlot(body,slots[control.ccIndex])'));
});

test('legacy User IR drafts are not remapped to a speculative High Cut / Low Cut order', () => {
  const values = between('function parameterValueForControl(', 'const delay=');
  assert.ok(values.includes('const legacy=BLOCKS[blockIndex].models[modelIndex][1].split'));
  assert.ok(!values.includes("control.param==='lowcut'"));
  assert.ok(!values.includes("control.param==='highcut'"));
});

test('the live active scene parser is the shared QuickTone-verified status parser', () => {
  const status = between('async function readActiveProgramScene()', 'async function readActiveProgramSceneWithRetry(');
  assert.ok(status.includes("await import('./mg30-scene-status.js')"));
  assert.ok(status.includes('parseMG30ActiveSceneStatusReply(reply)'));
  assert.ok(!status.includes('Number(reply[9])'));
});

test('incoming CC80 is a refresh hint, never assigned directly as the active scene', () => {
  const handler = between('function handleMG30MidiMessage(', 'async function connectMG30(');
  assert.ok(handler.includes('cc===80&&value<=2'));
  assert.ok(handler.includes('sceneStateRevision++'));
  assert.ok(handler.includes('scheduleExternalSceneStatusRefresh()'));
  assert.ok(!handler.includes('activeSceneIndex=value'));
  assert.ok(!handler.includes('sceneIndex:value'));
});

test('external CC80 waits for current reads to settle and queries authoritative 15/02 status', () => {
  const refresh = between('function scheduleExternalSceneStatusRefresh(', 'function handleMG30MidiMessage(');
  assert.ok(refresh.includes('hardwareSyncBusy||sceneSwitchPending||activeBufferReadPromise||sceneStatusReadPromise'));
  assert.ok(refresh.includes('scheduleExternalSceneStatusRefresh()'));
  assert.ok(refresh.includes('pollHardwareState(true)'));
});

test('an in-flight status poll cannot overwrite a newer external scene event', () => {
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

test('initial USB sync retries active status and never silently chooses Scene 1 while connected', () => {
  const retry = between('async function readActiveProgramSceneWithRetry(', 'async function readSysExPart(');
  const readBuffer = between('async function readActiveBuffer(', 'async function pollHardwareState(');
  assert.ok(retry.includes('attempts=3'));
  assert.ok(retry.includes('readActiveProgramScene()'));
  assert.ok(readBuffer.includes('readActiveProgramSceneWithRetry()'));
  assert.ok(readBuffer.includes('Scene aktif MG-30 belum diketahui'));
});

test('connection and reconnection invalidate unconfirmed scene state before first sync', () => {
  const reset = between('function resetHardwareSceneSyncState(', 'let lastAnnouncedActivePresetSlot');
  const connect = between('async function connectMG30(', 'let selected=');
  assert.ok(reset.includes('sceneStateRevision++'));
  assert.ok(reset.includes('activeSceneIndex=null'));
  assert.ok(reset.includes('lastReportedSceneStatus=null'));
  assert.ok(reset.includes('lastReportedProgram=null'));
  assert.equal(connect.split('resetHardwareSceneSyncState();hardwareSyncBusy=true').length - 1, 2);
  assert.ok(connect.includes('finally{hardwareSyncBusy=false}'));
});

test('scene UI shows no active scene until the hardware scene is identified', () => {
  const render = between('function renderSceneButtons(', 'function initSceneCopyUI(');
  assert.ok(render.includes('const sceneKnown=Number.isInteger(activeSceneIndex)&&activeSceneIndex>=0&&activeSceneIndex<=2'));
  assert.ok(render.includes('picker.selectedIndex=sceneKnown?activeSceneIndex:-1'));
  assert.ok(render.includes("sceneKnown&&activeSceneIndex===i?'active':'"));
});

test('factory IR global CC and packed scene slot tables remain unchanged', () => {
  assert.ok(source.includes('[66,67,68,69,70,71], // IR/CAB: base CC 66'));
  assert.ok(source.includes('[76,77,78,79,80,81],[83,84]'));
  assert.ok(source.includes('const MIDI_PARAM_CC=['));
  assert.ok(source.includes('const KNOB_SLOTS=['));
});
