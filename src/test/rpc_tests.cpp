// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/blockchain.h>
#include <rpc/client.h>
#include <rpc/server.h>
#include <rpc/util.h>

#include <config.h>
#include <interfaces/chain.h>
#include <node/context.h>
#include <util/time.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

#include <any>

static UniValue JSON(std::string_view json) {
    UniValue value;
    BOOST_CHECK(value.read(json.data(), json.size()));
    return value;
}

class HasJSON {
public:
    explicit HasJSON(std::string json) : m_json(std::move(json)) {}
    bool operator()(const UniValue &value) const {
        std::string json{value.write()};
        BOOST_CHECK_EQUAL(json, m_json);
        return json == m_json;
    };

private:
    const std::string m_json;
};

class RPCTestingSetup : public TestingSetup {
public:
    UniValue TransformParams(const UniValue &params,
                             std::vector<std::string> arg_names) const;
    UniValue CallRPC(const std::string &args);
};

UniValue
RPCTestingSetup::TransformParams(const UniValue &params,
                                 std::vector<std::string> arg_names) const {
    UniValue transformed_params;
    CRPCTable table;
    CRPCCommand command{"category", "method",
                        [&](const Config &, const JSONRPCRequest &request,
                            UniValue &, bool) -> bool {
                            transformed_params = request.params;
                            return true;
                        },
                        arg_names, /*unique_id=*/0};
    table.appendCommand("method", &command);
    JSONRPCRequest request;
    request.strMethod = "method";
    request.params = params;
    if (RPCIsInWarmup(nullptr)) {
        SetRPCWarmupFinished();
    }
    GlobalConfig config;
    table.execute(config, request);
    return transformed_params;
}

UniValue RPCTestingSetup::CallRPC(const std::string &args) {
    std::vector<std::string> vArgs{SplitString(args, ' ')};
    std::string strMethod = vArgs[0];
    vArgs.erase(vArgs.begin());
    GlobalConfig config;
    JSONRPCRequest request;
    request.context = &m_node;
    request.strMethod = strMethod;
    request.params = RPCConvertValues(strMethod, vArgs);
    if (RPCIsInWarmup(nullptr)) {
        SetRPCWarmupFinished();
    }
    try {
        UniValue result = tableRPC.execute(config, request);
        return result;
    } catch (const UniValue &objError) {
        throw std::runtime_error(objError.find_value("message").get_str());
    }
}

BOOST_FIXTURE_TEST_SUITE(rpc_tests, RPCTestingSetup)

BOOST_AUTO_TEST_CASE(rpc_namedparams) {
    const std::vector<std::string> arg_names{"arg1", "arg2", "arg3", "arg4",
                                             "arg5"};

    // Make sure named arguments are transformed into positional arguments in
    // correct places separated by nulls
    BOOST_CHECK_EQUAL(
        TransformParams(JSON(R"({"arg2": 2, "arg4": 4})"), arg_names).write(),
        "[null,2,null,4]");

    // Make sure named argument specified multiple times raises an exception
    BOOST_CHECK_EXCEPTION(
        TransformParams(JSON(R"({"arg2": 2, "arg2": 4})"), arg_names), UniValue,
        HasJSON(
            R"({"code":-8,"message":"Parameter arg2 specified multiple times"})"));

    // Make sure named and positional arguments can be combined.
    BOOST_CHECK_EQUAL(
        TransformParams(JSON(R"({"arg5": 5, "args": [1, 2], "arg4": 4})"),
                        arg_names)
            .write(),
        "[1,2,null,4,5]");

    // Make sure a unknown named argument raises an exception
    BOOST_CHECK_EXCEPTION(
        TransformParams(JSON(R"({"arg2": 2, "unknown": 6})"), arg_names),
        UniValue,
        HasJSON(R"({"code":-8,"message":"Unknown named parameter unknown"})"));

    // Make sure an overlap between a named argument and positional argument
    // raises an exception
    BOOST_CHECK_EXCEPTION(
        TransformParams(JSON(R"({"args": [1,2,3], "arg4": 4, "arg2": 2})"),
                        arg_names),
        UniValue,
        HasJSON(
            R"({"code":-8,"message":"Parameter arg2 specified twice both as positional and named argument"})"));

    // Make sure extra positional arguments can be passed through to the method
    // implementation, as long as they don't overlap with named arguments.
    BOOST_CHECK_EQUAL(
        TransformParams(JSON(R"({"args": [1,2,3,4,5,6,7,8,9,10]})"), arg_names)
            .write(),
        "[1,2,3,4,5,6,7,8,9,10]");
    BOOST_CHECK_EQUAL(
        TransformParams(JSON(R"([1,2,3,4,5,6,7,8,9,10])"), arg_names).write(),
        "[1,2,3,4,5,6,7,8,9,10]");
}

BOOST_AUTO_TEST_CASE(rpc_rawparams) {
    // Test raw transaction API argument handling
    UniValue r;

    BOOST_CHECK_THROW(CallRPC("getrawtransaction"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("getrawtransaction not_hex"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("getrawtransaction "
                              "a3b807410df0b60fcb9736768df5823938b2f838694939ba"
                              "45f3c0a1bff150ed not_int"),
                      std::runtime_error);

    BOOST_CHECK_THROW(CallRPC("createrawtransaction"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("createrawtransaction null null"),
                      std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("createrawtransaction not_array"),
                      std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("createrawtransaction {} {}"),
                      std::runtime_error);
    BOOST_CHECK_NO_THROW(CallRPC("createrawtransaction [] {}"));
    BOOST_CHECK_THROW(CallRPC("createrawtransaction [] {} extra"),
                      std::runtime_error);

    BOOST_CHECK_THROW(CallRPC("decoderawtransaction"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("decoderawtransaction null"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("decoderawtransaction DEADBEEF"),
                      std::runtime_error);
    std::string rawtx =
        "0100000001a15d57094aa7a21a28cb20b59aab8fc7d1149a3bdbcddba9c622e4f5f6a9"
        "9ece010000006c493046022100f93bb0e7d8db7bd46e40132d1f8242026e045f03a0ef"
        "e71bbb8e3f475e970d790221009337cd7f1f929f00cc6ff01f03729b069a7c21b59b17"
        "36ddfee5db5946c5da8c0121033b9b137ee87d5a812d6f506efdd37f0affa7ffc31071"
        "1c06c7f3e097c9447c52ffffffff0100e1f505000000001976a9140389035a9225b383"
        "9e2bbf32d826a1e222031fd888ac00000000";
    BOOST_CHECK_NO_THROW(
        r = CallRPC(std::string("decoderawtransaction ") + rawtx));
    BOOST_CHECK_EQUAL(r.get_obj().find_value("version").getInt<int>(), 1);
    BOOST_CHECK_EQUAL(r.get_obj().find_value("size").getInt<int>(), 193);
    BOOST_CHECK_EQUAL(r.get_obj().find_value("locktime").getInt<int>(), 0);
    BOOST_CHECK_THROW(
        r = CallRPC(std::string("decoderawtransaction ") + rawtx + " extra"),
        std::runtime_error);

    // Only check failure cases for sendrawtransaction, there's no network to
    // send to...
    BOOST_CHECK_THROW(CallRPC("sendrawtransaction"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("sendrawtransaction null"), std::runtime_error);
    BOOST_CHECK_THROW(CallRPC("sendrawtransaction DEADBEEF"),
                      std::runtime_error);
    BOOST_CHECK_THROW(
        CallRPC(std::string("sendrawtransaction ") + rawtx + " extra"),
        std::runtime_error);
}

BOOST_AUTO_TEST_CASE(rpc_togglenetwork) {
    UniValue r;

    r = CallRPC("getnetworkinfo");
    bool netState = r.get_obj().find_value("networkactive").get_bool();
    BOOST_CHECK_EQUAL(netState, true);

    BOOST_CHECK_NO_THROW(CallRPC("setnetworkactive false"));
    r = CallRPC("getnetworkinfo");
    int numConnection = r.get_obj().find_value("connections").getInt<int>();
    BOOST_CHECK_EQUAL(numConnection, 0);

    netState = r.get_obj().find_value("networkactive").get_bool();
    BOOST_CHECK_EQUAL(netState, false);

    BOOST_CHECK_NO_THROW(CallRPC("setnetworkactive true"));
    r = CallRPC("getnetworkinfo");
    netState = r.get_obj().find_value("networkactive").get_bool();
    BOOST_CHECK_EQUAL(netState, true);
}

BOOST_AUTO_TEST_CASE(rpc_rawsign) {
    UniValue r;
    // input is a 1-of-2 multisig (so is output):
    std::string prevout = "[{\"txid\":"
                          "\"b4cc287e58f87cdae59417329f710f3ecd75a4ee1d2872b724"
                          "8f50977c8493f3\","
                          "\"vout\":1,\"scriptPubKey\":"
                          "\"a914b10c9df5f7edf436c697f02f1efdba4cf399615187\","
                          "\"amount\":3141590.00,"
                          "\"redeemScript\":"
                          "\"512103debedc17b3df2badbcdd86d5feb4562b86fe182e5998"
                          "abd8bcd4f122c6155b1b21027e940bb73ab8732bfdf7f9216ece"
                          "fca5b94d6df834e77e108f68e66f126044c052ae\"}]";
    r = CallRPC(std::string("createrawtransaction ") + prevout + " " +
                "{\"3HqAe9LtNBjnsfM4CyYaWTnvCaUYT7v4oZ\":11}");
    std::string notsigned = r.get_str();
    std::string privkey1 =
        "\"KzsXybp9jX64P5ekX1KUxRQ79Jht9uzW7LorgwE65i5rWACL6LQe\"";
    std::string privkey2 =
        "\"Kyhdf5LuKTRx4ge69ybABsiUAWjVRK4XGxAKk2FQLp2HjGMy87Z4\"";
    r = CallRPC(std::string("signrawtransactionwithkey ") + notsigned + " [] " +
                prevout);
    BOOST_CHECK(r.get_obj().find_value("complete").get_bool() == false);
    r = CallRPC(std::string("signrawtransactionwithkey ") + notsigned + " [" +
                privkey1 + "," + privkey2 + "] " + prevout);
    BOOST_CHECK(r.get_obj().find_value("complete").get_bool() == true);
}

BOOST_AUTO_TEST_CASE(rpc_rawsign_missing_amount) {
    // Old format, missing amount parameter for prevout should generate
    // an RPC error.  This is because of new replay-protected tx's require
    // nonzero amount present in signed tx.
    // See: https://github.com/Bitcoin-ABC/bitcoin-abc/issues/63
    // (We will re-use the tx + keys from the above rpc_rawsign test for
    // simplicity.)
    UniValue r;
    std::string prevout = "[{\"txid\":"
                          "\"b4cc287e58f87cdae59417329f710f3ecd75a4ee1d2872b724"
                          "8f50977c8493f3\","
                          "\"vout\":1,\"scriptPubKey\":"
                          "\"a914b10c9df5f7edf436c697f02f1efdba4cf399615187\","
                          "\"redeemScript\":"
                          "\"512103debedc17b3df2badbcdd86d5feb4562b86fe182e5998"
                          "abd8bcd4f122c6155b1b21027e940bb73ab8732bfdf7f9216ece"
                          "fca5b94d6df834e77e108f68e66f126044c052ae\"}]";
    r = CallRPC(std::string("createrawtransaction ") + prevout + " " +
                "{\"3HqAe9LtNBjnsfM4CyYaWTnvCaUYT7v4oZ\":11}");
    std::string notsigned = r.get_str();
    std::string privkey1 =
        "\"KzsXybp9jX64P5ekX1KUxRQ79Jht9uzW7LorgwE65i5rWACL6LQe\"";
    std::string privkey2 =
        "\"Kyhdf5LuKTRx4ge69ybABsiUAWjVRK4XGxAKk2FQLp2HjGMy87Z4\"";

    bool exceptionThrownDueToMissingAmount = false,
         errorWasMissingAmount = false;

    try {
        r = CallRPC(std::string("signrawtransactionwithkey ") + notsigned +
                    " [" + privkey1 + "," + privkey2 + "] " + prevout);
    } catch (const std::runtime_error &e) {
        exceptionThrownDueToMissingAmount = true;
        if (std::string(e.what()).find("amount") != std::string::npos) {
            errorWasMissingAmount = true;
        }
    }
    BOOST_CHECK(exceptionThrownDueToMissingAmount == true);
    BOOST_CHECK(errorWasMissingAmount == true);
}

BOOST_AUTO_TEST_CASE(rpc_createraw_op_return) {
    BOOST_CHECK_NO_THROW(
        CallRPC("createrawtransaction "
                "[{\"txid\":"
                "\"a3b807410df0b60fcb9736768df5823938b2f838694939ba45f3c0a1bff1"
                "50ed\",\"vout\":0}] {\"data\":\"68656c6c6f776f726c64\"}"));

    // Key not "data" (bad address)
    BOOST_CHECK_THROW(
        CallRPC("createrawtransaction "
                "[{\"txid\":"
                "\"a3b807410df0b60fcb9736768df5823938b2f838694939ba45f3c0a1bff1"
                "50ed\",\"vout\":0}] {\"somedata\":\"68656c6c6f776f726c64\"}"),
        std::runtime_error);

    // Bad hex encoding of data output
    BOOST_CHECK_THROW(
        CallRPC("createrawtransaction "
                "[{\"txid\":"
                "\"a3b807410df0b60fcb9736768df5823938b2f838694939ba45f3c0a1bff1"
                "50ed\",\"vout\":0}] {\"data\":\"12345\"}"),
        std::runtime_error);
    BOOST_CHECK_THROW(
        CallRPC("createrawtransaction "
                "[{\"txid\":"
                "\"a3b807410df0b60fcb9736768df5823938b2f838694939ba45f3c0a1bff1"
                "50ed\",\"vout\":0}] {\"data\":\"12345g\"}"),
        std::runtime_error);

    // Data 81 bytes long
    BOOST_CHECK_NO_THROW(
        CallRPC("createrawtransaction "
                "[{\"txid\":"
                "\"a3b807410df0b60fcb9736768df5823938b2f838694939ba45f3c0a1bff1"
                "50ed\",\"vout\":0}] "
                "{\"data\":"
                "\"010203040506070809101112131415161718192021222324252627282930"
                "31323334353637383940414243444546474849505152535455565758596061"
                "6263646566676869707172737475767778798081\"}"));
}

BOOST_AUTO_TEST_CASE(rpc_format_monetary_values) {
    BOOST_CHECK(UniValue(Amount::zero()).write() == "0.00");
    BOOST_CHECK(UniValue(SATOSHI).write() == "0.01");
    BOOST_CHECK(UniValue(17622195 * SATOSHI).write() == "176221.95");
    BOOST_CHECK(UniValue(50000000 * SATOSHI).write() == "500000.00");
    BOOST_CHECK(UniValue(89898989 * SATOSHI).write() == "898989.89");
    BOOST_CHECK(UniValue(100000000 * SATOSHI).write() == "1000000.00");
    BOOST_CHECK(UniValue(int64_t(2099999999999990) * SATOSHI).write() ==
                "20999999999999.90");
    BOOST_CHECK(UniValue(int64_t(2099999999999999) * SATOSHI).write() ==
                "20999999999999.99");

    BOOST_CHECK_EQUAL(UniValue(Amount::zero()).write(), "0.00");
    BOOST_CHECK_EQUAL(UniValue(123456789 * (COIN / 10000)).write(),
                      "12345678900.00");
    BOOST_CHECK_EQUAL(UniValue(-1 * COIN).write(), "-1000000.00");
    BOOST_CHECK_EQUAL(UniValue(-1 * COIN / 10).write(), "-100000.00");

    BOOST_CHECK_EQUAL(UniValue(100000000 * COIN).write(), "100000000000000.00");
    BOOST_CHECK_EQUAL(UniValue(10000000 * COIN).write(), "10000000000000.00");
    BOOST_CHECK_EQUAL(UniValue(1000000 * COIN).write(), "1000000000000.00");
    BOOST_CHECK_EQUAL(UniValue(100000 * COIN).write(), "100000000000.00");
    BOOST_CHECK_EQUAL(UniValue(10000 * COIN).write(), "10000000000.00");
    BOOST_CHECK_EQUAL(UniValue(1000 * COIN).write(), "1000000000.00");
    BOOST_CHECK_EQUAL(UniValue(100 * COIN).write(), "100000000.00");
    BOOST_CHECK_EQUAL(UniValue(10 * COIN).write(), "10000000.00");
    BOOST_CHECK_EQUAL(UniValue(COIN).write(), "1000000.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 10).write(), "100000.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 100).write(), "10000.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 1000).write(), "1000.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 10000).write(), "100.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 100000).write(), "10.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 1000000).write(), "1.00");
    BOOST_CHECK_EQUAL(UniValue(COIN / 10000000).write(), "0.10");
    BOOST_CHECK_EQUAL(UniValue(COIN / 100000000).write(), "0.01");
}

static UniValue ValueFromString(const std::string &str) noexcept {
    UniValue value;
    value.setNumStr(str);
    return value;
}

BOOST_AUTO_TEST_CASE(rpc_parse_monetary_values) {
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("-0.01")), UniValue);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0")), Amount::zero());
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.00")), Amount::zero());
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.01")), SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("176221.95")),
                      17622195 * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("500000")),
                      50000000 * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("500000.00")),
                      50000000 * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("898989.89")),
                      89898989 * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("1000000.00")),
                      100000000 * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("20999999999999.9")),
                      int64_t(2099999999999990) * SATOSHI);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("20999999999999.99")),
                      int64_t(2099999999999999) * SATOSHI);

    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("1e-2")),
                      COIN / 100000000);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.1e-1")),
                      COIN / 100000000);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.01e-0")),
                      COIN / 100000000);
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString(
                          "0."
                          "0000000000000000000000000000000000000000000000000000"
                          "000000000000000000000001e+74")),
                      COIN / 100000000);
    BOOST_CHECK_EQUAL(
        AmountFromValue(ValueFromString("10000000000000000000000000000000000000"
                                        "000000000000000000000000000e-58")),
        COIN);
    BOOST_CHECK_EQUAL(
        AmountFromValue(ValueFromString(
            "0."
            "000000000000000000000000000000000000000000000000000000000000000100"
            "000000000000000000000000000000000000000000000000000e70")),
        COIN);

    // should fail
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("1e-9")), UniValue);
    // should fail
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("0.000000019")),
                      UniValue);
    // should pass, cut trailing 0
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.01000000")), SATOSHI);
    // should fail
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("19e-9")), UniValue);
    // should pass, leading 0 is present
    BOOST_CHECK_EQUAL(AmountFromValue(ValueFromString("0.19e-0")),
                      19 * SATOSHI);
    // should fail, no leading 0
    BOOST_CHECK_EXCEPTION(AmountFromValue(".19e-6"), UniValue,
                          HasJSON(R"({"code":-3,"message":"Invalid amount"})"));
    // overflow error
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("92233720368.54775808")),
                      UniValue);
    // overflow error
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("1e+17")), UniValue);
    // overflow error signless
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("1e17")), UniValue);
    // overflow error
    BOOST_CHECK_THROW(AmountFromValue(ValueFromString("93e+15")), UniValue);
}

BOOST_AUTO_TEST_CASE(rpc_ban) {
    BOOST_CHECK_NO_THROW(CallRPC(std::string("clearbanned")));

    UniValue r;
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("setban 127.0.0.0 add")));
    // portnumber for setban not allowed
    BOOST_CHECK_THROW(r = CallRPC(std::string("setban 127.0.0.0:8334")),
                      std::runtime_error);
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    UniValue ar = r.get_array();
    UniValue o1 = ar[0].get_obj();
    UniValue adr = o1.find_value("address");
    BOOST_CHECK_EQUAL(adr.get_str(), "127.0.0.0/32");
    BOOST_CHECK_NO_THROW(CallRPC(std::string("setban 127.0.0.0 remove")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    BOOST_CHECK_EQUAL(ar.size(), 0UL);

    // Set ban way in the future: 2283-12-18 19:33:20
    BOOST_CHECK_NO_THROW(
        r = CallRPC(std::string("setban 127.0.0.0/24 add 9907731200 true")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    o1 = ar[0].get_obj();
    adr = o1.find_value("address");
    UniValue banned_until = o1.find_value("banned_until");
    BOOST_CHECK_EQUAL(adr.get_str(), "127.0.0.0/24");
    // absolute time check
    BOOST_CHECK_EQUAL(banned_until.getInt<int64_t>(), 9907731200);

    BOOST_CHECK_NO_THROW(CallRPC(std::string("clearbanned")));

    BOOST_CHECK_NO_THROW(
        r = CallRPC(std::string("setban 127.0.0.0/24 add 200")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    o1 = ar[0].get_obj();
    adr = o1.find_value("address");
    banned_until = o1.find_value("banned_until");
    BOOST_CHECK_EQUAL(adr.get_str(), "127.0.0.0/24");
    int64_t now = GetTime();
    BOOST_CHECK(banned_until.getInt<int64_t>() > now);
    BOOST_CHECK(banned_until.getInt<int64_t>() - now <= 200);

    // must throw an exception because 127.0.0.1 is in already banned subnet
    // range
    BOOST_CHECK_THROW(r = CallRPC(std::string("setban 127.0.0.1 add")),
                      std::runtime_error);

    BOOST_CHECK_NO_THROW(CallRPC(std::string("setban 127.0.0.0/24 remove")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    BOOST_CHECK_EQUAL(ar.size(), 0UL);

    BOOST_CHECK_NO_THROW(
        r = CallRPC(std::string("setban 127.0.0.0/255.255.0.0 add")));
    BOOST_CHECK_THROW(r = CallRPC(std::string("setban 127.0.1.1 add")),
                      std::runtime_error);

    BOOST_CHECK_NO_THROW(CallRPC(std::string("clearbanned")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    BOOST_CHECK_EQUAL(ar.size(), 0UL);

    // invalid IP
    BOOST_CHECK_THROW(r = CallRPC(std::string("setban test add")),
                      std::runtime_error);

    // IPv6 tests
    BOOST_CHECK_NO_THROW(
        r = CallRPC(
            std::string("setban FE80:0000:0000:0000:0202:B3FF:FE1E:8329 add")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    o1 = ar[0].get_obj();
    adr = o1.find_value("address");
    BOOST_CHECK_EQUAL(adr.get_str(), "fe80::202:b3ff:fe1e:8329/128");

    BOOST_CHECK_NO_THROW(CallRPC(std::string("clearbanned")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string(
                             "setban 2001:db8::/ffff:fffc:0:0:0:0:0:0 add")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    o1 = ar[0].get_obj();
    adr = o1.find_value("address");
    BOOST_CHECK_EQUAL(adr.get_str(), "2001:db8::/30");

    BOOST_CHECK_NO_THROW(CallRPC(std::string("clearbanned")));
    BOOST_CHECK_NO_THROW(
        r = CallRPC(std::string(
            "setban 2001:4d48:ac57:400:cacf:e9ff:fe1d:9c63/128 add")));
    BOOST_CHECK_NO_THROW(r = CallRPC(std::string("listbanned")));
    ar = r.get_array();
    o1 = ar[0].get_obj();
    adr = o1.find_value("address");
    BOOST_CHECK_EQUAL(adr.get_str(),
                      "2001:4d48:ac57:400:cacf:e9ff:fe1d:9c63/128");
}

BOOST_AUTO_TEST_CASE(rpc_convert_values_generatetoaddress) {
    UniValue result;

    BOOST_CHECK_NO_THROW(result = RPCConvertValues(
                             "generatetoaddress",
                             {"101", "mkESjLZW66TmHhiFX8MCaBjrhZ543PPh9a"}));
    BOOST_CHECK_EQUAL(result[0].getInt<int>(), 101);
    BOOST_CHECK_EQUAL(result[1].get_str(),
                      "mkESjLZW66TmHhiFX8MCaBjrhZ543PPh9a");

    BOOST_CHECK_NO_THROW(result = RPCConvertValues(
                             "generatetoaddress",
                             {"101", "mhMbmE2tE9xzJYCV9aNC8jKWN31vtGrguU"}));
    BOOST_CHECK_EQUAL(result[0].getInt<int>(), 101);
    BOOST_CHECK_EQUAL(result[1].get_str(),
                      "mhMbmE2tE9xzJYCV9aNC8jKWN31vtGrguU");

    BOOST_CHECK_NO_THROW(result = RPCConvertValues(
                             "generatetoaddress",
                             {"1", "mkESjLZW66TmHhiFX8MCaBjrhZ543PPh9a", "9"}));
    BOOST_CHECK_EQUAL(result[0].getInt<int>(), 1);
    BOOST_CHECK_EQUAL(result[1].get_str(),
                      "mkESjLZW66TmHhiFX8MCaBjrhZ543PPh9a");
    BOOST_CHECK_EQUAL(result[2].getInt<int>(), 9);

    BOOST_CHECK_NO_THROW(result = RPCConvertValues(
                             "generatetoaddress",
                             {"1", "mhMbmE2tE9xzJYCV9aNC8jKWN31vtGrguU", "9"}));
    BOOST_CHECK_EQUAL(result[0].getInt<int>(), 1);
    BOOST_CHECK_EQUAL(result[1].get_str(),
                      "mhMbmE2tE9xzJYCV9aNC8jKWN31vtGrguU");
    BOOST_CHECK_EQUAL(result[2].getInt<int>(), 9);
}

BOOST_AUTO_TEST_CASE(help_example) {
    // test different argument types
    const RPCArgList &args = {{"foo", "bar"}, {"b", true}, {"n", 1}};
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", args),
                      "> bitcoin-cli -named test foo=bar b=true n=1\n");
    BOOST_CHECK_EQUAL(HelpExampleRpcNamed("test", args),
                      "> curl --user myusername --data-binary '{\"jsonrpc\": "
                      "\"1.0\", \"id\": \"curltest\", \"method\": \"test\", "
                      "\"params\": {\"foo\":\"bar\",\"b\":true,\"n\":1}}' -H "
                      "'content-type: text/plain;' http://127.0.0.1:8332/\n");

    // test shell escape
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", {{"foo", "b'ar"}}),
                      "> bitcoin-cli -named test foo='b'''ar'\n");
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", {{"foo", "b\"ar"}}),
                      "> bitcoin-cli -named test foo='b\"ar'\n");
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", {{"foo", "b ar"}}),
                      "> bitcoin-cli -named test foo='b ar'\n");

    // test object params
    UniValue obj_value(UniValue::VOBJ);
    obj_value.pushKV("foo", "bar");
    obj_value.pushKV("b", false);
    obj_value.pushKV("n", 1);
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", {{"name", obj_value}}),
                      "> bitcoin-cli -named test "
                      "name='{\"foo\":\"bar\",\"b\":false,\"n\":1}'\n");
    BOOST_CHECK_EQUAL(
        HelpExampleRpcNamed("test", {{"name", obj_value}}),
        "> curl --user myusername --data-binary '{\"jsonrpc\": \"1.0\", "
        "\"id\": \"curltest\", \"method\": \"test\", \"params\": "
        "{\"name\":{\"foo\":\"bar\",\"b\":false,\"n\":1}}}' -H 'content-type: "
        "text/plain;' http://127.0.0.1:8332/\n");

    // test array params
    UniValue arr_value(UniValue::VARR);
    arr_value.push_back("bar");
    arr_value.push_back(false);
    arr_value.push_back(1);
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("test", {{"name", arr_value}}),
                      "> bitcoin-cli -named test name='[\"bar\",false,1]'\n");
    BOOST_CHECK_EQUAL(HelpExampleRpcNamed("test", {{"name", arr_value}}),
                      "> curl --user myusername --data-binary '{\"jsonrpc\": "
                      "\"1.0\", \"id\": \"curltest\", \"method\": \"test\", "
                      "\"params\": {\"name\":[\"bar\",false,1]}}' -H "
                      "'content-type: text/plain;' http://127.0.0.1:8332/\n");

    // test types don't matter for shell
    BOOST_CHECK_EQUAL(HelpExampleCliNamed("foo", {{"arg", true}}),
                      HelpExampleCliNamed("foo", {{"arg", "true"}}));

    // test types matter for Rpc
    BOOST_CHECK_NE(HelpExampleRpcNamed("foo", {{"arg", true}}),
                   HelpExampleRpcNamed("foo", {{"arg", "true"}}));
}

BOOST_AUTO_TEST_SUITE_END()
