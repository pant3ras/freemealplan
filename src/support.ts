/**
 * Support links and the forms (feedback, recipe ideas). The app has no internet permission,
 * so nothing is sent by the app itself: a form opens the phone's mail app with the text
 * already filled in, and the person presses Send there.
 */
import { isNative } from './native';

/** Where submissions go. */
export const SUPPORT_EMAIL = 'pant3ras+weekplan@gmail.com';
export const DONATE_URL = 'https://buymeacoffee.com/panteras';

export function mailtoUrl(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Open a web page in the system browser (Custom Tabs on Android, a new tab on the web). */
export async function openLink(url: string): Promise<void> {
  if (isNative) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/** Hand a mailto link to the mail app. */
export function openMail(url: string): void {
  window.location.href = url;
}
