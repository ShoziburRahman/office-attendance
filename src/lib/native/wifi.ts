import { Network } from '@capacitor/network';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

interface AndroidWifiPlugin {
  getWifiInfo(): Promise<{ ssid: string | null; bssid: string | null; available: boolean; error?: string }>;
}

const AndroidWifi = registerPlugin<AndroidWifiPlugin>('AndroidWifi');

export async function getWifiInfo(): Promise<WifiInfo> {
  // 1. Basic Connectivity Check
  const status = await Network.getStatus();
  if (status.connectionType !== 'wifi') {
    return { ssid: null, bssid: null };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      console.log('[WIFI DEBUG] Calling Capacitor plugin AndroidWifi.getWifiInfo()...');
      const result = await AndroidWifi.getWifiInfo();
      console.log('[WIFI DEBUG] Plugin result:', result);

      if (!result.available) {
        console.error('[WIFI DEBUG] Plugin reported unavailable:', result.error);
        return { ssid: null, bssid: null };
      }

      return {
        ssid: result.ssid,
        bssid: result.bssid,
      };
    } catch (e) {
      console.error('[WIFI DEBUG] Capacitor plugin call failed:', e);
      return { ssid: null, bssid: null };
    }
  }

  // Web fallback (Placeholder)
  return { ssid: null, bssid: null };
}

export async function verifyWifi(): Promise<boolean> {
  const status = await Network.getStatus();
  return status.connectionType === 'wifi';
}
