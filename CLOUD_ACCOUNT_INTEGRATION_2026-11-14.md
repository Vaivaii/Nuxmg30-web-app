# Cloud Account Integration — 14 November 2026

## Scope
Implemented the first isolated Cloud Account authentication UI layer on branch `feature/cloud-account-auth`, based on `feature/amp-knob-label-correction-artwork`.

## Changes
- Added `cloud-account.js`.
- Mounted the Cloud Account panel at the top of the existing Device page through a separate script include in `index.html`.
- Login calls the personal Worker endpoint `/auth/login`.
- Existing sessions are checked with `/auth/me`.
- Disconnect clears the locally stored app token and username.
- The password is never persisted by this module.
- Provider API keys remain server-side; this stage does not expose provider secrets to the app.

## Isolation / regression guardrails
- The new module does not call Web MIDI, SysEx, NAM, IR, preset, or MIDI mapping functions.
- Existing Device controls and Manual API settings are not removed or rewritten.
- USB-MIDI and local editor behavior do not depend on Cloud login.
- Target remains original NUX MG-30 Gen 2 firmware 6.0.x, not MKII.

## Current implementation status
- Cloudflare Worker login and token validation were manually confirmed by the user as returning `true`.
- Source changes have been committed to `feature/cloud-account-auth`.
- Build, browser runtime, mobile WebView, login UI, and offline regression have **not yet been executed** in this environment.
- No APK has been built or installed from this branch.
- Token is stored in app localStorage for this initial web/PWA integration. Before production release, review Android secure-storage requirements and token expiry/revocation policy.

## Next validation
1. Run `npm test` and `npm run build`.
2. Test Device page layout on desktop and Android WebView.
3. Test successful login, invalid credentials, expired token, and disconnect.
4. Verify Cloud login failure/offline does not affect USB-MIDI, NAM, IR, preset operations, or MIDI mappings.
5. Keep Manual API selection and credentials independent from Cloud Account; implement explicit source selection before adding any provider invocation.
6. Add authenticated Worker endpoints for profile/configuration only after the app login flow is validated.

## Change record
- Branch: `feature/cloud-account-auth`
- Base branch: `feature/amp-knob-label-correction-artwork`
- Commits:
  - `abd7ac5` Add isolated Cloud Account login module
  - `31ec005` Mount Cloud Account panel on Device page
