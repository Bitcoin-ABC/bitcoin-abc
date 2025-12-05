// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app;

import android.nfc.NfcAdapter;
import android.nfc.cardemulation.CardEmulation;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

/**
 * React Native module to control NFC HCE (Host Card Emulation)
 */
public class NfcHceModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NfcHceModule";
    private final ReactApplicationContext reactContext;

    public NfcHceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "NfcHce";
    }

    /**
     * Set the BIP21 URI for NFC sharing
     * @param uri The complete BIP21 URI (e.g., "ecash:address" or "ecash:address?amount=100.00")
     */
    @ReactMethod
    public void setBip21Uri(String uri, Promise promise) {
        try {
            Log.d(TAG, "Setting BIP21 URI: " + uri);
            NfcHceService.setBip21Uri(uri);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error setting BIP21 URI", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Clear the BIP21 URI
     */
    @ReactMethod
    public void clearBip21Uri(Promise promise) {
        try {
            Log.d(TAG, "Clearing BIP21 URI");
            NfcHceService.clearBip21Uri();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error clearing BIP21 URI", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Check if NFC is available and enabled
     */
    @ReactMethod
    public void isNfcAvailable(Promise promise) {
        try {
            NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(reactContext);
            if (nfcAdapter == null) {
                promise.resolve(false);
                return;
            }
            promise.resolve(nfcAdapter.isEnabled());
        } catch (Exception e) {
            Log.e(TAG, "Error checking NFC availability", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Check if HCE is supported
     */
    @ReactMethod
    public void isHceSupported(Promise promise) {
        try {
            NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(reactContext);
            if (nfcAdapter == null) {
                promise.resolve(false);
                return;
            }
            
            CardEmulation cardEmulation = CardEmulation.getInstance(nfcAdapter);
            promise.resolve(cardEmulation != null);
        } catch (Exception e) {
            Log.e(TAG, "Error checking HCE support", e);
            promise.reject("ERROR", e.getMessage());
        }
    }
}

