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

test('DAW and Android recorder bridge scripts parse after Loopback changes', () => {
  for (const relative of ['../www/studio-daw.js', '../www/main.js']) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path]));
  }
});

test('project has a dedicated fifth Loopback lane, separate from Backing and Guitar', async () => {
  const { DAW_TRACKS, createDefaultProject, normalizeProject } = await import('../www/studio-daw-core.js');
  assert.deepEqual(DAW_TRACKS.map((track) => track.id), ['backing', 'guitar', 'bass', 'vocals', 'loopback']);
  const project = createDefaultProject('Loopback session');
  const loopback = project.tracks.find((track) => track.id === 'loopback');
  assert.ok(loopback);
  assert.equal(loopback.name, 'Loopback');
  assert.equal(loopback.input, 'MG-30 USB Loopback');
  assert.equal(loopback.armed, false);
  assert.equal(project.tracks.find((track) => track.id === 'guitar').armed, true);

  const legacy = normalizeProject({
    name: 'Old four-track project',
    tracks: [
      { id: 'backing', clips: [{ mediaId: 'song', durationSeconds: 12 }] },
      { id: 'guitar', armed: true, clips: [{ mediaId: 'guitar-take', durationSeconds: 4 }] },
      { id: 'bass' },
      { id: 'vocals' },
    ],
  });
  assert.equal(legacy.tracks.length, 5);
  assert.equal(legacy.tracks.find((track) => track.id === 'loopback').clips.length, 0);
  assert.equal(legacy.tracks.find((track) => track.id === 'backing').clips.length, 1);
  assert.equal(legacy.tracks.find((track) => track.id === 'guitar').clips.length, 1);
});

test('Loopback takes preserve channel count and raw channel-index metadata in project clips', async () => {
  const { normalizeProject } = await import('../www/studio-daw-core.js');
  const project = normalizeProject({
    tracks: [{
      id: 'loopback',
      clips: [{
        mediaId: 'loopback-media',
        durationSeconds: 5,
        channels: 4,
        sampleRate: 48000,
        captureMode: 'loopback',
        channelIndexMask: 15,
      }],
    }],
  });
  const clip = project.tracks.find((track) => track.id === 'loopback').clips[0];
  assert.equal(clip.channels, 4);
  assert.equal(clip.captureMode, 'loopback');
  assert.equal(clip.channelIndexMask, 15);
});

test('native recorder exposes USB input channel counts, position masks, and index masks', () => {
  assert.ok(recorder.includes('device.getChannelCounts()'));
  assert.ok(recorder.includes('device.getChannelMasks()'));
  assert.ok(recorder.includes('device.getChannelIndexMasks()'));
  assert.ok(recorder.includes('item.put("channelIndexMasks"'));
  assert.ok(recorder.includes('candidate.setPreferredDevice(usb)'));
  assert.ok(recorder.includes('candidate.getRoutedDevice()'));
  assert.ok(recorder.includes('if (usb == null && !loopbackCapture)'));
  assert.ok(recorder.includes('!loopbackCapture || isMg30UsbDevice(routed)'));
  assert.ok(recorder.includes('private static boolean isMg30UsbDevice(AudioDeviceInfo device)'));
  assert.ok(recorder.includes('sampleCount -= sampleCount % captureChannels'));
});

test('Loopback capture prefers the widest advertised raw USB channel layout', () => {
  assert.match(recorder, /call\.getString\("captureMode", "normal"\)/);
  assert.match(recorder, /boolean loopbackCapture = "loopback"\.equalsIgnoreCase\(captureMode\)/);
  assert.match(recorder, /preferredLoopbackCounts = new int\[\] \{ 4, 3, 2, 1 \}/);
  assert.match(recorder, /Integer\.bitCount\(indexMask\)/);
  assert.match(recorder, /loopbackIndexMasks\.add\(indexMask\)/);
  assert.match(recorder, /0xC/);
  assert.match(recorder, /setChannelIndexMask\(channelIndexMask\)/);
  assert.match(recorder, /useChannelIndexMask[\s\S]*?rate \* channels \* bytesPerCaptureSample \/ 10/);
  assert.match(recorder, /advertisedIndexMasks\.length > 0 && channelOptions\.isEmpty\(\)/);
  assert.match(recorder, /selectedChannelIndexMask = channelIndexMask/);
  assert.match(recorder, /MG30_Loopback_Take_/);
  assert.match(recorder, /activeCaptureMode = loopbackCapture \? "loopback" : "normal"/);
  assert.match(recorder, /result\.put\("channelIndexMask", activeChannelIndexMask\)/);
  assert.match(recorder, /result\.put\("captureMode", activeCaptureMode\)/);
  assert.doesNotMatch(recorder, /AudioTrack/);
});

test('DAW Loopback button arms the independent lane and requests Loopback capture mode', () => {
  assert.ok(core.includes("{ id: 'loopback', name: 'Loopback'"));
  assert.ok(daw.includes('Phone Audio → MG-30 → Loopback Track'));
  assert.ok(daw.includes('armTrack(\'loopback\')'));
  assert.ok(daw.includes("track.id === 'loopback' ? 'loopback' : 'normal'"));
  assert.ok(daw.includes('recorder.start({ captureMode })'));
  assert.ok(daw.includes('Loopback-only capture must not create/resume Web Audio output'));
  assert.ok(daw.includes("audioContext.suspend()"));
  assert.ok(daw.includes('(performance.now() - recordingStartPerformanceTime) / 1000'));
  assert.ok(daw.includes('importQuickTake(take, trackId, startAt)'));
  assert.ok(daw.includes('syncLoopbackPanel'));
  assert.ok(daw.includes('START USB LOOPBACK CAPTURE'));
  assert.ok(daw.includes('STOP USB LOOPBACK CAPTURE'));
  assert.match(daw, /not inserted into the Backing or Guitar track/i);
});

test('Quick Record bridge forwards the requested capture mode to MG30Audio', () => {
  assert.match(main, /async function startGuitarRecording\(options = \{\}\)/);
  assert.match(main, /options\?\.captureMode === 'loopback' \? 'loopback' : 'normal'/);
  assert.ok(main.includes('MG30Audio.startRecording({ prefer24Bit: true, captureMode })'));
  assert.ok(main.includes('device.channelIndexMasks'));
  assert.ok(main.includes('Channel index masks:'));
  assert.ok(main.includes("let recordingCaptureMode = 'normal'"));
  assert.match(main, /if \(!isLoopback\) \{[\s\S]*?guitarStopBtn/);
  assert.match(main, /if \(!isLoopback\) \{[\s\S]*?setCurrentPlayback\(take, false\)/);
  assert.ok(main.includes('start: startGuitarRecording'));
});

test('Reamp output path is absent; existing USB output discovery/tone probe stays isolated', () => {
  assert.doesNotMatch(daw, /Reamp|reamp/);
  assert.doesNotMatch(outputPlugin, /beginReampPlayback|startReampPlayback|ReampSession/);
  assert.ok(outputPlugin.includes('inspectOutputDevices'));
  assert.ok(outputPlugin.includes('playTestTone'));
  assert.doesNotMatch(outputPlugin, /import android\\.media\\.AudioRecord|new AudioRecord|AudioRecord\\.Builder/);
  assert.ok(index.includes('5 tracks · 48 kHz / 24-bit'));
});

