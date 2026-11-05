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

The USB recorder tries 48 kHz and PCM 32-bit integer first, because Android's USB audio host documentation defines the common UAC representation of 24 useful bits left-justified in a 32-bit word. When routed successfully, the app packs those samples into integer PCM 24-bit WAV. It only continues when Android reports the active input route is USB; it never silently accepts the phone microphone. Some Android builds may still refuse the route. In that case the next engineering step is a direct USB Audio Class driver rather than another metadata-only change.

Fallback sources include PCM float or PCM 16-bit where the Android HAL exposes those formats. The saved file remains integer PCM 24-bit WAV, but its effective source resolution and bit-perfect status depend on the actual capture path, so the app reports which source format it used.

## Backing and YouTube behaviour

A local MP3/WAV file is loaded as the separate backing source. YouTube search opens the official search page; paste a video URL to play it in the embedded official player. The app does not extract/download YouTube audio into a track. Search-result listings inside the Studio UI would require a separately configured YouTube Data API integration.

## Current limitations

- No automated device test has run against a physical MG-30 or Android phone in this environment.
- Takes are listed in the current Studio session; persistent take-library browsing/export is a follow-up.
- The sample uses native Android AudioRecord. Some USB audio interfaces require a specialised USB Audio Class driver; if MG-30 does not appear as a routed USB input on the target handset, use that result to plan a dedicated USB host audio engine rather than silently recording the phone microphone.
- Existing preset and SysEx code is copied into \`www/index.html\` as an APK bundle baseline and remains unchanged in the repository root.


## Recording storage, take management, export

- Tapping Stop ends the recording and writes a WAV into the app-specific Music directory. The take list is reloaded from that directory when Studio opens, so it survives closing/reopening the app.
- Use the pencil icon on a take to rename the underlying WAV file.
- Use the download/export icon to copy a take to a user-selected folder via Android's Save dialog. The original in app storage stays in place.
- The main recorder transport uses custom Record / Play / Stop controls. The browser's native audio controls (including its download menu) are intentionally hidden to keep the UI compact.
