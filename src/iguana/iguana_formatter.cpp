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

    if (!result.traceScriptPubKey.entries.empty()) {
        FormatStacks(result.traceScriptPubKey.entries.back().stacks);
    }

    if (result.traceRedeemScript) {
        if (!FormatTrace("redeemScript", *result.traceRedeemScript,
                         result.metrics)) {
            return false;
        }

        if (!result.traceRedeemScript->entries.empty()) {
            FormatStacks(result.traceRedeemScript->entries.back().stacks);
        }
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

std::string FormatStackItem(const std::vector<uint8_t> &data) {
    if (data.empty()) {
        return "\"\"";
    } else {
        return HexStr(data);
    }
}

bool FormatterHumanReadable::FormatTrace(
    const std::string &title, const IguanaTrace &trace,
    const ScriptExecutionMetrics &metrics) {
    std::cout << "======= " << title << " =======" << std::endl;

    FormatStacks(trace.initialStacks);

    for (size_t entryIdx = 0; entryIdx < trace.entries.size(); ++entryIdx) {
        const IguanaTraceEntry &entry = trace.entries[entryIdx];
        std::cout << strprintf("OP%3d: %s", entryIdx,
                               FormatOpcode(entry.opcode));
        if (!entry.pushdata.empty()) {
            std::cout << " " << HexStr(entry.pushdata);
        }
        std::cout << std::endl;

        if (entryIdx == trace.entries.size() - 1 &&
            trace.scriptError != ScriptError::CLEANSTACK &&
            trace.scriptError != ScriptError::INPUT_SIGCHECKS) {
            continue;
        }

        FormatStacks(entry.stacks);
    }

    if (!trace.errorMsg.empty() || trace.scriptError != ScriptError::OK) {
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
                               FormatStackItem(stacks.stack[itemIdx]))
                  << std::endl;
    }
    if (!stacks.altstack.empty()) {
        std::cout << strprintf(
                         "       Altstack (%d item%s):", stacks.altstack.size(),
                         stacks.altstack.size() == 1 ? "" : "s")
                  << std::endl;
        for (size_t itemIdx = 0; itemIdx < stacks.altstack.size(); ++itemIdx) {
            std::cout << strprintf("        %2d: %s", itemIdx,
                                   FormatStackItem(stacks.altstack[itemIdx]))
                      << std::endl;
        }
    }
}

void FormatterHumanReadable::FormatExecutionMetrics(
    const ScriptExecutionMetrics &metrics) {
    std::cout << "Number of sigChecks: " << metrics.nSigChecks << std::endl;
}

bool FormatterCsv::Format(const IguanaResult &result) {
    // Calculate the maximum used stack size (to format the altstack)
    size_t topStackSize = 0;
    size_t topAltStackSize = 0;
    TopStackSize(result.traceScriptSig, topStackSize, topAltStackSize);
    TopStackSize(result.traceScriptPubKey, topStackSize, topAltStackSize);
    if (result.traceRedeemScript) {
        TopStackSize(*result.traceRedeemScript, topStackSize, topAltStackSize);
    }

    std::cout << "scriptName,index,opcode,";
    for (size_t idx = 0; idx < topStackSize; ++idx) {
        std::cout << "stack " << idx << ",";
    }
    for (size_t idx = 0; idx < topAltStackSize; ++idx) {
        std::cout << "altstack " << idx << ",";
    }
    std::cout << std::endl;

    if (!FormatTrace("scriptSig", result.traceScriptSig, result.metrics,
                     topStackSize)) {
        return false;
    }

    if (!FormatTrace("scriptPubKey", result.traceScriptPubKey, result.metrics,
                     topStackSize)) {
        return false;
    }

    if (result.traceRedeemScript) {
        if (!FormatTrace("redeemScript", *result.traceRedeemScript,
                         result.metrics, topStackSize)) {
            return false;
        }
    }

    FormatExecutionMetrics(result.metrics);
    std::cout << "Script executed without errors" << std::endl;

    return true;
}

void FormatterCsv::TopStackSize(const IguanaTrace &trace, size_t &topStackSize,
                                size_t &topAltStackSize) {
    for (const IguanaTraceEntry &entry : trace.entries) {
        topStackSize = std::max(topStackSize, entry.stacks.stack.size());
        topAltStackSize =
            std::max(topAltStackSize, entry.stacks.altstack.size());
    }
}

bool FormatterCsv::FormatTrace(const std::string &traceName,
                               const IguanaTrace &trace,
                               const ScriptExecutionMetrics &metrics,
                               size_t topStackSize) {
    for (size_t entryIdx = 0; entryIdx < trace.entries.size(); ++entryIdx) {
        const IguanaTraceEntry &entry = trace.entries[entryIdx];
        std::cout << traceName << ",";
        std::cout << entryIdx << ",";
        if (entry.pushdata.empty()) {
            std::cout << FormatOpcode(entry.opcode) << ",";
        } else {
            std::cout << "0x" << HexStr(entry.pushdata) << ",";
        }
        FormatStacks(entry.stacks, topStackSize);
        std::cout << std::endl;
    }

    if (!trace.errorMsg.empty() || trace.scriptError != ScriptError::OK) {
        if (trace.scriptError == ScriptError::INPUT_SIGCHECKS) {
            FormatExecutionMetrics(metrics);
        }

        std::cout << traceName << " failed execution: ";
        if (trace.errorMsg.size() > 0) {
            std::cout << trace.errorMsg;
        } else {
            std::cout << ScriptErrorString(trace.scriptError);
        }
        std::cout << std::endl;
        return false;
    }

    return true;
}

void FormatterCsv::FormatStacks(const IguanaStacks &stacks,
                                size_t topStackSize) {
    FormatStack(stacks.stack);
    if (!stacks.altstack.empty()) {
        for (size_t padIdx = 0; padIdx < topStackSize - stacks.stack.size();
             ++padIdx) {
            std::cout << ",";
        }
        FormatStack(stacks.altstack);
    }
}

void FormatterCsv::FormatStack(const std::vector<std::vector<uint8_t>> &stack) {
    for (const std::vector<uint8_t> &item : stack) {
        if (item.empty()) {
            std::cout << "(empty)";
        } else {
            std::cout << "\"" << HexStr(item) << "\"";
        }
        std::cout << ",";
    }
}

void FormatterCsv::FormatExecutionMetrics(
    const ScriptExecutionMetrics &metrics) {
    std::cout << "#sigChecks"
              << "," << metrics.nSigChecks << std::endl;
}
