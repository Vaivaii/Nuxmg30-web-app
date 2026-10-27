# MG30 Studio APK branch

This branch intentionally isolates Android packaging and Studio experiments from the existing editor source at the repository root. The existing root \`index.html\` and its preset/SysEx implementation are not edited by the APK work.

## Build the Android project locally

Requirements: Node.js 22, Java 21, Android SDK/platform tools, and USB OTG support on the target phone.

\`\`\`bash
npm install
npm run android:init
cd android
./gradlew assembleDebug
\`\`\`

On Windows, run \`gradlew.bat assembleDebug\` from the \`android\` directory. The generated \`android/\` and \`dist/\` folders are ignored by Git; source files for the native audio bridge live in \`native-android/\`.

A GitHub Actions workflow also builds a debug APK when changes are pushed to this branch. Download the artifact named \`MG30-Studio-debug-APK\` from the workflow run.

## What is implemented in this first pass

- Capacitor 8 build configuration with a dedicated web bundle under \`www/\`.
- Studio UI for backing-file import/playback, official YouTube search/player hand-off, and separate guitar USB recording.
- Native Android USB-input enumeration, preferred USB input routing, PCM/WAV capture, and a route check that cancels recording if Android routes to the built-in microphone instead.
- WAV output is written to the app-specific Music folder. It is currently app-private storage rather than a public Music library export.

## Hardware test required

The USB audio engine is a first-pass compatibility probe, not a claim that every MG-30/Android combination works. Connect the real MG-30 over data-capable USB OTG, open the APK, tap **Tes kompatibilitas USB Audio**, then attempt a short recording. The app reports the actual Android-routed input and the capture WAV format.

Android may resample or convert the USB stream. A WAV recorded as 24-bit is not proof that the MG-30's USB transport itself was 24-bit. This first pass tries packed PCM 24-bit only if Android reports that format for the USB input, then falls back to PCM 16-bit when necessary.

## Backing and YouTube behaviour

A local MP3/WAV file is loaded as the separate backing source. YouTube search opens the official search page; paste a video URL to play it in the embedded official player. The app does not extract/download YouTube audio into a track. Search-result listings inside the Studio UI would require a separately configured YouTube Data API integration.

## Current limitations

- No automated device test has run against a physical MG-30 or Android phone in this environment.
- Takes are listed in the current Studio session; persistent take-library browsing/export is a follow-up.
- The sample uses native Android AudioRecord. Some USB audio interfaces require a specialised USB Audio Class driver; if MG-30 does not appear as a routed USB input on the target handset, use that result to plan a dedicated USB host audio engine rather than silently recording the phone microphone.
- Existing preset and SysEx code is copied into \`www/index.html\` as an APK bundle baseline and remains unchanged in the repository root.
