// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app;

import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * React Native module to signal when payment request listener is ready
 */
public class PaymentRequestModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PaymentRequestModule";
    private static boolean listenerReady = false;
    private static PaymentRequestReadyCallback callback = null;

    public interface PaymentRequestReadyCallback {
        void onListenerReady();
    }

    public PaymentRequestModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "PaymentRequestModule";
    }

    /**
     * Called by React Native when the payment request listener is registered
     */
    @ReactMethod
    public void setListenerReady() {
        Log.d(TAG, "Payment request listener is now ready");
        listenerReady = true;
        if (callback != null) {
            callback.onListenerReady();
            callback = null;
        }
    }

    /**
     * Check if the listener is ready
     */
    public static boolean isListenerReady() {
        return listenerReady;
    }

    /**
     * Reset the ready state (called when app restarts)
     */
    public static void reset() {
        listenerReady = false;
        callback = null;
    }

    /**
     * Set a callback to be notified when listener is ready
     */
    public static void setReadyCallback(PaymentRequestReadyCallback cb) {
        if (listenerReady) {
            // Already ready, call immediately
            cb.onListenerReady();
        } else {
            callback = cb;
        }
    }
}

