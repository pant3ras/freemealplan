/**
 * Builds the Android app end to end: tests + web bundle -> Capacitor copy -> Gradle.
 *
 * The steps are welded together on purpose: Gradle on its own happily packages whatever
 * web bundle was last copied into android/, and the phone then shows an old screen.
 *
 *   node scripts/build-apk.mjs                 -> debug APK (sideload)
 *   node scripts/build-apk.mjs assembleRelease -> release APK (needs a signing config)
 *   node scripts/build-apk.mjs bundleRelease   -> release AAB for the Play Store
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');

if (!existsSync(androidDir)) {
  console.error('No android/ project yet. Run:  npx cap add android && node scripts/generate-icons.mjs');
  process.exit(1);
}

function step(label, command, cwd = root) {
  console.log(`\n==> ${label}`);
  const r = spawnSync(command, { cwd, stdio: 'inherit', shell: true });
  if (r.error || r.status !== 0) {
    console.error(`\n${label} failed — not building an APK.`);
    process.exit(r.status ?? 1);
  }
}

step('Running the engine tests', 'npm test');
step('Building the web bundle', 'npm run build');

// Capacitor copies over the top and never deletes, so old hashed bundles would pile up in the APK.
const webAssets = join(androidDir, 'app', 'src', 'main', 'assets', 'public');
rmSync(webAssets, { recursive: true, force: true });
step('Copying the web bundle into the Android project', 'npx cap sync android');

const task = process.argv[2] ?? 'assembleDebug';
if (!/^[A-Za-z][A-Za-z0-9:_-]*$/.test(task)) {
  console.error(`Refusing to run an unexpected Gradle task name: ${task}`);
  process.exit(1);
}
// Node won't spawn a .bat directly, so Windows goes through the shell with a quoted absolute path.
const wrapper = join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
step(`Running Gradle (${task})`, `"${wrapper}" ${task}`, androidDir);

// Prove the packaged UI is the one just built.
const entry = (dir) => readFileSync(join(dir, 'index.html'), 'utf8').match(/assets\/(index-[^"']+\.js)/)?.[1];
const built = entry(join(root, 'dist'));
const packaged = entry(webAssets);
if (built !== packaged) {
  console.error(`\nThe APK does not contain the UI just built (built ${built}, packaged ${packaged}).`);
  process.exit(1);
}

if (task === 'assembleDebug') {
  const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  console.log(`\nAPK ready (UI ${built}):\n  ${apk}\n\nInstall on a phone over USB:  adb install -r "${apk}"\n`);
}
