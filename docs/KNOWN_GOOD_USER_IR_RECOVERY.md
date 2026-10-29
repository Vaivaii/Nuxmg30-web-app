# Known-good User IR import recovery

This branch starts from the exact commit used by the protected `android/ir-user-validated` and `android/ir-import-test` baseline:

`abf9d64edaabe64b56a6b65bf7bd49a271838f90`

It predates the merged Collection IR refactor and the experimental active User IR name readback. Use this as a recovery test for the original NUX MG-30 Gen 2 firmware 6.0.x.

## Import behavior

- Use the original dedicated IR Import panel and its explicit Choose / Validate / Send steps.
- User parameter is initialized to `71`, as used by the successful User import test.
- Transfer remains `10/09/11` and 75 frames.
- No `09/00` active-name readback query is present.
- NAM handling, native USB-MIDI plugin and MIDI mapping are taken from the same baseline commit.

## Trade-off

This intentionally restores the separate IR Import page from the known-good baseline rather than the newer merged NAM & IR / Collection UI. This is a controlled recovery test, not a claim that the current merged UI has been repaired. Once User import succeeds again, port the known-good User import interaction into the merged app separately.

## Verification

CI syntax checks and Android build demonstrate that the baseline packages. Physical transfer must still be confirmed on the user's original MG-30 Gen 2 before calling it recovered.
