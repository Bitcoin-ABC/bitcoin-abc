// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Foundation

struct WalletData {
    let address: String
    let bip21Prefix: String
    
    static func load() -> WalletData? {
        let defaults = UserDefaults.standard
        guard let address = defaults.string(forKey: "wallet_address"),
              let bip21Prefix = defaults.string(forKey: "bip21_prefix") else {
            return nil
        }
        return WalletData(address: address, bip21Prefix: bip21Prefix)
    }
    
    static func save(address: String, bip21Prefix: String) {
        let defaults = UserDefaults.standard
        defaults.set(address, forKey: "wallet_address")
        defaults.set(bip21Prefix, forKey: "bip21_prefix")
    }
    
    static func clear() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "wallet_address")
        defaults.removeObject(forKey: "bip21_prefix")
    }
}
