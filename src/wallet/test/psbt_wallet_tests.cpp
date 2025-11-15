// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key_io.h>
#include <util/bip32.h>
#include <util/error.h>
#include <util/strencodings.h>
#include <wallet/test/wallet_test_fixture.h>
#include <wallet/wallet.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(psbt_wallet_tests, WalletTestingSetup)

BOOST_AUTO_TEST_CASE(psbt_updater_test) {
    auto spk_man = m_wallet.GetOrCreateLegacyScriptPubKeyMan();
    LOCK2(m_wallet.cs_wallet, spk_man->cs_KeyStore);

    // Create prevtxs and add to wallet
    DataStream s_prev_tx1{
        ParseHex("020000000158e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f54"
                 "5887bb2abdd7501000000171600145f275f436b09a8cc9a2eb2a2f528485c"
                 "68a56323feffffff02d8231f1b0100000017a914aed962d6654f9a2b36608"
                 "eb9d64d2b260db4f1118700c2eb0b0000000017a914f6539307e3a48d1e01"
                 "36d061f5d1fe19e1a240898765000000")};

    CTransactionRef prev_tx1;
    s_prev_tx1 >> prev_tx1;
    m_wallet.mapWallet.emplace(std::piecewise_construct,
                               std::forward_as_tuple(prev_tx1->GetId()),
                               std::forward_as_tuple(prev_tx1));

    DataStream s_prev_tx2{ParseHex(
        "0200000001aad73931018bd25f84ae400b68848be09db706eac2ac18298babee71"
        "ab656f8b0000000048473044022058f6fc7c6a33e1b31548d481c826c015bd3013"
        "5aad42cd67790dab66d2ad243b02204a1ced2604c6735b6393e5b41691dd78b00f"
        "0c5942fb9f751856faa938157dba01feffffff0280f0fa020000000017a9140fb9"
        "463421696b82c833af241c78c17ddbde493487d0f20a270100000017a91429ca74"
        "f8a08f81999428185c97b5d852e4063f618765000000")};
    CTransactionRef prev_tx2;
    s_prev_tx2 >> prev_tx2;
    m_wallet.mapWallet.emplace(std::piecewise_construct,
                               std::forward_as_tuple(prev_tx2->GetId()),
                               std::forward_as_tuple(prev_tx2));

    // Add scripts
    CScript rs1;
    DataStream s_rs1{
        ParseHex("475221029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c218"
                 "3f1ab96e07f2102dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54"
                 "dae4dba2fbfef536d752ae")};
    s_rs1 >> rs1;
    spk_man->AddCScript(rs1);

    CScript rs2;
    DataStream s_rs2{
        ParseHex("47522103089dc10c7ac6db54f91329af617333db388cead0c231f723379d1"
                 "b99030b02dc21023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e8"
                 "6151926860221f0e7352ae")};
    s_rs2 >> rs2;
    spk_man->AddCScript(rs2);

    // Add hd seed
    // Mainnet and uncompressed form of
    // cUkG8i1RFfWGWy5ziR11zJ5V4U4W3viSFCfyJmZnvQaUsd1xuF3T
    CKey key =
        DecodeSecret("5KSSJQ7UNfFGwVgpCZDSHm5rVNhMFcFtvWM3zQ8mW4qNDEN7LFd");
    CPubKey master_pub_key = spk_man->DeriveNewSeed(key);
    spk_man->SetHDSeed(master_pub_key);
    spk_man->NewKeyPool();

    // Call FillPSBT
    PartiallySignedTransaction psbtx;
    CDataStream ssData(
        ParseHex("70736274ff0100a0020000000258e87a21b56daf0c23be8e7070456c336f7"
                 "cbaa5c8757924f545887bb2abdd750000000000ffffffff6b04ec37326fba"
                 "c8e468a73bf952c8877f84f96c3f9deadeab246455e34fe0cd0100000000f"
                 "fffffff0270aaf008000000001976a914d85c2b71d0060b09c9886aeb815e"
                 "50991dda124d88ac00e1f505000000001976a91400aea9a2e5f0f876a588d"
                 "f5546e8742d1d87008f88ac000000000000000000"),
        SER_NETWORK, PROTOCOL_VERSION);
    ssData >> psbtx;

    // FIXME: input 2 hd path is missing.
    // The path missing comes from the HD masterkey.

    // Fill transaction with our data
    bool complete = true;
    BOOST_REQUIRE_EQUAL(
        m_wallet.FillPSBT(psbtx, complete, SigHashType(), false, true),
        TransactionError::OK);

    // Get the final tx
    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
    ssTx << psbtx;
    std::string final_hex = HexStr(ssTx);
    BOOST_CHECK_EQUAL(
        final_hex,
        "70736274ff0100a0020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c875"
        "7924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c887"
        "7f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf0080000000019"
        "76a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976"
        "a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac000000000001002080f0fa"
        "020000000017a9140fb9463421696b82c833af241c78c17ddbde493487010447522102"
        "9583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f2102da"
        "b61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d752ae2206"
        "029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f10d9"
        "0c6a4f000000800000008000000080220602dab61ff49a14db6a7d02b0cd1fbb78fc4b"
        "18312b5b4e54dae4dba2fbfef536d710d90c6a4f000000800000008001000080000100"
        "2000c2eb0b0000000017a914f6539307e3a48d1e0136d061f5d1fe19e1a24089870104"
        "47522103089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02"
        "dc21023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e73"
        "52ae2206023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f"
        "0e7310d90c6a4f000000800000008003000080220603089dc10c7ac6db54f91329af61"
        "7333db388cead0c231f723379d1b99030b02dc10d90c6a4f0000008000000080020000"
        "8000220203a9a4c37f5996d3aa25dbac6b570af0650394492942460b354753ed9eeca5"
        "877110d90c6a4f000000800000008004000080002202027f6399757d2eff55a136ad02"
        "c684b1838b6556e5f1b6b34282a94b6b5005109610d90c6a4f00000080000000800500"
        "008000");
}

BOOST_AUTO_TEST_CASE(parse_hd_keypath) {
    std::vector<uint32_t> keypath;

    BOOST_CHECK(ParseHDKeypath(
        "1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1", keypath));
    BOOST_CHECK(!ParseHDKeypath("///////////////////////////", keypath));

    BOOST_CHECK(ParseHDKeypath(
        "1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1'/1", keypath));
    BOOST_CHECK(!ParseHDKeypath("//////////////////////////'/", keypath));

    BOOST_CHECK(ParseHDKeypath(
        "1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/", keypath));
    BOOST_CHECK(!ParseHDKeypath("1///////////////////////////", keypath));

    BOOST_CHECK(ParseHDKeypath(
        "1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1/1'/", keypath));
    BOOST_CHECK(!ParseHDKeypath("1/'//////////////////////////", keypath));

    BOOST_CHECK(ParseHDKeypath("", keypath));
    BOOST_CHECK(!ParseHDKeypath(" ", keypath));

    BOOST_CHECK(ParseHDKeypath("0", keypath));
    BOOST_CHECK(!ParseHDKeypath("O", keypath));

    BOOST_CHECK(ParseHDKeypath("0000'/0000'/0000'", keypath));
    BOOST_CHECK(!ParseHDKeypath("0000,/0000,/0000,", keypath));

    BOOST_CHECK(ParseHDKeypath("01234", keypath));
    BOOST_CHECK(!ParseHDKeypath("0x1234", keypath));

    BOOST_CHECK(ParseHDKeypath("1", keypath));
    BOOST_CHECK(!ParseHDKeypath(" 1", keypath));

    BOOST_CHECK(ParseHDKeypath("42", keypath));
    BOOST_CHECK(!ParseHDKeypath("m42", keypath));

    // 4294967295 == 0xFFFFFFFF (uint32_t max)
    BOOST_CHECK(ParseHDKeypath("4294967295", keypath));
    // 4294967296 == 0xFFFFFFFF (uint32_t max) + 1
    BOOST_CHECK(!ParseHDKeypath("4294967296", keypath));

    BOOST_CHECK(ParseHDKeypath("m", keypath));
    BOOST_CHECK(!ParseHDKeypath("n", keypath));

    BOOST_CHECK(ParseHDKeypath("m/", keypath));
    BOOST_CHECK(!ParseHDKeypath("n/", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0", keypath));
    BOOST_CHECK(!ParseHDKeypath("n/0", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0'", keypath));
    BOOST_CHECK(!ParseHDKeypath("m/0''", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0'/0'", keypath));
    BOOST_CHECK(!ParseHDKeypath("m/'0/0'", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0/0", keypath));
    BOOST_CHECK(!ParseHDKeypath("n/0/0", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0/0/00", keypath));
    BOOST_CHECK(!ParseHDKeypath("m/0/0/f00", keypath));

    BOOST_CHECK(ParseHDKeypath("m/0/0/"
                               "00000000000000000000000000000000000000000000000"
                               "0000000000000000000000000000000000000",
                               keypath));
    BOOST_CHECK(!ParseHDKeypath("m/1/1/"
                                "1111111111111111111111111111111111111111111111"
                                "11111111111111111111111111111111111111",
                                keypath));

    BOOST_CHECK(ParseHDKeypath("m/0/00/0", keypath));
    BOOST_CHECK(!ParseHDKeypath("m/0'/00/'0", keypath));

    BOOST_CHECK(ParseHDKeypath("m/1/", keypath));
    BOOST_CHECK(!ParseHDKeypath("m/1//", keypath));

    // 4294967295 == 0xFFFFFFFF (uint32_t max)
    BOOST_CHECK(ParseHDKeypath("m/0/4294967295", keypath));
    // 4294967296 == 0xFFFFFFFF (uint32_t max) + 1
    BOOST_CHECK(!ParseHDKeypath("m/0/4294967296", keypath));

    // 4294967295 == 0xFFFFFFFF (uint32_t max)
    BOOST_CHECK(ParseHDKeypath("m/4294967295", keypath));
    // 4294967296 == 0xFFFFFFFF (uint32_t max) + 1
    BOOST_CHECK(!ParseHDKeypath("m/4294967296", keypath));
}

BOOST_AUTO_TEST_SUITE_END()
