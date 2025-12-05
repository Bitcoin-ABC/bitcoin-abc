// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface AppDelegate () <WCSessionDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"MarlinWallet";
  // RCTAppDelegate now requires RCTAppDependencyProvider to load third party dependencies
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  
  // Initialize WatchConnectivity
  if ([WCSession isSupported]) {
    WCSession *session = [WCSession defaultSession];
    session.delegate = self;
    [session activateSession];
  }

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// MARK: - WCSessionDelegate

- (void)session:(WCSession *)session activationDidCompleteWithState:(WCSessionActivationState)activationState error:(NSError *)error {
  // Activation complete
}

- (void)sessionDidBecomeInactive:(WCSession *)session {
  // Session became inactive
}

- (void)sessionDidDeactivate:(WCSession *)session {
  // Reactivate the session for iOS app
  [[WCSession defaultSession] activateSession];
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *,id> *)message replyHandler:(void (^)(NSDictionary<NSString *,id> * _Nonnull))replyHandler {
  // Handle messages from watch (e.g., "open_app" action)
  NSString *action = message[@"action"];
  if ([action isEqualToString:@"open_app"]) {
    // App is already open since we received the message
    replyHandler(@{@"status": @"ok"});
  }
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Handle deep links (iOS 13+)
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [RCTLinkingManager application:application openURL:url options:options];
}

// Handle deep links (iOS 9-12 compatibility)
- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
  sourceApplication:(NSString *)sourceApplication
         annotation:(id)annotation {
  return [RCTLinkingManager application:application openURL:url
                      sourceApplication:sourceApplication annotation:annotation];
}

@end
