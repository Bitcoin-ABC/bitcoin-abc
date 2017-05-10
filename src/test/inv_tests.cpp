// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "protocol.h"

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(inv_tests)

static void CheckType(int type, int expected, bool IsTx, bool IsBlock) {
    CInv inv(type, uint256());
    BOOST_CHECK_EQUAL(inv.GetKind(), expected);
    BOOST_CHECK_EQUAL(inv.IsTx(), IsTx);
    BOOST_CHECK_EQUAL(inv.IsSomeBlock(), IsBlock);
}

/* Validate various inv facilities. */
BOOST_AUTO_TEST_CASE(validate_kind) {
    CheckType(GetDataMsg::UNDEFINED, GetDataMsg::UNDEFINED, false, false);
    CheckType(GetDataMsg::MSG_TX, GetDataMsg::MSG_TX, true, false);
    CheckType(GetDataMsg::MSG_BLOCK, GetDataMsg::MSG_BLOCK, false, true);
    CheckType(GetDataMsg::MSG_FILTERED_BLOCK, GetDataMsg::MSG_FILTERED_BLOCK,
              false, true);
    CheckType(GetDataMsg::MSG_CMPCT_BLOCK, GetDataMsg::MSG_CMPCT_BLOCK, false,
              true);
    CheckType(GetDataMsg::MSG_EXT_TX, GetDataMsg::MSG_TX, true, false);
    CheckType(GetDataMsg::MSG_EXT_BLOCK, GetDataMsg::MSG_BLOCK, false, true);
}

BOOST_AUTO_TEST_SUITE_END()
