// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_MESSAGEWRITER_H
#define BITCOIN_SEEDER_MESSAGEWRITER_H

#include <config.h>
#include <net.h>
#include <netmessagemaker.h>

namespace MessageWriter {

template <typename... Args>
static void WriteMessage(CDataStream &stream, std::string command,
                         Args &&...args) {
    CSerializedNetMsg payload = CNetMsgMaker(stream.GetVersion())
                                    .Make(command, std::forward<Args>(args)...);

    // Serialize header
    std::vector<uint8_t> serializedHeader;
    V1TransportSerializer serializer = V1TransportSerializer();
    serializer.prepareForTransport(GetConfig(), payload, serializedHeader);

    // Write message header + payload to outgoing stream
    stream.write(MakeByteSpan(serializedHeader));
    if (payload.data.size()) {
        stream.write(MakeByteSpan(payload.data));
    }
}

} // namespace MessageWriter

#endif // BITCOIN_SEEDER_MESSAGEWRITER_H
