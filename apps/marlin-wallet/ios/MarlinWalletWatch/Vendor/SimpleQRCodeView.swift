// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import SwiftUI

/// Simple QR Code view for watchOS using vendored QRCodeGenerator
struct SimpleQRCodeView: View {
    let content: String
    let size: CGFloat
    
    var body: some View {
        if let image = generateQRCode() {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .aspectRatio(1.0, contentMode: .fit)
                .frame(width: size, height: size)
        } else {
            Text("QR Error")
                .foregroundColor(.red)
        }
    }
    
    private func generateQRCode() -> UIImage? {
        guard let qrCode = try? QRCode.encode(text: content, ecl: .low) else {
            return nil
        }
        
        let size = qrCode.size
        let scale = 10 // 10 pixels per module for crisp display
        let imageSize = size * scale
        
        // Create bitmap context
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
            data: nil,
            width: imageSize,
            height: imageSize,
            bitsPerComponent: 8,
            bytesPerRow: imageSize,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return nil
        }
        
        // Draw QR code modules
        for y in 0..<size {
            for x in 0..<size {
                let module = qrCode.getModule(x: x, y: y)
                let color: UInt8 = module ? 0 : 255 // Black for modules, white for spaces
                
                let rect = CGRect(
                    x: x * scale,
                    y: y * scale,
                    width: scale,
                    height: scale
                )
                
                context.setFillColor(gray: CGFloat(color) / 255.0, alpha: 1.0)
                context.fill(rect)
            }
        }
        
        guard let cgImage = context.makeImage() else {
            return nil
        }
        
        return UIImage(cgImage: cgImage)
    }
}

