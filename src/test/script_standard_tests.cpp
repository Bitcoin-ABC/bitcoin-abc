// Copyright (c) 2017-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key.h>
#include <script/script.h>
#include <script/signingprovider.h>
#include <script/standard.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

// Append given push onto a script, using specific opcode (not necessarily
// the minimal one, but must be able to contain the given data.)
void AppendPush(CScript &script, opcodetype opcode,
                const std::vector<uint8_t> &b) {
    assert(opcode <= OP_PUSHDATA4);
    script.push_back(opcode);
    if (opcode < OP_PUSHDATA1) {
        assert(b.size() == opcode);
    } else if (opcode == OP_PUSHDATA1) {
        assert(b.size() <= 0xff);
        script.push_back(uint8_t(b.size()));
    } else if (opcode == OP_PUSHDATA2) {
        assert(b.size() <= 0xffff);
        uint8_t _data[2];
        WriteLE16(_data, b.size());
        script.insert(script.end(), _data, _data + sizeof(_data));
    } else if (opcode == OP_PUSHDATA4) {
        uint8_t _data[4];
        WriteLE32(_data, b.size());
        script.insert(script.end(), _data, _data + sizeof(_data));
    }
    script.insert(script.end(), b.begin(), b.end());
}

BOOST_FIXTURE_TEST_SUITE(script_standard_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(dest_default_is_no_dest) {
    CTxDestination dest;
    BOOST_CHECK(!IsValidDestination(dest));
}

BOOST_AUTO_TEST_CASE(script_standard_Solver_success) {
    CKey keys[3];
    CPubKey pubkeys[3];
    for (int i = 0; i < 3; i++) {
        keys[i].MakeNewKey(true);
        pubkeys[i] = keys[i].GetPubKey();
    }

    CScript s;
    std::vector<std::vector<uint8_t>> solutions;

    // TxoutType::PUBKEY
    s.clear();
    s << ToByteVector(pubkeys[0]) << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::PUBKEY);
    BOOST_CHECK_EQUAL(solutions.size(), 1U);
    BOOST_CHECK(solutions[0] == ToByteVector(pubkeys[0]));

    // TxoutType::PUBKEYHASH
    s.clear();
    s << OP_DUP << OP_HASH160 << ToByteVector(pubkeys[0].GetID())
      << OP_EQUALVERIFY << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::PUBKEYHASH);
    BOOST_CHECK_EQUAL(solutions.size(), 1U);
    BOOST_CHECK(solutions[0] == ToByteVector(pubkeys[0].GetID()));

    // TxoutType::SCRIPTHASH
    CScript redeemScript(s); // initialize with leftover P2PKH script
    s.clear();
    s << OP_HASH160 << ToByteVector(CScriptID(redeemScript)) << OP_EQUAL;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::SCRIPTHASH);
    BOOST_CHECK_EQUAL(solutions.size(), 1U);
    BOOST_CHECK(solutions[0] == ToByteVector(CScriptID(redeemScript)));

    // TxoutType::MULTISIG
    s.clear();
    s << OP_1 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1]) << OP_2
      << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::MULTISIG);
    BOOST_CHECK_EQUAL(solutions.size(), 4U);
    BOOST_CHECK(solutions[0] == std::vector<uint8_t>({1}));
    BOOST_CHECK(solutions[1] == ToByteVector(pubkeys[0]));
    BOOST_CHECK(solutions[2] == ToByteVector(pubkeys[1]));
    BOOST_CHECK(solutions[3] == std::vector<uint8_t>({2}));

    s.clear();
    s << OP_2 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1])
      << ToByteVector(pubkeys[2]) << OP_3 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::MULTISIG);
    BOOST_CHECK_EQUAL(solutions.size(), 5U);
    BOOST_CHECK(solutions[0] == std::vector<uint8_t>({2}));
    BOOST_CHECK(solutions[1] == ToByteVector(pubkeys[0]));
    BOOST_CHECK(solutions[2] == ToByteVector(pubkeys[1]));
    BOOST_CHECK(solutions[3] == ToByteVector(pubkeys[2]));
    BOOST_CHECK(solutions[4] == std::vector<uint8_t>({3}));

    // TxoutType::NULL_DATA
    s.clear();
    s << OP_RETURN << std::vector<uint8_t>({0}) << std::vector<uint8_t>({75})
      << std::vector<uint8_t>({255});
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NULL_DATA);
    BOOST_CHECK_EQUAL(solutions.size(), 0U);

    // TxoutType::WITNESS_V0_KEYHASH
    s.clear();
    s << OP_0 << ToByteVector(pubkeys[0].GetID());
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
    BOOST_CHECK_EQUAL(solutions.size(), 0U);

    // TxoutType::WITNESS_V0_SCRIPTHASH
    uint256 scriptHash;
    CSHA256()
        .Write(redeemScript.data(), redeemScript.size())
        .Finalize(scriptHash.begin());

    s.clear();
    s << OP_0 << ToByteVector(scriptHash);
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
    BOOST_CHECK_EQUAL(solutions.size(), 0U);

    // TxoutType::NONSTANDARD
    s.clear();
    s << OP_9 << OP_ADD << OP_11 << OP_EQUAL;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
    BOOST_CHECK_EQUAL(solutions.size(), 0);

    // Try some non-minimal PUSHDATA pushes in various standard scripts
    for (auto pushdataop : {OP_PUSHDATA1, OP_PUSHDATA2, OP_PUSHDATA4}) {
        // mutated TxoutType::PUBKEY
        s.clear();
        AppendPush(s, pushdataop, ToByteVector(pubkeys[0]));
        s << OP_CHECKSIG;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);

        // mutated TxoutType::PUBKEYHASH
        s.clear();
        s << OP_DUP << OP_HASH160;
        AppendPush(s, pushdataop, ToByteVector(pubkeys[0].GetID()));
        s << OP_EQUALVERIFY << OP_CHECKSIG;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);

        // mutated TxoutType::SCRIPTHASH
        s.clear();
        s << OP_HASH160;
        AppendPush(s, pushdataop, ToByteVector(CScriptID(redeemScript)));
        s << OP_EQUAL;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);

        // mutated TxoutType::MULTISIG -- pubkey
        s.clear();
        s << OP_1;
        AppendPush(s, pushdataop, ToByteVector(pubkeys[0]));
        s << ToByteVector(pubkeys[1]) << OP_2 << OP_CHECKMULTISIG;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);

        // mutated TxoutType::MULTISIG -- num_signatures
        s.clear();
        AppendPush(s, pushdataop, {1});
        s << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1]) << OP_2
          << OP_CHECKMULTISIG;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);

        // mutated TxoutType::MULTISIG -- num_pubkeys
        s.clear();
        s << OP_1 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1]);
        AppendPush(s, pushdataop, {2});
        s << OP_CHECKMULTISIG;
        BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
        BOOST_CHECK_EQUAL(solutions.size(), 0);
    }

    // also try pushing the num_signatures and num_pubkeys using PUSH_N opcode
    // instead of OP_N opcode:
    s.clear();
    s << std::vector<uint8_t>{1} << ToByteVector(pubkeys[0])
      << ToByteVector(pubkeys[1]) << OP_2 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
    BOOST_CHECK_EQUAL(solutions.size(), 0);
    s.clear();
    s << OP_1 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1])
      << std::vector<uint8_t>{2} << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
    BOOST_CHECK_EQUAL(solutions.size(), 0);

    // Non-minimal pushes in OP_RETURN scripts are standard (some OP_RETURN
    // protocols like SLP rely on this). Also it turns out OP_RESERVED gets past
    // IsPushOnly and thus is standard here.
    std::vector<uint8_t> op_return_nonminimal{
        OP_RETURN,    OP_RESERVED, OP_PUSHDATA1, 0x00, 0x01, 0x01,
        OP_PUSHDATA4, 0x01,        0x00,         0x00, 0x00, 0xaa};
    s.assign(op_return_nonminimal.begin(), op_return_nonminimal.end());
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NULL_DATA);
    BOOST_CHECK_EQUAL(solutions.size(), 0);
}

BOOST_AUTO_TEST_CASE(script_standard_Solver_failure) {
    CKey key;
    CPubKey pubkey;
    key.MakeNewKey(true);
    pubkey = key.GetPubKey();

    CScript s;
    std::vector<std::vector<uint8_t>> solutions;

    // TxoutType::PUBKEY with incorrectly sized pubkey
    s.clear();
    s << std::vector<uint8_t>(30, 0x01) << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::PUBKEYHASH with incorrectly sized key hash
    s.clear();
    s << OP_DUP << OP_HASH160 << ToByteVector(pubkey) << OP_EQUALVERIFY
      << OP_CHECKSIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::SCRIPTHASH with incorrectly sized script hash
    s.clear();
    s << OP_HASH160 << std::vector<uint8_t>(21, 0x01) << OP_EQUAL;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::MULTISIG 0/2
    s.clear();
    s << OP_0 << ToByteVector(pubkey) << OP_1 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::MULTISIG 2/1
    s.clear();
    s << OP_2 << ToByteVector(pubkey) << OP_1 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::MULTISIG n = 2 with 1 pubkey
    s.clear();
    s << OP_1 << ToByteVector(pubkey) << OP_2 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::MULTISIG n = 1 with 0 pubkeys
    s.clear();
    s << OP_1 << OP_1 << OP_CHECKMULTISIG;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::NULL_DATA with other opcodes
    s.clear();
    s << OP_RETURN << std::vector<uint8_t>({75}) << OP_ADD;
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::WITNESS_UNKNOWN with unknown version
    s.clear();
    s << OP_1 << ToByteVector(pubkey);
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);

    // TxoutType::WITNESS_UNKNOWN with incorrect program size
    s.clear();
    s << OP_0 << std::vector<uint8_t>(19, 0x01);
    BOOST_CHECK_EQUAL(Solver(s, solutions), TxoutType::NONSTANDARD);
}

BOOST_AUTO_TEST_CASE(script_standard_ExtractDestination) {
    CKey key;
    CPubKey pubkey;
    key.MakeNewKey(true);
    pubkey = key.GetPubKey();

    CScript s;
    CTxDestination address;

    // TxoutType::PUBKEY
    s.clear();
    s << ToByteVector(pubkey) << OP_CHECKSIG;
    BOOST_CHECK(ExtractDestination(s, address));
    BOOST_CHECK(std::get<PKHash>(address) == PKHash(pubkey));

    // TxoutType::PUBKEYHASH
    s.clear();
    s << OP_DUP << OP_HASH160 << ToByteVector(pubkey.GetID()) << OP_EQUALVERIFY
      << OP_CHECKSIG;
    BOOST_CHECK(ExtractDestination(s, address));
    BOOST_CHECK(std::get<PKHash>(address) == PKHash(pubkey));

    // TxoutType::SCRIPTHASH
    CScript redeemScript(s); // initialize with leftover P2PKH script
    s.clear();
    s << OP_HASH160 << ToByteVector(CScriptID(redeemScript)) << OP_EQUAL;
    BOOST_CHECK(ExtractDestination(s, address));
    BOOST_CHECK(std::get<ScriptHash>(address) == ScriptHash(redeemScript));

    // TxoutType::MULTISIG
    s.clear();
    s << OP_1 << ToByteVector(pubkey) << OP_1 << OP_CHECKMULTISIG;
    BOOST_CHECK(!ExtractDestination(s, address));

    // TxoutType::NULL_DATA
    s.clear();
    s << OP_RETURN << std::vector<uint8_t>({75});
    BOOST_CHECK(!ExtractDestination(s, address));

    // TxoutType::WITNESS_V0_KEYHASH
    s.clear();
    s << OP_0 << ToByteVector(pubkey);
    BOOST_CHECK(!ExtractDestination(s, address));

    // TxoutType::WITNESS_V0_SCRIPTHASH
    s.clear();
    s << OP_0 << ToByteVector(CScriptID(redeemScript));
    BOOST_CHECK(!ExtractDestination(s, address));
}

BOOST_AUTO_TEST_CASE(script_standard_ExtractDestinations) {
    CKey keys[3];
    CPubKey pubkeys[3];
    for (int i = 0; i < 3; i++) {
        keys[i].MakeNewKey(true);
        pubkeys[i] = keys[i].GetPubKey();
    }

    CScript s;
    TxoutType whichType;
    std::vector<CTxDestination> addresses;
    int nRequired;

    // TxoutType::PUBKEY
    s.clear();
    s << ToByteVector(pubkeys[0]) << OP_CHECKSIG;
    BOOST_CHECK(ExtractDestinations(s, whichType, addresses, nRequired));
    BOOST_CHECK_EQUAL(whichType, TxoutType::PUBKEY);
    BOOST_CHECK_EQUAL(addresses.size(), 1U);
    BOOST_CHECK_EQUAL(nRequired, 1);
    BOOST_CHECK(std::get<PKHash>(addresses[0]) == PKHash(pubkeys[0]));

    // TxoutType::PUBKEYHASH
    s.clear();
    s << OP_DUP << OP_HASH160 << ToByteVector(pubkeys[0].GetID())
      << OP_EQUALVERIFY << OP_CHECKSIG;
    BOOST_CHECK(ExtractDestinations(s, whichType, addresses, nRequired));
    BOOST_CHECK_EQUAL(whichType, TxoutType::PUBKEYHASH);
    BOOST_CHECK_EQUAL(addresses.size(), 1U);
    BOOST_CHECK_EQUAL(nRequired, 1);
    BOOST_CHECK(std::get<PKHash>(addresses[0]) == PKHash(pubkeys[0]));

    // TxoutType::SCRIPTHASH
    // initialize with leftover P2PKH script
    CScript redeemScript(s);
    s.clear();
    s << OP_HASH160 << ToByteVector(CScriptID(redeemScript)) << OP_EQUAL;
    BOOST_CHECK(ExtractDestinations(s, whichType, addresses, nRequired));
    BOOST_CHECK_EQUAL(whichType, TxoutType::SCRIPTHASH);
    BOOST_CHECK_EQUAL(addresses.size(), 1U);
    BOOST_CHECK_EQUAL(nRequired, 1);
    BOOST_CHECK(std::get<ScriptHash>(addresses[0]) == ScriptHash(redeemScript));

    // TxoutType::MULTISIG
    s.clear();
    s << OP_2 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1]) << OP_2
      << OP_CHECKMULTISIG;
    BOOST_CHECK(ExtractDestinations(s, whichType, addresses, nRequired));
    BOOST_CHECK_EQUAL(whichType, TxoutType::MULTISIG);
    BOOST_CHECK_EQUAL(addresses.size(), 2U);
    BOOST_CHECK_EQUAL(nRequired, 2);
    BOOST_CHECK(std::get<PKHash>(addresses[0]) == PKHash(pubkeys[0]));
    BOOST_CHECK(std::get<PKHash>(addresses[1]) == PKHash(pubkeys[1]));

    // TxoutType::NULL_DATA
    s.clear();
    s << OP_RETURN << std::vector<uint8_t>({75});
    BOOST_CHECK(!ExtractDestinations(s, whichType, addresses, nRequired));

    // TxoutType::WITNESS_V0_KEYHASH
    s.clear();
    s << OP_0 << ToByteVector(pubkeys[0].GetID());
    BOOST_CHECK(!ExtractDestinations(s, whichType, addresses, nRequired));

    // TxoutType::WITNESS_V0_SCRIPTHASH
    s.clear();
    s << OP_0 << ToByteVector(CScriptID(redeemScript));
    BOOST_CHECK(!ExtractDestinations(s, whichType, addresses, nRequired));
}

BOOST_AUTO_TEST_CASE(script_standard_GetScriptFor_) {
    CKey keys[3];
    CPubKey pubkeys[3];
    for (int i = 0; i < 3; i++) {
        keys[i].MakeNewKey(true);
        pubkeys[i] = keys[i].GetPubKey();
    }

    CScript expected, result;

    // PKHash
    expected.clear();
    expected << OP_DUP << OP_HASH160 << ToByteVector(pubkeys[0].GetID())
             << OP_EQUALVERIFY << OP_CHECKSIG;
    result = GetScriptForDestination(PKHash(pubkeys[0]));
    BOOST_CHECK(result == expected);

    // CScriptID
    CScript redeemScript(result);
    expected.clear();
    expected << OP_HASH160 << ToByteVector(CScriptID(redeemScript)) << OP_EQUAL;
    result = GetScriptForDestination(ScriptHash(redeemScript));
    BOOST_CHECK(result == expected);

    // CNoDestination
    expected.clear();
    result = GetScriptForDestination(CNoDestination());
    BOOST_CHECK(result == expected);

    // GetScriptForRawPubKey
    expected.clear();
    expected << ToByteVector(pubkeys[0]) << OP_CHECKSIG;
    result = GetScriptForRawPubKey(pubkeys[0]);
    BOOST_CHECK(result == expected);

    // GetScriptForMultisig
    expected.clear();
    expected << OP_2 << ToByteVector(pubkeys[0]) << ToByteVector(pubkeys[1])
             << ToByteVector(pubkeys[2]) << OP_3 << OP_CHECKMULTISIG;
    result =
        GetScriptForMultisig(2, std::vector<CPubKey>(pubkeys, pubkeys + 3));
    BOOST_CHECK(result == expected);
}

BOOST_AUTO_TEST_SUITE_END()
