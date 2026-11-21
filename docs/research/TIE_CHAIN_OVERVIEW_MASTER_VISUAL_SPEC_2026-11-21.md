# Chain Overview — Master Visual Specification

PROJECT: MG30 Studio / NUX MG-30 Gen 2
MILESTONE: Phase 4 — Chain Overview Visual Approval
STATUS: IN PROGRESS
MASTER IMAGE: user-uploaded `1001023663.png`
MASTER RASTER: 1024 × 1536 px (2:3 portrait)

## 1. Viewport lock and evidence limitations

The supplied master raster is 1024 × 1536 pixels. Use this exact output raster size and aspect ratio for image-normalized visual comparison. The file contains no reliable Android display-density, WebView logical viewport, font-scale, status-bar inset, or safe-area metadata. Those values cannot be inferred from the raster alone and must not be invented.

For an actual Android comparison, record the runtime logical viewport (`window.innerWidth`, `window.innerHeight`), `window.devicePixelRatio`, `visualViewport.scale`, Android font/display scaling and safe-area insets. Normalize the actual app screenshot to 1024 × 1536 only for image-difference computation; do not stretch its UI independently to make a poor layout look correct.

The coordinate bands below are visual measurements from the master raster and are intended as layout anchors (not a claim of subpixel-perfect edge detection). The next required proof is an actual screenshot of the new APK at the locked raster, followed by overlay and difference-image analysis.

## 2. Page composition and landmark map

| Region | Approximate master bounds (x, y, w, h) | Required content / hierarchy |
|---|---:|---|
| Global status/system chrome | y 0–43 | Android status time, connection icons and battery; not app-authored |
| Global MG-30 header | x 0–1024, y 43–121 | NUX wordmark, MG-30 GEN2 identity, MOBILE EDITOR, USB MIDI state and connection action |
| Studio heading | x 35–989, y 121–212 | STUDIO eyebrow, large Tone Analysis title, right-aligned TIE - 5 Sections pill, subtle lower divider; no separate filled black header card |
| Workspace selector | x 35–989, y 227–302 | Two equal segments: Jamm & Record (left) and Tone Analysis (right, active lime outline) |
| Tone Analysis navigation | x 35–989, y 312–396 | Five equal icon/title destinations: Analyzer, Compare, Chain (active), Intel, AI; single rounded bordered surface |
| Chain main surface | x 35–989, y 411–1388 | One large blue-charcoal/teal surface with rounded corners, subtle border and inset highlight |
| Chain title row | x 60–966, y 429–481 | 03 / SIGNAL CHAIN and Signal Chain Intelligence on left; LIVE FROM DEVICE badge on right when verified |
| Preset identity card | x 60–966, y 506–604 | Single compact horizontal card: preset icon, preset name + slot/Scene, device name/status, small refresh action |
| Pedalboard | x 68–960, y 632–761 | Actual ordered effect blocks; category-colored pedal tiles, icon, label, model, ON/BYPASS, chevron connectors; horizontal overflow for later blocks |
| Selected Block | x 60–966, y 790–1254 | One deep inset card; section/state header, model identity on left, model artwork on right, Key Parameters, first five knobs, paging controls |
| Configuration Review entry | x 60–966, y 1281–1373 | One horizontal lime-accent card with icon, title/description, status pill and right chevron |
| Bottom navigation | x 0–1024, y 1404–1536 | Five persistent destinations: Editor, NAM & IR, Presets, Studio (active), Device |

## 3. Main surface proportions

- Main surface occupies approximately 93.2% of raster width and 63.6% of raster height.
- Main surface inner cards share an aligned left/right inset of approximately 25 px from its outer edge.
- Main surface uses a dark navy/teal charcoal treatment, subtle border, rounded corners and restrained internal highlight. It must not become a flat black slab or a uniformly green panel.
- Vertical order is fixed: title row → preset card → pedalboard → Selected Block → Configuration Review entry.
- The screenshot has a compact, dense vertical rhythm; do not insert a new status banner between preset card and pedalboard.

## 4. Preset identity card

- Single horizontal card; no second visible status/error panel.
- Left: square rounded preset-grid icon with lime line-art identity.
- Centre: preset name; beneath it, actual preset slot and active Scene.
- Right: vertical divider, device identity, green/amber/unavailable status, small rounded refresh icon button.
- Device status text and readback provenance remain data-driven. Local Draft must not be presented as LIVE FROM DEVICE or Connected.
- Refresh messages are announced through the existing toast/snackbar layer and an off-screen live region. They must not change card height or push page content.

## 5. Pedalboard

- Actual block order and model/bypass state come from the existing shared Editor/device snapshot.
- Target first view demonstrates six visible tiles: WAH, EFX, S/R, GATE, AMP, IR. This is a visual example only; do not force exactly six blocks or invent block data when the actual preset differs.
- Approximately 120 px wide × 128 px high per tile in master raster, with consistent spacing and a small chevron connector between actual blocks.
- Category colors: WAH purple; EFX cyan/blue; S/R yellow; GATE turquoise; AMP red; IR cyan. The application’s existing remaining category tokens continue to apply to additional actual block types.
- SVGs must reuse `window.MG30EditorBlockIcon`, preserve the Editor glyph paths and render via stroke/currentColor (no emoji, replacement glyph or arbitrary CSS filter).
- Selected state strengthens the category outline; bypass dims the tile while retaining its category identity.

## 6. Selected Block and artwork

- Card header: SELECTED BLOCK at upper left and ON/BYPASS at upper right.
- Two-column information/artwork row: text/model details on the left; matching local Editor model artwork on the right. The artwork shown by the master is the existing Deluxe Rvb / Fender-style amplifier vector asset; use the current block/model renderer, not a generic substitute.
- Preserve model, type and state labels sourced from the current snapshot.
- Key Parameters is a distinct uppercase lime label with a fine separator extending to the right.
- Five complete rotary knobs are visible at the initial scroll position. Further parameters are reachable horizontally.
- Knob appearance must reuse the Editor `.knob`, `.dial-control`, `.dial`, `.dial-needle`, `.dial-cap` and `.knob-value` visual structure/definition. The TIE renderer is read-only: do not attach Editor drag/keyboard/write behavior or use role=slider.
- Values and angles come only from the existing model parameter definitions and snapshot values.

## 7. Parameter carousel

- The first viewport contains exactly five complete knob units (dial, label, numeric value).
- Previous/next circular controls sit at the left/right edges of the knob rail.
- Five-parameter pages are navigated by the horizontal swipe/scroll gesture; do not wrap parameters into a second row.
- Dots below indicate the current five-parameter page; the master shows three dots for the current parameter set.
- Right-aligned “Swipe for more parameters” hint and lime arrow appear below the knob rail.
- For fewer than six available controls, do not create extra fake knobs or false additional pages. Hide/neutralize unavailable paging affordances rather than inventing data.

## 8. Configuration Review entry and navigation

- Entry card is compact and horizontal: icon, title, description, actual source/read status, chevron.
- Tap opens the existing separate Configuration Review screen. It must not expand below Chain Overview or scroll to a hidden section.
- This milestone does not redesign Overview/Chain/Gain/Tone/Report. Keep their current implementation untouched except for shared navigation wiring required by the entry card.

## 9. Shared Editor design system

Reuse, do not approximate, the Editor’s existing:
- Category SVG renderer and shared category token map.
- Model artwork renderer.
- Rotary dial markup and surface/needle styling.
- Lime accent, dark charcoal card surfaces, border treatment, typography and active-control treatment.

The master uses a blue/teal-biased dark surface while Editor is the component/design-system source. Scope any master-specific surface adjustments to the Chain Overview page; do not globally recolor the app or alter unrelated Studio/Editor surfaces.

## 10. Refresh functional contract and identified source bug

Existing device readback boundary is `MG30AIToneBridge.refreshSignalChainSnapshot()`, which:
1. Requires an active USB-MIDI connection.
2. Waits for device idle.
3. Calls the existing `readActiveBuffer({preserveDraftName:true})`.
4. Reads actual signal-chain routing mode (best-effort).
5. Returns the updated shared snapshot.

No new device-write operation is allowed.

Source audit found a UI feedback/layout bug in `www/tie-signal-chain-ui.js`: success and error branches replace the visually-hidden `tieChainStatus` class with visible `tie-chain-status` classes. This injects a new visible status block after refresh and changes the Chain Overview height. Correct by retaining the off-screen live-region class and showing success/error feedback only through the existing shared toast, with a single-flight guard against rapid refresh attempts.

Required refresh tests: connected success updates preset/scene/order/state/model/parameters; disconnected rejects without write; read failure preserves last known snapshot and layout; rapid taps cause only one readback; success/error feedback does not change DOM layout dimensions.

## 11. Current repository audit and gaps

Remote branch at audit: `feature/tone-intelligence-engine`, HEAD `6b57690398be4e6796540250619e3b5d1012f123`. Remote GitHub view does not establish local working-tree cleanliness; that remains unverified.

Confirmed existing reusable pieces:
- Studio shell already retains global application header, Jamm & Record / Tone Analysis selector and five Tone Analysis destinations.
- Shared snapshot bridge and original active-preset readback function are available.
- Shared category SVG renderer and per-model local gear artwork renderer are available.
- Shared Editor model parameter catalog provides actual model values.
- Configuration Review already opens as a separate replacement screen.

Gaps to address in Chain Overview only:
1. Current TIE knob markup is a custom 39 px pseudo-dial, not the Editor rotary dial markup.
2. Current parameter rail has no explicit left/right arrow controls, five-page dots or master swipe hint.
3. Current CSS makes knob columns 58 px and does not enforce five complete controls in the initial viewport.
4. Selected Block artwork/text column ratio and card proportions do not match the master.
5. Pedal tile sizing and main vertical rhythm need master-specific refinement.
6. Refresh visible status class mutation violates the fixed-card contract.

## 12. Protected boundaries / acceptance

Do not modify:
- MG-30 Gen 2 protocol / firmware communication.
- MIDI CC or block parameter mappings.
- Preset codec / load / save / import / export.
- NAM transfer/selection and the working NAM feature.
- IR User / Third Party import and IR Collection mapping.
- AI provider orchestration, DSP algorithms, audio capture/playback, DAW, Quick Record, USB loopback or device management.

No Phase 5 or Configuration Review detail-page redesign is authorized by this milestone.

CHAIN OVERVIEW remains **IN PROGRESS — VISUAL APPROVAL PENDING** until a runtime Android screenshot is overlaid/diffed against this master, all relevant regressions pass, and the owner approves the result.
