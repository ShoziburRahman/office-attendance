import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

export async function getWifiInfo(): Promise<WifiInfo> {
  // 1. Basic Connectivity Check
  const status = await Network.getStatus();
  if (status.connectionType !== 'wifi') {
    return { ssid: null, bssid: null };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      // BYPASS CAPACITOR PLUGIN SYSTEM:
      // We are using a raw JavascriptInterface injected in MainActivity.java
      const androidWifi = (window as any).AndroidWifi;

      if (!androidWifi) {
        console.error('[WIFI DEBUG] Raw bridge AndroidWifi not found in window');
        return { ssid: null, bssid: null };
      }

      console.log('[WIFI DEBUG] Raw bridge AndroidWifi found! Calling getWifiInfoJson()...');
      const jsonResult = androidWifi.getWifiInfoJson();
      const info = JSON.parse(jsonResult);

      if (info.error) {
        console.error('[WIFI DEBUG] Native bridge error:', info.error);
        return { ssid: null, bssid: null };
      }

      return {
        ssid: info.ssid || null,
        bssid: info.bssid || null,
      };
    } catch (e) {
      console.error('Native Wi-Fi raw bridge error:', e);
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
