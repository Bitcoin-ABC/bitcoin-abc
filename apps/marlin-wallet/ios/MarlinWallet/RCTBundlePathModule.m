// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#import "RCTBundlePathModule.h"

@implementation RCTBundlePathModule

RCT_EXPORT_MODULE(BundlePath);

// Export the main bundle path to JavaScript
RCT_EXPORT_METHOD(getMainBundlePath:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *bundlePath = [[NSBundle mainBundle] bundlePath];
  if (bundlePath) {
    resolve(bundlePath);
  } else {
    reject(@"error", @"Could not get bundle path", nil);
  }
}

// Synchronous method to get bundle path
- (NSDictionary *)constantsToExport
{
  return @{
    @"mainBundlePath": [[NSBundle mainBundle] bundlePath] ?: @"",
    @"resourcePath": [[NSBundle mainBundle] resourcePath] ?: @""
  };
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end

