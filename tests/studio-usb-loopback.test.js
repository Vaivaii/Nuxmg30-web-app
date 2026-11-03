import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const core = read('../www/studio-daw-core.js');
const daw = read('../www/studio-daw.js');
const main = read('../www/main.js');
const recorder = read('../native-android/MG30AudioPlugin.java');
const outputPlugin = read('../native-android/MG30AudioOutputPlugin.java');
const index = read('../www/index.html');

test('DAW and Android recorder bridge scripts parse after four-track routing changes', () => {
  for (const relative of ['../www/studio-daw.js', '../www/main.js']) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path]));
  }
});

test('DAW stays at four visible tracks and every track has an independent input route', async () => {
  const { DAW_TRACKS, DAW_INPUT_ROUTES, createDefaultProject, normalizeProject } = await import('../www/studio-daw-core.js');
  assert.deepEqual(DAW_TRACKS.map((track) => track.id), ['backing', 'guitar', 'bass', 'vocals']);
  assert.deepEqual(DAW_INPUT_ROUTES.map((route) => route.id), [
    'file', 'usb-ch1-mono', 'usb-ch1-2-stereo', 'usb-wet-sync-3-4-stereo',
  ]);
  assert.equal(DAW_INPUT_ROUTES.find((route) => route.id === 'usb-ch1-mono').channelIndexMask, 0x1);
  assert.equal(DAW_INPUT_ROUTES.find((route) => route.id === 'usb-ch1-2-stereo').channelIndexMask, 0x3);
  assert.equal(DAW_INPUT_ROUTES.find((route) => route.id === 'usb-wet-sync-3-4-stereo').channelIndexMask, 0xC);

  const project = createDefaultProject('Four-track routing session');
  assert.equal(project.tracks.length, 4);
  assert.equal(project.tracks.find((track) => track.id === 'backing').inputRoute, 'file');
  assert.equal(project.tracks.find((track) => track.id === 'guitar').inputRoute, 'usb-ch1-2-stereo');
  assert.equal(project.tracks.find((track) => track.id === 'guitar').armed, true);

  const legacy = normalizeProject({
    name: 'Former five-lane project',
    tracks: [
      { id: 'backing', clips: [{ mediaId: 'song', durationSeconds: 12 }] },
      { id: 'guitar', armed: true, clips: [{ mediaId: 'guitar-take', durationSeconds: 4 }] },
      { id: 'bass' },
      { id: 'vocals' },
      { id: 'loopback' },
    ],
  });
  assert.equal(legacy.tracks.length, 4);
  assert.equal(legacy.tracks.find((track) => track.id === 'backing').clips.length, 1);
  assert.equal(legacy.tracks.find((track) => track.id === 'guitar').clips.length, 1);
  assert.equal(legacy.tracks.some((track) => track.id === 'loopback'), false);
  assert.equal(legacy.legacyLoopbackClips.length, 0);
});

test('channel selection maps mono input 1, stereo inputs 1-2, and Wet Sync inputs 3-4', async () => {
  const { selectUsbChannelPositions } = await import('../www/studio-daw-core.js');
  assert.deepEqual(selectUsbChannelPositions(0xF, 0x1), [0]);
  assert.deepEqual(selectUsbChannelPositions(0xF, 0x3), [0, 1]);
  assert.deepEqual(selectUsbChannelPositions(0xF, 0xC), [2, 3]);
  assert.deepEqual(selectUsbChannelPositions(0xC, 0xC), [0, 1]);
  assert.throws(() => selectUsbChannelPositions(0x3, 0xC), /does not contain/);
  assert.throws(() => selectUsbChannelPositions(0xF, 0x0), /one mono channel or one stereo pair/);
});

test('per-track route and original capture-channel metadata persist with clips', async () => {
  const { normalizeProject } = await import('../www/studio-daw-core.js');
  const project = normalizeProject({
    tracks: [{
      id: 'bass',
      inputRoute: 'usb-wet-sync-3-4-stereo',
      clips: [{
        mediaId: 'loopback-capture',
        durationSeconds: 5,
        channels: 2,
        sampleRate: 48000,
        captureMode: 'multichannel',
        channelIndexMask: 15,
        inputChannelMask: 12,
        inputRoute: 'usb-wet-sync-3-4-stereo',
      }],
    }],
  });
  const bass = project.tracks.find((track) => track.id === 'bass');
  assert.equal(bass.inputRoute, 'usb-wet-sync-3-4-stereo');
  assert.equal(bass.clips[0].captureMode, 'multichannel');
  assert.equal(bass.clips[0].channelIndexMask, 15);
  assert.equal(bass.clips[0].inputChannelMask, 12);
  assert.equal(bass.clips[0].inputRoute, 'usb-wet-sync-3-4-stereo');
});

test('native recorder exposes and captures the MG-30 multichannel USB endpoint', () => {
  assert.ok(recorder.includes('device.getChannelCounts()'));
  assert.ok(recorder.includes('device.getChannelMasks()'));
  assert.ok(recorder.includes('device.getChannelIndexMasks()'));
  assert.ok(recorder.includes('item.put("channelIndexMasks"'));
  assert.ok(recorder.includes('candidate.setPreferredDevice(usb)'));
  assert.ok(recorder.includes('candidate.getRoutedDevice()'));
  assert.ok(recorder.includes('if (usb == null && !multichannelCapture)'));
  assert.ok(recorder.includes('!multichannelCapture || isMg30UsbDevice(routed)'));
  assert.ok(recorder.includes('private static boolean isMg30UsbDevice(AudioDeviceInfo device)'));
  assert.ok(recorder.includes('sampleCount -= sampleCount % captureChannels'));
  assert.match(recorder, /boolean multichannelCapture = loopbackCapture \\|\\| diagnosticCapture \\|\\| "multichannel"\\.equalsIgnoreCase\\(captureMode\\)/);
  assert.match(recorder, /preferredLoopbackCounts = new int\[\] \{ 4, 3, 2, 1 \}/);
  assert.match(recorder, /Integer\.bitCount\(indexMask\)/);
  assert.match(recorder, /setChannelIndexMask\(channelIndexMask\)/);
  assert.match(recorder, /activeCaptureMode = diagnosticCapture \? "diagnostic"\s*:\s*\(multichannelCapture \? \(loopbackCapture \? "loopback" : "multichannel"\) : "normal"\)/);
  assert.ok(recorder.includes('MG30_USB_Input_Take_'));
  assert.ok(recorder.includes('call.getInt("channelIndexMask", 0)'));
  assert.ok(recorder.includes('(indexMask & requestedChannelIndexMask) != requestedChannelIndexMask'));
  assert.ok(recorder.includes('(fallbackMask & requestedChannelIndexMask) != requestedChannelIndexMask'));
  assert.ok(recorder.includes('MG-30 tidak mengekspos kanal USB yang dibutuhkan oleh input track ini'));
});

test('four-track DAW exposes per-track routes and only imports selected USB channels', () => {
  assert.ok(daw.includes('Track Input Routing'));
  assert.ok(daw.includes('data-track-input-route'));
  assert.ok(daw.includes('track.inputRoute = route.id'));
  assert.ok(daw.includes('const captureMode = \'multichannel\''));
  assert.ok(daw.includes('recorder.start({ captureMode, channelIndexMask: inputRoute.channelIndexMask })'));
  assert.ok(daw.includes('selectUsbChannelPositions(capturedMask, route.channelIndexMask)'));
  assert.ok(daw.includes('encodeWavHeader(pcm.byteLength, buffer.sampleRate, 2, 24)'));
  assert.ok(daw.includes('storedBlob = new Blob'));
  assert.ok(daw.includes('inputChannelMask: route.channelIndexMask'));
  assert.doesNotMatch(daw, /id: 'loopback', name: 'Loopback'/);
  assert.doesNotMatch(daw, /dawLoopbackRecord|mountLoopbackPanel|syncLoopbackPanel/);
});

test('Quick Record remains separate and passes multichannel mode without altering Guitar UI', () => {
  assert.match(main, /async function startGuitarRecording\(options = \{\}\)/);
  assert.ok(main.includes("['loopback', 'multichannel', 'diagnostic'].includes(options?.captureMode)"));
  assert.ok(main.includes("const isDawCapture = captureMode !== 'normal'"));
  assert.ok(main.includes("MG30Audio.startRecording({ prefer24Bit: true, captureMode, channelIndexMask })"));
  assert.ok(main.includes("const isDawCapture = captureMode === 'loopback' || captureMode === 'multichannel' || captureMode === 'diagnostic'"));
  assert.ok(main.includes('device.channelIndexMasks'));
  assert.ok(main.includes('Channel index masks:'));
  assert.ok(main.includes("let recordingCaptureMode = 'normal'"));
  assert.match(main, /if \(!isDawCapture\) \{[\s\S]*?guitarStopBtn/);
  assert.ok(main.includes('start: startGuitarRecording'));
});

test('Loopback is not mislabeled as USB Input 3/4; 3/4 is Wet Sync / Dry Out', () => {
  assert.ok(core.includes("id: 'usb-wet-sync-3-4-stereo'"));
  assert.ok(core.includes("label: 'MG-30 USB · Input 3–4 (Wet Sync / Dry Out)'"));
  assert.doesNotMatch(core, /Loopback 3–4/);
  assert.ok(daw.includes('Input 3/4 bukan otomatis Loopback playback dari HP.'));
  assert.ok(daw.includes('Normal + Loopback option'));
  assert.ok(daw.includes('captureMode: \'diagnostic\''));
  assert.ok(daw.includes('channelStats'));
  assert.ok(daw.includes('USB IN '));
});

test('Reamp output path remains absent and four-track labels are shipped', () => {
  assert.doesNotMatch(daw, /Reamp|reamp/);
  assert.doesNotMatch(outputPlugin, /beginReampPlayback|startReampPlayback|ReampSession/);
  assert.ok(outputPlugin.includes('inspectOutputDevices'));
  assert.ok(outputPlugin.includes('playTestTone'));
  assert.doesNotMatch(outputPlugin, /import android\\.media\\.AudioRecord|new AudioRecord|AudioRecord\\.Builder/);
  assert.ok(index.includes('4 tracks · 48 kHz / 24-bit'));
});
