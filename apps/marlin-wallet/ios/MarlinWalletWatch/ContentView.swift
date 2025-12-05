// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import SwiftUI

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var showAmountEntry = false
    @State private var paymentAmountSats: Int64? = nil
    @State private var paymentUnit: AmountUnit = .XEC
    
    var body: some View {
        NavigationStack {
            Group {
                if let walletData = connectivityManager.walletData {
                    // Show QR code with wallet address
                    if showAmountEntry {
                        AmountEntryView(
                            amountSats: $paymentAmountSats,
                            unit: $paymentUnit,
                            onApply: {
                                showAmountEntry = false
                            },
                            onClear: {
                                paymentAmountSats = nil
                                showAmountEntry = false
                            }
                        )
                    } else {
                        QRCodeView(
                            walletData: walletData,
                            amountSats: paymentAmountSats,
                            amountUnit: paymentUnit,
                            onTapQRCode: {
                                showAmountEntry = true
                            }
                        )
                    }
                } else {
                    // Show "open on phone" screen
                    OpenOnPhoneView {
                        connectivityManager.openPhoneApp()
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct QRCodeView: View {
    let walletData: WalletData
    let amountSats: Int64?
    let amountUnit: AmountUnit
    let onTapQRCode: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Logo section (fixed height: 20pt)
            ZStack {
                Circle()
                    .fill(Color(red: 0.0, green: 0.48, blue: 0.89))
                    .frame(width: 20, height: 20)
                
                Image("Logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 20, height: 20)
                    .clipShape(Circle())
            }
            .frame(height: 20)
            .padding(.bottom, 4)
            
            // QR Code (flexible - takes ALL remaining space)
            GeometryReader { geometry in
                let qrSize = min(geometry.size.width, geometry.size.height)
                
                SimpleQRCodeView(
                    content: createBip21Uri(),
                    size: qrSize
                )
                .frame(width: qrSize, height: qrSize)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onTapGesture {
                    onTapQRCode()
                }
            }
            
            // Amount section (fixed height: 28pt)
            Group {
                if let amountSats = amountSats {
                    Text(formatAmount(amountSats))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                } else {
                    Text(" ")
                        .font(.system(size: 12))
                }
            }
            .frame(height: 12)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .edgesIgnoringSafeArea(.bottom)
    }
    
    private func createBip21Uri() -> String {
        // Strip prefix from address if present
        let prefixlessAddress = walletData.address.contains(":") 
            ? String(walletData.address.split(separator: ":")[1])
            : walletData.address
        
        var uri = "\(walletData.bip21Prefix)\(prefixlessAddress)"
        
        // Add amount if set
        if let amountSats = amountSats {
            let amountXec = Double(amountSats) / 100.0
            uri += String(format: "?amount=%.2f", amountXec)
        }
        
        return uri
    }
    
    private func formatAmount(_ amountSats: Int64) -> String {
        let value = Double(amountSats) / 100.0
        let displayValue: Double
        
        switch amountUnit {
        case .XEC:
            displayValue = value
        case .kXEC:
            displayValue = value / 1000.0
        case .MXEC:
            displayValue = value / 1000000.0
        }
        
        return String(format: "Pay %.2f %@", displayValue, amountUnit.rawValue)
    }
}

#Preview {
    ContentView()
}

