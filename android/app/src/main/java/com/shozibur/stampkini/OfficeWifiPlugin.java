package com.shozibur.stampkini;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.app.ActivityCompat;

@CapacitorPlugin(name = "OfficeWifi")
public class OfficeWifiPlugin extends Plugin {

    @PluginMethod
    public void ping(PluginCall call) {
        Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] ping() called");
        JSObject result = new JSObject();
        result.put("status", "alive");
        call.resolve(result);
    }

    @PluginMethod
    public void getWifiInfo(PluginCall call) {
        Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] METHOD EXECUTED v1");

        try {
            Context context = getContext();

            // 1. Permission Check
            boolean hasPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] permission status: " + (hasPermission ? "GRANTED" : "DENIED"));

            if (!hasPermission) {
                Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] Permission denied, rejecting call");
                call.reject("Wi-Fi permission is required to verify the office network.");
                return;
            }

            // 2. WifiManager Access
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] WifiManager available: " + (wifiManager != null));
            if (wifiManager == null) {
                call.reject("WifiManager not available");
                return;
            }

            // 3. WifiInfo Retrieval
            WifiInfo info = wifiManager.getConnectionInfo();
            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] WifiInfo available: " + (info != null));
            if (info == null) {
                JSObject result = new JSObject();
                result.put("available", false);
                result.put("error", "No Wi-Fi connection found");
                call.resolve(result);
                return;
            }

            String ssid = info.getSSID();
            String bssid = info.getBSSID();

            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] SSID available: " + (ssid != null && !ssid.isEmpty()));
            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] BSSID available: " + (bssid != null && !bssid.isEmpty()));

            if (ssid == null) ssid = "";
            if (bssid == null) bssid = "";

            if (ssid.equalsIgnoreCase("<unknown ssid>") || ssid.isEmpty()) {
                Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] SSID is unknown or empty");
                JSObject result = new JSObject();
                result.put("available", false);
                result.put("error", "Unknown SSID");
                call.resolve(result);
                return;
            }

            // 4. Success Resolution
            JSObject result = new JSObject();
            result.put("ssid", ssid);
            result.put("bssid", bssid);
            result.put("available", true);

            Log.d("WifiBridge", "[OFFICE_WIFI_PLUGIN] resolving with SSID: " + ssid);
            call.resolve(result);

        } catch (Exception e) {
            Log.e("WifiBridge", "[OFFICE_WIFI_PLUGIN] EXCEPTION: " + e.getMessage(), e);
            call.reject("Native exception: " + e.getMessage());
        }
    }
}
