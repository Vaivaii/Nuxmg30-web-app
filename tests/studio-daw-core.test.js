import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProject, normalizeProject, barDurationSeconds, projectDurationSeconds,
  snapTime, selectStemTracks, safeExportName, encodeWavHeader, floatStereoToPcm24,
  makeWavBlob, createStoredZip, crc32,
} from '../www/studio-daw-core.js';

test('new DAW projects start with four prepared lanes', () => {
  const project = createDefaultProject('First Song', '2026-11-02T00:00:00.000Z');
  assert.deepEqual(project.tracks.map((track) => track.id), ['backing', 'guitar', 'bass', 'vocals']);
  assert.equal(project.tracks[0].input, 'Audio file');
  assert.equal(project.tracks[1].input, 'MG-30 USB');
  assert.equal(project.tracks[0].clips.length, 0);
  assert.equal(project.tracks[2].clips.length, 0);
  assert.equal(project.tracks[3].clips.length, 0);
  assert.equal(project.tracks[1].armed, true);
  assert.equal(project.tempo, 100);
  assert.equal(project.sampleRate, 48000);
  assert.equal(project.bitDepth, 24);
});

test('project normalization clamps unsafe values and retains only the four supported tracks', () => {
  const project = normalizeProject({
    name: '  Demo  ', tempo: 999, masterGain: 8,
    tracks: [
      { id: 'guitar', armed: true, gain: 9, pan: -9, clips: [{ id: 'a', mediaId: 'media-a', startSeconds: 2, sourceOffsetSeconds: 0.5, durationSeconds: 4 }] },
      { id: 'backing', clips: [{ mediaId: 'media-b', startSeconds: -3, durationSeconds: 0 }] },
      { id: 'unknown', clips: [{ mediaId: 'ignore', durationSeconds: 3 }] },
    ],
  });
  assert.equal(project.name, 'Demo');
  assert.equal(project.tempo, 240);
  assert.equal(project.masterGain, 1.5);
  assert.equal(project.tracks.length, 4);
  assert.equal(project.tracks[1].gain, 2);
  assert.equal(project.tracks[1].pan, -1);
  assert.equal(project.tracks[1].clips[0].startSeconds, 2);
  assert.equal(project.tracks[0].clips.length, 0);
  assert.equal(project.tracks.filter((track) => track.armed).length, 1);
  assert.equal(normalizeProject(null), null);
});

test('bar timing, project duration, and snap quantization use tempo and meter', () => {
  const project = createDefaultProject();
  assert.equal(barDurationSeconds(120, '4/4'), 2);
  project.tracks[0].clips.push({ startSeconds: 5, durationSeconds: 3 });
  assert.equal(projectDurationSeconds(project), 9.6); // minimum four-bar project timeline at 120 BPM
  assert.equal(snapTime(0.62, { tempo: 120, timeSignature: '4/4' }, 'beat'), 0.5);
  assert.equal(snapTime(2.9, { tempo: 120, timeSignature: '4/4' }, 'bar'), 2);
});

test('stem selection returns only checked tracks that contain audio', () => {
  const project = createDefaultProject();
  project.tracks[0].clips.push({ mediaId: 'a' });
  project.tracks[1].clips.push({ mediaId: 'b' });
  assert.deepEqual(selectStemTracks(project, ['guitar', 'bass']).map((track) => track.id), ['guitar']);
  assert.deepEqual(selectStemTracks(project, ['backing', 'guitar']).map((track) => track.id), ['backing', 'guitar']);
});

test('export filenames are safe for common Android document providers', () => {
  assert.equal(safeExportName('../My: Song?.wav'), '..-My- Song-.wav');
  assert.equal(safeExportName(''), 'MG30-Studio-Export');
});

test('24-bit WAV header and PCM conversion are valid little-endian stereo', () => {
  const pcm = floatStereoToPcm24(new Float32Array([-1, 0.5]), new Float32Array([1, -0.5]));
  assert.equal(pcm.length, 12);
  assert.deepEqual([...pcm.slice(0, 6)], [0, 0, 128, 255, 255, 127]);
  const header = encodeWavHeader(pcm.length, 48000, 2, 24);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  assert.equal(String.fromCharCode(...header.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...header.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(34, true), 24);
  assert.equal(view.getUint32(40, true), 12);
  const wav = makeWavBlob([pcm], 2);
  assert.equal(wav.size, 56);
  assert.equal(wav.type, 'audio/wav');
});

test('stored ZIP contains separate selected stem files with CRC and central directory', async () => {
  const zip = await createStoredZip([
    { name: '01-Backing.wav', blob: new Blob(['backing-audio']) },
    { name: '02-Guitar.wav', blob: new Blob(['guitar-audio']) },
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(zip.type, 'application/zip');
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 14, true), 2);
  const centralOffset = view.getUint32(bytes.length - 6, true);
  assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
  const nameLength = view.getUint16(centralOffset + 28, true);
  assert.equal(new TextDecoder().decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength)), '01-Backing.wav');
  const expected = crc32(new TextEncoder().encode('backing-audio')) ^ 0xffffffff;
  assert.equal(view.getUint32(centralOffset + 16, true), expected >>> 0);
  await assert.rejects(() => createStoredZip([]), /Select at least one/);
});
