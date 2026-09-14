export interface WifiVerificationProvider {
  verifyWifi(): Promise<boolean>;
}

/**
 * WifiProvider that handles browser limitations.
 * In a real Capacitor build, this would use a native plugin.
 * For the web demo, we must allow verification to proceed so that the
 * server-side checks can be tested.
 */
export class WifiProvider implements WifiVerificationProvider {
  async verifyWifi(): Promise<boolean> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In the browser, we cannot actually check the SSID.
    // We return true to allow the user to reach the server-side verification,
    // which is the only place where Wi-Fi can be truly validated.
    return true;
  }
}

export const wifiProvider = new WifiProvider();
