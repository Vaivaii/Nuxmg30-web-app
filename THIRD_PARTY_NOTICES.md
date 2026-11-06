# Third-Party Notices — MG30 Studio

This inventory covers only the direct npm dependencies declared in the current `package.json`. The project has no `package-lock.json` yet, so the exact resolved versions and the complete transitive dependency tree are not pinned here. This file is therefore a preliminary direct-dependency inventory, not a complete SBOM or final APK notice.

| Direct package | Declared version range | License reported by package metadata | Upstream |
|---|---:|---|---|
| `@capacitor/android` | `^8.5.3` | MIT | https://github.com/ionic-team/capacitor |
| `@capacitor/core` | `^8.5.3` | MIT | https://github.com/ionic-team/capacitor |
| `@capacitor/app` | `^8.0.0` | MIT | https://github.com/ionic-team/capacitor-plugins |
| `@capacitor/browser` | `^8.0.0` | MIT | https://github.com/ionic-team/capacitor-plugins |
| `@capacitor/status-bar` | `^8.0.0` | MIT | https://github.com/ionic-team/capacitor-plugins |
| `@capacitor/cli` | `^8.5.3` | MIT | https://github.com/ionic-team/capacitor |
| `vite` | `^7.1.7` | MIT | https://github.com/vitejs/vite |
| `typescript` | `^5.9.3` | Apache-2.0 | https://github.com/microsoft/TypeScript |

The package metadata sources reviewed for this preliminary inventory are linked below:
- https://www.npmjs.com/package/@capacitor/android
- https://www.npmjs.com/package/@capacitor/core
- https://www.npmjs.com/package/@capacitor/app
- https://www.npmjs.com/package/@capacitor/browser
- https://www.npmjs.com/package/@capacitor/status-bar
- https://www.npmjs.com/package/@capacitor/cli
- https://www.npmjs.com/package/vite
- https://www.npmjs.com/package/typescript

## Required before public APK publication

- Generate and commit `package-lock.json` from the approved source tree.
- Install from that lockfile with `npm ci`.
- Generate a complete dependency license inventory/SBOM for all production and build-time dependencies, including transitive npm packages and Android/Gradle dependencies.
- Check bundled fonts, images, artwork, icons, model data, and other assets individually. A package's MIT or Apache-2.0 license does not grant rights to unrelated assets.
- Include required upstream copyright and license notices in the distributed source/APK package where required.
- Re-run the inventory whenever dependency versions change.

The project-level `LICENSE` is GPL-3.0-only. That license does not replace the individual license terms of third-party components.
