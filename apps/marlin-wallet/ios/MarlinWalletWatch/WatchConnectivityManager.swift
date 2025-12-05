// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    
    @Published var walletData: WalletData?
    
    private override init() {
        super.init()
        
        // Load saved wallet data
        walletData = WalletData.load()
        
        // Set up WatchConnectivity
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    // MARK: - WCSessionDelegate
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        // Activation complete
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        DispatchQueue.main.async {
            if let address = applicationContext["address"] as? String,
               let bip21Prefix = applicationContext["bip21_prefix"] as? String {
                // Save to UserDefaults
                WalletData.save(address: address, bip21Prefix: bip21Prefix)
                
                // Update published property
                self.walletData = WalletData(address: address, bip21Prefix: bip21Prefix)
            }
        }
    }
    
    func openPhoneApp() {
        guard WCSession.default.isReachable else {
            return
        }
        
        // Send message to iPhone to open the app
        WCSession.default.sendMessage(
            ["action": "open_app"],
            replyHandler: nil,
            errorHandler: nil
        )
    }
}

