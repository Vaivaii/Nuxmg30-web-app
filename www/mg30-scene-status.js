/**
 * Parse the original NUX MG-30 Gen 2 active program/scene status reply.
 *
 * The Web MIDI handler passes a SysEx body with F0/F7 already removed:
 * [43, 58, 70, 15, 02, field0, field1, field2, field3, field4]
 *
 * QuickTone 2.6.7.16 reads the five status fields at raw SysEx offsets
 * 6..10. UserDataMG30::setSceneIndex writes field3 to byte[3], and its
 * getter reads that same byte. Since the leading F0 was stripped by
 * waitForSysEx(), field3 is body[8], not body[9].
 */
export function parseMG30ActiveSceneStatusReply(input) {
  if (!input || typeof input[Symbol.iterator] !== 'function') {
    throw new TypeError('Status MG-30 harus berupa deretan byte.');
  }
  const body = Array.from(input, value => Number(value));
  if (body.length < 10) {
    throw new Error('Balasan status 15/02 terlalu pendek: ' + body.length + ' byte.');
  }
  if (body[0] !== 0x43 || body[1] !== 0x58 || body[2] !== 0x70 ||
      body[3] !== 0x15 || body[4] !== 0x02) {
    throw new Error('Header balasan status MG-30 bukan 43 58 70 15 02.');
  }
  for (let i = 5; i <= 9; i++) {
    if (!Number.isInteger(body[i]) || body[i] < 0 || body[i] > 0x7f) {
      throw new Error('Field status MG-30 tidak valid pada posisi body[' + i + '].');
    }
  }
  const program = body[5];
  const scene = body[8];
  if (program < 0 || program > 127) {
    throw new Error('Nomor preset MG-30 tidak valid: ' + program);
  }
  if (scene < 0 || scene > 2) {
    throw new Error('Indeks Scene aktif MG-30 tidak valid: ' + scene);
  }
  return Object.freeze({ program, scene, fields: body.slice(5, 10) });
}
