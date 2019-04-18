// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/guiutiltests.h>

#include <chainparams.h>
#include <config.h>
#include <dstencode.h>
#include <qt/guiutil.h>

namespace {

class GUIUtilTestConfig : public DummyConfig {
public:
    GUIUtilTestConfig()
        : DummyConfig(CBaseChainParams::MAIN), useCashAddr(false) {}
    void SetCashAddrEncoding(bool b) override { useCashAddr = b; }
    bool UseCashAddrEncoding() const override { return useCashAddr; }

private:
    bool useCashAddr;
};

} // namespace

void GUIUtilTests::dummyAddressTest() {
    GUIUtilTestConfig config;
    const CChainParams &params = config.GetChainParams();

    std::string dummyaddr;

    config.SetCashAddrEncoding(false);
    dummyaddr = GUIUtil::DummyAddress(config);
    QVERIFY(!IsValidDestinationString(dummyaddr, params));
    QVERIFY(!dummyaddr.empty());

    config.SetCashAddrEncoding(true);
    dummyaddr = GUIUtil::DummyAddress(config);
    QVERIFY(!IsValidDestinationString(dummyaddr, params));
    QVERIFY(!dummyaddr.empty());
}

void GUIUtilTests::toCurrentEncodingTest() {
    GUIUtilTestConfig config;

    // garbage in, garbage out
    QVERIFY(GUIUtil::convertToConfiguredAddressFormat(config, "garbage") ==
            "garbage");

    QString cashaddr_pubkey =
        "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a";
    QString base58_pubkey = "1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu";

    config.SetCashAddrEncoding(true);
    QVERIFY(GUIUtil::convertToConfiguredAddressFormat(
                config, cashaddr_pubkey) == cashaddr_pubkey);
    QVERIFY(GUIUtil::convertToConfiguredAddressFormat(config, base58_pubkey) ==
            cashaddr_pubkey);

    config.SetCashAddrEncoding(false);
    QVERIFY(GUIUtil::convertToConfiguredAddressFormat(
                config, cashaddr_pubkey) == base58_pubkey);
    QVERIFY(GUIUtil::convertToConfiguredAddressFormat(config, base58_pubkey) ==
            base58_pubkey);
}
