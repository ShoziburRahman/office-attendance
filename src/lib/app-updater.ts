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

const VERSION_CHECK_URL = 'https://stampkini.netlify.app/api/app-version';

export async function checkAppUpdate(): Promise<UpdateCheckResult> {
  // Updates are currently disabled.
  return { shouldUpdate: false, versionData: null, isForced: false };
}
