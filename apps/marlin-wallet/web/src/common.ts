// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Type declaration for React Native WebView
declare global {
    interface Window {
        ReactNativeWebView?: {
            postMessage: (message: string) => void;
        };
    }
}

// Check if we are running in a React Native WebView. This makes it possible to
// use a degraded but functional web version of the app.
export function isReactNativeWebView(): boolean {
    return !!window.ReactNativeWebView;
}

// Send a message to the backend app if we are running in a React Native
// WebView. This is how we communicate back and forth to escape the WebView and
// access the platform native features.
export function sendMessageToBackend(type: string, data: any): boolean {
    if (isReactNativeWebView()) {
        window.ReactNativeWebView.postMessage(
            JSON.stringify({
                type,
                data,
            }),
        );
        return true;
    }

    return false;
}

export function webViewLog(...messages) {
    const catMessages = messages.join(' ');
    console.log(catMessages);
    sendMessageToBackend('LOG', catMessages);
}

export function webViewError(...messages) {
    webViewLog('Error:', ...messages);
}
