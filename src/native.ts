/**
 * The Android app (Capacitor) wraps the same web build. Everything here is a no-op in
 * the browser; native plugins are imported lazily so the web bundle never waits on them.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

const KEY = 'weekplate:v1';

/**
 * The WebView's localStorage is the working copy, but Android may clear WebView storage
 * (low space, "clear cache" from some cleaners), so the app also keeps its data in its
 * own private SharedPreferences. On start-up the newer of the two wins.
 */
export async function restoreNativeData(): Promise<void> {
  if (!isNative) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: KEY });
    const local = localStorage.getItem(KEY);
    if (value && (!local || savedAt(value) > savedAt(local))) localStorage.setItem(KEY, value);
  } catch {
    // Fall back to whatever the WebView still has.
  }
}

const savedAt = (raw: string): number => {
  try {
    return Number((JSON.parse(raw) as { savedAt?: number }).savedAt) || 0;
  } catch {
    return 0;
  }
};

let pending: string | null = null;
let timer: number | undefined;

/** Mirror a save into SharedPreferences, batched so dragging a slider doesn't write 50 times. */
export function persistNative(raw: string): void {
  if (!isNative) return;
  pending = raw;
  window.clearTimeout(timer);
  timer = window.setTimeout(flush, 400);
}

async function flush(): Promise<void> {
  if (pending === null) return;
  const value = pending;
  pending = null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: KEY, value });
  } catch {
    // Still in localStorage; the next save retries.
  }
}

/** Share text through Android's share sheet (the WebView has no navigator.share). */
export async function shareText(title: string, text: string): Promise<void> {
  const { Share } = await import('@capacitor/share');
  await Share.share({ title, text, dialogTitle: title });
}

/**
 * Android back button: close the open sheet or swipe deck first (they all close on
 * Escape), then go back to the Plan tab, then leave the app.
 */
export async function setupNativeShell(): Promise<void> {
  if (!isNative) return;
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    if (document.querySelector('.overlay, .swipe-overlay')) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    } else if (location.hash && location.hash !== '#plan') {
      location.hash = '#plan';
    } else {
      App.exitApp();
    }
  });
  // Save right away when the app goes to the background — it may be killed there.
  App.addListener('pause', () => void flush());

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const sync = async () => {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      await StatusBar.setBackgroundColor({ color: dark ? '#111612' : '#f6f1e7' });
    };
    await sync();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => void sync());
  } catch {
    // Older Android versions ignore the colour call.
  }
}
