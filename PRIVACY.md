# MG30 Studio Community Edition — Privacy Notice

Last updated: 7 November 2026

This notice describes the data handling visible in the MG30 Studio application source currently prepared for release. It is a technical disclosure, not legal advice. The behavior of a future APK must be checked against its final generated Android manifest and release build before publication.

## 1. App operator and contact

MG30 Studio is an independent community project. It is not affiliated with, endorsed by, or supported by NUX/Cherub Technology.

For questions about this notice or the application, use the repository's GitHub Issues page:
https://github.com/Vaivaii/Nuxmg30-web-app/issues

Do not post passwords, access tokens, private API keys, preset backups, or other sensitive data in public issues.

## 2. Data stored on your device

The application stores settings and working data in the app's WebView `localStorage`. The inspected source includes:
- Preset drafts, selected slot, effect/model state, Signal Chain order and favorites.
- NAM slot labels, User IR name, and the mapping between IR Collection entries and preset slots.
- TONE3000 client/publishable key, redirect configuration, selected tone/model, catalogue cache, OAuth state and PKCE verifier, access token, refresh token and token expiry.
- A YouTube Data API key if you choose to enter and save one.

The application source stores these TONE3000 OAuth tokens and the YouTube API key in WebView local storage; the inspected implementation does not show an app-specific encryption layer for those values. Protect your Android device and do not share its app data. Use the TONE3000 disconnect control to clear the stored TONE3000 credentials. Use the YouTube API key clear control to remove the saved YouTube key.

Preset, NAM, IR and other working data may also be held temporarily in application memory or local cache while an operation is in progress. The app's native DAW export plugin stages temporary export files in the app cache and deletes them after a successful export or cancellation.

## 3. Optional third-party network services

The app does not require you to use the following optional online integrations for basic local MG-30 editing.

### TONE3000

If you configure and use TONE3000 NAM import, the app opens TONE3000's authorization flow and communicates directly with `https://www.tone3000.com/api/v1`. Depending on the actions you take, this can transmit your TONE3000 client/publishable key, OAuth authorization code or refresh token, access token, selected tone/model identifiers, and requests to retrieve model catalogue information or model files. The app uses OAuth with a PKCE verifier.

TONE3000 handles its own account, authorization, API and service-side data under its own policies and terms. Review the TONE3000 documentation and terms before connecting an account:
- https://www.tone3000.com/api
- https://www.tone3000.com/api/terms

You can disconnect TONE3000 from the app settings; the app's sign-out routine clears its locally stored tokens and related OAuth state.

### YouTube

If you configure YouTube Data API v3 and search or play a video, the app sends the search text and your configured API key to Google's YouTube Data API. If you play a video, the app loads the YouTube privacy-enhanced embed host at `youtube-nocookie.com`. Google/YouTube may process request data, device/network information and viewing activity under their own policies.

The YouTube API key is saved locally on the device until you clear it. Review Google's policies:
- https://policies.google.com/privacy
- https://www.youtube.com/t/terms

### Other external links

The app contains links to external service documentation and developer-console pages. Opening these links transfers control to the browser or the relevant external service, which applies its own privacy practices.

## 4. USB-MIDI and connected MG-30 hardware

When you connect a compatible original NUX MG-30 Gen 2 over USB, the app communicates with the connected device through Android USB-MIDI/native MIDI functionality. Preset, parameter, NAM and IR transfers are intended to take place between the app and the connected pedal. The inspected implementation does not show these USB-MIDI messages being sent to an MG30 Studio-operated server.

Only connect hardware you trust. Back up pedal presets before bulk writes. Import All and Export All remain under validation and should not be treated as fully verified.

## 5. Microphone and audio recording

The Android initializer explicitly adds the `android.permission.RECORD_AUDIO` permission. The native audio plugin requests microphone permission when you start a recording. The implementation attempts to select the USB audio input from the connected NUX/USB audio device; it includes a generic USB-input fallback for normal capture. It reports an error rather than intentionally switching to the phone microphone when the MG-30 USB audio device is detected but cannot be routed as required.

Audio takes are written to app-managed local storage/cache and can be exported by the user through Android's system document picker. Recording is user-initiated. The app should not be granted microphone permission unless you intend to use recording features.

## 6. Camera

The current inspected Android initializer explicitly adds the microphone permission and USB-host feature; it does not explicitly add a camera permission. The inspected source references a native Camera2 UI, but a complete camera capture implementation and final merged manifest were not established in this source audit. Therefore this notice does not claim that camera capture is active or describe camera data handling. Camera behavior and permissions must be re-audited against the actual release APK before enabling or advertising that feature.

## 7. Diagnostics, analytics and crash reports

The app includes user-visible diagnostic information for some device/export operations, and provides controls to copy diagnostic text. The app operator does not receive those diagnostics automatically in the inspected code; users may choose to share them when asking for help. Review diagnostic text before sharing it because it may contain device-operation details.

No app-operator analytics or telemetry SDK was identified in the inspected direct dependency list or source paths reviewed for this notice. This is not a guarantee about every transitive dependency or Android platform component; the final dependency tree and APK still require review.

## 8. Data sharing and retention

MG30 Studio does not operate a project backend in the inspected implementation. Optional TONE3000 and YouTube requests go directly from the app to those providers. Those providers may retain and process data under their own policies.

Local app data generally remains on the device until you clear it, clear the app's storage, or uninstall the app. Exported files remain wherever you choose to save them. Uninstalling or clearing app data may permanently remove local presets, settings, credentials and unsaved takes; export/backup anything you need first.

## 9. Security

The app uses HTTPS for the identified TONE3000 and Google API requests. OAuth credentials and the optional YouTube key are currently stored in WebView local storage, not an app-specific encrypted vault. Keep your device protected, avoid installing modified builds from untrusted sources, and disconnect third-party accounts on shared devices.

Do not send signing keystores, passwords, OAuth tokens, API keys or private preset/IR files through public issue reports.

## 10. Changes to this notice

This notice must be updated when the app adds or changes network services, permissions, local storage, analytics, diagnostics, camera or audio behavior. The release version should link to the notice corresponding to that exact build.

## Release-audit status

This notice is based on source inspection of the release-preparation branch and the Android initializer/native plugins. It is not a substitute for inspecting the final merged Android manifest, dependency/SBOM output, network behavior and APK contents. The release checklist keeps those final-build checks as publication gates.
