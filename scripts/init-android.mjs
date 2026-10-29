import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const androidDir = resolve(root, 'android');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args) => execFileSync(npx, args, { cwd: root, stdio: 'inherit' });

if (!existsSync(androidDir)) {
  run(['cap', 'add', 'android']);
}

const javaDir = resolve(androidDir, 'app/src/main/java/com/vaivaii/mg30studio');
mkdirSync(javaDir, { recursive: true });
copyFileSync(resolve(root, 'native-android/MG30AudioPlugin.java'), resolve(javaDir, 'MG30AudioPlugin.java'));
copyFileSync(resolve(root, 'native-android/MG30MidiPlugin.java'), resolve(javaDir, 'MG30MidiPlugin.java'));

const mainActivityLines = [
  'package com.vaivaii.mg30studio;',
  '',
  'import android.graphics.Color;',
  'import android.os.Build;',
  'import android.os.Bundle;',
  'import android.view.WindowManager;',
  'import androidx.core.view.WindowCompat;',
  'import com.getcapacitor.BridgeActivity;',
  '',
  'public class MainActivity extends BridgeActivity {',
  '    @Override',
  '    public void onCreate(Bundle savedInstanceState) {',
  '        registerPlugin(MG30AudioPlugin.class);',
  '        registerPlugin(MG30MidiPlugin.class);',
  '        super.onCreate(savedInstanceState);',
  '        applySystemBars();',
  '        getWindow().getDecorView().post(this::applySystemBars);',
  '    }',
  '',
  '    @Override',
  '    public void onResume() {',
  '        super.onResume();',
  '        applySystemBars();',
  '    }',
  '',
  '    private void applySystemBars() {',
  '        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {',
  '            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);',
  '            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);',
  '            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);',
  '            getWindow().setStatusBarColor(Color.rgb(11, 16, 18));',
  '            getWindow().setNavigationBarColor(Color.rgb(11, 16, 18));',
  '            getWindow().getDecorView().setSystemUiVisibility(0);',
  '        }',
  '    }',
  '}'
];
writeFileSync(resolve(javaDir, 'MainActivity.java'), mainActivityLines.join('\n') + '\n', 'utf8');

const manifestPath = resolve(androidDir, 'app/src/main/AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
const requiredEntries = [
  ['android.permission.RECORD_AUDIO', '    <uses-permission android:name="android.permission.RECORD_AUDIO" />'],
  ['android.hardware.usb.host', '    <uses-feature android:name="android.hardware.usb.host" android:required="false" />']
];
for (const [marker, entry] of requiredEntries) {
  if (!manifest.includes(marker)) manifest = manifest.replace(/(<manifest\b[^>]*>)/, '$1\n' + entry);
}
manifest = manifest.replace(/<application\b[^>]*>/, tag => {
  const clean = tag.replace(/\sandroid:icon="[^"]*"/g, '').replace(/\sandroid:roundIcon="[^"]*"/g, '');
  return clean.replace(/>$/, ' android:icon="@drawable/ic_launcher" android:roundIcon="@drawable/ic_launcher">');
});

// TONE3000 OAuth callback for native Android. The URI must also be registered in
// the TONE3000 developer settings before the native Select flow can complete.
if (!manifest.includes('android:scheme="mg30studio"')) {
  manifest = manifest.replace(/(<activity\b(?=[^>]*android:name="[^"]*MainActivity")[^>]*>[\s\S]*?)(<\/activity>)/, (whole, start, end) =>
    start + '\n            <intent-filter>\n' +
    '                <action android:name="android.intent.action.VIEW" />\n' +
    '                <category android:name="android.intent.category.DEFAULT" />\n' +
    '                <category android:name="android.intent.category.BROWSABLE" />\n' +
    '                <data android:scheme="mg30studio" android:host="oauth" android:pathPrefix="/callback" />\n' +
    '            </intent-filter>\n        ' + end
  );
}

// The selected native redirect URI must also be registered on the TONE3000 API key.
// Support the officially documented example scheme alongside the previous app-specific scheme.
if (!manifest.includes('android:scheme="tone3000-example"')) {
  manifest = manifest.replace(/(<activity\b(?=[^>]*android:name="[^"]*MainActivity")[^>]*>[\s\S]*?)(<\/activity>)/, (whole, start, end) =>
    start + '\n            <intent-filter>\n' +
    '                <action android:name="android.intent.action.VIEW" />\n' +
    '                <category android:name="android.intent.category.DEFAULT" />\n' +
    '                <category android:name="android.intent.category.BROWSABLE" />\n' +
    '                <data android:scheme="tone3000-example" android:host="oauth" android:pathPrefix="/callback" />\n' +
    '            </intent-filter>\n        ' + end
  );
}
writeFileSync(manifestPath, manifest, 'utf8');

const stylesPath = resolve(androidDir, 'app/src/main/res/values/styles.xml');
if (existsSync(stylesPath)) {
  let styles = readFileSync(stylesPath, 'utf8');
  const themeMatch = styles.match(/<style name="[^"]*NoActionBar[^"]*"[^>]*>[\s\S]*?<\/style>/);
  if (themeMatch) {
    let theme = themeMatch[0];
    for (const item of [
      '<item name="android:statusBarColor">#0b1012</item>',
      '<item name="android:navigationBarColor">#0b1012</item>',
      '<item name="android:windowLightStatusBar">false</item>',
      '<item name="android:windowLightNavigationBar">false</item>',
      '<item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>'
    ]) {
      const itemName = item.match(/name="([^"]+)"/)[1];
      const startTag = '<item name="' + itemName + '">';
      const itemStart = theme.indexOf(startTag);
      if (itemStart >= 0) {
        const itemEnd = theme.indexOf('</item>', itemStart);
        if (itemEnd >= 0) theme = theme.slice(0, itemStart) + item + theme.slice(itemEnd + 7);
        else theme = theme.replace('</style>', '        ' + item + '\n    </style>');
      } else {
        theme = theme.replace('</style>', '        ' + item + '\n    </style>');
      }
    }
    styles = styles.replace(themeMatch[0], theme);
    writeFileSync(stylesPath, styles, 'utf8');
  }
}


const drawableDir = resolve(androidDir, 'app/src/main/res/drawable');
mkdirSync(drawableDir, { recursive: true });
const launcherIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512">
<path android:fillColor="#FFFFFF" android:pathData="M0,0h512v512h-512z"/>
<path android:fillColor="#050505" android:pathData="M34,224 L34,289 L34,291 L70,291 L71,290 L71,250 L71,249 L125,289 L129,291 L136,291 L162,291 L162,225 L162,224 L126,224 L125,264 L123,264 L87,236 L72,226 L65,224 Z"/>
<path android:fillColor="#050505" android:pathData="M178,224 L178,274 L181,282 L188,289 L193,291 L200,291 L283,291 L287,290 L292,287 L298,280 L300,273 L300,225 L299,224 L264,224 L263,266 L262,270 L256,274 L222,274 L218,272 L216,270 L215,267 L215,225 L214,224 L179,224 Z"/>
<path android:fillColor="#050505" android:pathData="M316,224 L316,226 L316,290 L317,290 L358,259 L359,256 Z"/>
<path android:fillColor="#050505" android:pathData="M343,225 L384,256 L384,258 L343,289 L343,291 L391,291 L410,276 L429,291 L477,291 L476,289 L436,258 L436,257 L477,225 L478,224 L477,224 L429,224 L411,238 L409,237 L391,224 L343,224 Z"/>
</vector>
`;

writeFileSync(resolve(drawableDir, 'ic_launcher.xml'), launcherIcon, 'utf8');

run(['cap', 'sync', 'android']);
console.log('MG30 Studio Android platform ready. USB audio plugin installed; hardware audio compatibility still needs a real-device test.');
