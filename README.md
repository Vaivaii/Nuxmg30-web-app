# NUX MG30 Studio — Web Test

A mobile-friendly prototype for experimenting with tone-chain layouts and local preset drafts.

## Try it

After GitHub Pages deployment succeeds, open:

https://vaivaii.github.io/Nuxmg30-web-app/

## Deploy

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`. In GitHub, open **Settings → Pages** and make sure the build/deployment source is set to **GitHub Actions**. Each commit to `main` that changes the site triggers a deployment.

## Safety and current limitations

- Tone controls, block switches, and presets are local drafts in this browser; no MIDI Control Change messages are sent.
- The app does not write, save, or commit data to a physical MG-30.
- Browser Web MIDI support varies, especially on Android.
- The protocol notes available for this project were reverse-engineered from firmware 5.0.2 and are not official documentation. Compatibility with NUX MG-30 GEN2 has not been verified on hardware.
- This project is independent and is not affiliated with NUX.

## Local data

Drafts are stored in the browser's local storage. Export JSON backups before clearing browser data or changing devices.
