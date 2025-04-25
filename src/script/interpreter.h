// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_INTERPRETER_H
#define BITCOIN_SCRIPT_INTERPRETER_H

#include <hash.h>
#include <primitives/transaction.h>
#include <script/conditionstack.h>
#include <script/script.h>
#include <script/script_error.h>
#include <script/script_flags.h>
#include <script/script_metrics.h>
#include <script/sighashtype.h>

#include <cstdint>
#include <optional>
#include <vector>

class CPubKey;
class CTransaction;
class uint256;

bool CastToBool(const std::vector<uint8_t> &vch);

/**
 * Data structure to cache SHA256 midstates for the ECDSA sighash calculations
 * (bare, P2SH)
 */
class SigHashCache {
    /**
     * For each sighash mode:
     *  [0]  ALL
     *  [1]  NONE
     *  [2]  SINGLE
     *  [3]  ALL|ANYONE
     *  [4]  NONE|ANYONE
     *  [5]  SINGLE|ANYONE
     *  [6]  ALL|FORKID
     *  [7]  NONE|FORKID
     *  [8]  SINGLE|FORKID
     *  [9]  ALL|ANYONE|FORKID
     *  [10] NONE|ANYONE|FORKID
     *  [11] SINGLE|ANYONE|FORKID
     * optionally store a scriptCode which the hash is for, plus a midstate
     * for the SHA256 computation just before adding the hash_type itself.
     */
    std::optional<std::pair<CScript, HashWriter>> m_cache_entries[12];

    /** Given a hash_type, find which of the 12 cache entries is to be used. */
    int CacheIndex(const SigHashType &hash_type) const noexcept;

public:
    /** Load into writer the SHA256 midstate if found in this cache. */
    [[nodiscard]] bool Load(const SigHashType &hash_type,
                            const CScript &script_code,
                            HashWriter &writer) const noexcept;
    /** Store into this cache object the provided SHA256 midstate. */
    void Store(const SigHashType &hash_type, const CScript &script_code,
               const HashWriter &writer) noexcept;
};

template <class T>
uint256 SignatureHash(const CScript &scriptCode, const T &txTo,
                      unsigned int nIn, SigHashType sigHashType,
                      const Amount amount,
                      const PrecomputedTransactionData *cache = nullptr,
                      uint32_t flags = SCRIPT_ENABLE_SIGHASH_FORKID,
                      SigHashCache *sighash_cache = nullptr);

class BaseSignatureChecker {
public:
    virtual bool VerifySignature(const std::vector<uint8_t> &vchSig,
                                 const CPubKey &vchPubKey,
                                 const uint256 &sighash) const;

    virtual bool CheckSig(const std::vector<uint8_t> &vchSigIn,
                          const std::vector<uint8_t> &vchPubKey,
                          const CScript &scriptCode, uint32_t flags) const {
        return false;
    }

    virtual bool CheckLockTime(const CScriptNum &nLockTime) const {
        return false;
    }

    virtual bool CheckSequence(const CScriptNum &nSequence) const {
        return false;
    }

    virtual ~BaseSignatureChecker() {}
};

template <class T>
class GenericTransactionSignatureChecker : public BaseSignatureChecker {
private:
    const T *txTo;
    unsigned int nIn;
    const Amount amount;
    const PrecomputedTransactionData *txdata;
    mutable SigHashCache m_sighash_cache;

public:
    GenericTransactionSignatureChecker(const T *txToIn, unsigned int nInIn,
                                       const Amount &amountIn)
        : txTo(txToIn), nIn(nInIn), amount(amountIn), txdata(nullptr) {}
    GenericTransactionSignatureChecker(
        const T *txToIn, unsigned int nInIn, const Amount &amountIn,
        const PrecomputedTransactionData &txdataIn)
        : txTo(txToIn), nIn(nInIn), amount(amountIn), txdata(&txdataIn) {}

    // The overridden functions are now final.
    bool CheckSig(const std::vector<uint8_t> &vchSigIn,
                  const std::vector<uint8_t> &vchPubKey,
                  const CScript &scriptCode,
                  uint32_t flags) const final override;
    bool CheckLockTime(const CScriptNum &nLockTime) const final override;
    bool CheckSequence(const CScriptNum &nSequence) const final override;
};

using TransactionSignatureChecker =
    GenericTransactionSignatureChecker<CTransaction>;
using MutableTransactionSignatureChecker =
    GenericTransactionSignatureChecker<CMutableTransaction>;

class ScriptInterpreter {
private:
    // stack (reference so we can modify an outside stack)
    std::vector<std::vector<uint8_t>> &stack;
    // altstack (owned)
    std::vector<std::vector<uint8_t>> altstack;

    // Script being executed
    const CScript &script;

    // Current position (program counter) in the executed Script
    CScript::const_iterator pc;
    // End iterator of the executed Script
    CScript::const_iterator pend;
    // Position of the last executed OP_CODESEPARATOR
    CScript::const_iterator pbegincodehash;

    // Number of executed non-push ops
    size_t nOpCount = 0;

    // true/false stack of nested OP_IF/OP_ELSE/OP_ENDIF
    ConditionStack vfExec;

    // Script flag of this execution
    uint32_t flags;

    // Signature checker (reference)
    const BaseSignatureChecker &checker;

    // Execution metrics (e.g. for counting sigchecks)
    ScriptExecutionMetrics &metrics;

    // Last script error
    ScriptError script_error;

public:
    ScriptInterpreter(std::vector<std::vector<uint8_t>> &stack,
                      const CScript &script, uint32_t flags,
                      const BaseSignatureChecker &checker,
                      ScriptExecutionMetrics &metrics);

    // Whether the interpreter program counter reached the end of the Script.
    // This does not reflect whether an error occured or not.
    bool IsAtEnd();

    // Do checks before running the first opcode, and set script_error on errror
    bool CheckPreConditions();

    // Do checks after running the last opcode, and set script_error on error
    bool CheckPostConditions();

    // Return the next opcode (with attached pushdata, if present)
    bool GetNextOp(opcodetype &opcodeRet, std::vector<uint8_t> &vchRet) const;

    // Run all opcodes to completion, setting script_error on any error
    bool RunUntilEnd();

    // Execute the next op of the script, return `false` if it failed.
    // The corresponding error can be obtained via GetScriptError
    bool RunNextOp() noexcept;

    // Get the condition stack, determining if opcodes are currently executed
    const ConditionStack &GetConditionStack() { return vfExec; }

    // Current error of the Script. During execution, this will be UNKNOWN,
    // upon successful execution it will be OK, and if RunNextOp returns false,
    // this will be the error of the Script.
    ScriptError GetScriptError() { return script_error; }

    // Get the stack of the interpreter
    const std::vector<std::vector<uint8_t>> &GetStack() const { return stack; }

    // Get the altstack of the interpreter
    const std::vector<std::vector<uint8_t>> &GetAltStack() const {
        return altstack;
    }

private:
    // Inner private opcode execution function, called by RunNextOp.
    // Execute the next op of the script, return `false` if it failed.
    // May throw an exception if there's e.g. an integer overflow.
    bool RunNextOpInner();
};

bool EvalScript(std::vector<std::vector<uint8_t>> &stack, const CScript &script,
                uint32_t flags, const BaseSignatureChecker &checker,
                ScriptExecutionMetrics &metrics, ScriptError *error = nullptr);
static inline bool EvalScript(std::vector<std::vector<uint8_t>> &stack,
                              const CScript &script, uint32_t flags,
                              const BaseSignatureChecker &checker,
                              ScriptError *error = nullptr) {
    ScriptExecutionMetrics dummymetrics;
    return EvalScript(stack, script, flags, checker, dummymetrics, error);
}

/**
 * Execute an unlocking and locking script together.
 *
 * Upon success, metrics will hold the accumulated script metrics.
 * (upon failure, the results should not be relied on)
 */
bool VerifyScript(const CScript &scriptSig, const CScript &scriptPubKey,
                  uint32_t flags, const BaseSignatureChecker &checker,
                  ScriptExecutionMetrics &metricsOut,
                  ScriptError *serror = nullptr);
static inline bool VerifyScript(const CScript &scriptSig,
                                const CScript &scriptPubKey, uint32_t flags,
                                const BaseSignatureChecker &checker,
                                ScriptError *serror = nullptr) {
    ScriptExecutionMetrics dummymetrics;
    return VerifyScript(scriptSig, scriptPubKey, flags, checker, dummymetrics,
                        serror);
}

int FindAndDelete(CScript &script, const CScript &b);

#endif // BITCOIN_SCRIPT_INTERPRETER_H
