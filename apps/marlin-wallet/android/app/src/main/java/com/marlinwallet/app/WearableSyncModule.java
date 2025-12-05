// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class WearableSyncModule extends ReactContextBaseJavaModule {
    
    public WearableSyncModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return "WearableSync";
    }
    
    @ReactMethod
    public void sendDataToWatch(String address, String bip21Prefix) {
        WearableListenerService.sendDataToWatch(getReactApplicationContext(), address, bip21Prefix);
    }
}

