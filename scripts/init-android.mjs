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
  manifest = manifest.replace(/(<activity\\b(?=[^>]*android:name="[^"]*MainActivity")[^>]*>[\\s\\S]*?)(<\\/activity>)/, (whole, start, end) =>
    start + '\\n            <intent-filter>\\n' +
    '                <action android:name="android.intent.action.VIEW" />\\n' +
    '                <category android:name="android.intent.category.DEFAULT" />\\n' +
    '                <category android:name="android.intent.category.BROWSABLE" />\\n' +
    '                <data android:scheme="mg30studio" android:host="oauth" android:pathPrefix="/callback" />\\n' +
    '            </intent-filter>\\n        ' + end
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
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
<path android:fillColor="#0B1012" android:pathData="M0,0h108v108h-108z"/>
<path android:fillColor="#C5F36B" android:pathData="M54,9 C33,9 21,25 24,43 C26,61 43,82 54,94 C65,82 82,61 84,43 C87,25 75,9 54,9Z"/>
<path android:fillColor="#0B1012" android:pathData="M54,19 C40,19 31,30 33,42 C35,54 47,70 54,78 C61,70 73,54 75,42 C77,30 68,19 54,19Z"/>
<path android:fillColor="#C5F36B" android:pathData="M29,49h12l5,-10l8,25l7,-18l4,7h14v5h-17l-2,-3l-6,16l-8,-23l-2,7h-15z"/>
<path android:fillColor="#F1F5F4" android:pathData="M30,84h48v3h-48z"/>
</vector>
`;
writeFileSync(resolve(drawableDir, 'ic_launcher.xml'), launcherIcon, 'utf8');

run(['cap', 'sync', 'android']);
console.log('MG30 Studio Android platform ready. USB audio plugin installed; hardware audio compatibility still needs a real-device test.');
