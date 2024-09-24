// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <iguana_formatter.h>
#include <iguana_interpreter.h>
#include <iostream>
#include <tinyformat.h>
#include <util/strencodings.h>

bool FormatterHumanReadable::Format(const IguanaResult &result) {
    if (!FormatTrace("scriptSig", result.traceScriptSig, result.metrics)) {
        return false;
    }

    if (!FormatTrace("scriptPubKey", result.traceScriptPubKey,
                     result.metrics)) {
        return false;
    }
    FormatStacks(result.traceScriptPubKey.finalStacks);

    if (result.traceRedeemScript) {
        if (!FormatTrace("redeemScript", *result.traceRedeemScript,
                         result.metrics)) {
            return false;
        }
        FormatStacks(result.traceRedeemScript->finalStacks);
    }

    std::cout << "Script executed without errors" << std::endl;

    return true;
}

std::string FormatOpcode(opcodetype opcode) {
    if (opcode > OP_0 && opcode < OP_PUSHDATA1) {
        return strprintf("0x%02x", int32_t(opcode));
    } else if (opcode == OP_1NEGATE) {
        return "OP_1NEGATE";
    } else if (opcode == OP_0 || (opcode >= OP_1 && opcode <= OP_16)) {
        return strprintf("OP_%s", GetOpName(opcode));
    } else {
        return GetOpName(opcode);
    }
}

bool FormatterHumanReadable::FormatTrace(
    const std::string &title, const IguanaTrace &trace,
    const ScriptExecutionMetrics &metrics) {
    std::cout << "======= " << title << " =======" << std::endl;

    for (size_t entryIdx = 0; entryIdx < trace.entries.size(); ++entryIdx) {
        const IguanaTraceEntry &entry = trace.entries[entryIdx];
        FormatStacks(entry.stacks);
        std::cout << strprintf("OP%3d: %s", entryIdx,
                               FormatOpcode(entry.opcode));
        if (!entry.pushdata.empty()) {
            std::cout << " " << HexStr(entry.pushdata);
        }
        std::cout << std::endl;
    }

    if (!trace.errorMsg.empty() || trace.scriptError != ScriptError::OK) {
        if (trace.scriptError == ScriptError::CLEANSTACK ||
            trace.scriptError == ScriptError::INPUT_SIGCHECKS) {
            FormatStacks(trace.finalStacks);
        }
        if (trace.scriptError == ScriptError::INPUT_SIGCHECKS) {
            FormatExecutionMetrics(metrics);
        }

        std::cerr << title << " failed execution: ";
        if (trace.errorMsg.size() > 0) {
            std::cerr << trace.errorMsg;
        } else {
            std::cerr << ScriptErrorString(trace.scriptError);
        }
        std::cerr << std::endl;
        return false;
    }

    return true;
}

void FormatterHumanReadable::FormatStacks(const IguanaStacks &stacks) {
    std::cout << strprintf("       Stack (%d item%s):", stacks.stack.size(),
                           stacks.stack.size() == 1 ? "" : "s");
    if (stacks.stack.empty()) {
        std::cout << " (empty stack)";
    }
    std::cout << std::endl;
    for (size_t itemIdx = 0; itemIdx < stacks.stack.size(); ++itemIdx) {
        std::cout << strprintf("        %2d: %s", itemIdx,
                               HexStr(stacks.stack[itemIdx]))
                  << std::endl;
    }
    if (!stacks.altstack.empty()) {
        std::cout << strprintf(
                         "       Altstack (%d item%s):", stacks.altstack.size(),
                         stacks.altstack.size() == 1 ? "" : "s")
                  << std::endl;
        for (size_t itemIdx = 0; itemIdx < stacks.altstack.size(); ++itemIdx) {
            std::cout << strprintf("        %2d: %s", itemIdx,
                                   HexStr(stacks.altstack[itemIdx]))
                      << std::endl;
        }
    }
}

void FormatterHumanReadable::FormatExecutionMetrics(
    const ScriptExecutionMetrics &metrics) {
    std::cout << "Number of sigChecks: " << metrics.nSigChecks << std::endl;
}
