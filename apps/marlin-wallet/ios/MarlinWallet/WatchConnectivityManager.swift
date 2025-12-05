// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivityModule)
class WatchConnectivityModule: NSObject, RCTBridgeModule {
    
    static func moduleName() -> String! {
        return "WatchConnectivity"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc(sendDataToWatch:bip21Prefix:)
    func sendDataToWatch(_ address: String, bip21Prefix: String) {
        guard WCSession.isSupported() else {
            return
        }
        
        let session = WCSession.default
        
        // Send data using application context (persistent, even if watch isn't reachable)
        // Include timestamp to force update even if address didn't change
        let context: [String: Any] = [
            "address": address,
            "bip21_prefix": bip21Prefix,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        do {
            try session.updateApplicationContext(context)
        } catch {
            // Failed to send data to watch
        }
    }
}

