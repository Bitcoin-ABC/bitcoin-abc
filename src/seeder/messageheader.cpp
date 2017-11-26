// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "messageheader.h"

#include <cstring>
#include <stdexcept>
#include <vector>

#ifndef WIN32
#include <arpa/inet.h>
#endif

uint8_t pchMessageStart[4] = {0xe3, 0xe1, 0xf3, 0xe8};

CSeederMessageHeader::CSeederMessageHeader() {
    memcpy(pchMessageStart, ::pchMessageStart, sizeof(pchMessageStart));
    memset(pchCommand, 0, sizeof(pchCommand));
    pchCommand[1] = 1;
    nMessageSize = -1;
    nChecksum = 0;
}

CSeederMessageHeader::CSeederMessageHeader(const char *pszCommand,
                                           unsigned int nMessageSizeIn) {
    memcpy(pchMessageStart, ::pchMessageStart, sizeof(pchMessageStart));
    strncpy(pchCommand, pszCommand, COMMAND_SIZE);
    nMessageSize = nMessageSizeIn;
    nChecksum = 0;
}

std::string CSeederMessageHeader::GetCommand() const {
    if (pchCommand[COMMAND_SIZE - 1] == 0)
        return std::string(pchCommand, pchCommand + strlen(pchCommand));
    else
        return std::string(pchCommand, pchCommand + COMMAND_SIZE);
}

bool CSeederMessageHeader::IsValid() const {
    // Check start string
    if (memcmp(pchMessageStart, ::pchMessageStart, sizeof(pchMessageStart)) !=
        0)
        return false;

    // Check the command string for errors
    for (const char *p1 = pchCommand; p1 < pchCommand + COMMAND_SIZE; p1++) {
        if (*p1 == 0) {
            // Must be all zeros after the first zero
            for (; p1 < pchCommand + COMMAND_SIZE; p1++)
                if (*p1 != 0) return false;
        } else if (*p1 < ' ' || *p1 > 0x7E)
            return false;
    }

    // Message size
    if (nMessageSize > MAX_SIZE) {
        printf("CSeederMessageHeader::IsValid() : (%s, %u bytes) nMessageSize "
               "> MAX_SIZE\n",
               GetCommand().c_str(), nMessageSize);
        return false;
    }

    return true;
}
