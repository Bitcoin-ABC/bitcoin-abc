#if 0
#include "omnicore/sp.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <stdint.h>
#include <limits>
#include <utility>

BOOST_FIXTURE_TEST_SUITE(omnicore_crowdsale_participation_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(overpayment_close)
{

    uint16_t   precision = 2;
    int64_t amountInvested = 300000000;
    uint8_t earlyBirdBonus = 10;
    int64_t deadline = 1535644800;
    int64_t timestamp = 1407877014LL;
    int64_t amountPerUnitInvested = 10000000000;
    int soldTokens = 0;
    int64_t totalTokens = 200000000;
    int64_t purchasedTokens = 0;
    int64_t refund = 0;
    bool fClosed = false;

    //txid : db7782198b2640aa8891453fd5077968d1642bfa5947f839396ce77f8e51d286
    mastercore::calculateFundraiser(precision, amountInvested, earlyBirdBonus, deadline,
                                    timestamp, amountPerUnitInvested, soldTokens , totalTokens, purchasedTokens,
                                    fClosed, refund);

    BOOST_CHECK(fClosed);
    BOOST_CHECK_EQUAL(8384883669867978007LL, tokensCreated.first); // user
}

/*
 * void mastercore::calculateFundraiser(uint16_t tokenPrecision, int64_t transfer,
                                     uint8_t bonusPerc, int64_t closeSeconds,
                                     int64_t currentSeconds, int64_t price,
                                     int64_t soldTokens, int64_t totalTokens,
                                     int64_t &purchasedTokens,
                                     bool &closeCrowdsale, int64_t &refund) {
 * */

#if 0
BOOST_AUTO_TEST_CASE(max_limits)
{
    int64_t amountPerUnitInvested = std::numeric_limits<int64_t>::max();
    int64_t deadline = std::numeric_limits<int64_t>::max();
    uint8_t earlyBirdBonus = std::numeric_limits<uint8_t>::max();
    uint8_t issuerBonus = std::numeric_limits<uint8_t>::max();

    int64_t timestamp = 0;
    int64_t amountInvested = std::numeric_limits<int64_t>::max();

    int64_t totalTokens = std::numeric_limits<int64_t>::max() - 1LL;
    std::pair<int64_t, int64_t> tokensCreated;
    bool fClosed = false;

    mastercore::calculateFundraiser(true, amountInvested, earlyBirdBonus, deadline,
            timestamp, amountPerUnitInvested, issuerBonus, totalTokens,
            tokensCreated, fClosed);

    BOOST_CHECK(fClosed);
    BOOST_CHECK_EQUAL(1, tokensCreated.first);  // user
    BOOST_CHECK_EQUAL(0, tokensCreated.second); // issuer
}

BOOST_AUTO_TEST_CASE(negative_time)
{
    int64_t amountPerUnitInvested = 50;
    int64_t deadline = 500000000;
    uint8_t earlyBirdBonus = 255;
    uint8_t issuerBonus = 19;

    int64_t timestamp = 500007119;
    int64_t amountInvested = 1000000000L;

    int64_t totalTokens = 0;
    std::pair<int64_t, int64_t> tokensCreated;
    bool fClosed = false;

    mastercore::calculateFundraiser(false, amountInvested, earlyBirdBonus, deadline,
            timestamp, amountPerUnitInvested, issuerBonus, totalTokens,
            tokensCreated, fClosed);

    BOOST_CHECK(!fClosed);
    BOOST_CHECK_EQUAL(500, tokensCreated.first); // user
    BOOST_CHECK_EQUAL(95, tokensCreated.second); // issuer
}
#endif

BOOST_AUTO_TEST_SUITE_END()
#endif