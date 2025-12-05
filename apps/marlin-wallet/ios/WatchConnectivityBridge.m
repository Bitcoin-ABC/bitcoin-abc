// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(WatchConnectivity, WatchConnectivityModule, NSObject)

RCT_EXTERN_METHOD(sendDataToWatch:(NSString *)address bip21Prefix:(NSString *)bip21Prefix)

@end

