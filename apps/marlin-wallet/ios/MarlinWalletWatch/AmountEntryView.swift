// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import SwiftUI

enum AmountUnit: String, CaseIterable {
    case XEC = "XEC"
    case kXEC = "kXEC"
    case MXEC = "MXEC"
    
    var baseIncrement: Int64 {
        switch self {
        case .XEC: return 1      // 0.01 XEC = 1 sat
        case .kXEC: return 1000   // 0.01 kXEC = 1000 sats
        case .MXEC: return 1000000 // 0.01 MXEC = 1000000 sats
        }
    }
    
    var minValueSats: Int64 {
        switch self {
        case .XEC: return 546      // 5.46 XEC
        case .kXEC: return 1000     // 0.01 kXEC
        case .MXEC: return 1000000  // 0.01 MXEC
        }
    }
    
    var maxValueSats: Int64 {
        switch self {
        case .XEC: return 99999999        // 999999.99 XEC
        case .kXEC: return 99999999000     // 999999.99 kXEC
        case .MXEC: return 99999999000000  // 999999.99 MXEC
        }
    }
}

struct AmountEntryView: View {
    @Binding var amountSats: Int64?
    @Binding var unit: AmountUnit
    let onApply: () -> Void
    let onClear: () -> Void
    
    @State private var currentAmountSats: Int64
    @State private var currentUnit: AmountUnit
    @State private var amountText: String
    @State private var crownValue: Double = 0.0
    @State private var isUpdatingUnit: Bool = false
    @FocusState private var isTextFieldFocused: Bool
    
    init(amountSats: Binding<Int64?>, unit: Binding<AmountUnit>, onApply: @escaping () -> Void, onClear: @escaping () -> Void) {
        self._amountSats = amountSats
        self._unit = unit
        self.onApply = onApply
        self.onClear = onClear
        
        let initialSats = amountSats.wrappedValue ?? unit.wrappedValue.minValueSats
        let initialUnit = unit.wrappedValue
        
        self._currentAmountSats = State(initialValue: initialSats)
        self._currentUnit = State(initialValue: initialUnit)
        
        // Initialize text field with formatted value using helper function
        let displayValue = Self.satsToDisplayValueStatic(initialSats, unit: initialUnit)
        self._amountText = State(initialValue: String(format: "%.2f", displayValue))
        self._crownValue = State(initialValue: displayValue)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Title
            Text("Payment Request")
                .font(.system(size: 11))
                .foregroundColor(.white)
            
            // Unit selector
            HStack(spacing: 2) {
                ForEach(AmountUnit.allCases, id: \.self) { unit in
                    Text(unit.rawValue)
                        .font(.system(size: 11))
                        .foregroundColor(currentUnit == unit ? .white : .gray)
                        .fontWeight(currentUnit == unit ? .bold : .regular)
                        .frame(width: 40)
                        .padding(.vertical, 8)
                        .onTapGesture {
                            switchUnit(to: unit)
                        }
                    
                    if unit != AmountUnit.allCases.last {
                        Text("•")
                            .font(.system(size: 11))
                            .foregroundColor(Color(white: 0.3))
                            .frame(width: 8)
                    }
                }
            }
            
            // Amount input with TextField and Digital Crown
            TextField("0.00", text: $amountText)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .focused($isTextFieldFocused)
                .focusable()
                .id(currentUnit) // Force re-render when unit changes to update Digital Crown bounds
                .digitalCrownRotation(
                    $crownValue,
                    from: satsToDisplayValue(currentUnit.minValueSats, unit: currentUnit),
                    through: satsToDisplayValue(currentUnit.maxValueSats, unit: currentUnit),
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )
                .onChange(of: crownValue) { oldValue, newValue in
                    guard !isUpdatingUnit else { return }
                    
                    let sats = displayValueToSats(newValue, unit: currentUnit)
                    
                    // Check if we overflowed the current unit's max
                    if sats > currentUnit.maxValueSats {
                        handleUnitOverflow(sats: sats)
                    } else {
                        // Update amount within current unit bounds
                        updateAmount(sats: sats, displayValue: newValue)
                    }
                }
                .onChange(of: amountText) { oldValue, newValue in
                    let validText = sanitizeTextInput(newValue)
                    
                    if validText != newValue {
                        amountText = validText
                        return
                    }
                    
                    updateAmountFromText(validText)
                    syncCrownToText(validText)
                }
                .padding(.vertical, 8)
            
            Spacer()
            
            // Action buttons
            HStack(spacing: 12) {
                Button(action: {
                    onClear()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 44, height: 44)
                        Text("✕")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
                
                    Button(action: {
                        amountSats = currentAmountSats
                        unit = currentUnit
                        onApply()
                    }) {
                    ZStack {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 44, height: 44)
                        Text("✓")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 8)
        }
        .padding(.horizontal, 8)
        .background(Color.black)
    }
    
    /// Convert sats to display value in the specified unit (static for use in init)
    private static func satsToDisplayValueStatic(_ sats: Int64, unit: AmountUnit) -> Double {
        let valueInXEC = Double(sats) / 100.0
        
        switch unit {
        case .XEC:
            return valueInXEC
        case .kXEC:
            return valueInXEC / 1000.0
        case .MXEC:
            return valueInXEC / 1000000.0
        }
    }
    
    /// Convert sats to display value in the current unit
    private func satsToDisplayValue(_ sats: Int64, unit: AmountUnit) -> Double {
        return Self.satsToDisplayValueStatic(sats, unit: unit)
    }
    
    /// Convert display value in the current unit to sats
    private func displayValueToSats(_ displayValue: Double, unit: AmountUnit) -> Int64 {
        let valueInXEC: Double
        
        switch unit {
        case .XEC:
            valueInXEC = displayValue
        case .kXEC:
            valueInXEC = displayValue * 1000.0
        case .MXEC:
            valueInXEC = displayValue * 1000000.0
        }
        
        return Int64(valueInXEC * 100.0)
    }
    
    /// Handle unit overflow when crown value exceeds current unit's max
    private func handleUnitOverflow(sats: Int64) {
        isUpdatingUnit = true
        
        // Determine next unit or clamp if already at max
        let newUnit: AmountUnit
        switch currentUnit {
        case .XEC:
            newUnit = .kXEC
        case .kXEC:
            newUnit = .MXEC
        case .MXEC:
            // Already at highest unit, clamp to max
            updateAmount(sats: currentUnit.maxValueSats, displayValue: satsToDisplayValue(currentUnit.maxValueSats, unit: currentUnit))
            isUpdatingUnit = false
            return
        }
        
        // Switch to new unit and update display
        currentUnit = newUnit
        let clampedSats = min(sats, newUnit.maxValueSats)
        updateAmount(sats: clampedSats, displayValue: satsToDisplayValue(clampedSats, unit: newUnit))
        
        // Re-enable updates after view refresh
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.isUpdatingUnit = false
        }
    }
    
    /// Update the current amount and sync UI
    private func updateAmount(sats: Int64, displayValue: Double) {
        currentAmountSats = min(max(sats, currentUnit.minValueSats), currentUnit.maxValueSats)
        
        let formatted = String(format: "%.2f", displayValue)
        if amountText != formatted {
            amountText = formatted
        }
        if abs(crownValue - displayValue) > 0.001 {
            crownValue = displayValue
        }
    }
    
    /// Sanitize text input to only allow valid numeric input
    private func sanitizeTextInput(_ text: String) -> String {
        // Filter to only allow digits and decimal point
        let filtered = text.filter { "0123456789.,".contains($0) }
            .replacingOccurrences(of: ",", with: ".")
        
        // Ensure only one decimal point
        let components = filtered.components(separatedBy: ".")
        if components.count > 2 {
            return components[0] + "." + components.dropFirst().joined()
        }
        return filtered
    }
    
    /// Update amount from text input
    private func updateAmountFromText(_ text: String) {
        guard let displayValue = Double(text.replacingOccurrences(of: ",", with: ".")) else {
            return
        }
        
        let sats = displayValueToSats(displayValue, unit: currentUnit)
        currentAmountSats = min(max(sats, currentUnit.minValueSats), currentUnit.maxValueSats)
    }
    
    /// Sync crown value to match text input
    private func syncCrownToText(_ text: String) {
        guard let value = Double(text), abs(value - crownValue) > 0.001 else {
            return
        }
        crownValue = value
    }
    
    /// Switch to a different unit (user tapped unit selector)
    private func switchUnit(to newUnit: AmountUnit) {
        currentUnit = newUnit
        
        // Adjust amount if below new unit's minimum
        if currentAmountSats < newUnit.minValueSats {
            currentAmountSats = newUnit.minValueSats
        }
        
        // Round and clamp to new unit's bounds
        roundToCurrentUnit()
        currentAmountSats = min(max(currentAmountSats, newUnit.minValueSats), newUnit.maxValueSats)
        
        // Update UI
        let displayValue = satsToDisplayValue(currentAmountSats, unit: currentUnit)
        amountText = String(format: "%.2f", displayValue)
        crownValue = displayValue
    }
    
    /// Round amount to 2 decimal places in current unit
    private func roundToCurrentUnit() {
        let displayValue = satsToDisplayValue(currentAmountSats, unit: currentUnit)
        let rounded = (displayValue * 100.0).rounded() / 100.0
        currentAmountSats = displayValueToSats(rounded, unit: currentUnit)
    }
    
}


