// Copyright (c) 2017-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_UTIL_H
#define BITCOIN_RPC_UTIL_H

#include <node/transaction.h>
#include <outputtype.h>
#include <protocol.h>
#include <rpc/protocol.h>
#include <rpc/request.h>
#include <script/script.h>
#include <script/sign.h>
#include <script/standard.h> // For CTxDestination
#include <univalue.h>
#include <util/check.h>

#include <string>
#include <variant>
#include <vector>

class CChainParams;
class FillableSigningProvider;
class CPubKey;
class CScript;
struct Sections;

static constexpr bool DEFAULT_RPC_DOC_CHECK{false};

/**
 * String used to describe UNIX epoch time in documentation, factored out to a
 * constant for consistency.
 */
extern const std::string UNIX_EPOCH_TIME;

/**
 * Example CashAddr address used in multiple RPCExamples.
 */
extern const std::string EXAMPLE_ADDRESS;

/**
 * Wrapper for UniValue::VType, which includes typeAny: used to denote don't
 * care type.
 */
struct UniValueType {
    UniValueType(UniValue::VType _type) : typeAny(false), type(_type) {}
    UniValueType() : typeAny(true) {}
    bool typeAny;
    UniValue::VType type;
};

/**
 * Check for expected keys/value types in an Object.
 */
void RPCTypeCheckObj(const UniValue &o,
                     const std::map<std::string, UniValueType> &typesExpected,
                     bool fAllowNull = false, bool fStrict = false);

/**
 * Utilities: convert hex-encoded values (throws error if not hex).
 */
extern uint256 ParseHashV(const UniValue &v, std::string strName);
extern uint256 ParseHashO(const UniValue &o, std::string strKey);
extern std::vector<uint8_t> ParseHexV(const UniValue &v, std::string strName);
extern std::vector<uint8_t> ParseHexO(const UniValue &o, std::string strKey);

extern Amount AmountFromValue(const UniValue &value);

using RPCArgList = std::vector<std::pair<std::string, UniValue>>;
extern std::string HelpExampleCli(const std::string &methodname,
                                  const std::string &args);
extern std::string HelpExampleCliNamed(const std::string &methodname,
                                       const RPCArgList &args);
extern std::string HelpExampleRpc(const std::string &methodname,
                                  const std::string &args);
extern std::string HelpExampleRpcNamed(const std::string &methodname,
                                       const RPCArgList &args);

CPubKey HexToPubKey(const std::string &hex_in);
CPubKey AddrToPubKey(const CChainParams &chainparams,
                     const FillableSigningProvider &keystore,
                     const std::string &addr_in);
CTxDestination AddAndGetMultisigDestination(const int required,
                                            const std::vector<CPubKey> &pubkeys,
                                            OutputType type,
                                            FillableSigningProvider &keystore,
                                            CScript &script_out);

UniValue DescribeAddress(const CTxDestination &dest);
std::string GetAllOutputTypes();

RPCErrorCode RPCErrorFromTransactionError(TransactionError terr);
UniValue JSONRPCTransactionError(TransactionError terr,
                                 const std::string &err_string = "");

//! Parse a JSON range specified as int64, or [int64, int64]
std::pair<int64_t, int64_t> ParseDescriptorRange(const UniValue &value);

/**
 * Evaluate a descriptor given as a string, or as a {"desc":...,"range":...}
 * object, with default range of 1000.
 */
std::vector<CScript>
EvalDescriptorStringOrObject(const UniValue &scanobject,
                             FlatSigningProvider &provider);

/**
 * Returns, given services flags, a list of humanly readable (known)
 * network services.
 */
UniValue GetServicesNames(ServiceFlags services);

/**
 * Serializing JSON objects depends on the outer type. Only arrays and
 * dictionaries can be nested in json. The top-level outer type is "NONE".
 */
enum class OuterType {
    ARR,
    OBJ,
    NONE, // Only set on first recursion
};

struct RPCArgOptions {
    bool skip_type_check{false};
    //! Should be empty unless it is supposed to override the auto-generated
    //! summary line
    std::string oneline_description{};
    //! Should be empty unless it is supposed to override the auto-generated
    //! type strings. Vector length is either 0 or 2, m_opts.type_str.at(0) will
    //! override the type of the value in a key-value pair,
    //! m_opts.type_str.at(1) will override the type in the argument
    //! description.
    std::vector<std::string> type_str{};
    //! For testing only
    bool hidden{false};
    //! If set allows a named-parameter field in an OBJ_NAMED_PARAM options
    //! object to have the same name as a top-level parameter. By default the
    //! RPC framework disallows this, because if an RPC request passes the value
    //! by name, it is assigned to top-level parameter position, not to the
    //! options position, defeating the purpose of using OBJ_NAMED_PARAMS
    //! instead OBJ for that option. But sometimes it makes sense to allow
    //! less-commonly used options to be passed by name only, and more commonly
    //! used options to be passed by name or position, so the RPC framework
    //! allows this as long as methods set the also_positional flag and read
    //! values from both positions.
    bool also_positional{false};
};

struct RPCArg {
    enum class Type {
        OBJ,
        ARR,
        STR,
        NUM,
        BOOL,
        //! Special type that behaves almost exactly like OBJ, defining an
        //! options object with a list of pre-defined keys. The only difference
        //! between OBJ and OBJ_NAMED_PARAMS is that OBJ_NAMED_PARMS also allows
        //! the keys to be passed as top-level named parameters, as a more
        //! convenient way to pass options to the RPC method without nesting
        //! them.
        OBJ_NAMED_PARAMS,
        //! Special type where the user must set the keys e.g. to define
        //! multiple addresses; as opposed to e.g. an options object where the
        //! keys are predefined
        OBJ_USER_KEYS,
        //! Special type representing a floating point amount (can be either NUM
        //! or STR)
        AMOUNT,
        //! Special type that is a STR with only hex chars
        STR_HEX,
        //! Special type that is a NUM or [NUM,NUM]
        RANGE,
    };

    enum class Optional {
        /** Required arg */
        NO,
        /**
         * The arg is optional for one of two reasons:
         *
         * Optional arg that is a named argument and has a default value of
         * `null`.
         *
         * Optional argument with default value omitted because they are
         * implicitly clear. That is, elements in an array may not exist by
         * default.
         * When possible, the default value should be specified.
         */
        OMITTED,
        OMITTED_NAMED_ARG, // Deprecated alias for OMITTED, can be removed
    };
    /** Hint for default value */
    using DefaultHint = std::string;
    /** Default constant value */
    using Default = UniValue;
    using Fallback = std::variant<Optional, DefaultHint, Default>;

    //! The name of the arg (can be empty for inner args, can contain multiple
    //! aliases separated by | for named request arguments)
    const std::string m_names;
    const Type m_type;
    //! Only used for arrays or dicts
    const std::vector<RPCArg> m_inner;
    const Fallback m_fallback;
    const std::string m_description;
    const RPCArgOptions m_opts;

    RPCArg(std::string name, Type type, Fallback fallback,
           std::string description, RPCArgOptions opts = {})
        : m_names{std::move(name)}, m_type{std::move(type)},
          m_fallback{std::move(fallback)},
          m_description{std::move(description)}, m_opts{std::move(opts)} {
        CHECK_NONFATAL(type != Type::ARR && type != Type::OBJ &&
                       type != Type::OBJ_NAMED_PARAMS &&
                       type != Type::OBJ_USER_KEYS);
    }

    RPCArg(std::string name, Type type, Fallback fallback,
           std::string description, std::vector<RPCArg> inner,
           RPCArgOptions opts = {})
        : m_names{std::move(name)}, m_type{std::move(type)},
          m_inner{std::move(inner)}, m_fallback{std::move(fallback)},
          m_description{std::move(description)}, m_opts{std::move(opts)} {
        CHECK_NONFATAL(type == Type::ARR || type == Type::OBJ ||
                       type == Type::OBJ_NAMED_PARAMS ||
                       type == Type::OBJ_USER_KEYS);
    }

    bool IsOptional() const;

    /**
     * Check whether the request JSON type matches.
     * Returns true if type matches, or object describing error(s) if not.
     */
    UniValue MatchesType(const UniValue &request) const;

    /** Return the first of all aliases */
    std::string GetFirstName() const;

    /** Return the name, throws when there are aliases */
    std::string GetName() const;

    /**
     * Return the type string of the argument.
     * Set oneline to allow it to be overridden by a custom oneline type string
     * (m_opts.oneline_description).
     */
    std::string ToString(bool oneline) const;
    /**
     * Return the type string of the argument when it is in an object (dict).
     * Set oneline to get the oneline representation (less whitespace)
     */
    std::string ToStringObj(bool oneline) const;
    /**
     * Return the description string, including the argument type and whether
     * the argument is required.
     */
    std::string ToDescriptionString(bool is_named_arg) const;
};

struct RPCResult {
    enum class Type {
        OBJ,
        ARR,
        STR,
        NUM,
        BOOL,
        NONE,
        ANY,        //!< Special type to disable type checks (for testing only)
        STR_AMOUNT, //!< Special string to represent a floating point amount
        STR_HEX,    //!< Special string with only hex chars
        OBJ_DYN,    //!< Special dictionary with keys that are not literals
        ARR_FIXED,  //!< Special array that has a fixed number of entries
        NUM_TIME,   //!< Special numeric to denote unix epoch time
        ELISION,    //!< Special type to denote elision (...)
    };

    const Type m_type;
    const std::string m_key_name;         //!< Only used for dicts
    const std::vector<RPCResult> m_inner; //!< Only used for arrays or dicts
    const bool m_optional;
    const bool m_skip_type_check;
    const std::string m_description;
    const std::string m_cond;

    RPCResult(std::string cond, Type type, std::string key_name, bool optional,
              std::string description, std::vector<RPCResult> inner = {})
        : m_type{std::move(type)}, m_key_name{std::move(key_name)},
          m_inner{std::move(inner)}, m_optional{optional},
          m_skip_type_check{false}, m_description{std::move(description)},
          m_cond{std::move(cond)} {
        CHECK_NONFATAL(!m_cond.empty());
        CheckInnerDoc();
    }

    RPCResult(std::string cond, Type type, std::string key_name,
              std::string description, std::vector<RPCResult> inner = {})
        : RPCResult{std::move(cond),        type,
                    std::move(key_name),    /*optional=*/false,
                    std::move(description), std::move(inner)} {}

    RPCResult(Type type, std::string key_name, bool optional,
              std::string description, std::vector<RPCResult> inner = {},
              bool skip_type_check = false)
        : m_type{std::move(type)}, m_key_name{std::move(key_name)},
          m_inner{std::move(inner)}, m_optional{optional},
          m_skip_type_check{skip_type_check},
          m_description{std::move(description)}, m_cond{} {
        CheckInnerDoc();
    }

    RPCResult(Type type, std::string key_name, std::string description,
              std::vector<RPCResult> inner = {}, bool skip_type_check = false)
        : RPCResult{type,
                    std::move(key_name),
                    /*optional=*/false,
                    std::move(description),
                    std::move(inner),
                    skip_type_check} {}

    /** Append the sections of the result. */
    void ToSections(Sections &sections, OuterType outer_type = OuterType::NONE,
                    const int current_indent = 0) const;
    /** Return the type string of the result when it is in an object (dict). */
    std::string ToStringObj() const;
    /** Return the description string, including the result type. */
    std::string ToDescriptionString() const;
    /**
     * Check whether the result JSON type matches.
     * Returns true if type matches, or object describing error(s) if not.
     */
    UniValue MatchesType(const UniValue &result) const;

private:
    void CheckInnerDoc() const;
};

struct RPCResults {
    const std::vector<RPCResult> m_results;

    RPCResults(RPCResult result) : m_results{{result}} {}

    RPCResults(std::initializer_list<RPCResult> results) : m_results{results} {}

    /**
     * Return the description string.
     */
    std::string ToDescriptionString() const;
};

struct RPCExamples {
    const std::string m_examples;
    explicit RPCExamples(std::string examples)
        : m_examples(std::move(examples)) {}
    RPCExamples() : m_examples(std::move("")) {}
    std::string ToDescriptionString() const;
};

class RPCHelpMan {
public:
    RPCHelpMan(std::string name, std::string description,
               std::vector<RPCArg> args, RPCResults results,
               RPCExamples examples);
    using RPCMethodImpl = std::function<UniValue(
        const RPCHelpMan &, const Config &config, const JSONRPCRequest &)>;
    RPCHelpMan(std::string name, std::string description,
               std::vector<RPCArg> args, RPCResults results,
               RPCExamples examples, RPCMethodImpl fun);

    UniValue HandleRequest(const Config &config,
                           const JSONRPCRequest &request) const;
    std::string ToString() const;
    /**
     * Return the named args that need to be converted from string to another
     * JSON type
     */
    UniValue GetArgMap() const;
    /** If the supplied number of args is neither too small nor too high */
    bool IsValidNumArgs(size_t num_args) const;
    //! Return list of arguments and whether they are named-only.
    std::vector<std::pair<std::string, bool>> GetArgNames() const;

    const std::string m_name;

private:
    const RPCMethodImpl m_fun;
    const std::string m_description;
    const std::vector<RPCArg> m_args;
    const RPCResults m_results;
    const RPCExamples m_examples;
};

#endif // BITCOIN_RPC_UTIL_H
