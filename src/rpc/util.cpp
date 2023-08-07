// Copyright (c) 2017-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/util.h>

#include <clientversion.h>
#include <common/args.h>
#include <consensus/amount.h>
#include <key_io.h>
#include <script/descriptor.h>
#include <script/signingprovider.h>
#include <tinyformat.h>
#include <util/check.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/translation.h>

#include <tuple>
#include <variant>

const std::string UNIX_EPOCH_TIME = "UNIX epoch time";
const std::string EXAMPLE_ADDRESS =
    "\"qrmzys48glkpevp2l4t24jtcltc9hyzx9cep2qffm4\"";

void RPCTypeCheckObj(const UniValue &o,
                     const std::map<std::string, UniValueType> &typesExpected,
                     bool fAllowNull, bool fStrict) {
    for (const auto &t : typesExpected) {
        const UniValue &v = o.find_value(t.first);
        if (!fAllowNull && v.isNull()) {
            throw JSONRPCError(RPC_TYPE_ERROR,
                               strprintf("Missing %s", t.first));
        }

        if (!(t.second.typeAny || v.type() == t.second.type ||
              (fAllowNull && v.isNull()))) {
            std::string err = strprintf("Expected type %s for %s, got %s",
                                        uvTypeName(t.second.type), t.first,
                                        uvTypeName(v.type()));
            throw JSONRPCError(RPC_TYPE_ERROR, err);
        }
    }

    if (fStrict) {
        for (const std::string &k : o.getKeys()) {
            if (typesExpected.count(k) == 0) {
                std::string err = strprintf("Unexpected key %s", k);
                throw JSONRPCError(RPC_TYPE_ERROR, err);
            }
        }
    }
}

Amount AmountFromValue(const UniValue &value) {
    if (!value.isNum() && !value.isStr()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Amount is not a number or string");
    }

    int64_t n;
    if (!ParseFixedPoint(value.getValStr(), Currency::get().decimals, &n)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount");
    }

    Amount amt = n * SATOSHI;
    if (!MoneyRange(amt)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Amount out of range");
    }

    return amt;
}

uint256 ParseHashV(const UniValue &v, std::string strName) {
    std::string strHex(v.get_str());
    if (64 != strHex.length()) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            strprintf("%s must be of length %d (not %d, for '%s')", strName, 64,
                      strHex.length(), strHex));
    }
    // Note: IsHex("") is false
    if (!IsHex(strHex)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strName + " must be hexadecimal string (not '" +
                               strHex + "')");
    }
    return uint256S(strHex);
}

uint256 ParseHashO(const UniValue &o, std::string strKey) {
    return ParseHashV(o.find_value(strKey), strKey);
}

std::vector<uint8_t> ParseHexV(const UniValue &v, std::string strName) {
    std::string strHex;
    if (v.isStr()) {
        strHex = v.get_str();
    }
    if (!IsHex(strHex)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strName + " must be hexadecimal string (not '" +
                               strHex + "')");
    }

    return ParseHex(strHex);
}

std::vector<uint8_t> ParseHexO(const UniValue &o, std::string strKey) {
    return ParseHexV(o.find_value(strKey), strKey);
}

namespace {

/**
 * Quote an argument for shell.
 *
 * @note This is intended for help, not for security-sensitive purposes.
 */
std::string ShellQuote(const std::string &s) {
    std::string result;
    result.reserve(s.size() * 2);
    for (const char ch : s) {
        if (ch == '\'') {
            result += "'\''";
        } else {
            result += ch;
        }
    }
    return "'" + result + "'";
}

/**
 * Shell-quotes the argument if it needs quoting, else returns it literally, to
 * save typing.
 *
 * @note This is intended for help, not for security-sensitive purposes.
 */
std::string ShellQuoteIfNeeded(const std::string &s) {
    for (const char ch : s) {
        if (ch == ' ' || ch == '\'' || ch == '"') {
            return ShellQuote(s);
        }
    }

    return s;
}

} // namespace

std::string HelpExampleCli(const std::string &methodname,
                           const std::string &args) {
    return "> bitcoin-cli " + methodname + " " + args + "\n";
}

std::string HelpExampleCliNamed(const std::string &methodname,
                                const RPCArgList &args) {
    std::string result = "> bitcoin-cli -named " + methodname;
    for (const auto &argpair : args) {
        const auto &value = argpair.second.isStr() ? argpair.second.get_str()
                                                   : argpair.second.write();
        result += " " + argpair.first + "=" + ShellQuoteIfNeeded(value);
    }
    result += "\n";
    return result;
}

std::string HelpExampleRpc(const std::string &methodname,
                           const std::string &args) {
    return "> curl --user myusername --data-binary '{\"jsonrpc\": \"1.0\", "
           "\"id\": \"curltest\", "
           "\"method\": \"" +
           methodname + "\", \"params\": [" + args +
           "]}' -H 'content-type: text/plain;' http://127.0.0.1:8332/\n";
}

std::string HelpExampleRpcNamed(const std::string &methodname,
                                const RPCArgList &args) {
    UniValue params(UniValue::VOBJ);
    for (const auto &param : args) {
        params.pushKV(param.first, param.second);
    }

    return "> curl --user myusername --data-binary '{\"jsonrpc\": \"1.0\", "
           "\"id\": \"curltest\", "
           "\"method\": \"" +
           methodname + "\", \"params\": " + params.write() +
           "}' -H 'content-type: text/plain;' http://127.0.0.1:8332/\n";
}

// Converts a hex string to a public key if possible
CPubKey HexToPubKey(const std::string &hex_in) {
    if (!IsHex(hex_in)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid public key: " + hex_in);
    }
    CPubKey vchPubKey(ParseHex(hex_in));
    if (!vchPubKey.IsFullyValid()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid public key: " + hex_in);
    }
    return vchPubKey;
}

// Retrieves a public key for an address from the given FillableSigningProvider
CPubKey AddrToPubKey(const CChainParams &chainparams,
                     const FillableSigningProvider &keystore,
                     const std::string &addr_in) {
    CTxDestination dest = DecodeDestination(addr_in, chainparams);
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid address: " + addr_in);
    }
    CKeyID key = GetKeyForDestination(keystore, dest);
    if (key.IsNull()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           strprintf("%s does not refer to a key", addr_in));
    }
    CPubKey vchPubKey;
    if (!keystore.GetPubKey(key, vchPubKey)) {
        throw JSONRPCError(
            RPC_INVALID_ADDRESS_OR_KEY,
            strprintf("no full public key for address %s", addr_in));
    }
    if (!vchPubKey.IsFullyValid()) {
        throw JSONRPCError(RPC_INTERNAL_ERROR,
                           "Wallet contains an invalid public key");
    }
    return vchPubKey;
}

// Creates a multisig address from a given list of public keys, number of
// signatures required, and the address type
CTxDestination AddAndGetMultisigDestination(const int required,
                                            const std::vector<CPubKey> &pubkeys,
                                            OutputType type,
                                            FillableSigningProvider &keystore,
                                            CScript &script_out) {
    // Gather public keys
    if (required < 1) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "a multisignature address must require at least one key to redeem");
    }
    if ((int)pubkeys.size() < required) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strprintf("not enough keys supplied (got %u keys, "
                                     "but need at least %d to redeem)",
                                     pubkeys.size(), required));
    }
    if (pubkeys.size() > 16) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Number of keys involved in the multisignature "
                           "address creation > 16\nReduce the number");
    }

    script_out = GetScriptForMultisig(required, pubkeys);

    if (script_out.size() > MAX_SCRIPT_ELEMENT_SIZE) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            (strprintf("redeemScript exceeds size limit: %d > %d",
                       script_out.size(), MAX_SCRIPT_ELEMENT_SIZE)));
    }

    // Check if any keys are uncompressed. If so, the type is legacy
    for (const CPubKey &pk : pubkeys) {
        if (!pk.IsCompressed()) {
            type = OutputType::LEGACY;
            break;
        }
    }

    // Make the address
    CTxDestination dest =
        AddAndGetDestinationForScript(keystore, script_out, type);

    return dest;
}

class DescribeAddressVisitor {
public:
    explicit DescribeAddressVisitor() {}

    UniValue operator()(const CNoDestination &dest) const {
        return UniValue(UniValue::VOBJ);
    }

    UniValue operator()(const PKHash &keyID) const {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("isscript", false);
        return obj;
    }

    UniValue operator()(const ScriptHash &scriptID) const {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("isscript", true);
        return obj;
    }
};

UniValue DescribeAddress(const CTxDestination &dest) {
    return std::visit(DescribeAddressVisitor(), dest);
}

std::string GetAllOutputTypes() {
    std::vector<std::string> ret;
    using U = std::underlying_type<TxoutType>::type;
    for (U i = (U)TxoutType::NONSTANDARD; i <= (U)TxoutType::NULL_DATA; ++i) {
        ret.emplace_back(GetTxnOutputType(static_cast<TxoutType>(i)));
    }
    return Join(ret, ", ");
}

RPCErrorCode RPCErrorFromTransactionError(TransactionError terr) {
    switch (terr) {
        case TransactionError::MEMPOOL_REJECTED:
            return RPC_TRANSACTION_REJECTED;
        case TransactionError::ALREADY_IN_CHAIN:
            return RPC_TRANSACTION_ALREADY_IN_CHAIN;
        case TransactionError::P2P_DISABLED:
            return RPC_CLIENT_P2P_DISABLED;
        case TransactionError::INVALID_PSBT:
        case TransactionError::PSBT_MISMATCH:
            return RPC_INVALID_PARAMETER;
        case TransactionError::SIGHASH_MISMATCH:
            return RPC_DESERIALIZATION_ERROR;
        default:
            break;
    }
    return RPC_TRANSACTION_ERROR;
}

UniValue JSONRPCTransactionError(TransactionError terr,
                                 const std::string &err_string) {
    if (err_string.length() > 0) {
        return JSONRPCError(RPCErrorFromTransactionError(terr), err_string);
    } else {
        return JSONRPCError(RPCErrorFromTransactionError(terr),
                            TransactionErrorString(terr).original);
    }
}

/**
 * A pair of strings that can be aligned (through padding) with other Sections
 * later on
 */
struct Section {
    Section(const std::string &left, const std::string &right)
        : m_left{left}, m_right{right} {}
    std::string m_left;
    const std::string m_right;
};

/**
 * Keeps track of RPCArgs by transforming them into sections for the purpose
 * of serializing everything to a single string
 */
struct Sections {
    std::vector<Section> m_sections;
    size_t m_max_pad{0};

    void PushSection(const Section &s) {
        m_max_pad = std::max(m_max_pad, s.m_left.size());
        m_sections.push_back(s);
    }

    /**
     * Recursive helper to translate an RPCArg into sections
     */
    void Push(const RPCArg &arg, const size_t current_indent = 5,
              const OuterType outer_type = OuterType::NONE) {
        const auto indent = std::string(current_indent, ' ');
        const auto indent_next = std::string(current_indent + 2, ' ');
        // Dictionary keys must have a name
        const bool push_name{outer_type == OuterType::OBJ};
        // True on the first recursion
        const bool is_top_level_arg{outer_type == OuterType::NONE};

        switch (arg.m_type) {
            case RPCArg::Type::STR_HEX:
            case RPCArg::Type::STR:
            case RPCArg::Type::NUM:
            case RPCArg::Type::AMOUNT:
            case RPCArg::Type::RANGE:
            case RPCArg::Type::BOOL:
            case RPCArg::Type::OBJ_NAMED_PARAMS: {
                // Nothing more to do for non-recursive types on first recursion
                if (is_top_level_arg) {
                    return;
                }
                auto left = indent;
                if (arg.m_opts.type_str.size() != 0 && push_name) {
                    left += "\"" + arg.GetName() +
                            "\": " + arg.m_opts.type_str.at(0);
                } else {
                    left += push_name ? arg.ToStringObj(/* oneline */ false)
                                      : arg.ToString(/* oneline */ false);
                }
                left += ",";
                PushSection({left, arg.ToDescriptionString(
                                       /*is_named_arg=*/push_name)});
                break;
            }
            case RPCArg::Type::OBJ:
            case RPCArg::Type::OBJ_USER_KEYS: {
                const auto right =
                    is_top_level_arg
                        ? ""
                        : arg.ToDescriptionString(/*is_named_arg=*/push_name);
                PushSection(
                    {indent + (push_name ? "\"" + arg.GetName() + "\": " : "") +
                         "{",
                     right});
                for (const auto &arg_inner : arg.m_inner) {
                    Push(arg_inner, current_indent + 2, OuterType::OBJ);
                }
                if (arg.m_type != RPCArg::Type::OBJ) {
                    PushSection({indent_next + "...", ""});
                }
                PushSection({indent + "}" + (is_top_level_arg ? "" : ","), ""});
                break;
            }
            case RPCArg::Type::ARR: {
                auto left = indent;
                left += push_name ? "\"" + arg.GetName() + "\": " : "";
                left += "[";
                const auto right =
                    is_top_level_arg
                        ? ""
                        : arg.ToDescriptionString(/*is_named_arg=*/push_name);
                PushSection({left, right});
                for (const auto &arg_inner : arg.m_inner) {
                    Push(arg_inner, current_indent + 2, OuterType::ARR);
                }
                PushSection({indent_next + "...", ""});
                PushSection({indent + "]" + (is_top_level_arg ? "" : ","), ""});
                break;
            } // no default case, so the compiler can warn about missing cases
        }
    }

    /**
     * Concatenate all sections with proper padding
     */
    std::string ToString() const {
        std::string ret;
        const size_t pad = m_max_pad + 4;
        for (const auto &s : m_sections) {
            // The left part of a section is assumed to be a single line,
            // usually it is the name of the JSON struct or a brace like
            // {, }, [, or ]
            CHECK_NONFATAL(s.m_left.find('\n') == std::string::npos);
            if (s.m_right.empty()) {
                ret += s.m_left;
                ret += "\n";
                continue;
            }

            std::string left = s.m_left;
            left.resize(pad, ' ');
            ret += left;

            // Properly pad after newlines
            std::string right;
            size_t begin = 0;
            size_t new_line_pos = s.m_right.find_first_of('\n');
            while (true) {
                right += s.m_right.substr(begin, new_line_pos - begin);
                if (new_line_pos == std::string::npos) {
                    // No new line
                    break;
                }
                right += "\n" + std::string(pad, ' ');
                begin = s.m_right.find_first_not_of(' ', new_line_pos + 1);
                if (begin == std::string::npos) {
                    break; // Empty line
                }
                new_line_pos = s.m_right.find_first_of('\n', begin + 1);
            }
            ret += right;
            ret += "\n";
        }
        return ret;
    }
};

RPCHelpMan::RPCHelpMan(std::string name_, std::string description,
                       std::vector<RPCArg> args, RPCResults results,
                       RPCExamples examples)
    : RPCHelpMan{std::move(name_),   std::move(description), std::move(args),
                 std::move(results), std::move(examples),    nullptr} {}

RPCHelpMan::RPCHelpMan(std::string name_, std::string description,
                       std::vector<RPCArg> args, RPCResults results,
                       RPCExamples examples, RPCMethodImpl fun)
    : m_name{std::move(name_)}, m_fun{std::move(fun)},
      m_description{std::move(description)}, m_args{std::move(args)},
      m_results{std::move(results)}, m_examples{std::move(examples)} {
    // Map of parameter names and types just used to check whether the names are
    // unique. Parameter names always need to be unique, with the exception that
    // there can be pairs of POSITIONAL and NAMED parameters with the same name.
    enum ParamType { POSITIONAL = 1, NAMED = 2, NAMED_ONLY = 4 };
    std::map<std::string, int> param_names;

    for (const auto &arg : m_args) {
        std::vector<std::string> names = SplitString(arg.m_names, '|');
        // Should have unique named arguments
        for (const std::string &name : names) {
            auto &param_type = param_names[name];
            CHECK_NONFATAL(!(param_type & POSITIONAL));
            CHECK_NONFATAL(!(param_type & NAMED_ONLY));
            param_type |= POSITIONAL;
        }
        if (arg.m_type == RPCArg::Type::OBJ_NAMED_PARAMS) {
            for (const auto &inner : arg.m_inner) {
                std::vector<std::string> inner_names =
                    SplitString(inner.m_names, '|');
                for (const std::string &inner_name : inner_names) {
                    auto &param_type = param_names[inner_name];
                    CHECK_NONFATAL(!(param_type & POSITIONAL) ||
                                   inner.m_opts.also_positional);
                    CHECK_NONFATAL(!(param_type & NAMED));
                    CHECK_NONFATAL(!(param_type & NAMED_ONLY));
                    param_type |=
                        inner.m_opts.also_positional ? NAMED : NAMED_ONLY;
                }
            }
        }
        // Default value type should match argument type only when defined
        if (arg.m_fallback.index() == 2) {
            const RPCArg::Type type = arg.m_type;
            switch (std::get<RPCArg::Default>(arg.m_fallback).getType()) {
                case UniValue::VOBJ:
                    CHECK_NONFATAL(type == RPCArg::Type::OBJ);
                    break;
                case UniValue::VARR:
                    CHECK_NONFATAL(type == RPCArg::Type::ARR);
                    break;
                case UniValue::VSTR:
                    CHECK_NONFATAL(type == RPCArg::Type::STR ||
                                   type == RPCArg::Type::STR_HEX ||
                                   type == RPCArg::Type::AMOUNT);
                    break;
                case UniValue::VNUM:
                    CHECK_NONFATAL(type == RPCArg::Type::NUM ||
                                   type == RPCArg::Type::AMOUNT ||
                                   type == RPCArg::Type::RANGE);
                    break;
                case UniValue::VBOOL:
                    CHECK_NONFATAL(type == RPCArg::Type::BOOL);
                    break;
                case UniValue::VNULL:
                    // Null values are accepted in all arguments
                    break;
                default:
                    CHECK_NONFATAL(false);
                    break;
            }
        }
    }
}

std::string RPCResults::ToDescriptionString() const {
    std::string result;

    for (const auto &r : m_results) {
        if (r.m_type == RPCResult::Type::ANY) {
            // for testing only
            continue;
        }
        if (r.m_cond.empty()) {
            result += "\nResult:\n";
        } else {
            result += "\nResult (" + r.m_cond + "):\n";
        }
        Sections sections;
        r.ToSections(sections);
        result += sections.ToString();
    }
    return result;
}

std::string RPCExamples::ToDescriptionString() const {
    return m_examples.empty() ? m_examples : "\nExamples:\n" + m_examples;
}

UniValue RPCHelpMan::HandleRequest(const Config &config,
                                   const JSONRPCRequest &request) const {
    if (request.mode == JSONRPCRequest::GET_ARGS) {
        return GetArgMap();
    }
    /*
     * Check if the given request is valid according to this command or if
     * the user is asking for help information, and throw help when appropriate.
     */
    if (request.mode == JSONRPCRequest::GET_HELP ||
        !IsValidNumArgs(request.params.size())) {
        throw std::runtime_error(ToString());
    }
    UniValue arg_mismatch{UniValue::VOBJ};
    for (size_t i{0}; i < m_args.size(); ++i) {
        const auto &arg{m_args.at(i)};
        UniValue match{arg.MatchesType(request.params[i])};
        if (!match.isTrue()) {
            arg_mismatch.pushKV(
                strprintf("Position %s (%s)", i + 1, arg.m_names),
                std::move(match));
        }
    }
    if (!arg_mismatch.empty()) {
        throw JSONRPCError(RPC_TYPE_ERROR, strprintf("Wrong type passed:\n%s",
                                                     arg_mismatch.write(4)));
    }
    CHECK_NONFATAL(m_req == nullptr);
    m_req = &request;
    const UniValue ret = m_fun(*this, config, request);
    m_req = nullptr;
    if (gArgs.GetBoolArg("-rpcdoccheck", DEFAULT_RPC_DOC_CHECK)) {
        UniValue mismatch{UniValue::VARR};
        for (const auto &res : m_results.m_results) {
            UniValue match{res.MatchesType(ret)};
            if (match.isTrue()) {
                mismatch.setNull();
                break;
            }
            mismatch.push_back(match);
        }
        if (!mismatch.isNull()) {
            std::string explain{mismatch.empty() ? "no possible results defined"
                                : mismatch.size() == 1 ? mismatch[0].write(4)
                                                       : mismatch.write(4)};
            throw std::runtime_error{strprintf(
                "Internal bug detected: RPC call \"%s\" returned incorrect "
                "type:\n%s\n%s %s\nPlease report this issue here: %s\n",
                m_name, explain, PACKAGE_NAME, FormatFullVersion(),
                PACKAGE_BUGREPORT)};
        }
    }
    return ret;
}

using CheckFn = void(const RPCArg &);
static const UniValue *DetailMaybeArg(CheckFn *check,
                                      const std::vector<RPCArg> &params,
                                      const JSONRPCRequest *req, size_t i) {
    CHECK_NONFATAL(i < params.size());
    const UniValue &arg{CHECK_NONFATAL(req)->params[i]};
    const RPCArg &param{params.at(i)};
    if (check) {
        check(param);
    }

    if (!arg.isNull()) {
        return &arg;
    }
    if (!std::holds_alternative<RPCArg::Default>(param.m_fallback)) {
        return nullptr;
    }
    return &std::get<RPCArg::Default>(param.m_fallback);
}

static void CheckRequiredOrDefault(const RPCArg &param) {
    // Must use `Arg<Type>(i)` to get the argument or its default value.
    const bool required{
        std::holds_alternative<RPCArg::Optional>(param.m_fallback) &&
            RPCArg::Optional::NO ==
                std::get<RPCArg::Optional>(param.m_fallback),
    };
    CHECK_NONFATAL(required ||
                   std::holds_alternative<RPCArg::Default>(param.m_fallback));
}

#define TMPL_INST(check_param, ret_type, return_code)                          \
    template <> ret_type RPCHelpMan::ArgValue<ret_type>(size_t i) const {      \
        const UniValue *maybe_arg{                                             \
            DetailMaybeArg(check_param, m_args, m_req, i),                     \
        };                                                                     \
        return return_code                                                     \
    }                                                                          \
    void force_semicolon(ret_type)

// Optional arg (without default). Can also be called on required args, if
// needed.
TMPL_INST(nullptr, std::optional<double>,
          maybe_arg ? std::optional{maybe_arg->get_real()} : std::nullopt;);
TMPL_INST(nullptr, std::optional<bool>,
          maybe_arg ? std::optional{maybe_arg->get_bool()} : std::nullopt;);
TMPL_INST(nullptr, const std::string *,
          maybe_arg ? &maybe_arg->get_str() : nullptr;);

// Required arg or optional arg with default value.
TMPL_INST(CheckRequiredOrDefault, bool, CHECK_NONFATAL(maybe_arg)->get_bool(););
TMPL_INST(CheckRequiredOrDefault, int,
          CHECK_NONFATAL(maybe_arg)->getInt<int>(););
TMPL_INST(CheckRequiredOrDefault, uint64_t,
          CHECK_NONFATAL(maybe_arg)->getInt<uint64_t>(););
TMPL_INST(CheckRequiredOrDefault, const std::string &,
          CHECK_NONFATAL(maybe_arg)->get_str(););

bool RPCHelpMan::IsValidNumArgs(size_t num_args) const {
    size_t num_required_args = 0;
    for (size_t n = m_args.size(); n > 0; --n) {
        if (!m_args.at(n - 1).IsOptional()) {
            num_required_args = n;
            break;
        }
    }
    return num_required_args <= num_args && num_args <= m_args.size();
}

std::vector<std::pair<std::string, bool>> RPCHelpMan::GetArgNames() const {
    std::vector<std::pair<std::string, bool>> ret;
    ret.reserve(m_args.size());
    for (const auto &arg : m_args) {
        if (arg.m_type == RPCArg::Type::OBJ_NAMED_PARAMS) {
            for (const auto &inner : arg.m_inner) {
                ret.emplace_back(inner.m_names, /*named_only=*/true);
            }
        }
        ret.emplace_back(arg.m_names, /*named_only=*/false);
    }
    return ret;
}

std::string RPCHelpMan::ToString() const {
    std::string ret;

    // Oneline summary
    ret += m_name;
    bool was_optional{false};
    for (const auto &arg : m_args) {
        if (arg.m_opts.hidden) {
            // Any arg that follows is also hidden
            break;
        }
        const bool optional = arg.IsOptional();
        ret += " ";
        if (optional) {
            if (!was_optional) {
                ret += "( ";
            }
            was_optional = true;
        } else {
            if (was_optional) {
                ret += ") ";
            }
            was_optional = false;
        }
        ret += arg.ToString(/* oneline */ true);
    }
    if (was_optional) {
        ret += " )";
    }
    ret += "\n\n";

    // Description
    ret += m_description;

    // Arguments
    Sections sections;
    Sections named_only_sections;
    for (size_t i{0}; i < m_args.size(); ++i) {
        const auto &arg = m_args.at(i);
        if (arg.m_opts.hidden) {
            // Any arg that follows is also hidden
            break;
        }

        // Push named argument name and description
        sections.m_sections.emplace_back(
            ::ToString(i + 1) + ". " + arg.GetFirstName(),
            arg.ToDescriptionString(/*is_named_arg=*/true));
        sections.m_max_pad = std::max(sections.m_max_pad,
                                      sections.m_sections.back().m_left.size());

        // Recursively push nested args
        sections.Push(arg);

        // Push named-only argument sections
        if (arg.m_type == RPCArg::Type::OBJ_NAMED_PARAMS) {
            for (const auto &arg_inner : arg.m_inner) {
                named_only_sections.PushSection(
                    {arg_inner.GetFirstName(),
                     arg_inner.ToDescriptionString(/*is_named_arg=*/true)});
                named_only_sections.Push(arg_inner);
            }
        }
    }

    if (!sections.m_sections.empty()) {
        ret += "\nArguments:\n";
    }
    ret += sections.ToString();
    if (!named_only_sections.m_sections.empty()) {
        ret += "\nNamed Arguments:\n";
    }
    ret += named_only_sections.ToString();

    // Result
    ret += m_results.ToDescriptionString();

    // Examples
    ret += m_examples.ToDescriptionString();

    return ret;
}

UniValue RPCHelpMan::GetArgMap() const {
    UniValue arr{UniValue::VARR};

    auto push_back_arg_info = [&arr](const std::string &rpc_name, int pos,
                                     const std::string &arg_name,
                                     const RPCArg::Type &type) {
        UniValue map{UniValue::VARR};
        map.push_back(rpc_name);
        map.push_back(pos);
        map.push_back(arg_name);
        map.push_back(type == RPCArg::Type::STR ||
                      type == RPCArg::Type::STR_HEX);
        arr.push_back(map);
    };

    for (int i{0}; i < int(m_args.size()); ++i) {
        const auto &arg = m_args.at(i);
        std::vector<std::string> arg_names = SplitString(arg.m_names, '|');
        for (const auto &arg_name : arg_names) {
            push_back_arg_info(m_name, i, arg_name, arg.m_type);
            if (arg.m_type == RPCArg::Type::OBJ_NAMED_PARAMS) {
                for (const auto &inner : arg.m_inner) {
                    std::vector<std::string> inner_names =
                        SplitString(inner.m_names, '|');
                    for (const std::string &inner_name : inner_names) {
                        push_back_arg_info(m_name, i, inner_name, inner.m_type);
                    }
                }
            }
        }
    }
    return arr;
}

static std::optional<UniValue::VType> ExpectedType(RPCArg::Type type) {
    using Type = RPCArg::Type;
    switch (type) {
        case Type::STR_HEX:
        case Type::STR: {
            return UniValue::VSTR;
        }
        case Type::NUM: {
            return UniValue::VNUM;
        }
        case Type::AMOUNT: {
            // VNUM or VSTR, checked inside AmountFromValue()
            return std::nullopt;
        }
        case Type::RANGE: {
            // VNUM or VARR, checked inside ParseRange()
            return std::nullopt;
        }
        case Type::BOOL: {
            return UniValue::VBOOL;
        }
        case Type::OBJ:
        case Type::OBJ_NAMED_PARAMS:
        case Type::OBJ_USER_KEYS: {
            return UniValue::VOBJ;
        }
        case Type::ARR: {
            return UniValue::VARR;
        }
    } // no default case, so the compiler can warn about missing cases
    NONFATAL_UNREACHABLE();
}

UniValue RPCArg::MatchesType(const UniValue &request) const {
    if (m_opts.skip_type_check) {
        return true;
    }
    if (IsOptional() && request.isNull()) {
        return true;
    }
    const auto exp_type{ExpectedType(m_type)};
    if (!exp_type) {
        // nothing to check
        return true;
    }

    if (*exp_type != request.getType()) {
        return strprintf("JSON value of type %s is not of expected type %s",
                         uvTypeName(request.getType()), uvTypeName(*exp_type));
    }
    return true;
}

std::string RPCArg::GetFirstName() const {
    return m_names.substr(0, m_names.find("|"));
}

std::string RPCArg::GetName() const {
    CHECK_NONFATAL(std::string::npos == m_names.find("|"));
    return m_names;
}

bool RPCArg::IsOptional() const {
    if (m_fallback.index() != 0) {
        return true;
    } else {
        return RPCArg::Optional::NO != std::get<RPCArg::Optional>(m_fallback);
    }
}

std::string RPCArg::ToDescriptionString(bool is_named_arg) const {
    std::string ret;
    ret += "(";
    if (m_opts.type_str.size() != 0) {
        ret += m_opts.type_str.at(1);
    } else {
        switch (m_type) {
            case Type::STR_HEX:
            case Type::STR: {
                ret += "string";
                break;
            }
            case Type::NUM: {
                ret += "numeric";
                break;
            }
            case Type::AMOUNT: {
                ret += "numeric or string";
                break;
            }
            case Type::RANGE: {
                ret += "numeric or array";
                break;
            }
            case Type::BOOL: {
                ret += "boolean";
                break;
            }
            case Type::OBJ:
            case Type::OBJ_NAMED_PARAMS:
            case Type::OBJ_USER_KEYS: {
                ret += "json object";
                break;
            }
            case Type::ARR: {
                ret += "json array";
                break;
            } // no default case, so the compiler can warn about missing cases
        }
    }
    if (m_fallback.index() == 1) {
        ret +=
            ", optional, default=" + std::get<RPCArg::DefaultHint>(m_fallback);
    } else if (m_fallback.index() == 2) {
        ret += ", optional, default=" +
               std::get<RPCArg::Default>(m_fallback).write();
    } else {
        switch (std::get<RPCArg::Optional>(m_fallback)) {
            case RPCArg::Optional::OMITTED: {
                // Default value is "null" in dicts. Otherwise, nothing to do.
                // Element is treated as if not present and has no default value
                if (is_named_arg) {
                    ret += ", optional";
                }
                break;
            }
            case RPCArg::Optional::NO: {
                ret += ", required";
                break;
            } // no default case, so the compiler can warn about missing cases
        }
    }
    ret += ")";
    if (m_type == Type::OBJ_NAMED_PARAMS) {
        ret += " Options object that can be used to pass named arguments, "
               "listed below.";
    }
    ret += m_description.empty() ? "" : " " + m_description;
    return ret;
}

void RPCResult::ToSections(Sections &sections, const OuterType outer_type,
                           const int current_indent) const {
    // Indentation
    const std::string indent(current_indent, ' ');
    const std::string indent_next(current_indent + 2, ' ');

    // Elements in a JSON structure (dictionary or array) are separated by a
    // comma
    const std::string maybe_separator{outer_type != OuterType::NONE ? "," : ""};

    // The key name if recursed into a dictionary
    const std::string maybe_key{
        outer_type == OuterType::OBJ ? "\"" + this->m_key_name + "\" : " : ""};

    // Format description with type
    const auto Description = [&](const std::string &type) {
        return "(" + type + (this->m_optional ? ", optional" : "") + ")" +
               (this->m_description.empty() ? "" : " " + this->m_description);
    };

    switch (m_type) {
        case Type::ELISION: {
            // If the inner result is empty, use three dots for elision
            sections.PushSection(
                {indent + "..." + maybe_separator, m_description});
            return;
        }
        case Type::ANY: {
            // Only for testing
            NONFATAL_UNREACHABLE();
        }
        case Type::NONE: {
            sections.PushSection(
                {indent + "null" + maybe_separator, Description("json null")});
            return;
        }
        case Type::STR: {
            sections.PushSection(
                {indent + maybe_key + "\"str\"" + maybe_separator,
                 Description("string")});
            return;
        }
        case Type::STR_AMOUNT: {
            sections.PushSection({indent + maybe_key + "n" + maybe_separator,
                                  Description("numeric")});
            return;
        }
        case Type::STR_HEX: {
            sections.PushSection(
                {indent + maybe_key + "\"hex\"" + maybe_separator,
                 Description("string")});
            return;
        }
        case Type::NUM: {
            sections.PushSection({indent + maybe_key + "n" + maybe_separator,
                                  Description("numeric")});
            return;
        }
        case Type::NUM_TIME: {
            sections.PushSection({indent + maybe_key + "xxx" + maybe_separator,
                                  Description("numeric")});
            return;
        }
        case Type::BOOL: {
            sections.PushSection(
                {indent + maybe_key + "true|false" + maybe_separator,
                 Description("boolean")});
            return;
        }
        case Type::ARR_FIXED:
        case Type::ARR: {
            sections.PushSection(
                {indent + maybe_key + "[", Description("json array")});
            for (const auto &i : m_inner) {
                i.ToSections(sections, OuterType::ARR, current_indent + 2);
            }
            CHECK_NONFATAL(!m_inner.empty());
            if (m_type == Type::ARR && m_inner.back().m_type != Type::ELISION) {
                sections.PushSection({indent_next + "...", ""});
            } else {
                // Remove final comma, which would be invalid JSON
                sections.m_sections.back().m_left.pop_back();
            }
            sections.PushSection({indent + "]" + maybe_separator, ""});
            return;
        }
        case Type::OBJ_DYN:
        case Type::OBJ: {
            if (m_inner.empty()) {
                sections.PushSection({indent + maybe_key + "{}",
                                      Description("empty JSON object")});
                return;
            }
            sections.PushSection(
                {indent + maybe_key + "{", Description("json object")});
            for (const auto &i : m_inner) {
                i.ToSections(sections, OuterType::OBJ, current_indent + 2);
            }
            if (m_type == Type::OBJ_DYN &&
                m_inner.back().m_type != Type::ELISION) {
                // If the dictionary keys are dynamic, use three dots for
                // continuation
                sections.PushSection({indent_next + "...", ""});
            } else {
                // Remove final comma, which would be invalid JSON
                sections.m_sections.back().m_left.pop_back();
            }
            sections.PushSection({indent + "}" + maybe_separator, ""});
            return;
        } // no default case, so the compiler can warn about missing cases
    }
    NONFATAL_UNREACHABLE();
}

static std::optional<UniValue::VType> ExpectedType(RPCResult::Type type) {
    using Type = RPCResult::Type;
    switch (type) {
        case Type::ELISION:
        case Type::ANY: {
            return std::nullopt;
        }
        case Type::NONE: {
            return UniValue::VNULL;
        }
        case Type::STR:
        case Type::STR_HEX: {
            return UniValue::VSTR;
        }
        case Type::NUM:
        case Type::STR_AMOUNT:
        case Type::NUM_TIME: {
            return UniValue::VNUM;
        }
        case Type::BOOL: {
            return UniValue::VBOOL;
        }
        case Type::ARR_FIXED:
        case Type::ARR: {
            return UniValue::VARR;
        }
        case Type::OBJ_DYN:
        case Type::OBJ: {
            return UniValue::VOBJ;
        }
    } // no default case, so the compiler can warn about missing cases
    NONFATAL_UNREACHABLE();
}

UniValue RPCResult::MatchesType(const UniValue &result) const {
    if (m_skip_type_check) {
        return true;
    }

    const auto exp_type = ExpectedType(m_type);
    if (!exp_type) {
        // can be any type, so nothing to check
        return true;
    }

    if (*exp_type != result.getType()) {
        return strprintf("returned type is %s, but declared as %s in doc",
                         uvTypeName(result.getType()), uvTypeName(*exp_type));
    }

    if (UniValue::VARR == result.getType()) {
        UniValue errors(UniValue::VOBJ);
        for (size_t i{0}; i < result.get_array().size(); ++i) {
            // If there are more results than documented, re-use the last
            // doc_inner.
            const RPCResult &doc_inner{
                m_inner.at(std::min(m_inner.size() - 1, i))};
            UniValue match{doc_inner.MatchesType(result.get_array()[i])};
            if (!match.isTrue()) {
                errors.pushKV(strprintf("%d", i), match);
            }
        }
        if (errors.empty()) {
            // empty result array is valid
            return true;
        }
        return errors;
    }

    if (UniValue::VOBJ == result.getType()) {
        if (!m_inner.empty() && m_inner.at(0).m_type == Type::ELISION) {
            return true;
        }
        UniValue errors(UniValue::VOBJ);
        if (m_type == Type::OBJ_DYN) {
            // Assume all types are the same, randomly pick the first
            const RPCResult &doc_inner{m_inner.at(0)};
            for (size_t i{0}; i < result.get_obj().size(); ++i) {
                UniValue match{doc_inner.MatchesType(result.get_obj()[i])};
                if (!match.isTrue()) {
                    errors.pushKV(result.getKeys()[i], match);
                }
            }
            if (errors.empty()) {
                // empty result obj is valid
                return true;
            }
            return errors;
        }
        std::set<std::string> doc_keys;
        for (const auto &doc_entry : m_inner) {
            doc_keys.insert(doc_entry.m_key_name);
        }
        std::map<std::string, UniValue> result_obj;
        result.getObjMap(result_obj);
        for (const auto &result_entry : result_obj) {
            if (doc_keys.find(result_entry.first) == doc_keys.end()) {
                errors.pushKV(result_entry.first,
                              "key returned that was not in doc");
            }
        }

        for (const auto &doc_entry : m_inner) {
            const auto result_it{result_obj.find(doc_entry.m_key_name)};
            if (result_it == result_obj.end()) {
                if (!doc_entry.m_optional) {
                    errors.pushKV(
                        doc_entry.m_key_name,
                        "key missing, despite not being optional in doc");
                }
                continue;
            }
            UniValue match{doc_entry.MatchesType(result_it->second)};
            if (!match.isTrue()) {
                errors.pushKV(doc_entry.m_key_name, match);
            }
        }
        if (errors.empty()) {
            return true;
        }
        return errors;
    }

    return true;
}

void RPCResult::CheckInnerDoc() const {
    if (m_type == Type::OBJ) {
        // May or may not be empty
        return;
    }
    // Everything else must either be empty or not
    const bool inner_needed{m_type == Type::ARR || m_type == Type::ARR_FIXED ||
                            m_type == Type::OBJ_DYN};
    CHECK_NONFATAL(inner_needed != m_inner.empty());
}

std::string RPCArg::ToStringObj(const bool oneline) const {
    std::string res;
    res += "\"";
    res += GetFirstName();
    if (oneline) {
        res += "\":";
    } else {
        res += "\": ";
    }
    switch (m_type) {
        case Type::STR:
            return res + "\"str\"";
        case Type::STR_HEX:
            return res + "\"hex\"";
        case Type::NUM:
            return res + "n";
        case Type::RANGE:
            return res + "n or [n,n]";
        case Type::AMOUNT:
            return res + "amount";
        case Type::BOOL:
            return res + "bool";
        case Type::ARR:
            res += "[";
            for (const auto &i : m_inner) {
                res += i.ToString(oneline) + ",";
            }
            return res + "...]";
        case Type::OBJ:
        case Type::OBJ_NAMED_PARAMS:
        case Type::OBJ_USER_KEYS:
            // Currently unused, so avoid writing dead code
            NONFATAL_UNREACHABLE();

            // no default case, so the compiler can warn about missing cases
    }
    NONFATAL_UNREACHABLE();
    return res + "unknown";
}

std::string RPCArg::ToString(const bool oneline) const {
    if (oneline && !m_opts.oneline_description.empty()) {
        return m_opts.oneline_description;
    }

    switch (m_type) {
        case Type::STR_HEX:
        case Type::STR: {
            return "\"" + GetFirstName() + "\"";
        }
        case Type::NUM:
        case Type::RANGE:
        case Type::AMOUNT:
        case Type::BOOL: {
            return GetFirstName();
        }
        case Type::OBJ:
        case Type::OBJ_NAMED_PARAMS:
        case Type::OBJ_USER_KEYS: {
            const std::string res = Join(m_inner, ",", [&](const RPCArg &i) {
                return i.ToStringObj(oneline);
            });
            if (m_type == Type::OBJ) {
                return "{" + res + "}";
            } else {
                return "{" + res + ",...}";
            }
        }
        case Type::ARR: {
            std::string res;
            for (const auto &i : m_inner) {
                res += i.ToString(oneline) + ",";
            }
            return "[" + res + "...]";
        } // no default case, so the compiler can warn about missing cases
    }
    NONFATAL_UNREACHABLE();
}

static std::pair<int64_t, int64_t> ParseRange(const UniValue &value) {
    if (value.isNum()) {
        return {0, value.getInt<int64_t>()};
    }
    if (value.isArray() && value.size() == 2 && value[0].isNum() &&
        value[1].isNum()) {
        int64_t low = value[0].getInt<int64_t>();
        int64_t high = value[1].getInt<int64_t>();
        if (low > high) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Range specified as [begin,end] must not have begin after end");
        }
        return {low, high};
    }
    throw JSONRPCError(RPC_INVALID_PARAMETER,
                       "Range must be specified as end or as [begin,end]");
}

std::pair<int64_t, int64_t> ParseDescriptorRange(const UniValue &value) {
    int64_t low, high;
    std::tie(low, high) = ParseRange(value);
    if (low < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Range should be greater or equal than 0");
    }
    if ((high >> 31) != 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "End of range is too high");
    }
    if (high >= low + 1000000) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Range is too large");
    }
    return {low, high};
}

std::vector<CScript>
EvalDescriptorStringOrObject(const UniValue &scanobject,
                             FlatSigningProvider &provider) {
    std::string desc_str;
    std::pair<int64_t, int64_t> range = {0, 1000};
    if (scanobject.isStr()) {
        desc_str = scanobject.get_str();
    } else if (scanobject.isObject()) {
        const UniValue &desc_uni{scanobject.find_value("desc")};
        if (desc_uni.isNull()) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Descriptor needs to be provided in scan object");
        }
        desc_str = desc_uni.get_str();
        const UniValue &range_uni{scanobject.find_value("range")};
        if (!range_uni.isNull()) {
            range = ParseDescriptorRange(range_uni);
        }
    } else {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Scan object needs to be either a string or an object");
    }

    std::string error;
    auto desc = Parse(desc_str, provider, error);
    if (!desc) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, error);
    }
    if (!desc->IsRange()) {
        range.first = 0;
        range.second = 0;
    }
    std::vector<CScript> ret;
    for (int i = range.first; i <= range.second; ++i) {
        std::vector<CScript> scripts;
        if (!desc->Expand(i, provider, scripts, provider)) {
            throw JSONRPCError(
                RPC_INVALID_ADDRESS_OR_KEY,
                strprintf("Cannot derive script without private keys: '%s'",
                          desc_str));
        }
        std::move(scripts.begin(), scripts.end(), std::back_inserter(ret));
    }
    return ret;
}

UniValue GetServicesNames(ServiceFlags services) {
    UniValue servicesNames(UniValue::VARR);

    for (const auto &flag : serviceFlagsToStr(services)) {
        servicesNames.push_back(flag);
    }

    return servicesNames;
}
