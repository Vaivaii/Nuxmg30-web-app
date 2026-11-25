export function routeControllerPacket(packet, config = {}) {
  const bytes = Array.from(packet || [], value => Number(value) & 0xff);
  if (bytes.length === 0) return [];

  const passthrough = config.passthrough !== false;
  const mapping = config.ccMap;
  const status = bytes[0] & 0xf0;
  const isControlChange = status === 0xb0 && bytes.length >= 3;
  const matchesMapping = isControlChange && mapping &&
    Number.isInteger(Number(mapping.source)) &&
    Number.isInteger(Number(mapping.target)) &&
    bytes[1] === Number(mapping.source) &&
    Number(mapping.target) >= 0 && Number(mapping.target) <= 127;

  if (matchesMapping) {
    const mapped = bytes.slice();
    mapped[1] = Number(mapping.target);
    return [mapped];
  }
  return passthrough ? [bytes] : [];
}

export function normalizeMidiBytes(packet) {
  const bytes = Array.from(packet || [], value => Number(value));
  if (!bytes.length || bytes.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new TypeError('Invalid MIDI byte array');
  }
  return bytes;
}
