#include "test/test_bitcoin.h"

#include "utilstrencodings.h"
#include "omnicore/tx.h"

#include <boost/test/unit_test.hpp>

using namespace mastercore;

BOOST_FIXTURE_TEST_SUITE(parse_tx_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(parse_erc721)
{
    CMPTransaction mp_obj;
//void Set(const std::string& s, const std::string& r, uint64_t n, const uint256& t,
//int b, unsigned int idx, unsigned char *p, unsigned int size, int encodingClassIn, uint64_t txf)
    std::vector<unsigned char> prefix = ParseHex("0000000901");

    unsigned char wormhole_content[MAX_PACKETS * PACKET_SIZE];
    memcpy(wormhole_content, prefix.data(), prefix.size());

    //case 1: all remaining bytes are '\0'.
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(mp_obj.interpret_Transaction());

    //case 2: all remaining bytes are the Name field.
    // txtype + version + action + name
    memset(wormhole_content + prefix.size(), '1', sizeof(wormhole_content) - prefix.size());
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(!mp_obj.interpret_Transaction());

    //case 3: all remaining bytes are the symbol field.
    //  txtype + version + action + name + symbol
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    wormhole_content[prefix.size()] = '1';
    memset(wormhole_content + prefix.size() + 2, '1', sizeof(wormhole_content) - prefix.size() - 2);
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(!mp_obj.interpret_Transaction());

    //case 4: all remaining bytes are the symbol field and name field is empty.
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    memset(wormhole_content + prefix.size() + 1, '1', sizeof(wormhole_content) - prefix.size() - 1);
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(!mp_obj.interpret_Transaction());

    //case 5: all remaining bytes are the data field.
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    memset(wormhole_content + prefix.size() + 2, '1', sizeof(wormhole_content) - prefix.size() - 1);
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(!mp_obj.interpret_Transaction());

    //case 6: all remaining bytes are the url field.
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    memset(wormhole_content + prefix.size() + 3, '1', sizeof(wormhole_content) - prefix.size() - 1);
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(!mp_obj.interpret_Transaction());

    //case 7: name + symbol + data + url, these field is empty; and remaining bytes are tokenNumber.
    memset(wormhole_content + prefix.size(), 0, sizeof(wormhole_content) - prefix.size());
    memset(wormhole_content + prefix.size() + 4, '1', sizeof(wormhole_content) - prefix.size() - 1);
    mp_obj.Set("", "", 0, uint256(), 0, 0, wormhole_content, sizeof(wormhole_content), 3, 1);
    BOOST_CHECK(mp_obj.interpret_Transaction());

}

BOOST_AUTO_TEST_SUITE_END()