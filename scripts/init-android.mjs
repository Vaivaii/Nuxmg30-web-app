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
  'import android.os.Bundle;',
  'import com.getcapacitor.BridgeActivity;',
  '',
  'public class MainActivity extends BridgeActivity {',
  '    @Override',
  '    public void onCreate(Bundle savedInstanceState) {',
  '        registerPlugin(MG30AudioPlugin.class);',
  '        super.onCreate(savedInstanceState);',
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

run(['cap', 'sync', 'android']);
console.log('MG30 Studio Android platform ready. USB audio plugin installed; hardware audio compatibility still needs a real-device test.');
