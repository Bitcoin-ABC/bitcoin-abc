// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

package com.marlinwallet.app.wear

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.TextView
import androidx.wear.widget.SwipeDismissFrameLayout
import com.marlinwallet.app.R
import java.util.Locale

/**
 * Manages the amount entry screen for the Wear OS app.
 * Handles rotary input, keyboard input, unit selection, and navigation.
 */
class AmountEntryManager(
    private val activity: Activity,
    private val swipeDismissLayout: SwipeDismissFrameLayout,
    private val amountEntryScreen: View,
    private val amountText: TextView,
    private val amountInput: EditText,
    private val unitXec: TextView,
    private val unitKxec: TextView,
    private val unitMxec: TextView,
    private val clearBtn: TextView,
    private val applyBtn: TextView,
    private val onAmountChanged: (Long?) -> Unit
) {
    // Amount units with their base increments, minimum values, and maximum values
    enum class AmountUnit(
        val label: String, 
        val baseIncrement: Long, 
        val minValueSats: Long,
        val maxValueSats: Long
    ) {
        XEC("XEC", 1L, 546L, 99999999L),              // 0.01 XEC, min: 5.46 XEC, max: 999999.99 XEC
        kXEC("kXEC", 1000L, 1000L, 99999999000L),     // 0.01 kXEC, min: 0.01 kXEC, max: 999999.99 kXEC
        MXEC("MXEC", 1000000L, 1000000L, 99999999000000L)  // 0.01 MXEC, min: 0.01 MXEC, max: 999999.99 MXEC
    }

    private var currentAmountSats: Long = AmountUnit.XEC.minValueSats
    private var currentUnit: AmountUnit = AmountUnit.XEC
    private var savedAmountSats: Long? = null
    private var savedUnit: AmountUnit = AmountUnit.XEC
    private var isAmountScreenVisible = false

    // Velocity tracking for rotary input
    private var lastScrollTime = 0L
    private var consecutiveScrolls = 0
    
    // Debounced display update
    private val updateHandler = Handler(Looper.getMainLooper())
    private var pendingUpdate: Runnable? = null

    init {
        setupSwipeDismiss()
        setupClickListeners()
        updateUnitDisplay()
    }

    private fun setupSwipeDismiss() {
        swipeDismissLayout.addCallback(object : SwipeDismissFrameLayout.Callback() {
            override fun onDismissed(layout: SwipeDismissFrameLayout) {
                handleBackAction()
            }
        })
    }

    private fun setupClickListeners() {
        // Unit selection buttons
        unitXec.setOnClickListener { switchUnit(AmountUnit.XEC) }
        unitKxec.setOnClickListener { switchUnit(AmountUnit.kXEC) }
        unitMxec.setOnClickListener { switchUnit(AmountUnit.MXEC) }

        // Amount text - tap to show keyboard
        amountText.setOnClickListener {
            showKeyboardInput(amountInput)
        }

        // Keyboard input handler
        amountInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                handleKeyboardInput(amountInput.text.toString())
                amountInput.setText("")
                hideKeyboard()
                true
            } else {
                false
            }
        }

        // Clear button - clear amount and return to QR screen
        clearBtn.setOnClickListener {
            savedAmountSats = null
            currentAmountSats = AmountUnit.XEC.minValueSats
            currentUnit = AmountUnit.XEC
            onAmountChanged(null)
            hide()
        }

        // Apply button - apply amount and return to QR screen
        applyBtn.setOnClickListener {
            savedAmountSats = currentAmountSats
            savedUnit = currentUnit  // Remember the unit used
            onAmountChanged(currentAmountSats)
            hide()
        }
    }

    fun show() {
        isAmountScreenVisible = true
        swipeDismissLayout.visibility = View.VISIBLE
        
        // Restore saved amount and unit, or use defaults
        if (savedAmountSats != null) {
            currentAmountSats = savedAmountSats!!
            currentUnit = savedUnit
        } else {
            currentAmountSats = AmountUnit.XEC.minValueSats
            currentUnit = AmountUnit.XEC
        }
        updateAmountDisplay()
        updateUnitDisplay()
    }

    fun hide() {
        isAmountScreenVisible = false
        swipeDismissLayout.visibility = View.GONE
        
        // Cancel any pending updates
        pendingUpdate?.let { updateHandler.removeCallbacks(it) }
        pendingUpdate = null
    }

    fun isVisible(): Boolean = isAmountScreenVisible

    fun getSavedAmount(): Long? = savedAmountSats
    
    fun getSavedUnit(): AmountUnit = savedUnit

    fun clearSavedAmount() {
        savedAmountSats = null
    }

    fun handleBackAction() {
        savedAmountSats = null
        savedUnit = AmountUnit.XEC
        currentAmountSats = AmountUnit.XEC.minValueSats
        currentUnit = AmountUnit.XEC
        onAmountChanged(null)
        hide()
    }

    fun handleGenericMotionEvent(event: MotionEvent): Boolean {
        if (!isAmountScreenVisible) {
            return false
        }

        if (event.action == MotionEvent.ACTION_SCROLL) {
            val delta = -event.getAxisValue(MotionEvent.AXIS_SCROLL)
            if (delta != 0f) {
                updateAmountWithVelocity(delta)
                return true
            }
        }
        return false
    }

    private fun switchUnit(newUnit: AmountUnit) {
        if (currentUnit == newUnit) return

        currentUnit = newUnit

        // Round to 2 decimals in the new unit
        roundToCurrentUnit()

        updateAmountDisplay()
        updateUnitDisplay()
    }

    private fun roundToCurrentUnit() {
        // Round to 2 decimals in the current unit to ensure consistency
        val displayValue = when (currentUnit) {
            AmountUnit.XEC -> currentAmountSats / 100.0
            AmountUnit.kXEC -> currentAmountSats / 100000.0
            AmountUnit.MXEC -> currentAmountSats / 100000000.0
        }
        
        // Round to 2 decimals (use Locale.US to ensure dot as decimal separator)
        val roundedValue = String.format(Locale.US, "%.2f", displayValue).toDouble()
        
        // Convert back to sats
        currentAmountSats = when (currentUnit) {
            AmountUnit.XEC -> (roundedValue * 100).toLong()
            AmountUnit.kXEC -> (roundedValue * 100000).toLong()
            AmountUnit.MXEC -> (roundedValue * 100000000).toLong()
        }

        // Enforce minimum and maximum values for current unit
        if (currentAmountSats < currentUnit.minValueSats) {
            currentAmountSats = currentUnit.minValueSats
        } else if (currentAmountSats > currentUnit.maxValueSats) {
            currentAmountSats = currentUnit.maxValueSats
        }
    }

    private fun updateAmountWithVelocity(delta: Float) {
        val currentTime = System.currentTimeMillis()
        val timeSinceLastScroll = currentTime - lastScrollTime

        // Reset velocity if scroll stopped for more than 150ms
        if (timeSinceLastScroll > 150) {
            consecutiveScrolls = 0
        }

        // Increment consecutive scrolls
        consecutiveScrolls++

        // Calculate multiplier based on velocity - extremely aggressive for watch gesture
        val multiplier = when {
            consecutiveScrolls > 8 -> 10000   // Very fast - 10,000x increment (100 XEC jumps)
            consecutiveScrolls > 5 -> 1000    // Fast - 1,000x increment (10 XEC jumps)
            consecutiveScrolls > 3 -> 100     // Medium - 100x increment (1 XEC jumps)
            consecutiveScrolls > 1 -> 10      // Quick - 10x increment (0.10 units)
            else -> 1                         // Slow - 1x increment (0.01 units)
        }

        val increment = currentUnit.baseIncrement * multiplier
        val change = if (delta > 0) increment else -increment

        var newAmount = currentAmountSats + change

        // Enforce minimum value
        if (newAmount < currentUnit.minValueSats) {
            newAmount = currentUnit.minValueSats
        }

        // Check for overflow and auto-switch to next unit if needed
        if (newAmount > currentUnit.maxValueSats) {
            when (currentUnit) {
                AmountUnit.XEC -> {
                    // Switch to kXEC
                    currentUnit = AmountUnit.kXEC
                    currentAmountSats = newAmount
                    // Round to 2 decimals in the new unit
                    roundToCurrentUnit()
                    updateUnitDisplay()
                }
                AmountUnit.kXEC -> {
                    // Switch to MXEC
                    currentUnit = AmountUnit.MXEC
                    currentAmountSats = newAmount
                    // Round to 2 decimals in the new unit
                    roundToCurrentUnit()
                    updateUnitDisplay()
                }
                AmountUnit.MXEC -> {
                    // Clamp to max value for MXEC
                    newAmount = currentUnit.maxValueSats
                    currentAmountSats = newAmount
                }
            }
        } else {
            currentAmountSats = newAmount
        }

        lastScrollTime = currentTime
        
        // Debounce the display update to improve responsiveness
        scheduleDisplayUpdate()
    }
    
    private fun scheduleDisplayUpdate() {
        // Cancel pending update
        pendingUpdate?.let { updateHandler.removeCallbacks(it) }
        
        // Schedule new update
        pendingUpdate = Runnable {
            updateAmountDisplay()
        }
        
        // Update immediately for the first few scrolls, then debounce for fast scrolling
        if (consecutiveScrolls < 3) {
            updateAmountDisplay()
        } else {
            // Debounce by 50ms for fast scrolling to avoid UI lag
            updateHandler.postDelayed(pendingUpdate!!, 50)
        }
    }

    private fun updateAmountDisplay() {
        val displayValue = when (currentUnit) {
            AmountUnit.XEC -> currentAmountSats / 100.0
            AmountUnit.kXEC -> currentAmountSats / 100000.0
            AmountUnit.MXEC -> currentAmountSats / 100000000.0
        }
        amountText.text = String.format(Locale.US, "%.2f %s", displayValue, currentUnit.label)
    }

    private fun updateUnitDisplay() {
        // Highlight active unit with white color, dim inactive units
        val activeColor = 0xFFFFFFFF.toInt()  // White
        val inactiveColor = 0x80FFFFFF.toInt()  // 50% transparent white
        
        unitXec.setTextColor(if (currentUnit == AmountUnit.XEC) activeColor else inactiveColor)
        unitKxec.setTextColor(if (currentUnit == AmountUnit.kXEC) activeColor else inactiveColor)
        unitMxec.setTextColor(if (currentUnit == AmountUnit.MXEC) activeColor else inactiveColor)
    }

    private fun showKeyboardInput(amountInput: EditText) {
        // Pre-fill with current value
        val currentValue = when (currentUnit) {
            AmountUnit.XEC -> currentAmountSats / 100.0
            AmountUnit.kXEC -> currentAmountSats / 100000.0
            AmountUnit.MXEC -> currentAmountSats / 100000000.0
        }
        amountInput.setText(String.format(Locale.US, "%.2f", currentValue))
        amountInput.setSelection(amountInput.text.length)

        // Show keyboard
        amountInput.visibility = View.VISIBLE
        amountInput.requestFocus()
        val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.showSoftInput(amountInput, InputMethodManager.SHOW_FORCED)
    }

    private fun handleKeyboardInput(input: String) {
        try {
            val value = input.toDouble()
            val sats = when (currentUnit) {
                AmountUnit.XEC -> (value * 100).toLong()
                AmountUnit.kXEC -> (value * 100000).toLong()
                AmountUnit.MXEC -> (value * 100000000).toLong()
            }

            // Enforce minimum and maximum values
            currentAmountSats = when {
                sats < currentUnit.minValueSats -> currentUnit.minValueSats
                sats > currentUnit.maxValueSats -> currentUnit.maxValueSats
                else -> sats
            }

            updateAmountDisplay()
        } catch (e: NumberFormatException) {
            Log.e("AmountEntryManager", "Invalid number input: $input")
        }
    }

    private fun hideKeyboard() {
        amountInput.visibility = View.GONE
        val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(amountInput.windowToken, 0)
    }
}

