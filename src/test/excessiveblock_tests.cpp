// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/consensus.h>
#include <rpc/server.h>
#include <util/ref.h>
#include <util/string.h>

#include <test/util/setup_common.h>

#include <boost/algorithm/string.hpp>
#include <boost/test/unit_test.hpp>

#include <limits>
#include <string>

extern UniValue CallRPC(const std::string &args, const util::Ref &context);

class ExcessiveBlockTestingSetup : public TestingSetup {
public:
    ExcessiveBlockTestingSetup()
        : TestingSetup(CBaseChainParams::MAIN,
                       {"-deprecatedrpc=setexcessiveblock"}){};

    UniValue CallRPC(const std::string &args) {
        const util::Ref context{m_node};
        return ::CallRPC(args, context);
    }
};

BOOST_FIXTURE_TEST_SUITE(excessiveblock_tests, ExcessiveBlockTestingSetup)

BOOST_AUTO_TEST_CASE(excessiveblock_rpc) {
    BOOST_CHECK_NO_THROW(CallRPC("getexcessiveblock"));

    BOOST_CHECK_THROW(CallRPC("setexcessiveblock"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock not_uint"),
                      std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock 1000000 not_uint"),
                      std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock 1000000 1"),
                      std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock -1"), std::runtime_error);

    BOOST_CHECK_THROW(CallRPC("setexcessiveblock 0"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock 1"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setexcessiveblock 1000"), std::runtime_error);
    BOOST_CHECK_THROW(
        CallRPC(std::string("setexcessiveblock ") + ToString(ONE_MEGABYTE - 1)),
        std::runtime_error);
    BOOST_CHECK_THROW(
        CallRPC(std::string("setexcessiveblock ") + ToString(ONE_MEGABYTE)),
        std::runtime_error);

    BOOST_CHECK_NO_THROW(CallRPC(std::string("setexcessiveblock ") +
                                 ToString(ONE_MEGABYTE + 1)));
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setexcessiveblock ") +
                                 ToString(ONE_MEGABYTE + 10)));

    // Default can be higher than 1MB in future - test it too
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setexcessiveblock ") +
                                 ToString(DEFAULT_MAX_BLOCK_SIZE)));
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setexcessiveblock ") +
                                 ToString(DEFAULT_MAX_BLOCK_SIZE * 8)));

    BOOST_CHECK_NO_THROW(
        CallRPC(std::string("setexcessiveblock ") +
                ToString(std::numeric_limits<int64_t>::max())));

    BOOST_CHECK_THROW(
        CallRPC(std::string("setexcessiveblock ") +
                ToString(uint64_t(std::numeric_limits<int64_t>::max()) + 1)),
        std::runtime_error);

    BOOST_CHECK_THROW(CallRPC(std::string("setexcessiveblock ") +
                              ToString(std::numeric_limits<uint64_t>::max())),
                      std::runtime_error);
}

BOOST_AUTO_TEST_SUITE_END()
