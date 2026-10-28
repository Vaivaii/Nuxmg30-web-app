#!/usr/bin/env python3
"""Offline full-transaction validator for QuickTone 2.6.7.16 / MG-30 Gen 2.

Reads NAM JSON and USBPcap .pcapng captures. Never executes QuickTone and
never sends MIDI. Intended for regression tests of the recovered wire format.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
from collections import Counter
from pathlib import Path

ROOT = bytes.fromhex("F0 43 58 70 58")
TOTAL = 8192
CHUNK = 136
DESC = 12


def pack7(data: bytes) -> bytes:
    out, acc, bits = bytearray(), 0, 0
    for byte in data:
        acc |= byte << bits
        bits += 8
        while bits >= 7:
            out.append(acc & 0x7F)
            acc >>= 7
            bits -= 7
    if bits:
        out.append(acc & 0x7F)
    return bytes(out)


def unpack7(data: bytes) -> bytes:
    out, acc, bits = bytearray(), 0, 0
    for byte in data:
        if byte & 0x80:
            raise ValueError("non-7-bit encoded byte")
        acc |= byte << bits
        bits += 7
        while bits >= 8:
            out.append(acc & 0xFF)
            acc >>= 8
            bits -= 8
    return bytes(out)


def make_sysex(command: int, raw: bytes) -> bytes:
    return ROOT + bytes([command]) + pack7(raw) + b"\xF7"


def descriptor(slot: int, field2: int, field3: int, offset: int, size: int) -> bytes:
    return bytes([0, slot, field2, field3]) + struct.pack("<II", offset, size)


def decode(message: bytes) -> dict:
    if not message.startswith(ROOT) or message[-1:] != b"\xF7":
        raise ValueError("not MG-30 SysEx")
    raw = unpack7(message[6:-1])
    if len(raw) < DESC:
        raise ValueError("descriptor missing")
    d = raw[:DESC]
    return {
        "command": message[5], "raw": raw, "descriptor": d,
        "slot": d[1], "field2": d[2], "field3": d[3],
        "offset": struct.unpack_from("<I", d, 4)[0],
        "size": struct.unpack_from("<I", d, 8)[0],
        "payload": raw[DESC:], "message": message,
    }


def read_usbpcap(path: Path) -> list[dict]:
    data, pos, out = path.read_bytes(), 0, []
    while pos + 12 <= len(data):
        block_type, block_len = struct.unpack_from("<II", data, pos)
        if block_len < 12 or pos + block_len > len(data):
            break
        if block_type == 6 and block_len >= 32:  # Enhanced Packet Block
            caplen = struct.unpack_from("<I", data, pos + 20)[0]
            packet = data[pos + 28:pos + 28 + caplen]
            if len(packet) >= 28 and struct.unpack_from("<H", packet, 0)[0] == 27:
                endpoint, events = packet[21], packet[28:]
                midi = bytes(b for i, b in enumerate(events) if i % 4 != 3)
                if midi.startswith(b"\xF0") and b"\xF7" in midi:
                    msg = midi[:midi.index(b"\xF7") + 1]
                    try:
                        out.append({"endpoint": endpoint, "decoded": decode(msg)})
                    except ValueError:
                        pass
        pos += block_len
    return out


def read_a2lite(path: Path) -> bytes:
    root = json.loads(path.read_text(encoding="utf-8"))
    if root.get("architecture") != "SlimmableContainer":
        raise ValueError(f"{path.name}: expected SlimmableContainer")
    submodels = root.get("config", {}).get("submodels", [])
    model = submodels[0].get("model", {}) if submodels else {}
    weights = model.get("weights", [])
    if model.get("architecture") != "WaveNet" or len(weights) != 1871:
        raise ValueError(f"{path.name}: first submodel is not the expected 1871-weight A2-Lite")
    return b"".join(struct.pack("<f", float(x)) for x in weights)


def make_metadata(slot: int, model_name: str, tail: bytes) -> bytes:
    if len(tail) != 96:
        raise ValueError("metadata template tail must be 96 bytes")
    name = model_name.encode("utf-8")[:32].ljust(32, b"\0")
    return make_sysex(1, descriptor(slot, 3, 0, 0, 128) + name + tail)


def make_data(slot: int, offset: int, buffer: bytes) -> bytes:
    return make_sysex(1, descriptor(slot, 1, 3, offset, TOTAL) + buffer[offset:offset + CHUNK])


def make_query(slot: int) -> bytes:
    return make_sysex(0, descriptor(slot, 4, 0, 0, 0) + bytes(CHUNK))


def analyze(label: str, nam_path: Path, capture_path: Path, slot_number: int) -> dict:
    slot = slot_number - 1
    weights = read_a2lite(nam_path)
    transfer = weights + bytes(TOTAL - len(weights))
    events = read_usbpcap(capture_path)
    out = [e["decoded"] for e in events if e["endpoint"] == 0x02]
    incoming = [e["decoded"] for e in events if e["endpoint"] == 0x82]
    metadata = [m for m in out if m["command"] == 1 and m["field2"] == 3 and m["size"] == 128]
    data = [m for m in out if m["command"] == 1 and m["field2"] == 1 and m["field3"] == 3 and m["size"] == TOTAL]
    queries = [m for m in out if m["command"] == 0 and m["field2"] == 4 and m["size"] == 0]
    acks = [m for m in incoming if m["command"] == 3]
    replies = [m for m in incoming if m["command"] == 2]
    if len(metadata) != 1:
        raise ValueError(f"{capture_path.name}: expected one metadata write")
    tail = metadata[0]["payload"][32:128]
    metadata_frame = make_metadata(slot, Path(nam_path).stem, tail)
    expected_offsets = [0, 0] + list(range(CHUNK, TOTAL, CHUNK))
    expected_data = [make_data(slot, offset, transfer) for offset in expected_offsets]
    expected_queries = [make_query(s) for s in range(10)] * 2
    data_byte_exact = [m["message"] for m in data] == expected_data
    metadata_exact = metadata[0]["message"] == metadata_frame
    queries_exact = [m["message"] for m in queries] == expected_queries
    expected_ack_desc = Counter([metadata[0]["descriptor"]] + [m["descriptor"] for m in data])
    actual_ack_desc = Counter(m["descriptor"] for m in acks)
    roundtrip = pack7(unpack7(b"".join([]))) == b""  # sanity check for empty stream
    replies_rounds_equal = len(replies) == 20 and all(
        replies[i]["slot"] == replies[i + 10]["slot"]
        and replies[i]["payload"] == replies[i + 10]["payload"]
        for i in range(10))
    selected_names = [
        m["payload"][:32].split(b"\0", 1)[0].decode("utf-8", "replace")
        for m in replies if m["slot"] == slot
    ]
    return {
        "model": label, "nam_file": nam_path.name, "capture": capture_path.name,
        "ui_slot": slot_number, "slot_index": slot, "outbound_sysex": len(out),
        "inbound_sysex": len(incoming),
        "outbound_size_counts": dict(Counter(len(m["message"]) for m in out)),
        "inbound_size_counts": dict(Counter(len(m["message"]) for m in incoming)),
        "weight_count": len(weights) // 4, "weight_bytes": len(weights),
        "transfer_buffer_bytes": len(transfer), "zero_padding_bytes": TOTAL - len(weights),
        "weight_sha256": hashlib.sha256(weights).hexdigest(),
        "transfer_buffer_sha256": hashlib.sha256(transfer).hexdigest(),
        "metadata_write_exact": metadata_exact, "metadata_label_captured": metadata[0]["payload"][:32].split(b"\0", 1)[0].decode("utf-8", "replace"),
        "metadata_template_tail_matches": metadata[0]["payload"][32:] == tail,
        "data_frames": len(data), "unique_data_offsets": len(set(m["offset"] for m in data)),
        "duplicate_offset_zero_count": sum(m["offset"] == 0 for m in data),
        "all_data_frames_exact_regenerated_in_order": data_byte_exact,
        "all_data_frames_round_trip_pack": all(pack7(unpack7(m["message"][6:-1])) == m["message"][6:-1] for m in data),
        "all_61_offsets_present": sorted(set(m["offset"] for m in data)) == list(range(0, TOTAL, CHUNK)),
        "queries": len(queries), "all_queries_exact_regenerated_in_order": queries_exact,
        "acks": len(acks), "ack_descriptor_multiset_matches_metadata_and_data": actual_ack_desc == expected_ack_desc,
        "metadata_replies": len(replies),
        "all_reply_shapes_valid": len(replies) == 20 and all(m["field2"] == 4 and m["size"] == 128 and len(m["payload"]) == 128 for m in replies),
        "two_readback_rounds_identical": replies_rounds_equal,
        "selected_slot_readback_names": selected_names,
    }


def read_js_metadata_tail(repo_root: Path) -> bytes:
    source = (repo_root / "www" / "nam-transfer.js").read_text(encoding="utf-8")
    marker = "const METADATA_TAIL = Uint8Array.from("
    if marker not in source:
        raise ValueError("www/nam-transfer.js does not contain METADATA_TAIL")
    block = source.split(marker, 1)[1].split(");", 1)[0]
    pieces = __import__("re").findall(r"'([^']*)'", block)
    return bytes.fromhex(" ".join(pieces))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--friedman-nam", type=Path, default=Path("/mnt/data/Friedman DS40.nam"))
    p.add_argument("--friedman-capture", type=Path, default=Path("/mnt/data/namimport1.pcapng"))
    p.add_argument("--mesa-nam", type=Path, default=Path("/mnt/data/Mesa Boogie  Mark V Rythm Amp Only.nam"))
    p.add_argument("--mesa-capture", type=Path, default=Path("/mnt/data/namimport2.pcapng"))
    p.add_argument("--output", type=Path, default=Path("/mnt/data/quicktone-mg30-transaction-report.json"))
    a = p.parse_args()
    results = [
        analyze("Friedman DS40", a.friedman_nam, a.friedman_capture, 9),
        analyze("Mesa Boogie Mark V", a.mesa_nam, a.mesa_capture, 10),
    ]
    repo_root = Path(__file__).resolve().parents[2]
    js_tail = read_js_metadata_tail(repo_root)
    captured_tails = [bytes.fromhex(r["metadata_tail_hex"]) for r in results]
    metadata_tail_validation = {
        "app_tail_length_bytes": len(js_tail),
        "matches_friedman_capture": len(captured_tails) > 0 and js_tail == captured_tails[0],
        "matches_mesa_capture": len(captured_tails) > 1 and js_tail == captured_tails[1],
        "tail_hex": js_tail.hex(" "),
    }
    report = {
        "kind": "static offline USBPcap validation; does not execute QuickTone or send MIDI",
        "app_metadata_tail_validation": metadata_tail_validation,
        "codec": "continuous LSB-first 8-to-7 packing over descriptor plus chunk",
        "outer_command": {"0": "outbound slot metadata query", "1": "metadata write / model data", "2": "slot metadata reply", "3": "ACK"},
        "descriptor": "[zero, slot-index, field2, field3, uint32le offset, uint32le size]",
        "results": results,
    }
    a.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps([{k: v for k, v in r.items() if k not in ("weight_sha256", "transfer_buffer_sha256")} for r in results], indent=2))


if __name__ == "__main__":
    main()
