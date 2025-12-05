// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
package com.marlinwallet.app;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;
import java.util.Arrays;

/**
 * NFC Host Card Emulation Service
 * Emulates an NFC tag containing a BIP21 URI for payment requests
 */
public class NfcHceService extends HostApduService {
    private static final String TAG = "NfcHceService";
    
    // Static variable to hold the BIP21 URI to be shared via NFC
    private static String currentBip21Uri = null;
    
    // NDEF application AID (Android default)
    private static final String NDEF_AID = "D2760000850101";
    
    // Select NDEF application command
    private static final byte[] SELECT_NDEF_APP = hexStringToByteArray("00A4040007D2760000850101");
    
    // Capability container
    private static final byte[] CC_FILE = hexStringToByteArray("000F20003B00340406E10400FF00FF");
    
    // Status codes
    private static final byte[] SUCCESS = hexStringToByteArray("9000");
    private static final byte[] FAILED = hexStringToByteArray("6A82");
    
    // Track which file was last selected
    private static final int FILE_NONE = 0;
    private static final int FILE_CC = 1;
    private static final int FILE_NDEF = 2;
    private int selectedFile = FILE_NONE;
    
    /**
     * Set the BIP21 URI to be shared via NFC
     * @param uri The complete BIP21 URI (e.g., "ecash:address" or "ecash:address?amount=100.00")
     */
    public static void setBip21Uri(String uri) {
        currentBip21Uri = uri;
        Log.d(TAG, "eCashWallet - BIP21 URI set for NFC sharing: " + currentBip21Uri);
    }
    
    /**
     * Clear the BIP21 URI
     */
    public static void clearBip21Uri() {
        currentBip21Uri = null;
        Log.d(TAG, "eCashWallet - BIP21 URI cleared");
    }

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        // Check if we have a URI to share
        if (currentBip21Uri == null || currentBip21Uri.isEmpty()) {
            return FAILED;
        }
        
        // Handle SELECT NDEF application (allow trailing bytes)
        if (commandApdu.length >= SELECT_NDEF_APP.length && 
            Arrays.equals(Arrays.copyOf(commandApdu, SELECT_NDEF_APP.length), SELECT_NDEF_APP)) {
            selectedFile = FILE_NONE;
            return SUCCESS;
        }
        
        // Handle SELECT capability container (CC)
        if (isSelectCommand(commandApdu, (short) 0xE103)) {
            selectedFile = FILE_CC;
            return SUCCESS;
        }
        
        // Handle SELECT NDEF file
        if (isSelectCommand(commandApdu, (short) 0xE104)) {
            selectedFile = FILE_NDEF;
            return SUCCESS;
        }
        
        // Handle READ commands based on selected file
        if (isReadCommand(commandApdu) && commandApdu.length >= 5) {
            int offset = ((commandApdu[2] & 0xFF) << 8) | (commandApdu[3] & 0xFF);
            int length = commandApdu[4] & 0xFF;
            
            if (selectedFile == FILE_CC) {
                byte[] response = new byte[Math.min(CC_FILE.length - offset, length) + 2];
                System.arraycopy(CC_FILE, offset, response, 0, Math.min(CC_FILE.length - offset, length));
                System.arraycopy(SUCCESS, 0, response, response.length - 2, 2);
                return response;
            } else if (selectedFile == FILE_NDEF) {
                byte[] ndefMessage = createNdefMessage(currentBip21Uri);
                
                // Return the requested portion of the NDEF message
                int responseLength = Math.min(ndefMessage.length - offset, length);
                if (responseLength > 0 && offset < ndefMessage.length) {
                    byte[] response = new byte[responseLength + 2];
                    System.arraycopy(ndefMessage, offset, response, 0, responseLength);
                    System.arraycopy(SUCCESS, 0, response, responseLength, 2);
                    return response;
                }
            }
        }
        
        return FAILED;
    }
    
    @Override
    public void onDeactivated(int reason) {
        String reasonStr = reason == DEACTIVATION_LINK_LOSS ? "link loss" : "deselected";
        Log.d(TAG, "eCashWallet - NFC deactivated: " + reasonStr);
    }
    
    /**
     * Create an NDEF message containing a URI record
     */
    private byte[] createNdefMessage(String uri) {
        // NDEF URI Record format
        // Record header: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=0x01 (Well-Known)
        byte recordHeader = (byte) 0xD1;
        
        // Type length: 1 byte for 'U' (URI type)
        byte typeLength = 0x01;
        
        // URI identifier code for "ecash:" is not predefined, use 0x00 for no abbreviation
        byte uriIdentifier = 0x00;
        
        // Payload: identifier + URI
        byte[] uriBytes = uri.getBytes();
        byte[] payload = new byte[uriBytes.length + 1];
        payload[0] = uriIdentifier;
        System.arraycopy(uriBytes, 0, payload, 1, uriBytes.length);
        
        // Payload length
        byte payloadLength = (byte) payload.length;
        
        // Type: 'U' for URI
        byte[] type = new byte[]{'U'};
        
        // Build the NDEF record
        int recordLength = 1 + 1 + 1 + type.length + payload.length;
        byte[] record = new byte[recordLength];
        int pos = 0;
        record[pos++] = recordHeader;
        record[pos++] = typeLength;
        record[pos++] = payloadLength;
        System.arraycopy(type, 0, record, pos, type.length);
        pos += type.length;
        System.arraycopy(payload, 0, record, pos, payload.length);
        
        // Wrap in NDEF message with length prefix
        byte[] ndefMessage = new byte[record.length + 2];
        ndefMessage[0] = (byte) ((record.length >> 8) & 0xFF);
        ndefMessage[1] = (byte) (record.length & 0xFF);
        System.arraycopy(record, 0, ndefMessage, 2, record.length);
        
        return ndefMessage;
    }
    
    /**
     * Check if command is a SELECT command for a specific file
     */
    private boolean isSelectCommand(byte[] apdu, short fileId) {
        if (apdu.length < 7) return false;
        return apdu[0] == 0x00 && apdu[1] == (byte) 0xA4 && 
               apdu[2] == 0x00 && apdu[3] == 0x0C &&
               apdu[5] == (byte) ((fileId >> 8) & 0xFF) &&
               apdu[6] == (byte) (fileId & 0xFF);
    }
    
    /**
     * Check if command is a READ BINARY command
     */
    private boolean isReadCommand(byte[] apdu) {
        return apdu.length >= 5 && apdu[0] == 0x00 && apdu[1] == (byte) 0xB0;
    }
    
    /**
     * Convert hex string to byte array
     */
    private static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }
    
    /**
     * Convert byte array to hex string for logging
     */
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}

