package com.shozibur.stampkini;

import android.os.Bundle;
import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.content.pm.PackageManager;
import android.Manifest;
import androidx.core.app.ActivityCompat;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Inject a raw JavascriptInterface directly into the WebView.
        // Use 'this' to pass the Activity context directly to the interface.
        this.getBridge().getWebView().addJavascriptInterface(new WifiInterface(this), "AndroidWifi");
        Log.d("WifiBridge", "AndroidWifi JavascriptInterface injected");
    }

    public static class WifiInterface {
        private Context context;

        public WifiInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String getWifiInfoJson() {
            Log.d("WifiBridge", "getWifiInfoJson called from JS");
            try {
                if (context == null) return "{\"error\": \"Context null\"}";

                WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
                if (wifiManager == null) return "{\"error\": \"WifiManager null\"}";

                if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    return "{\"error\": \"Permission denied\"}";
                }

                WifiInfo info = wifiManager.getConnectionInfo();
                if (info == null) return "{\"error\": \"No connection\"}";

                String ssid = info.getSSID();
                String bssid = info.getBSSID();

                if (ssid == null) ssid = "";
                if (bssid == null) bssid = "";

                // Escape double quotes in SSID to prevent JSON syntax errors
                String escapedSsid = ssid.replace("\"", "\\\"");
                String escapedBssid = bssid.replace("\"", "\\\"");

                if (escapedSsid.isEmpty() || escapedSsid.equals("<unknown ssid>") || escapedSsid.equals("unknown ssid")) {
                    return "{\"error\": \"Unknown SSID\"}";
                }

                Log.d("WifiBridge", "Returning SSID: " + escapedSsid + ", BSSID: " + escapedBssid);
                return "{\"ssid\": \"" + escapedSsid + "\", \"bssid\": \"" + escapedBssid + "\"}";
            } catch (Exception e) {
                Log.e("WifiBridge", "Error in getWifiInfoJson", e);
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        }
    }
}
