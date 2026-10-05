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
    console.log("[AppUpdater] Starting update check...");

    // 1. Get installed app version
    console.log("[AppUpdater] Getting installed version...");
    const info = await App.getInfo();
    const installedVersionCode = (info as any).versionCode || 0;
    console.log(`[AppUpdater] Installed versionCode: ${installedVersionCode}`);

    // 2. Fetch remote version config
    console.log(`[AppUpdater] Fetching remote version from: ${VERSION_CHECK_URL}`);
    const response = await fetch(VERSION_CHECK_URL, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    console.log(`[AppUpdater] Response received: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.warn("[AppUpdater] Version check failed: Server response not ok");
      return { shouldUpdate: false, versionData: null, isForced: false };
    }

    const text = await response.text();
    console.log("[AppUpdater] Raw response text:", text);

    let remote: AppVersion;
    try {
      remote = JSON.parse(text);
    } catch (e) {
      console.error("[AppUpdater] Failed to parse JSON:", e);
      return { shouldUpdate: false, versionData: null, isForced: false };
    }

    // Validate JSON structure
    if (!remote || typeof remote.versionCode === 'undefined' || !remote.apkUrl) {
      console.warn("[AppUpdater] Malformed version JSON received");
      return { shouldUpdate: false, versionData: null, isForced: false };
    }

    console.log(`[AppUpdater] Remote version: ${remote.versionCode} (${remote.versionName})`);

    // 3. Compare versions
    if (remote.versionCode > installedVersionCode) {
      console.log("[AppUpdater] Update found!");
      return {
        shouldUpdate: true,
        versionData: remote,
        isForced: remote.forceUpdate,
      };
    }

    console.log("[AppUpdater] App is up to date.");
  } catch (error) {
    console.error("[AppUpdater] Critical error during update check:", error);
  }

  return { shouldUpdate: false, versionData: null, isForced: false };
}

export async function dismissUpdate(versionCode: number): Promise<void> {
  await Preferences.set({
    key: DISMISS_KEY,
    value: String(versionCode),
  });
}
