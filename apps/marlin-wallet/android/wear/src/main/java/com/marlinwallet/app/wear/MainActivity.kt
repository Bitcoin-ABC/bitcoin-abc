// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app.wear

import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.wear.widget.SwipeDismissFrameLayout
import com.marlinwallet.app.NfcHceService
import com.marlinwallet.app.R
import com.google.android.gms.wearable.Wearable
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.util.Locale

class MainActivity : ComponentActivity() {
    
    private lateinit var amountEntryManager: AmountEntryManager
    private lateinit var qrCodeImageView: ImageView
    private lateinit var logoImageView: ImageView
    private lateinit var qrCodeContainer: View
    private lateinit var qrAmountLabel: TextView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen before calling super.onCreate()
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        qrCodeImageView = findViewById(R.id.qrCode)
        logoImageView = findViewById(R.id.logo)
        qrCodeContainer = findViewById(R.id.qrCodeContainer)
        qrAmountLabel = findViewById(R.id.qrAmountLabel)
        val openOnPhoneContainer = findViewById<LinearLayout>(R.id.openOnPhoneContainer)
        val swipeDismissLayout = findViewById<SwipeDismissFrameLayout>(R.id.swipeDismissLayout)
        val amountEntryScreen = findViewById<View>(R.id.amountEntryScreen)
        val amountText = findViewById<TextView>(R.id.amountText)
        val amountInput = findViewById<EditText>(R.id.amountInput)
        val unitXec = findViewById<TextView>(R.id.unitXec)
        val unitKxec = findViewById<TextView>(R.id.unitKxec)
        val unitMxec = findViewById<TextView>(R.id.unitMxec)
        val clearBtn = findViewById<TextView>(R.id.clearBtn)
        val applyBtn = findViewById<TextView>(R.id.applyBtn)
        
        // Initialize amount entry manager
        amountEntryManager = AmountEntryManager(
            activity = this,
            swipeDismissLayout = swipeDismissLayout,
            amountEntryScreen = amountEntryScreen,
            amountText = amountText,
            amountInput = amountInput,
            unitXec = unitXec,
            unitKxec = unitKxec,
            unitMxec = unitMxec,
            clearBtn = clearBtn,
            applyBtn = applyBtn,
            onAmountChanged = { amountSats ->
                updateNfcUriWithAmount(amountSats)
            }
        )
        
        // Check if we have both wallet address and BIP21 prefix
        val prefs = getSharedPreferences("wallet", MODE_PRIVATE)
        val address = prefs.getString("address", null)
        val bip21Prefix = prefs.getString("bip21_prefix", null)
        
        if (address != null && bip21Prefix != null) {
            // Show QR code screen initially
            qrCodeContainer.visibility = View.VISIBLE
            openOnPhoneContainer.visibility = View.GONE
            
            // Generate and display QR code
            val bip21Uri = createBip21Uri(bip21Prefix, address, null)
            val qrBitmap = generateQRCode(bip21Uri, 256, 256)
            qrCodeImageView.setImageBitmap(qrBitmap)
            
            // Set up NFC with initial URI (no amount)
            NfcHceService.setBip21Uri(bip21Uri)
            
            // Tap QR code to show amount entry screen
            qrCodeContainer.setOnClickListener {
                amountEntryManager.show()
            }
        } else {
            // Show "open on phone" UI if either address or BIP21 prefix is missing
            qrCodeContainer.visibility = View.GONE
            openOnPhoneContainer.visibility = View.VISIBLE
            
            // Clear NFC URI since we don't have complete wallet data
            NfcHceService.clearBip21Uri()
            
            // Handle tap to open phone app
            openOnPhoneContainer.setOnClickListener {
                openPhoneApp()
            }
        }
        
        // Set up back button handler
        onBackPressedDispatcher.addCallback(this, object : androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (amountEntryManager.isVisible()) {
                    amountEntryManager.handleBackAction()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
    
    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        // Address was updated from phone - refresh QR code but preserve amount
        if (::amountEntryManager.isInitialized) {
            val savedAmount = amountEntryManager.getSavedAmount()
            updateNfcUriWithAmount(savedAmount)
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Update NFC URI with the currently saved amount (preserves amount on resume)
        val savedAmount = if (::amountEntryManager.isInitialized) {
            amountEntryManager.getSavedAmount()
        } else {
            null
        }
        updateNfcUriWithAmount(savedAmount)
    }
    
    override fun onStop() {
        super.onStop()
        // Clear the saved amount when app goes to background (onStop = not visible)
        if (::amountEntryManager.isInitialized) {
            amountEntryManager.clearSavedAmount()
        }
        updateNfcUriWithAmount(null)
    }
    
    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        // Delegate rotary input to amount entry manager
        return if (amountEntryManager.handleGenericMotionEvent(event)) {
            true
        } else {
            super.onGenericMotionEvent(event)
        }
    }
    
    private fun updateNfcUriWithAmount(amountSats: Long?) {
        val prefs = getSharedPreferences("wallet", MODE_PRIVATE)
        val address = prefs.getString("address", null)
        val bip21Prefix = prefs.getString("bip21_prefix", null)
        
        if (address != null && bip21Prefix != null) {
            val bip21Uri = createBip21Uri(bip21Prefix, address, amountSats)
            
            // Update NFC
            NfcHceService.setBip21Uri(bip21Uri)
            
            // Update QR code
            val qrBitmap = generateQRCode(bip21Uri, 256, 256)
            qrCodeImageView.setImageBitmap(qrBitmap)
            
            // Show/hide amount label (use INVISIBLE to keep layout space)
            if (amountSats != null && ::amountEntryManager.isInitialized) {
                val unit = amountEntryManager.getSavedUnit()
                val displayValue = when (unit) {
                    AmountEntryManager.AmountUnit.XEC -> amountSats / 100.0
                    AmountEntryManager.AmountUnit.kXEC -> amountSats / 100000.0
                    AmountEntryManager.AmountUnit.MXEC -> amountSats / 100000000.0
                }
                qrAmountLabel.text = String.format(Locale.US, "Pay %.2f %s", displayValue, unit.label)
                qrAmountLabel.visibility = View.VISIBLE
            } else {
                qrAmountLabel.text = ""
                qrAmountLabel.visibility = View.INVISIBLE
            }
        } else {
            NfcHceService.clearBip21Uri()
        }
    }
    
    private fun createBip21Uri(bip21Prefix: String, address: String, amountSats: Long?): String {
        // Strip prefix from address if present
        val cleanAddress = if (address.contains(":")) {
            address.substring(address.indexOf(":") + 1)
        } else {
            address
        }
        
        return if (amountSats != null) {
            val xec = amountSats / 100.0
            "${bip21Prefix}${cleanAddress}?amount=${String.format(Locale.US, "%.2f", xec)}"
        } else {
            "${bip21Prefix}${cleanAddress}"
        }
    }
    
    private fun generateQRCode(content: String, width: Int, height: Int): Bitmap {
        val writer = QRCodeWriter()
        
        // Disable quiet zone (border) to maximize QR code size
        val hints = hashMapOf<EncodeHintType, Any>(
            EncodeHintType.MARGIN to 0
        )
        
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, width, height, hints)
        
        // Use IntArray for much faster bitmap creation (10-20x faster than setPixel)
        val pixels = IntArray(width * height)
        for (y in 0 until height) {
            val offset = y * width
            for (x in 0 until width) {
                pixels[offset + x] = if (bitMatrix[x, y]) Color.WHITE else Color.TRANSPARENT
            }
        }
        
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.setPixels(pixels, 0, width, 0, 0, width, height)
        
        return bitmap
    }
    
    private fun openPhoneApp() {
        // Send a message to the phone to open the app
        val messageClient = Wearable.getMessageClient(this)
        
        // Get connected nodes (phones)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nodes ->
            for (node in nodes) {
                // Send message to each connected phone
                messageClient.sendMessage(
                    node.id,
                    "/open_app",
                    null
                )
            }
        }
    }
}
