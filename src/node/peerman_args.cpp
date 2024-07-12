#include <node/peerman_args.h>

#include <common/args.h>
#include <net_processing.h>

#include <algorithm>
#include <limits>

namespace node {

void ApplyArgsManOptions(const ArgsManager &argsman,
                         PeerManager::Options &options) {
    if (auto value{argsman.GetIntArg("-maxorphantx")}) {
        options.max_orphan_txs = uint32_t(std::clamp<int64_t>(
            *value, 0, std::numeric_limits<uint32_t>::max()));
    }

    if (auto value{argsman.GetIntArg("-blockreconstructionextratxn")}) {
        options.max_extra_txs = uint32_t(std::clamp<int64_t>(
            *value, 0, std::numeric_limits<uint32_t>::max()));
    }

    if (auto value{argsman.GetBoolArg("-capturemessages")}) {
        options.capture_messages = *value;
    }

    if (auto value{argsman.GetBoolArg("-blocksonly")}) {
        options.ignore_incoming_txs = *value;
    }

    if (auto value{argsman.GetIntArg("-maxaddrtosend")}) {
        options.max_addr_to_send = size_t(std::max(int64_t{0}, *value));
    }

    if (auto value{argsman.GetIntArg("-avacooldown")}) {
        options.avalanche_cooldown = std::max(int64_t{0}, *value);
    }

    if (auto value{argsman.GetIntArg("-avalanchepeerreplacementcooldown")}) {
        options.avalanche_peer_replacement_cooldown =
            std::max(int64_t{0}, *value);
    }

    if (auto value{argsman.GetBoolArg("-avalanchepreconsensus")}) {
        options.avalanche_preconsensus = *value;
    }
}

} // namespace node
