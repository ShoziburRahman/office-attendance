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

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import androidx.biometric.BiometricPrompt;
import androidx.biometric.BiometricManager;
import androidx.core.content.ContextCompat;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import android.util.Base64;
import java.util.concurrent.CompletableFuture;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register the proper Capacitor Wi-Fi plugin
        this.registerPlugin(AndroidWifiPlugin.class);

        // Inject Biometric interface (keep this until converted to plugin)
        this.getBridge().getWebView().addJavascriptInterface(new BiometricInterface(this), "AndroidBiometric");
        Log.d("WifiBridge", "AndroidWifi plugin registered and AndroidBiometric interface injected");
    }

    public static class BiometricInterface {
        private Context context;
        private static final String KEY_ALIAS = "attendance_biometric_key";

        public BiometricInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String generateAndExportPublicKey() {
            Log.d("BiometricBridge", "generateAndExportPublicKey called");
            try {
                // Clear any existing key first to avoid conflicts during re-registration
                KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
                keyStore.load(null);
                if (keyStore.containsAlias(KEY_ALIAS)) {
                    keyStore.deleteEntry(KEY_ALIAS);
                    Log.d("BiometricBridge", "Existing key cleared for re-registration");
                }

                KeyPairGenerator kpg = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");

                kpg.initialize(new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                    .setUserAuthenticationRequired(true)
                    .setInvalidatedByBiometricEnrollment(true)
                    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PSS)
                    .build());

                KeyPair kp = kpg.generateKeyPair();
                PublicKey pubKey = kp.getPublic();

                return "{\"publicKey\": \"" + Base64.encodeToString(pubKey.getEncoded(), Base64.NO_WRAP) + "\"}";
            } catch (Exception e) {
                Log.e("BiometricBridge", "Key generation error", e);
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public String clearBiometricKey() {
            try {
                KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
                keyStore.load(null);
                if (keyStore.containsAlias(KEY_ALIAS)) {
                    keyStore.deleteEntry(KEY_ALIAS);
                    return "{\"success\": true}";
                }
                return "{\"success\": true, \"message\": \"No key to clear\"}";
            } catch (Exception e) {
                Log.e("BiometricBridge", "Error clearing key", e);
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface

        public String signChallenge(final String nonce) {
            Log.d("BiometricBridge", "signChallenge called with nonce: " + nonce);

            // BiometricPrompt requires an Activity context.
            // We need to use a callback because BiometricPrompt is async.
            // Since JavascriptInterface methods must be synchronous, we use a CompletableFuture.
            CompletableFuture<String> result = new CompletableFuture<>();

            MainActivity activity = (MainActivity) context;

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Verify your identity")
                .setSubtitle("Use your fingerprint to continue attendance")
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build();

            try {
                // Run on UI thread to avoid "Must be called from main thread of fragment host"
                activity.runOnUiThread(() -> {
                    try {
                        // --- DIAGNOSTIC LOGGING START ---
                        Log.d("BiometricBridge", "--- Keystore Diagnostic Start ---");
                        Log.d("BiometricBridge", "Android SDK Version: " + android.os.Build.VERSION.SDK_INT);
                        Log.d("BiometricBridge", "Device Model: " + android.os.Build.MODEL);

                        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
                        keyStore.load(null);

                        boolean keyExists = keyStore.containsAlias(KEY_ALIAS);
                        Log.d("BiometricBridge", "Key Alias: " + KEY_ALIAS);
                        Log.d("BiometricBridge", "Key Exists: " + keyExists);

                        BiometricManager biometricManager = BiometricManager.from(activity);
                        int biometricStatus = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
                        Log.d("BiometricBridge", "Biometric Status: " + biometricStatus + " (0=SUCCESS)");
                        // --- DIAGNOSTIC LOGGING END ---

                        PrivateKey privateKey = (PrivateKey) keyStore.getKey(KEY_ALIAS, null);

                        if (privateKey == null) {
                            result.complete("{\"error\": \"Biometric key not found. Please register your device.\"}");
                            return;
                        }

                        try {
                            // Use RSA-PSS instead of PKCS#1 v1.5 to resolve INCOMPATIBLE_PADDING_MODE on Android 14
                            Signature signature = Signature.getInstance("SHA256withRSA/PSS");
                            signature.initSign(privateKey);
                            BiometricPrompt.CryptoObject cryptoObject = new BiometricPrompt.CryptoObject(signature);

                            BiometricPrompt biometricPrompt = new BiometricPrompt(activity,
                                ContextCompat.getMainExecutor(activity),
                                new BiometricPrompt.AuthenticationCallback() {
                                    @Override
                                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult authResult) {
                                        super.onAuthenticationSucceeded(authResult);
                                        Log.d("BiometricBridge", "Biometric authentication succeeded");
                                        try {
                                            // Retrieve the authenticated signature from the CryptoObject
                                            Signature authenticatedSignature = authResult.getCryptoObject().getSignature();
                                            if (authenticatedSignature == null) {
                                                Log.e("BiometricBridge", "Authenticated signature object is null");
                                                result.complete("{\"error\": \"Authenticated signature was null\"}");
                                                return;
                                            }
                                            authenticatedSignature.update(nonce.getBytes());
                                            String signed = Base64.encodeToString(authenticatedSignature.sign(), Base64.NO_WRAP);
                                            Log.d("BiometricBridge", "Successfully signed challenge");
                                            result.complete("{\"signature\": \"" + signed + "\"}");
                                        } catch (Exception e) {
                                            Log.e("BiometricBridge", "Signing error after auth: " + e.getClass().getName() + " - " + e.getMessage(), e);
                                            result.complete("{\"error\": \"Signing failed: " + e.getMessage() + "\"}");
                                        }
                                    }

                                    @Override
                                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                                        super.onAuthenticationError(errorCode, errString);
                                        Log.e("BiometricBridge", "Auth Error (" + errorCode + "): " + errString);
                                        result.complete("{\"error\": \"Auth Error (" + errorCode + "): " + errString + "\"}");
                                    }

                                    @Override
                                    public void onAuthenticationFailed() {
                                        super.onAuthenticationFailed();
                                        Log.e("BiometricBridge", "Authentication failed");
                                        result.complete("{\"error\": \"Authentication failed\"}");
                                    }
                                });

                            // Authenticate with the CryptoObject to unlock the private key
                            biometricPrompt.authenticate(promptInfo, cryptoObject);
                        } catch (KeyPermanentlyInvalidatedException e) {
                            Log.e("BiometricBridge", "KeyPermanentlyInvalidatedException caught: " + e.getMessage(), e);
                            result.complete("{\"error\": \"Biometric security changed. Please re-register your device.\"}");
                        } catch (Exception e) {
                            Log.e("BiometricBridge", "Exception during Signature/CryptoObject setup: " + e.getClass().getName() + " - " + e.getMessage(), e);
                            result.complete("{\"error\": \"Keystore operation failed: " + e.getClass().getSimpleName() + " - " + e.getMessage() + "\"}");
                        }
                    } catch (Exception e) {
                        Log.e("BiometricBridge", "UI Thread Keystore error", e);
                        result.complete("{\"error\": \"UI Thread Keystore failure: " + e.getMessage() + "\"}");
                    }
                });
            } catch (Exception e) {
                Log.e("BiometricBridge", "runOnUiThread setup error", e);
                return "{\"error\": \"RunOnUiThread setup failed: " + e.getMessage() + "\"}";
            }

            try {
                // Wait for biometric result (blocking JS thread)
                return result.get();
            } catch (Exception e) {
                return "{\"error\": \"Verification timeout or interrupted\"}";
            }
        }
    }
}
