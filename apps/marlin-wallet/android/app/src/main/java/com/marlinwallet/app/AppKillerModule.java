// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.app.Activity;

public class AppKillerModule extends ReactContextBaseJavaModule {
    
    public AppKillerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppKiller";
    }

    @ReactMethod
    public void killApp() {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            // Finish all activities in the task and exit, don't keep the app in
            // the background.
            activity.finishAndRemoveTask();
        }
    }
}
