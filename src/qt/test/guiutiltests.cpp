// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "guiutiltests.h"
#include "chainparams.h"
#include "config.h"
#include "dstencode.h"
#include "guiutil.h"
#include "receiverequestdialog.h"

namespace {

class UtilCfgDummy : public DummyConfig {
public:
    UtilCfgDummy() : useCashAddr(false) {}
    void SetCashAddrEncoding(bool b) override { useCashAddr = b; }
    bool UseCashAddrEncoding() const override { return useCashAddr; }
    const CChainParams &GetChainParams() const override {
        return Params(CBaseChainParams::MAIN);
    }

private:
    bool useCashAddr;
};

} // namespace

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

void GUIUtilTests::toCurrentEncodingTest() {
    UtilCfgDummy config;

    // garbage in, garbage out
    QVERIFY(ToCurrentEncoding("garbage", config) == "garbage");

    QString cashaddr_pubkey =
        "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a";
    QString base58_pubkey = "1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu";

    config.SetCashAddrEncoding(true);
    QVERIFY(ToCurrentEncoding(cashaddr_pubkey, config) == cashaddr_pubkey);
    QVERIFY(ToCurrentEncoding(base58_pubkey, config) == cashaddr_pubkey);

    config.SetCashAddrEncoding(false);
    QVERIFY(ToCurrentEncoding(cashaddr_pubkey, config) == base58_pubkey);
    QVERIFY(ToCurrentEncoding(base58_pubkey, config) == base58_pubkey);
}
