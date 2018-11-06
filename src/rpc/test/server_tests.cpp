#include "rpc/server.h"
#include "test/test_bitcoin.h"
#include "util.h"

#include <cstdint>
#include <vector>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(server_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(server_IsDeprecatedRPCEnabled) {
    ArgsManager testArgs;
    const char *argv_test[] = {"bitcoind", "-deprecatedrpc=foo",
                               "-deprecatedrpc=bar"};

    testArgs.ParseParameters(3, (char **)argv_test);
    BOOST_CHECK(IsDeprecatedRPCEnabled(testArgs, "foo") == true);
    BOOST_CHECK(IsDeprecatedRPCEnabled(testArgs, "bar") == true);
    BOOST_CHECK(IsDeprecatedRPCEnabled(testArgs, "bob") == false);
}

BOOST_AUTO_TEST_SUITE_END()
