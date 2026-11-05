#!/usr/bin/env python3
"""Offline validator for QuickTone original MG-30 NAM USB-MIDI transfer frames.

Static/research tool only: reads USBPcap captures and .nam JSON files. It does
not open MIDI devices and cannot send anything to an amplifier.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
from pathlib import Path

PREFIX = bytes.fromhex('F0 43 58 70 58 01')
TOTAL_TRANSFER_BYTES = 8192
DATA_BYTES_PER_FRAME = 136
DESCRIPTOR_BYTES = 12


def unpack_7bit_stream(encoded: bytes) -> bytes:
    """Reverse QuickTone's LSB-first bit-stream packer (encoded bytes are 7-bit)."""
    out = bytearray()
    acc = 0
    bit_count = 0
    for value in encoded:
        if value & 0x80:
            raise ValueError('non-7-bit value in packed SysEx region')
        acc |= value << bit_count
        bit_count += 7
        while bit_count >= 8:
            out.append(acc & 0xFF)
            acc >>= 8
            bit_count -= 8
    return bytes(out)


def pack_7bit_stream(raw: bytes) -> bytes:
    """Match QuickTone's bit packer recovered from QuickTone.exe at VA 0x4A49E0."""
    out = bytearray()
    acc = 0
    bit_count = 0
    for value in raw:
        acc |= value << bit_count
        bit_count += 8
        while bit_count >= 7:
            out.append(acc & 0x7F)
            acc >>= 7
            bit_count -= 7
    if bit_count:
        out.append(acc & 0x7F)
    return bytes(out)


def build_transfer_frame(slot_index: int, offset: int, transfer_buffer: bytes,
                         device_or_mode: int = 0, transfer_type: int = 3) -> bytes:
    """Build one observed A2-Lite data frame; offline only, never sends MIDI."""
    if len(transfer_buffer) != TOTAL_TRANSFER_BYTES:
        raise ValueError(f'transfer buffer must be exactly {TOTAL_TRANSFER_BYTES} bytes')
    if not 0 <= slot_index <= 9:
        raise ValueError('slot index must be 0..9')
    if not 0 <= offset < TOTAL_TRANSFER_BYTES or offset % DATA_BYTES_PER_FRAME:
        raise ValueError('offset must be a valid 136-byte transfer boundary')
    payload = transfer_buffer[offset:offset + DATA_BYTES_PER_FRAME]
    descriptor = bytes((device_or_mode, slot_index, 1, transfer_type))
    descriptor += struct.pack('<II', offset, TOTAL_TRANSFER_BYTES)
    return PREFIX + pack_7bit_stream(descriptor + payload) + b'\xF7'


def read_pcapng_out_sysex(path: Path) -> list[bytes]:
    data = path.read_bytes()
    pos = 0
    messages: list[bytes] = []
    while pos + 12 <= len(data):
        block_type, block_len = struct.unpack_from('<II', data, pos)
        if block_len < 12 or pos + block_len > len(data):
            break
        if block_type == 6 and block_len >= 32:  # Enhanced Packet Block
            caplen = struct.unpack_from('<I', data, pos + 20)[0]
            packet = data[pos + 28:pos + 28 + caplen]
            if len(packet) >= 28:
                header_len = struct.unpack_from('<H', packet, 0)[0]
                endpoint = packet[21]
                midi = packet[28:]
                if header_len == 27 and endpoint == 0x02 and midi.startswith(b'\xF0'):
                    clean = bytes(b for i, b in enumerate(midi) if i % 4 != 3)
                    if clean.startswith(b'\xF0') and b'\xF7' in clean:
                        clean = clean[:clean.index(b'\xF7') + 1]
                        messages.append(clean)
        pos += block_len
    return messages


def extract_a2lite(nam_path: Path) -> tuple[dict, bytes]:
    model_json = json.loads(nam_path.read_text(encoding='utf-8'))
    if model_json.get('architecture') != 'SlimmableContainer':
        raise ValueError(f'{nam_path}: expected SlimmableContainer')
    submodels = model_json.get('config', {}).get('submodels', [])
    if not submodels or submodels[0].get('model', {}).get('architecture') != 'WaveNet':
        raise ValueError(f'{nam_path}: expected first WaveNet submodel (A2-Lite)')
    model = submodels[0]['model']
    weights = model.get('weights', [])
    if len(weights) != 1871:
        raise ValueError(f'{nam_path}: expected 1871 A2-Lite weights, got {len(weights)}')
    raw = b''.join(struct.pack('<f', float(x)) for x in weights)
    return model, raw


def decode_transfer_frame(message: bytes) -> dict:
    if not message.startswith(PREFIX) or not message.endswith(b'\xF7'):
        raise ValueError('not a QuickTone MG-30 NAM transfer frame')
    body = message[len(PREFIX):-1]
    decoded = unpack_7bit_stream(body)
    if len(decoded) < DESCRIPTOR_BYTES:
        raise ValueError('decoded body shorter than transfer descriptor')
    if pack_7bit_stream(decoded) != body:
        raise ValueError('bitstream pack/unpack round trip failed')
    descriptor = decoded[:DESCRIPTOR_BYTES]
    offset = struct.unpack_from('<I', descriptor, 4)[0]
    total_bytes = struct.unpack_from('<I', descriptor, 8)[0]
    payload = decoded[DESCRIPTOR_BYTES:]
    return {
        'frame_length': len(message),
        'packed_region_length': len(body),
        'decoded_raw_length': len(decoded),
        'descriptor_hex': descriptor.hex(' '),
        'device_or_mode_byte': descriptor[0],
        'slot_index_zero_based': descriptor[1],
        'descriptor_flag': descriptor[2],
        'transfer_type': descriptor[3],
        'byte_offset': offset,
        'declared_total_bytes': total_bytes,
        'payload_length': len(payload),
        'payload': payload,
        'message_hex': message.hex(' '),
        'reencoded_frame_exact': PREFIX + pack_7bit_stream(decoded) + b'\xF7' == message,
    }


def analyze(label: str, nam_path: Path, capture_path: Path, slot_number: int) -> dict:
    model, raw_weights = extract_a2lite(nam_path)
    messages = read_pcapng_out_sysex(capture_path)
    slot_index = slot_number - 1
    frames = []
    for message in messages:
        if len(message) > 6 and message[:6] == PREFIX:
            try:
                frame = decode_transfer_frame(message)
            except ValueError:
                continue
            if (frame['transfer_type'] == 3
                and frame['slot_index_zero_based'] == slot_index
                and frame['declared_total_bytes'] == TOTAL_TRANSFER_BYTES
                and frame['byte_offset'] % DATA_BYTES_PER_FRAME == 0):
                frames.append(frame)

    by_offset: dict[int, list[dict]] = {}
    for frame in frames:
        by_offset.setdefault(frame['byte_offset'], []).append(frame)
    unique = {off: group[0] for off, group in by_offset.items()}
    reconstruction = bytearray(TOTAL_TRANSFER_BYTES)
    block_results = []
    for offset, frame in sorted(unique.items()):
        payload = frame['payload']
        count = min(len(payload), max(0, TOTAL_TRANSFER_BYTES - offset))
        reconstruction[offset:offset + count] = payload[:count]
        expected = (raw_weights + bytes(TOTAL_TRANSFER_BYTES - len(raw_weights)))[offset:offset + count]
        block_results.append({
            'offset': offset,
            'frame_length': frame['frame_length'],
            'payload_length': len(payload),
            'payload_matches_a2lite_plus_zero_padding': payload[:count] == expected,
            'payload_bytes_compared': count,
            'descriptor_hex': frame['descriptor_hex'],
            'reencode_exact': frame['reencoded_frame_exact'],
            'duplicate_frames_at_offset': len(by_offset[offset]),
        })

    expected_buffer = raw_weights + bytes(TOTAL_TRANSFER_BYTES - len(raw_weights))
    mismatch_offsets = [i for i, (a, b) in enumerate(zip(reconstruction, expected_buffer)) if a != b]
    generated_frames = []
    for offset, group in sorted(by_offset.items()):
        generated = build_transfer_frame(slot_index, offset, expected_buffer)
        generated_frames.append({
            'offset': offset,
            'matches_all_captured_frames_at_offset': all(g['message_hex'] == generated.hex(' ') for g in group),
            'generated_frame_length': len(generated),
            'captured_copies': len(group),
        })
    return {
        'label': label,
        'source_nam': nam_path.name,
        'capture': capture_path.name,
        'slot_number': slot_number,
        'slot_index_zero_based': slot_index,
        'source_architecture': model.get('architecture'),
        'a2lite_weight_count': len(raw_weights) // 4,
        'a2lite_weight_bytes': len(raw_weights),
        'transfer_buffer_bytes': TOTAL_TRANSFER_BYTES,
        'padding_bytes_after_weights': TOTAL_TRANSFER_BYTES - len(raw_weights),
        'outgoing_sysex_messages_total': len(messages),
        'transfer_frames_matched': len(frames),
        'unique_transfer_offsets': len(unique),
        'offsets': sorted(unique),
        'offset_zero_duplicate_count': len(by_offset.get(0, [])),
        'decoded_weight_region_exact_match': reconstruction[:len(raw_weights)] == raw_weights,
        'decoded_all_8192_bytes_exact_match_weights_plus_zero_padding': not mismatch_offsets,
        'reconstruction_mismatch_byte_count': len(mismatch_offsets),
        'all_frames_reencode_byte_exact': all(f['reencoded_frame_exact'] for f in frames),
        'all_unique_payload_blocks_match_source_and_padding': all(b['payload_matches_a2lite_plus_zero_padding'] for b in block_results),
        'all_generated_frames_match_captured_frames_byte_exact': all(g['matches_all_captured_frames_at_offset'] for g in generated_frames),
        'blocks': block_results,
        'generated_frame_reconstruction': generated_frames,
        'raw_weights_sha256': hashlib.sha256(raw_weights).hexdigest(),
        'reconstructed_buffer_sha256': hashlib.sha256(reconstruction).hexdigest(),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--friedman-nam', type=Path, default=Path('/mnt/data/Friedman DS40.nam'))
    ap.add_argument('--friedman-capture', type=Path, default=Path('/mnt/data/namimport1.pcapng'))
    ap.add_argument('--mesa-nam', type=Path, default=Path('/mnt/data/Mesa Boogie  Mark V Rythm Amp Only.nam'))
    ap.add_argument('--mesa-capture', type=Path, default=Path('/mnt/data/namimport2.pcapng'))
    ap.add_argument('--output', type=Path, default=Path('/mnt/data/quicktone-mg30-codec-report.json'))
    args = ap.parse_args()
    results = [
        analyze('Friedman DS40', args.friedman_nam, args.friedman_capture, 9),
        analyze('Mesa Boogie Mark V', args.mesa_nam, args.mesa_capture, 10),
    ]
    report = {
        'analysis_kind': 'offline static QuickTone SysEx codec validation; does not send MIDI',
        'codec': {
            'prefix': PREFIX.hex(' '),
            'scheme': 'continuous 8-bit to 7-bit LSB-first bitstream packing over a 12-byte descriptor followed by each payload chunk',
            'descriptor': 'byte0 device/mode value; byte1 zero-based slot index; byte2 flag 1; byte3 transfer type 3; bytes4..7 little-endian byte offset; bytes8..11 little-endian total buffer size 8192',
            'full_frame': 'F0 43 58 70 58 01 + pack7(descriptor[12] || payload[136]) + F7',
            'short_final_frame': 'same framing; last payload is 32 bytes at offset 8160',
        },
        'results': results,
    }
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'output': str(args.output),
        'results': [{k: v for k, v in r.items() if k not in ('blocks', 'generated_frame_reconstruction')} for r in results],
    }, indent=2))


if __name__ == '__main__':
    main()
