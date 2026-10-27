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

const mainActivityLines = [
  'package com.vaivaii.mg30studio;',
  '',
  'import android.graphics.Color;',
  'import android.os.Build;',
  'import android.os.Bundle;',
  'import android.view.WindowManager;',
  'import com.getcapacitor.BridgeActivity;',
  '',
  'public class MainActivity extends BridgeActivity {',
  '    @Override',
  '    public void onCreate(Bundle savedInstanceState) {',
  '        registerPlugin(MG30AudioPlugin.class);',
  '        super.onCreate(savedInstanceState);',
  '        applySystemBars();',
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
if (!manifest.includes('android.permission.RECORD_AUDIO')) {
  manifest = manifest.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-feature android:name="android.hardware.usb.host" android:required="false" />');
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
      '<item name="android:windowLightNavigationBar">false</item>'
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

run(['cap', 'sync', 'android']);
console.log('MG30 Studio Android platform ready. USB audio plugin installed; hardware audio compatibility still needs a real-device test.');
