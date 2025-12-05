/* 
 * QR Code generator library (Swift)
 * 
 * Copyright (c) Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 * Copyright (c) 2020 fwcd
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */

/// A number between 1 and 40 (inclusive).
public struct QRCodeVersion: Hashable, Comparable {
    /// The minimum version number supported in the QR Code Model 2 standard.
    public static let min = QRCodeVersion(1)
    /// The maximum version number supported in the QR Code Model 2 standard.
    public static let max = QRCodeVersion(40)

    public let value: UInt8
    
    public init(_ value: UInt8) {
        assert(1 <= value && value <= 40, "Version number out of range")
        self.value = value
    }
    
    public static func <(lhs: QRCodeVersion, rhs: QRCodeVersion) -> Bool {
        lhs.value < rhs.value
    }
}
