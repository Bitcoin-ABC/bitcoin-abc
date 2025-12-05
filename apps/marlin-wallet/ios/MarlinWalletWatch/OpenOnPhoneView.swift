// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import SwiftUI

struct OpenOnPhoneView: View {
    let onTap: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "iphone")
                .font(.system(size: 48))
                .foregroundColor(.white)
            
            Text("Open the phone app\nto initialize")
                .font(.system(size: 14))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
        }
        .onTapGesture {
            onTap()
        }
    }
}

#Preview {
    OpenOnPhoneView(onTap: {})
}

