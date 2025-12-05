// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app;

import android.content.Context;
import android.content.Intent;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

/**
 * Service to handle communication with Wear OS watch
 */
public class WearableListenerService extends com.google.android.gms.wearable.WearableListenerService {
    
    private static final String WALLET_DATA_PATH = "/wallet_data";
    private static final String KEY_ADDRESS = "address";
    private static final String KEY_BIP21_PREFIX = "bip21_prefix";
    private static final String OPEN_APP_MESSAGE = "/open_app";
    
    @Override
    public void onMessageReceived(MessageEvent messageEvent) {
        if (messageEvent.getPath().equals(OPEN_APP_MESSAGE)) {
            // Watch is requesting to open the phone app
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        }
    }
    
    /**
     * Send wallet data (address and BIP21 prefix) to watch
     * This is called from React Native when the wallet is ready
     */
    public static void sendDataToWatch(Context context, String address, String bip21Prefix) {
        if (address == null || address.isEmpty()) {
            return;
        }
        
        // Create a data map with the address and BIP21 prefix
        PutDataMapRequest dataMap = PutDataMapRequest.create(WALLET_DATA_PATH);
        dataMap.getDataMap().putString(KEY_ADDRESS, address);
        dataMap.getDataMap().putString(KEY_BIP21_PREFIX, bip21Prefix != null ? bip21Prefix : "ecash:");
        dataMap.getDataMap().putLong("timestamp", System.currentTimeMillis()); // Force update
        
        PutDataRequest request = dataMap.asPutDataRequest();
        request.setUrgent();
        
        // Send to watch
        DataClient dataClient = Wearable.getDataClient(context);
        dataClient.putDataItem(request);
    }
}

