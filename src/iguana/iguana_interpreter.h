// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_IGUANA_IGUANA_INTERPRETER_H
#define BITCOIN_IGUANA_IGUANA_INTERPRETER_H

#include <script/interpreter.h>
#include <script/script.h>

#include <optional>
#include <string>
#include <vector>

enum class ScriptError;

struct IguanaStacks {
    std::vector<std::vector<uint8_t>> stack;
    std::vector<std::vector<uint8_t>> altstack;
};

struct IguanaTraceEntry {
    opcodetype opcode;
    std::vector<uint8_t> pushdata;
    IguanaStacks stacks;
};

struct IguanaTrace {
    std::vector<IguanaTraceEntry> entries;
    IguanaStacks finalStacks;
    std::string errorMsg;
    ScriptError scriptError;
};

struct IguanaResult {
    IguanaTrace traceScriptSig;
    IguanaTrace traceScriptPubKey;
    std::optional<IguanaTrace> traceRedeemScript;
    ScriptExecutionMetrics metrics;
};

class IguanaInterpreter {
private:
    CMutableTransaction tx;
    uint32_t inputIndex;

    CScript scriptPubKey;

    PrecomputedTransactionData txdata;

    MutableTransactionSignatureChecker sigChecker;

    uint32_t flags;

public:
    IguanaInterpreter(CMutableTransaction txIn, uint32_t inputIndexIn,
                      CTxOut spentOutput, uint32_t flagsIn)
        : tx(txIn), inputIndex(inputIndexIn),
          scriptPubKey(spentOutput.scriptPubKey), txdata(tx),
          sigChecker(&tx, inputIndex, spentOutput.nValue, txdata),
          flags(flagsIn) {}

    /**
     * Run the interpreter, stepping through the scripts and return the trace.
     * Modelled to match VerifyScript exactly.
     **/
    IguanaResult Run() const;

private:
    IguanaTrace RunScript(ScriptInterpreter &interpreter,
                          bool isPushOnly) const;
};

#endif // BITCOIN_IGUANA_IGUANA_INTERPRETER_H
