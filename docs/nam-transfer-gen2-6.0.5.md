# MG-30 Gen 2 firmware 6.0.5 — NAM transfer investigation

Scope: original NUX MG-30 (Gen 2 firmware 6.0.5), not MG-30 MKII. This branch is isolated from main. Keep NAM slot-name work paused while investigating transfer.

## Confirmed from the supplied nam import.pcapng

A local USBPcap/USB-MIDI decoder reassembled 166 complete SysEx messages. All use the vendor prefix:

F0 43 58 70 58 ... F7

Message lengths:
- 63 messages of 21 bytes: device acknowledgements (command byte 03)
- 21 messages of 167 bytes: includes transfer/setup and later 10-slot readback requests/responses
- 81 messages of 177 bytes: transfer-sized messages
- 1 message of 58 bytes: final shorter transfer message

The main host-to-device sequence begins with a 167-byte message:
F0 43 58 70 58 01 00 0E 0C ... F7

Most following host-to-device transfer messages are 177 bytes and start:
F0 43 58 70 58 01 00 0E 04 18 00 <offset-like bytes> ... F7

The corresponding device replies are 21 bytes and use command byte 03, with matching transfer fields. The transfer-like sequence has 63 host messages and 63 ACKs. The first 177-byte transfer message is duplicated byte-for-byte in the capture. Offset-like fields advance through a repeating sequence such as 00 00, 11 00, 22 00 ... 7C 07; their precise encoding has not yet been established.

After transfer, QuickTone sends two rounds of ten readback requests (selectors 00, 02, 04, ... 12) and receives ten 167-byte replies per round. The corresponding replies from the two rounds match byte-for-byte. Two trailing MIDI CC events are B0 4E 03 and B0 03 3D; their meaning in the import flow is not yet established.

## Important limitation

The capture proves a chunked vendor-SysEx exchange with per-message ACKs, but does not yet establish the transformation from the downloaded .nam JSON file into the bytes sent to the device. The supplied model is a 294,552-byte JSON file with A2-Lite-related submodel weight arrays; the observed transfer payload is much smaller. Therefore, directly splitting the original .nam file into USB packets would be incorrect and potentially unsafe. The proprietary model conversion/packing step must be identified before sending anything to the hardware.

## Next reverse-engineering steps

1. Compare a second import capture for a different, known model and identify bytes that change with model weights versus transfer framing.
2. Extract each complete transfer message and its ACK into a normalized JSON table (message index, command, offset fields, payload length, payload hash, ACK fields).
3. Test candidate 7-bit/packed/fixed-point encodings against the .nam submodel weight arrays and metadata. Do not assume direct binary correspondence.
4. Identify the exact transfer completion/commit sequence and slot-selection behavior.
5. Only then implement a native Android USB-MIDI transfer method and connect the existing TONE3000 model-download action to it. Keep the direct-send UI disabled until a hardware test validates a known safe model.

## TONE3000 integration

The existing integration in www/tone3000.js already supports the API selection flow and saving downloaded model files inside the native app. The “Kirim ke MG-30” action is deliberately disabled until transfer serialization is validated. Do not rebuild or replace the TONE3000 integration; extend it only after the transfer protocol is understood.
