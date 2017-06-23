// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "config.h"
#include "consensus/consensus.h"
#include "rpc/server.h"
#include "test/test_bitcoin.h"
#include "validation.h"

#include <boost/algorithm/string.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/test/unit_test.hpp>
#include <limits>
#include <string>

extern UniValue CallRPC(std::string strMethod);

BOOST_FIXTURE_TEST_SUITE(uahfstarttime_tests, TestChain100Setup)

BOOST_AUTO_TEST_CASE(uahfstarttime_rpc) {
    GlobalConfig config;
    const int HOUR = 60 * 60;

    // Check simple get
    BOOST_CHECK_NO_THROW(CallRPC("getuahfstarttime"));

    // Check set with invalid arguments
    BOOST_CHECK_THROW(CallRPC("setuahfstarttime"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("setuahfstarttime not_uint"),
                      boost::bad_lexical_cast);
    BOOST_CHECK_THROW(CallRPC("setuahfstarttime -1"), boost::bad_lexical_cast);
    BOOST_CHECK_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(std::numeric_limits<int64_t>::min())),
        boost::bad_lexical_cast);

    BOOST_CHECK_THROW(CallRPC("setuahfstarttime 0"), std::runtime_error);
    // Check setting to within <= 2 hours past current chain tip MTP
    LOCK(cs_main);
    int64_t chain_mtp = chainActive.Tip()->GetMedianTimePast();
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 2 * HOUR - 1)),
                      std::runtime_error);
    // Exactly 2 hours past is also not allowed, must be greater
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 2 * HOUR)),
                      std::runtime_error);

    // 2 hours + 1 second past is ok
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setuahfstarttime ") +
                                 std::to_string(chain_mtp + 2 * HOUR + 1)));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(), chain_mtp + 2 * HOUR + 1);

    // Check some reasonable values...
    // Default value + 1 day
    BOOST_CHECK_NO_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(DEFAULT_UAHF_START_TIME + 24 * HOUR)));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(),
                      DEFAULT_UAHF_START_TIME + 24 * HOUR);
    // Default value + 1 month
    BOOST_CHECK_NO_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(DEFAULT_UAHF_START_TIME + 30 * 24 * HOUR)));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(),
                      DEFAULT_UAHF_START_TIME + 30 * 24 * HOUR);
    // Default value + 1 year
    BOOST_CHECK_NO_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(DEFAULT_UAHF_START_TIME + 365 * 24 * HOUR)));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(),
                      DEFAULT_UAHF_START_TIME + 365 * 24 * HOUR);

    // Check maximum
    BOOST_CHECK_NO_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(std::numeric_limits<int64_t>::max())));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(),
                      std::numeric_limits<int64_t>::max());

    // Go to just before UAHF activation
    config.SetUAHFStartTime(DEFAULT_UAHF_START_TIME);
    int64_t hfStartTime = config.GetUAHFStartTime();
    BOOST_CHECK_EQUAL(hfStartTime, DEFAULT_UAHF_START_TIME);
    auto pindex = chainActive.Tip();
    for (size_t i = 0; pindex && i < 5; i++) {
        pindex->nTime = hfStartTime - 1;
        pindex = pindex->pprev;
    }
    chain_mtp = chainActive.Tip()->GetMedianTimePast();
    BOOST_CHECK(chain_mtp < hfStartTime);

    // Check that still allowed to update with minimum value 2hrs+1sec past
    // chain tip MTP
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setuahfstarttime ") +
                                 std::to_string(chain_mtp + 2 * HOUR + 1)));
    BOOST_CHECK_EQUAL(config.GetUAHFStartTime(), chain_mtp + 2 * HOUR + 1);

    // Now activate UAHF
    hfStartTime = config.GetUAHFStartTime();
    BOOST_CHECK_EQUAL(hfStartTime, chain_mtp + 2 * HOUR + 1);
    pindex = chainActive.Tip();
    for (size_t i = 0; pindex && i < 11; i++) {
        pindex->nTime = hfStartTime;
        pindex = pindex->pprev;
    }
    chain_mtp = chainActive.Tip()->GetMedianTimePast();
    BOOST_CHECK_EQUAL(chain_mtp, hfStartTime);
    // Check that not allowed to update anymore
    // update to 2hrs+1sec past chain tip MTP is no longer accepted
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 2 * HOUR + 1)),
                      std::runtime_error);
    // update to MTP+1sec is also not accepted
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 1)),
                      std::runtime_error);
    // previously "reasonable" values are also not accepted anymore
    // chain tip MTP + 1 day
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 24 * HOUR)),
                      std::runtime_error);
    // chain tip MTP + 1 month
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 30 * 24 * HOUR)),
                      std::runtime_error);
    // chain tip MTP + 1 year
    BOOST_CHECK_THROW(CallRPC(std::string("setuahfstarttime ") +
                              std::to_string(chain_mtp + 365 * 24 * HOUR)),
                      std::runtime_error);
    // Not even maximum is accepted any longer
    BOOST_CHECK_THROW(
        CallRPC(std::string("setuahfstarttime ") +
                std::to_string(std::numeric_limits<int64_t>::max())),
        std::runtime_error);
}

BOOST_AUTO_TEST_SUITE_END()
