// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "guiutiltests.h"
#include "chainparams.h"
#include "config.h"
#include "dstencode.h"
#include "guiutil.h"

namespace {

class UtilCfgDummy : public DummyConfig {
public:
    UtilCfgDummy() : useCashAddr(false) {}
    void SetCashAddrEncoding(bool b) override { useCashAddr = b; }
    bool UseCashAddrEncoding() const override { return useCashAddr; }

private:
    bool useCashAddr;
};

} // anon ns

void GUIUtilTests::dummyAddressTest() {
    CChainParams &params = Params(CBaseChainParams::MAIN);
    UtilCfgDummy cfg;
    std::string dummyaddr;

    cfg.SetCashAddrEncoding(false);
    dummyaddr = GUIUtil::DummyAddress(params, cfg);
    QVERIFY(!IsValidDestinationString(dummyaddr, params));
    QVERIFY(!dummyaddr.empty());

    cfg.SetCashAddrEncoding(true);
    dummyaddr = GUIUtil::DummyAddress(params, cfg);
    QVERIFY(!IsValidDestinationString(dummyaddr, params));
    QVERIFY(!dummyaddr.empty());
}
