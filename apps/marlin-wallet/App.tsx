// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * An eCash Wallet App using WebView
 * This approach uses a web-based wallet with full WebAssembly support
 * embedded in a React Native WebView
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    StatusBar,
    StyleSheet,
    View,
    Alert,
    Dimensions,
    BackHandler,
    NativeModules,
    Platform,
    Linking,
    DeviceEventEmitter,
    AppState,
    Modal,
    Text,
} from 'react-native';
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Keychain from 'react-native-keychain';
import LinearGradient from 'react-native-linear-gradient';

// Interface for messages to and from the WebView
interface WebViewMessage {
    type: string;
    data?: any;
}

function AppContent(): React.JSX.Element {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<WebView>(null);
    const [webViewSource, setWebViewSource] = useState<any>(null);
    const pendingPaymentRequestRef = useRef<string | null>(null);
    const walletReadyRef = useRef<boolean>(false);
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] =
        useState<boolean>(false);

    // Get the bundle path on mount for iOS
    useEffect(() => {
        if (Platform.OS === 'ios') {
            const BundlePath = NativeModules.BundlePath;

            if (BundlePath && BundlePath.mainBundlePath) {
                const bundlePath = BundlePath.mainBundlePath;
                const uri = `file://${bundlePath}/web/index.html`;
                setWebViewSource({
                    uri: uri,
                    baseUrl: `file://${bundlePath}/web/`,
                });
            }
        } else {
            setWebViewSource({ uri: 'file:///android_asset/web/index.html' });
        }
    }, []);

    // Background payment request listener (Android)
    useEffect(() => {
        if (Platform.OS !== 'android') {
            return;
        }

        const handlePaymentRequest = (bip21Uri: string) => {
            // If wallet is already ready, send immediately
            if (walletReadyRef.current && webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: 'PAYMENT_REQUEST',
                        data: bip21Uri,
                    }),
                );
            } else {
                // Store as pending - will be sent when WALLET_READY is received
                pendingPaymentRequestRef.current = bip21Uri;
            }
        };

        // Listen for payment requests
        const subscription = DeviceEventEmitter.addListener(
            'PAYMENT_REQUEST',
            handlePaymentRequest,
        );

        // Signal to native that the listener is ready
        const PaymentRequestModule = NativeModules.PaymentRequestModule;
        if (PaymentRequestModule && PaymentRequestModule.setListenerReady) {
            PaymentRequestModule.setListenerReady();
        }

        return () => {
            subscription.remove();
        };
    }, []);

    // Deep link listener (iOS)
    useEffect(() => {
        if (Platform.OS !== 'ios') {
            return;
        }

        const handleUrl = (event: { url: string }) => {
            const uri = event.url;

            // If wallet is already ready, send immediately
            if (walletReadyRef.current && webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: 'PAYMENT_REQUEST',
                        data: uri,
                    }),
                );
            } else {
                // Store as pending - will be sent when WALLET_READY is received
                pendingPaymentRequestRef.current = uri;
            }
        };

        // Check for initial URL (app launched from closed state)
        Linking.getInitialURL().then(url => {
            if (url) {
                handleUrl({ url });
            }
        });

        // Listen for URLs while app is running
        const subscription = Linking.addEventListener('url', handleUrl);

        return () => {
            subscription.remove();
        };
    }, []);

    // Monitor app state and sync wallet when app comes to foreground
    useEffect(() => {
        const subscription = AppState.addEventListener(
            'change',
            nextAppState => {
                if (
                    nextAppState === 'active' &&
                    walletReadyRef.current &&
                    webViewRef.current
                ) {
                    // App came to foreground, sync the wallet
                    console.log('App came to foreground, syncing wallet...');
                    sendMessageToWebView({
                        type: 'SYNC_WALLET',
                    });
                }
            },
        );

        return () => {
            subscription.remove();
        };
    }, []);

    // Properly terminate the app if the user cancels the authentication. Without
    // this, the app will stay running in the background and can be resumed in an
    // inconsistent state.
    function killApp() {
        try {
            // Use native module to properly kill the app
            NativeModules.AppKiller.killApp();
        } catch (error) {
            console.log(
                'Failed to kill app with native module, falling back to BackHandler:',
                error,
            );
            BackHandler.exitApp();
        }
    }

    // Send message to WebView
    const sendMessageToWebView = (message: WebViewMessage) => {
        if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify(message));
        } else {
            console.error('WebView ref is null, cannot send message');
        }
    };

    // Trigger haptic feedback with variable intensity
    const triggerHaptic = (type: any) => {
        try {
            ReactNativeHapticFeedback.trigger(type as any, {
                enableVibrateFallback: true,
                ignoreAndroidSystemSettings: false,
            });
        } catch (error) {
            console.error('Haptic feedback error:', error);
        }
    };

    // Store mnemonic in secure keychain storage
    const storeMnemonic = async (mnemonic: string): Promise<void> => {
        const closeWalletMessage = 'Close the wallet';
        try {
            await Keychain.setGenericPassword('MarlinWallet', mnemonic, {
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
                accessGroup: undefined,
                authenticationPrompt: {
                    title: 'Authenticate to store your wallet private key',
                    description:
                        'This is required to store your private key to the device secure storage',
                    cancel: closeWalletMessage,
                },
                service: 'MarlinWallet',
            });
        } catch (error) {
            console.log(
                'storeMnemonic: Error storing mnemonic in keychain:',
                error,
            );
            killApp();
            return;
        }
    };

    // Load mnemonic from secure keychain storage
    const loadMnemonic = async (): Promise<string | null> => {
        // TODO Fallback to watch-only mode if the user cancels the authentication
        // const watchOnlyMessage = 'Open in watch-only mode';
        const watchOnlyMessage = 'Close the wallet';
        try {
            const credentials = await Keychain.getGenericPassword({
                authenticationPrompt: {
                    title: 'Authenticate to access your wallet',
                    description:
                        'This is required to load your private key from the secure storage',
                    cancel: watchOnlyMessage,
                },
                service: 'MarlinWallet',
            });

            if (credentials && credentials.password) {
                console.log('Mnemonic loaded from keychain');
                return credentials.password;
            } else {
                console.log('No mnemonic found in keychain');
                return null;
            }
        } catch (error) {
            // TODO check the cancellation message for using watch-only mode
            // const message: string = (error as any).message;
            // if (message.includes(watchOnlyMessage)) {
            //   console.log('User chose to open in watch-only mode');
            //   return Promise.reject(error);
            // }

            console.log('Error loading mnemonic from keychain:', error);
            killApp();
            return Promise.reject(error);
        }
    };

    // Handle messages from the WebView
    const handleWebViewMessage = (event: any) => {
        try {
            const message: WebViewMessage = JSON.parse(event.nativeEvent.data);

            switch (message.type) {
                case 'LOG':
                    console.log('WebView: ', message.data);
                    break;

                case 'CLOSE_APP':
                    console.log(
                        'Killing app due to failed biometric authentication',
                    );
                    killApp();
                    break;

                case 'TX_FINALIZED':
                    console.log(
                        'Transaction finalized, triggering haptic feedback',
                    );
                    triggerHaptic('impactMedium');
                    break;

                case 'HAPTIC_FEEDBACK':
                    if (message.data) {
                        triggerHaptic(message.data);
                    }
                    break;

                case 'STORE_MNEMONIC':
                    if (message.data) {
                        storeMnemonic(message.data);
                    }
                    break;

                case 'LOAD_MNEMONIC':
                    loadMnemonic()
                        .then(mnemonic => {
                            sendMessageToWebView({
                                type: 'MNEMONIC_RESPONSE',
                                data: mnemonic,
                            });
                        })
                        .catch(error => {
                            console.log('Error in loadMnemonic:', error);
                        });
                    break;

                case 'OPEN_URL':
                    if (message.data) {
                        Linking.openURL(message.data).catch(err => {
                            console.error('Failed to open URL:', err);
                        });
                    }
                    break;

                case 'WALLET_READY':
                    // Wallet has finished loading
                    walletReadyRef.current = true;

                    // Send pending payment request if any
                    if (
                        pendingPaymentRequestRef.current &&
                        webViewRef.current
                    ) {
                        webViewRef.current.postMessage(
                            JSON.stringify({
                                type: 'PAYMENT_REQUEST',
                                data: pendingPaymentRequestRef.current,
                            }),
                        );
                        pendingPaymentRequestRef.current = null;
                    }
                    break;

                case 'SEND_ADDRESS_TO_WATCH':
                    // Send wallet address and BIP21 prefix to watch (Wear OS / Apple Watch)
                    if (message.data) {
                        if (Platform.OS === 'android') {
                            const WearableSync = NativeModules.WearableSync;
                            if (WearableSync) {
                                WearableSync.sendDataToWatch(
                                    message.data.address,
                                    message.data.bip21Prefix,
                                );
                            }
                        } else if (Platform.OS === 'ios') {
                            const WatchConnectivity =
                                NativeModules.WatchConnectivity;
                            if (WatchConnectivity) {
                                WatchConnectivity.sendDataToWatch(
                                    message.data.address,
                                    message.data.bip21Prefix,
                                );
                            }
                        }
                    }
                    break;

                case 'RETURN_TO_PREVIOUS_APP':
                    // Return to the previous app (browser) after payment is sent
                    // This is used when the app was opened via a deep link from a browser
                    console.log(
                        'Showing payment success modal before returning to browser',
                    );
                    // Clear pending payment request synchronously (ref updates are immediate)
                    pendingPaymentRequestRef.current = null;
                    // Show success modal for 2 seconds
                    setShowPaymentSuccessModal(true);
                    setTimeout(() => {
                        setShowPaymentSuccessModal(false);
                        killApp();
                    }, 2000);
                    break;

                default:
                    // Unknown message type - log and ignore
                    console.log('Unknown WebView message type:', message.type);
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebView message:', error);
        }
    };

    // Don't render WebView until we have the source
    if (!webViewSource) {
        return (
            <View style={styles.loadingScreen}>
                {Platform.OS === 'ios' && (
                    <StatusBar
                        barStyle="light-content"
                        translucent={false}
                        backgroundColor="#000000"
                    />
                )}
                <View style={styles.loadingContainer}></View>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <StatusBar
                barStyle="light-content"
                translucent={true}
                backgroundColor="transparent"
                hidden={false}
            />
            <View
                style={[
                    styles.webViewContainer,
                    {
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                ]}
            >
                <WebView
                    ref={webViewRef}
                    source={webViewSource}
                    style={styles.webView}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    mixedContentMode="compatibility"
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    mediaCapturePermissionGrantType="grant"
                    onError={syntheticEvent => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error:', nativeEvent);
                        Alert.alert(
                            'WebView Error',
                            'Failed to load the wallet interface',
                        );
                    }}
                    onHttpError={syntheticEvent => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView HTTP error:', nativeEvent);
                    }}
                />
            </View>
            <Modal
                visible={showPaymentSuccessModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.checkIconContainer}>
                            <Text style={styles.checkIcon}>✓</Text>
                        </View>
                        <Text style={styles.modalText}>
                            Payment sent!{'\n'}
                            Returning to the payment site...
                        </Text>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

function App(): React.JSX.Element {
    return (
        <SafeAreaProvider>
            <AppContent />
        </SafeAreaProvider>
    );
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingScreen: {
        flex: 1,
        backgroundColor: '#000000',
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    webView: {
        flex: 1,
        width: width,
        height: height,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 24,
        margin: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    checkIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4ade80',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkIcon: {
        fontSize: 36,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    modalText: {
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default App;
