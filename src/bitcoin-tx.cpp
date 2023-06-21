// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <chainparams.h>
#include <clientversion.h>
#include <coins.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <core_io.h>
#include <currencyunit.h>
#include <fs.h>
#include <key_io.h>
#include <primitives/transaction.h>
#include <rpc/util.h>
#include <script/script.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <util/moneystr.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/translation.h>

#include <univalue.h>

#include <boost/algorithm/string.hpp> // trim_right

#include <cstdio>
#include <functional>
#include <memory>

static bool fCreateBlank;
static std::map<std::string, UniValue> registers;
static const int CONTINUE_EXECUTION = -1;

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

static void SetupBitcoinTxArgs(ArgsManager &argsman) {
    SetupHelpOptions(argsman);

    SetupCurrencyUnitOptions(argsman);
    argsman.AddArg("-create", "Create new, empty TX.", ArgsManager::ALLOW_ANY,
                   OptionsCategory::OPTIONS);
    argsman.AddArg("-json", "Select JSON output", ArgsManager::ALLOW_ANY,
                   OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-txid",
        "Output only the hex-encoded transaction id of the resultant "
        "transaction.",
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    SetupChainParamsBaseOptions(argsman);

    argsman.AddArg("delin=N", "Delete input N from TX", ArgsManager::ALLOW_ANY,
                   OptionsCategory::COMMANDS);
    argsman.AddArg("delout=N", "Delete output N from TX",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("in=TXID:VOUT(:SEQUENCE_NUMBER)", "Add input to TX",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("locktime=N", "Set TX lock time to N",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("nversion=N", "Set TX version to N", ArgsManager::ALLOW_ANY,
                   OptionsCategory::COMMANDS);
    argsman.AddArg("outaddr=VALUE:ADDRESS", "Add address-based output to TX",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("outpubkey=VALUE:PUBKEY[:FLAGS]",
                   "Add pay-to-pubkey output to TX. "
                   "Optionally add the \"S\" flag to wrap the output in a "
                   "pay-to-script-hash.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("outdata=[VALUE:]DATA", "Add data-based output to TX",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("outscript=VALUE:SCRIPT[:FLAGS]",
                   "Add raw script output to TX. "
                   "Optionally add the \"S\" flag to wrap the output in a "
                   "pay-to-script-hash.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg(
        "outmultisig=VALUE:REQUIRED:PUBKEYS:PUBKEY1:PUBKEY2:....[:FLAGS]",
        "Add Pay To n-of-m Multi-sig output to TX. n = REQUIRED, m = PUBKEYS. "
        "Optionally add the \"S\" flag to wrap the output in a "
        "pay-to-script-hash.",
        ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);
    argsman.AddArg("sign=SIGHASH-FLAGS",
                   "Add zero or more signatures to transaction. "
                   "This command requires JSON registers:"
                   "prevtxs=JSON object, "
                   "privatekeys=JSON object. "
                   "See signrawtransactionwithkey docs for format of sighash "
                   "flags, JSON objects.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::COMMANDS);

    argsman.AddArg("load=NAME:FILENAME",
                   "Load JSON file FILENAME into register NAME",
                   ArgsManager::ALLOW_ANY, OptionsCategory::REGISTER_COMMANDS);
    argsman.AddArg("set=NAME:JSON-STRING",
                   "Set register NAME to given JSON-STRING",
                   ArgsManager::ALLOW_ANY, OptionsCategory::REGISTER_COMMANDS);
}

//
// This function returns either one of EXIT_ codes when it's expected to stop
// the process or CONTINUE_EXECUTION when it's expected to continue further.
//
static int AppInitRawTx(int argc, char *argv[]) {
    //
    // Parameters
    //
    SetupBitcoinTxArgs(gArgs);
    std::string error;
    if (!gArgs.ParseParameters(argc, argv, error)) {
        tfm::format(std::cerr, "Error parsing command line arguments: %s\n",
                    error);
        return EXIT_FAILURE;
    }

    // Check for -chain, -testnet or -regtest parameter (Params() calls are only
    // valid after this clause)
    try {
        SelectParams(gArgs.GetChainName());
    } catch (const std::exception &e) {
        tfm::format(std::cerr, "Error: %s\n", e.what());
        return EXIT_FAILURE;
    }

    fCreateBlank = gArgs.GetBoolArg("-create", false);

    if (argc < 2 || HelpRequested(gArgs)) {
        // First part of help message is specific to this utility
        std::string strUsage =
            PACKAGE_NAME " bitcoin-tx utility version " + FormatFullVersion() +
            "\n\n" +
            "Usage:  bitcoin-tx [options] <hex-tx> [commands]  Update "
            "hex-encoded bitcoin transaction\n" +
            "or:     bitcoin-tx [options] -create [commands]   Create "
            "hex-encoded bitcoin transaction\n" +
            "\n";
        strUsage += gArgs.GetHelpMessage();

        tfm::format(std::cout, "%s", strUsage);

        if (argc < 2) {
            tfm::format(std::cerr, "Error: too few parameters\n");
            return EXIT_FAILURE;
        }

        return EXIT_SUCCESS;
    }

    return CONTINUE_EXECUTION;
}

static void RegisterSetJson(const std::string &key,
                            const std::string &rawJson) {
    UniValue val;
    if (!val.read(rawJson)) {
        std::string strErr = "Cannot parse JSON for key " + key;
        throw std::runtime_error(strErr);
    }

    registers[key] = val;
}

static void RegisterSet(const std::string &strInput) {
    // separate NAME:VALUE in string
    size_t pos = strInput.find(':');
    if ((pos == std::string::npos) || (pos == 0) ||
        (pos == (strInput.size() - 1))) {
        throw std::runtime_error("Register input requires NAME:VALUE");
    }

    std::string key = strInput.substr(0, pos);
    std::string valStr = strInput.substr(pos + 1, std::string::npos);

    RegisterSetJson(key, valStr);
}

static void RegisterLoad(const std::string &strInput) {
    // separate NAME:FILENAME in string
    size_t pos = strInput.find(':');
    if ((pos == std::string::npos) || (pos == 0) ||
        (pos == (strInput.size() - 1))) {
        throw std::runtime_error("Register load requires NAME:FILENAME");
    }

    std::string key = strInput.substr(0, pos);
    std::string filename = strInput.substr(pos + 1, std::string::npos);

    FILE *f = fsbridge::fopen(filename.c_str(), "r");
    if (!f) {
        std::string strErr = "Cannot open file " + filename;
        throw std::runtime_error(strErr);
    }

    // load file chunks into one big buffer
    std::string valStr;
    while ((!feof(f)) && (!ferror(f))) {
        char buf[4096];
        int bread = fread(buf, 1, sizeof(buf), f);
        if (bread <= 0) {
            break;
        }

        valStr.insert(valStr.size(), buf, bread);
    }

    int error = ferror(f);
    fclose(f);

    if (error) {
        std::string strErr = "Error reading file " + filename;
        throw std::runtime_error(strErr);
    }

    // evaluate as JSON buffer register
    RegisterSetJson(key, valStr);
}

static Amount ExtractAndValidateValue(const std::string &strValue) {
    Amount value;
    if (!ParseMoney(strValue, value)) {
        throw std::runtime_error("invalid TX output value");
    }

    return value;
}

static void MutateTxVersion(CMutableTransaction &tx,
                            const std::string &cmdVal) {
    int64_t newVersion;
    if (!ParseInt64(cmdVal, &newVersion) ||
        newVersion < CTransaction::MIN_VERSION ||
        newVersion > CTransaction::MAX_VERSION) {
        throw std::runtime_error("Invalid TX version requested: '" + cmdVal +
                                 "'");
    }

    tx.nVersion = int(newVersion);
}

static void MutateTxLocktime(CMutableTransaction &tx,
                             const std::string &cmdVal) {
    int64_t newLocktime;
    if (!ParseInt64(cmdVal, &newLocktime) || newLocktime < 0LL ||
        newLocktime > 0xffffffffLL) {
        throw std::runtime_error("Invalid TX locktime requested: '" + cmdVal +
                                 "'");
    }

    tx.nLockTime = (unsigned int)newLocktime;
}

static void MutateTxAddInput(CMutableTransaction &tx,
                             const std::string &strInput) {
    std::vector<std::string> vStrInputParts = SplitString(strInput, ':');

    // separate TXID:VOUT in string
    if (vStrInputParts.size() < 2) {
        throw std::runtime_error("TX input missing separator");
    }

    // extract and validate TXID
    uint256 hash;
    if (!ParseHashStr(vStrInputParts[0], hash)) {
        throw std::runtime_error("invalid TX input txid");
    }

    TxId txid(hash);

    static const unsigned int minTxOutSz = 9;
    static const unsigned int maxVout = MAX_TX_SIZE / minTxOutSz;

    // extract and validate vout
    const std::string &strVout = vStrInputParts[1];
    int64_t vout;
    if (!ParseInt64(strVout, &vout) || vout < 0 ||
        vout > static_cast<int64_t>(maxVout)) {
        throw std::runtime_error("invalid TX input vout '" + strVout + "'");
    }

    // extract the optional sequence number
    uint32_t nSequenceIn = std::numeric_limits<unsigned int>::max();
    if (vStrInputParts.size() > 2) {
        nSequenceIn = std::stoul(vStrInputParts[2]);
    }

    // append to transaction input list
    CTxIn txin(txid, vout, CScript(), nSequenceIn);
    tx.vin.push_back(txin);
}

static void MutateTxAddOutAddr(CMutableTransaction &tx,
                               const std::string &strInput,
                               const CChainParams &chainParams) {
    // Separate into VALUE:ADDRESS
    std::vector<std::string> vStrInputParts = SplitString(strInput, ':');

    if (vStrInputParts.size() != 2) {
        throw std::runtime_error("TX output missing or too many separators");
    }

    // Extract and validate VALUE
    Amount value = ExtractAndValidateValue(vStrInputParts[0]);

    // extract and validate ADDRESS
    std::string strAddr = vStrInputParts[1];
    CTxDestination destination = DecodeDestination(strAddr, chainParams);
    if (!IsValidDestination(destination)) {
        throw std::runtime_error("invalid TX output address");
    }
    CScript scriptPubKey = GetScriptForDestination(destination);

    // construct TxOut, append to transaction output list
    CTxOut txout(value, scriptPubKey);
    tx.vout.push_back(txout);
}

static void MutateTxAddOutPubKey(CMutableTransaction &tx,
                                 const std::string &strInput) {
    // Separate into VALUE:PUBKEY[:FLAGS]
    std::vector<std::string> vStrInputParts = SplitString(strInput, ':');

    if (vStrInputParts.size() < 2 || vStrInputParts.size() > 3) {
        throw std::runtime_error("TX output missing or too many separators");
    }

    // Extract and validate VALUE
    Amount value = ExtractAndValidateValue(vStrInputParts[0]);

    // Extract and validate PUBKEY
    CPubKey pubkey(ParseHex(vStrInputParts[1]));
    if (!pubkey.IsFullyValid()) {
        throw std::runtime_error("invalid TX output pubkey");
    }

    CScript scriptPubKey = GetScriptForRawPubKey(pubkey);

    // Extract and validate FLAGS
    bool bScriptHash = false;
    if (vStrInputParts.size() == 3) {
        std::string flags = vStrInputParts[2];
        bScriptHash = (flags.find('S') != std::string::npos);
    }

    if (bScriptHash) {
        // Get the ID for the script, and then construct a P2SH destination for
        // it.
        scriptPubKey = GetScriptForDestination(ScriptHash(scriptPubKey));
    }

    // construct TxOut, append to transaction output list
    CTxOut txout(value, scriptPubKey);
    tx.vout.push_back(txout);
}

static void MutateTxAddOutMultiSig(CMutableTransaction &tx,
                                   const std::string &strInput) {
    // Separate into VALUE:REQUIRED:NUMKEYS:PUBKEY1:PUBKEY2:....[:FLAGS]
    std::vector<std::string> vStrInputParts = SplitString(strInput, ':');

    // Check that there are enough parameters
    if (vStrInputParts.size() < 3) {
        throw std::runtime_error("Not enough multisig parameters");
    }

    // Extract and validate VALUE
    Amount value = ExtractAndValidateValue(vStrInputParts[0]);

    // Extract REQUIRED
    uint32_t required = stoul(vStrInputParts[1]);

    // Extract NUMKEYS
    uint32_t numkeys = stoul(vStrInputParts[2]);

    // Validate there are the correct number of pubkeys
    if (vStrInputParts.size() < numkeys + 3) {
        throw std::runtime_error("incorrect number of multisig pubkeys");
    }

    if (required < 1 || required > MAX_PUBKEYS_PER_MULTISIG || numkeys < 1 ||
        numkeys > MAX_PUBKEYS_PER_MULTISIG || numkeys < required) {
        throw std::runtime_error("multisig parameter mismatch. Required " +
                                 ToString(required) + " of " +
                                 ToString(numkeys) + "signatures.");
    }

    // extract and validate PUBKEYs
    std::vector<CPubKey> pubkeys;
    for (int pos = 1; pos <= int(numkeys); pos++) {
        CPubKey pubkey(ParseHex(vStrInputParts[pos + 2]));
        if (!pubkey.IsFullyValid()) {
            throw std::runtime_error("invalid TX output pubkey");
        }

        pubkeys.push_back(pubkey);
    }

    // Extract FLAGS
    bool bScriptHash = false;
    if (vStrInputParts.size() == numkeys + 4) {
        std::string flags = vStrInputParts.back();
        bScriptHash = (flags.find('S') != std::string::npos);
    } else if (vStrInputParts.size() > numkeys + 4) {
        // Validate that there were no more parameters passed
        throw std::runtime_error("Too many parameters");
    }

    CScript scriptPubKey = GetScriptForMultisig(required, pubkeys);

    if (bScriptHash) {
        if (scriptPubKey.size() > MAX_SCRIPT_ELEMENT_SIZE) {
            throw std::runtime_error(
                strprintf("redeemScript exceeds size limit: %d > %d",
                          scriptPubKey.size(), MAX_SCRIPT_ELEMENT_SIZE));
        }
        // Get the ID for the script, and then construct a P2SH destination for
        // it.
        scriptPubKey = GetScriptForDestination(ScriptHash(scriptPubKey));
    }

    // construct TxOut, append to transaction output list
    CTxOut txout(value, scriptPubKey);
    tx.vout.push_back(txout);
}

static void MutateTxAddOutData(CMutableTransaction &tx,
                               const std::string &strInput) {
    Amount value = Amount::zero();

    // separate [VALUE:]DATA in string
    size_t pos = strInput.find(':');

    if (pos == 0) {
        throw std::runtime_error("TX output value not specified");
    }

    if (pos == std::string::npos) {
        pos = 0;
    } else {
        // Extract and validate VALUE
        value = ExtractAndValidateValue(strInput.substr(0, pos));
        ++pos;
    }

    // extract and validate DATA
    const std::string strData{strInput.substr(pos, std::string::npos)};

    if (!IsHex(strData)) {
        throw std::runtime_error("invalid TX output data");
    }

    std::vector<uint8_t> data = ParseHex(strData);

    CTxOut txout(value, CScript() << OP_RETURN << data);
    tx.vout.push_back(txout);
}

static void MutateTxAddOutScript(CMutableTransaction &tx,
                                 const std::string &strInput) {
    // separate VALUE:SCRIPT[:FLAGS]
    std::vector<std::string> vStrInputParts = SplitString(strInput, ':');
    if (vStrInputParts.size() < 2) {
        throw std::runtime_error("TX output missing separator");
    }

    // Extract and validate VALUE
    Amount value = ExtractAndValidateValue(vStrInputParts[0]);

    // extract and validate script
    std::string strScript = vStrInputParts[1];
    CScript scriptPubKey = ParseScript(strScript);

    // Extract FLAGS
    bool bScriptHash = false;
    if (vStrInputParts.size() == 3) {
        std::string flags = vStrInputParts.back();
        bScriptHash = (flags.find('S') != std::string::npos);
    }

    if (scriptPubKey.size() > MAX_SCRIPT_SIZE) {
        throw std::runtime_error(strprintf("script exceeds size limit: %d > %d",
                                           scriptPubKey.size(),
                                           MAX_SCRIPT_SIZE));
    }

    if (bScriptHash) {
        if (scriptPubKey.size() > MAX_SCRIPT_ELEMENT_SIZE) {
            throw std::runtime_error(
                strprintf("redeemScript exceeds size limit: %d > %d",
                          scriptPubKey.size(), MAX_SCRIPT_ELEMENT_SIZE));
        }
        scriptPubKey = GetScriptForDestination(ScriptHash(scriptPubKey));
    }

    // construct TxOut, append to transaction output list
    CTxOut txout(value, scriptPubKey);
    tx.vout.push_back(txout);
}

static void MutateTxDelInput(CMutableTransaction &tx,
                             const std::string &strInIdx) {
    // parse requested deletion index
    int64_t inIdx;
    if (!ParseInt64(strInIdx, &inIdx) || inIdx < 0 ||
        inIdx >= static_cast<int64_t>(tx.vin.size())) {
        throw std::runtime_error("Invalid TX input index '" + strInIdx + "'");
    }

    // delete input from transaction
    tx.vin.erase(tx.vin.begin() + inIdx);
}

static void MutateTxDelOutput(CMutableTransaction &tx,
                              const std::string &strOutIdx) {
    // parse requested deletion index
    int64_t outIdx;
    if (!ParseInt64(strOutIdx, &outIdx) || outIdx < 0 ||
        outIdx >= static_cast<int64_t>(tx.vout.size())) {
        throw std::runtime_error("Invalid TX output index '" + strOutIdx + "'");
    }

    // delete output from transaction
    tx.vout.erase(tx.vout.begin() + outIdx);
}

static const unsigned int N_SIGHASH_OPTS = 12;
static const struct {
    const char *flagStr;
    int flags;
} sigHashOptions[N_SIGHASH_OPTS] = {
    {"ALL", SIGHASH_ALL},
    {"NONE", SIGHASH_NONE},
    {"SINGLE", SIGHASH_SINGLE},
    {"ALL|ANYONECANPAY", SIGHASH_ALL | SIGHASH_ANYONECANPAY},
    {"NONE|ANYONECANPAY", SIGHASH_NONE | SIGHASH_ANYONECANPAY},
    {"SINGLE|ANYONECANPAY", SIGHASH_SINGLE | SIGHASH_ANYONECANPAY},
    {"ALL|FORKID", SIGHASH_ALL | SIGHASH_FORKID},
    {"NONE|FORKID", SIGHASH_NONE | SIGHASH_FORKID},
    {"SINGLE|FORKID", SIGHASH_SINGLE | SIGHASH_FORKID},
    {"ALL|FORKID|ANYONECANPAY",
     SIGHASH_ALL | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
    {"NONE|FORKID|ANYONECANPAY",
     SIGHASH_NONE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
    {"SINGLE|FORKID|ANYONECANPAY",
     SIGHASH_SINGLE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
};

static bool findSigHashFlags(SigHashType &sigHashType,
                             const std::string &flagStr) {
    sigHashType = SigHashType();

    for (unsigned int i = 0; i < N_SIGHASH_OPTS; i++) {
        if (flagStr == sigHashOptions[i].flagStr) {
            sigHashType = SigHashType(sigHashOptions[i].flags);
            return true;
        }
    }

    return false;
}

static void MutateTxSign(CMutableTransaction &tx, const std::string &flagStr) {
    SigHashType sigHashType = SigHashType().withForkId();

    if ((flagStr.size() > 0) && !findSigHashFlags(sigHashType, flagStr)) {
        throw std::runtime_error("unknown sighash flag/sign option");
    }

    // mergedTx will end up with all the signatures; it
    // starts as a clone of the raw tx:
    CMutableTransaction mergedTx{tx};
    const CMutableTransaction txv{tx};

    CCoinsView viewDummy;
    CCoinsViewCache view(&viewDummy);

    if (!registers.count("privatekeys")) {
        throw std::runtime_error("privatekeys register variable must be set.");
    }

    FillableSigningProvider tempKeystore;
    UniValue keysObj = registers["privatekeys"];

    for (unsigned int kidx = 0; kidx < keysObj.size(); kidx++) {
        if (!keysObj[kidx].isStr()) {
            throw std::runtime_error("privatekey not a std::string");
        }

        CKey key = DecodeSecret(keysObj[kidx].getValStr());
        if (!key.IsValid()) {
            throw std::runtime_error("privatekey not valid");
        }
        tempKeystore.AddKey(key);
    }

    // Add previous txouts given in the RPC call:
    if (!registers.count("prevtxs")) {
        throw std::runtime_error("prevtxs register variable must be set.");
    }

    UniValue prevtxsObj = registers["prevtxs"];

    for (unsigned int previdx = 0; previdx < prevtxsObj.size(); previdx++) {
        UniValue prevOut = prevtxsObj[previdx];
        if (!prevOut.isObject()) {
            throw std::runtime_error("expected prevtxs internal object");
        }

        std::map<std::string, UniValue::VType> types = {
            {"txid", UniValue::VSTR},
            {"vout", UniValue::VNUM},
            {"scriptPubKey", UniValue::VSTR}};
        if (!prevOut.checkObject(types)) {
            throw std::runtime_error("prevtxs internal object typecheck fail");
        }

        uint256 hash;
        if (!ParseHashStr(prevOut["txid"].get_str(), hash)) {
            throw std::runtime_error("txid must be hexadecimal string (not '" +
                                     prevOut["txid"].get_str() + "')");
        }

        TxId txid(hash);

        const int nOut = prevOut["vout"].get_int();
        if (nOut < 0) {
            throw std::runtime_error("vout cannot be negative");
        }

        COutPoint out(txid, nOut);
        std::vector<uint8_t> pkData(
            ParseHexUV(prevOut["scriptPubKey"], "scriptPubKey"));
        CScript scriptPubKey(pkData.begin(), pkData.end());

        {
            const Coin &coin = view.AccessCoin(out);
            if (!coin.IsSpent() &&
                coin.GetTxOut().scriptPubKey != scriptPubKey) {
                std::string err("Previous output scriptPubKey mismatch:\n");
                err = err + ScriptToAsmStr(coin.GetTxOut().scriptPubKey) +
                      "\nvs:\n" + ScriptToAsmStr(scriptPubKey);
                throw std::runtime_error(err);
            }

            CTxOut txout;
            txout.scriptPubKey = scriptPubKey;
            txout.nValue = Amount::zero();
            if (prevOut.exists("amount")) {
                txout.nValue = AmountFromValue(prevOut["amount"]);
            }

            view.AddCoin(out, Coin(txout, 1, false), true);
        }

        // If redeemScript given and private keys given, add redeemScript to the
        // tempKeystore so it can be signed:
        if (scriptPubKey.IsPayToScriptHash() &&
            prevOut.exists("redeemScript")) {
            UniValue v = prevOut["redeemScript"];
            std::vector<uint8_t> rsData(ParseHexUV(v, "redeemScript"));
            CScript redeemScript(rsData.begin(), rsData.end());
            tempKeystore.AddCScript(redeemScript);
        }
    }

    const FillableSigningProvider &keystore = tempKeystore;

    // Sign what we can:
    for (size_t i = 0; i < mergedTx.vin.size(); i++) {
        CTxIn &txin = mergedTx.vin[i];
        const Coin &coin = view.AccessCoin(txin.prevout);
        if (coin.IsSpent()) {
            continue;
        }

        const CScript &prevPubKey = coin.GetTxOut().scriptPubKey;
        const Amount amount = coin.GetTxOut().nValue;

        SignatureData sigdata =
            DataFromTransaction(mergedTx, i, coin.GetTxOut());
        // Only sign SIGHASH_SINGLE if there's a corresponding output:
        if ((sigHashType.getBaseType() != BaseSigHashType::SINGLE) ||
            (i < mergedTx.vout.size())) {
            ProduceSignature(keystore,
                             MutableTransactionSignatureCreator(
                                 &mergedTx, i, amount, sigHashType),
                             prevPubKey, sigdata);
        }

        UpdateInput(txin, sigdata);
    }

    tx = mergedTx;
}

class Secp256k1Init {
    ECCVerifyHandle globalVerifyHandle;

public:
    Secp256k1Init() { ECC_Start(); }
    ~Secp256k1Init() { ECC_Stop(); }
};

static void MutateTx(CMutableTransaction &tx, const std::string &command,
                     const std::string &commandVal,
                     const CChainParams &chainParams) {
    std::unique_ptr<Secp256k1Init> ecc;

    if (command == "nversion") {
        MutateTxVersion(tx, commandVal);
    } else if (command == "locktime") {
        MutateTxLocktime(tx, commandVal);
    } else if (command == "delin") {
        MutateTxDelInput(tx, commandVal);
    } else if (command == "in") {
        MutateTxAddInput(tx, commandVal);
    } else if (command == "delout") {
        MutateTxDelOutput(tx, commandVal);
    } else if (command == "outaddr") {
        MutateTxAddOutAddr(tx, commandVal, chainParams);
    } else if (command == "outpubkey") {
        ecc.reset(new Secp256k1Init());
        MutateTxAddOutPubKey(tx, commandVal);
    } else if (command == "outmultisig") {
        ecc.reset(new Secp256k1Init());
        MutateTxAddOutMultiSig(tx, commandVal);
    } else if (command == "outscript") {
        MutateTxAddOutScript(tx, commandVal);
    } else if (command == "outdata") {
        MutateTxAddOutData(tx, commandVal);
    } else if (command == "sign") {
        ecc.reset(new Secp256k1Init());
        MutateTxSign(tx, commandVal);
    } else if (command == "load") {
        RegisterLoad(commandVal);
    } else if (command == "set") {
        RegisterSet(commandVal);
    } else {
        throw std::runtime_error("unknown command");
    }
}

static void OutputTxJSON(const CTransaction &tx) {
    UniValue entry(UniValue::VOBJ);
    TxToUniv(tx, BlockHash(), entry);

    std::string jsonOutput = entry.write(4);
    tfm::format(std::cout, "%s\n", jsonOutput);
}

static void OutputTxHash(const CTransaction &tx) {
    // the hex-encoded transaction id.
    std::string strHexHash = tx.GetId().GetHex();

    tfm::format(std::cout, "%s\n", strHexHash);
}

static void OutputTxHex(const CTransaction &tx) {
    std::string strHex = EncodeHexTx(tx);

    tfm::format(std::cout, "%s\n", strHex);
}

static void OutputTx(const CTransaction &tx) {
    if (gArgs.GetBoolArg("-json", false)) {
        OutputTxJSON(tx);
    } else if (gArgs.GetBoolArg("-txid", false)) {
        OutputTxHash(tx);
    } else {
        OutputTxHex(tx);
    }
}

static std::string readStdin() {
    char buf[4096];
    std::string ret;

    while (!feof(stdin)) {
        size_t bread = fread(buf, 1, sizeof(buf), stdin);
        ret.append(buf, bread);
        if (bread < sizeof(buf)) {
            break;
        }
    }

    if (ferror(stdin)) {
        throw std::runtime_error("error reading stdin");
    }

    boost::algorithm::trim_right(ret);

    return ret;
}

static int CommandLineRawTx(int argc, char *argv[],
                            const CChainParams &chainParams) {
    std::string strPrint;
    int nRet = 0;
    try {
        // Skip switches; Permit common stdin convention "-"
        while (argc > 1 && IsSwitchChar(argv[1][0]) && (argv[1][1] != 0)) {
            argc--;
            argv++;
        }

        CMutableTransaction tx;
        int startArg;

        if (!fCreateBlank) {
            // require at least one param
            if (argc < 2) {
                throw std::runtime_error("too few parameters");
            }

            // param: hex-encoded bitcoin transaction
            std::string strHexTx(argv[1]);

            // "-" implies standard input
            if (strHexTx == "-") {
                strHexTx = readStdin();
            }

            if (!DecodeHexTx(tx, strHexTx)) {
                throw std::runtime_error("invalid transaction encoding");
            }

            startArg = 2;
        } else {
            startArg = 1;
        }

        for (int i = startArg; i < argc; i++) {
            std::string arg = argv[i];
            std::string key, value;
            size_t eqpos = arg.find('=');
            if (eqpos == std::string::npos) {
                key = arg;
            } else {
                key = arg.substr(0, eqpos);
                value = arg.substr(eqpos + 1);
            }

            MutateTx(tx, key, value, chainParams);
        }

        OutputTx(CTransaction(tx));
    } catch (const std::exception &e) {
        strPrint = std::string("error: ") + e.what();
        nRet = EXIT_FAILURE;
    } catch (const UniValue &e) {
        strPrint = std::string("error code: ") + e["code"].getValStr() +
                   " message: " + e["message"].getValStr();
        nRet = EXIT_FAILURE;
    } catch (...) {
        PrintExceptionContinue(nullptr, "CommandLineRawTx()");
        throw;
    }

    if (strPrint != "") {
        tfm::format(nRet == 0 ? std::cout : std::cerr, "%s\n", strPrint);
    }

    return nRet;
}

int main(int argc, char *argv[]) {
    SetupEnvironment();

    try {
        int ret = AppInitRawTx(argc, argv);
        if (ret != CONTINUE_EXECUTION) {
            return ret;
        }
    } catch (const std::exception &e) {
        PrintExceptionContinue(&e, "AppInitRawTx()");
        return EXIT_FAILURE;
    } catch (...) {
        PrintExceptionContinue(nullptr, "AppInitRawTx()");
        return EXIT_FAILURE;
    }

    int ret = EXIT_FAILURE;
    try {
        ret = CommandLineRawTx(argc, argv, Params());
    } catch (const std::exception &e) {
        PrintExceptionContinue(&e, "CommandLineRawTx()");
    } catch (...) {
        PrintExceptionContinue(nullptr, "CommandLineRawTx()");
    }

    return ret;
}
