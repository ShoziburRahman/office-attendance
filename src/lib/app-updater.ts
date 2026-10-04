import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface AppVersion {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

export interface UpdateCheckResult {
  shouldUpdate: boolean;
  versionData: AppVersion | null;
  isForced: boolean;
}

const VERSION_CHECK_URL = 'https://attendancekini.netlify.app/api/app-version';
const DISMISS_KEY = 'app_update_dismissed_version';

export async function checkAppUpdate(): Promise<UpdateCheckResult> {
  // Only run on Android Capacitor app
  if (Capacitor.getPlatform() !== 'android') {
    return { shouldUpdate: false, versionData: null, isForced: false };
  }

  try {
    // 1. Get installed app version
    const info = await App.getInfo();
    // Capacitor App.getInfo() returns version (string).
    // For Android, we often need the native versionCode.
    // In Capacitor 6+, if versionCode isn't explicitly in AppInfo,
    // we treat the numeric part of the version string as the code,
    // or cast to any to access the platform-specific versionCode property.
    const installedVersionCode = (info as any).versionCode || 0;

    // 2. Fetch remote version config
    const response = await fetch(VERSION_CHECK_URL, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.warn('[AppUpdater] Version check failed: Server response not ok');
      return { shouldUpdate: false, versionData: null, isForced: false };
    }

    const remote: AppVersion = await response.json();

    // Validate JSON structure
    if (!remote.versionCode || !remote.apkUrl) {
      console.warn('[AppUpdater] Malformed version JSON');
      return { shouldUpdate: false, versionData: null, isForced: false };
    }

    // 3. Compare versions
    if (remote.versionCode > installedVersionCode) {
      // If it's not a forced update, check if the user already dismissed this specific version
      if (!remote.forceUpdate) {
        const { value: dismissedVersion } = await Preferences.get({ key: DISMISS_KEY });
        if (dismissedVersion === String(remote.versionCode)) {
          return { shouldUpdate: false, versionData: null, isForced: false };
        }
      }

      return {
        shouldUpdate: true,
        versionData: remote,
        isForced: remote.forceUpdate,
      };
    }
  } catch (error) {
    // Silently continue on network failure or JSON errors
    console.warn('[AppUpdater] Update check failed silently:', error);
  }

  return { shouldUpdate: false, versionData: null, isForced: false };
}

export async function dismissUpdate(versionCode: number): Promise<void> {
  await Preferences.set({
    key: DISMISS_KEY,
    value: String(versionCode),
  });
}
