// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app

import android.content.Intent
import android.graphics.Color
import android.nfc.NfcAdapter
import android.nfc.NdefMessage
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  private val TAG = "MainActivity"
  private var pendingPaymentUri: String? = null
  private var reactActivityDelegate: ReactActivityDelegate? = null
  
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MarlinWallet"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val delegate = DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    reactActivityDelegate = delegate
    return delegate
  }
  
  /**
   * Override getReactHost to return the ReactHost from Application (New Architecture)
   */
  override fun getReactHost(): ReactHost {
    // Cast directly to MainApplication to access non-nullable reactHost
    val mainApp = application as? MainApplication
      ?: throw IllegalStateException("Application must be MainApplication")
    return mainApp.reactHost
  }
  
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Configure window for Android 15+ (API 35)
    // Enable edge-to-edge display for safe area insets
    WindowCompat.setDecorFitsSystemWindows(window, false)
    
    // Make status bar transparent - padding is handled in React Native
    window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
    window.statusBarColor = Color.TRANSPARENT
    
    // Make navigation bar transparent - padding is handled in React Native
    window.navigationBarColor = Color.TRANSPARENT
    
    // Reset listener state on app launch
    PaymentRequestModule.reset()
    
    // Set up callback to be notified when listener is ready
    PaymentRequestModule.setReadyCallback {
      // Listener is now ready, try to send pending payment request
      if (pendingPaymentUri != null) {
        tryToSendPendingPaymentRequest()
      }
    }
    
    handleIntent(intent)
  }
  
  override fun onResume() {
    super.onResume()
    
    // Check if we have a pending payment request to send
    if (pendingPaymentUri != null) {
      tryToSendPendingPaymentRequest()
    }
  }
  
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    
    // Handle NFC and deep link intents when app is already running (foreground)
    handleIntent(intent)
  }
  
  /**
   * Handle payment request intents (NFC, deep links, etc.)
   * @param intent The intent to handle
   */
  private fun handleIntent(intent: Intent?) {
    if (intent == null) {
      return
    }
    
    when (intent.action) {
      // Handle NFC NDEF discovery
      NfcAdapter.ACTION_NDEF_DISCOVERED -> {
        val rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
        if (rawMessages != null && rawMessages.isNotEmpty()) {
          val ndefMessage = rawMessages[0] as NdefMessage
          val records = ndefMessage.records
          
          if (records.isNotEmpty()) {
            val record = records[0]
            
            // Check if it's a URI record (TNF = 0x01, Type = "U")
            if (record.tnf.toInt() == 0x01) {
              val payload = record.payload
              if (payload.isNotEmpty()) {
                // First byte is the URI identifier code
                val uriIdentifier = payload[0].toInt() and 0xFF
                val uriBytes = payload.copyOfRange(1, payload.size)
                val uriSuffix = String(uriBytes, Charsets.UTF_8)
                
                // Reconstruct full URI based on identifier code
                // See NFC Forum URI Record Type Definition specification
                val uri = when (uriIdentifier) {
                  0x00 -> uriSuffix // No abbreviation
                  0x01 -> "http://www.$uriSuffix"
                  0x02 -> "https://www.$uriSuffix"
                  0x03 -> "http://$uriSuffix"
                  0x04 -> "https://$uriSuffix"
                  0x05 -> "tel:$uriSuffix"
                  0x06 -> "mailto:$uriSuffix"
                  0x07 -> "ftp://anonymous:anonymous@$uriSuffix"
                  0x08 -> "ftp://ftp.$uriSuffix"
                  0x09 -> "ftps://$uriSuffix"
                  0x0A -> "sftp://$uriSuffix"
                  0x0B -> "smb://$uriSuffix"
                  0x0C -> "nfs://$uriSuffix"
                  0x0D -> "ftp://$uriSuffix"
                  0x0E -> "dav://$uriSuffix"
                  0x0F -> "news:$uriSuffix"
                  0x10 -> "telnet://$uriSuffix"
                  0x11 -> "imap:$uriSuffix"
                  0x12 -> "rtsp://$uriSuffix"
                  0x13 -> "urn:$uriSuffix"
                  0x14 -> "pop:$uriSuffix"
                  0x15 -> "sip:$uriSuffix"
                  0x16 -> "sips:$uriSuffix"
                  0x17 -> "tftp://$uriSuffix"
                  0x18 -> "btspp://$uriSuffix"
                  0x19 -> "btl2cap://$uriSuffix"
                  0x1A -> "btgoep://$uriSuffix"
                  0x1B -> "tcpobex://$uriSuffix"
                  0x1C -> "irdaobex://$uriSuffix"
                  0x1D -> "file://$uriSuffix"
                  0x1E -> "urn:epc:id:$uriSuffix"
                  0x1F -> "urn:epc:tag:$uriSuffix"
                  0x20 -> "urn:epc:pat:$uriSuffix"
                  0x21 -> "urn:epc:raw:$uriSuffix"
                  0x22 -> "urn:epc:$uriSuffix"
                  else -> uriSuffix // Unknown identifier, use as-is
                }
                
                sendPaymentRequest(uri)
              }
            }
          }
        }
      }
      
      // Handle deep links (camera QR scanner, web links, etc.)
      Intent.ACTION_VIEW -> {
        val uri = intent.data?.toString()
        if (uri != null) {
          sendPaymentRequest(uri)
        }
      }
    }
  }
  
  /**
   * Store a payment request URI and schedule sending to React Native (for app launch)
   */
  private fun setPendingPaymentRequest(uri: String) {
    pendingPaymentUri = uri
    tryToSendPendingPaymentRequest()
  }
  
  /**
   * Get ReactContext from ReactActivityDelegate (New Architecture)
   */
  private fun getReactContext(): com.facebook.react.bridge.ReactContext? {
    return try {
      reactActivityDelegate?.reactHost?.currentReactContext
    } catch (e: Exception) {
      null
    }
  }
  
  /**
   * Send payment request to React Native, falling back to pending if app is not ready
   */
  private fun sendPaymentRequest(uri: String) {
    val reactContext = getReactContext()
    val listenerReady = PaymentRequestModule.isListenerReady()
    
    if (reactContext != null && listenerReady) {
      try {
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("PAYMENT_REQUEST", uri)
      } catch (e: Exception) {
        Log.e(TAG, "Error sending payment request", e)
        // Fallback: store for later
        setPendingPaymentRequest(uri)
      }
    } else {
      // ReactContext not available yet or listener not ready, store for later
      setPendingPaymentRequest(uri)
    }
  }
  
  
  /**
   * Retry sending pending payment request after a delay
   */
  private fun retryPendingPaymentRequest(attempt: Int) {
    if (attempt < 30) {
      Handler(Looper.getMainLooper()).postDelayed({
        tryToSendPendingPaymentRequest(attempt + 1)
      }, 200)
    }
  }
  
  /**
   * Try to send pending payment request to React Native (New Architecture)
   * Waits for listener to be ready
   */
  private fun tryToSendPendingPaymentRequest(attempt: Int = 0) {
    if (pendingPaymentUri == null) {
      return
    }
    
    val uri = pendingPaymentUri
    
    // Check if listener is ready
    if (!PaymentRequestModule.isListenerReady()) {
      retryPendingPaymentRequest(attempt)
      return
    }
    
    val reactContext = getReactContext()
    if (reactContext == null) {
      retryPendingPaymentRequest(attempt)
      return
    }
    
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("PAYMENT_REQUEST", uri)
      pendingPaymentUri = null
    } catch (e: Exception) {
      Log.e(TAG, "Error sending payment request", e)
      retryPendingPaymentRequest(attempt)
    }
  }
}
