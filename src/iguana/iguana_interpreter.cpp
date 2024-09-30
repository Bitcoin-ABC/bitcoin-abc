// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <iguana_interpreter.h>
#include <script/script_error.h>
#include <script/sigencoding.h>
#include <streams.h>

#include <tinyformat.h>

IguanaResult IguanaInterpreter::Run() const {
    const CTxIn &txin = tx.vin[inputIndex];

    const bool isSigPushOnly = flags & SCRIPT_VERIFY_SIGPUSHONLY;

    std::vector<std::vector<uint8_t>> stack;

    IguanaResult result;
    {
        ScriptInterpreter interpreter(stack, txin.scriptSig, flags, sigChecker,
                                      result.metrics);
        result.traceScriptSig = RunScript(interpreter, isSigPushOnly);
        if (result.traceScriptSig.scriptError != ScriptError::OK) {
            return result;
        }
    }

    std::vector<std::vector<uint8_t>> stackCopy = stack;

    {
        ScriptInterpreter interpreter(stack, scriptPubKey, flags, sigChecker,
                                      result.metrics);
        result.traceScriptPubKey = RunScript(interpreter, false);
        if (result.traceScriptPubKey.scriptError != ScriptError::OK) {
            return result;
        }
    }

    if (stack.empty() || CastToBool(stack.back()) == false) {
        result.traceScriptPubKey.scriptError = ScriptError::EVAL_FALSE;
        return result;
    }

    IguanaTrace *lastTrace = &result.traceScriptPubKey;

    if ((flags & SCRIPT_VERIFY_P2SH) && scriptPubKey.IsPayToScriptHash()) {
        result.traceRedeemScript.emplace();
        if (!txin.scriptSig.IsPushOnly()) {
            result.traceRedeemScript->scriptError = ScriptError::SIG_PUSHONLY;
            return result;
        }

        swap(stack, stackCopy);
        const std::vector<uint8_t> &redeemScriptRaw = stack.back();
        CScript redeemScript(redeemScriptRaw.begin(), redeemScriptRaw.end());
        stack.pop_back();

        if ((flags & SCRIPT_DISALLOW_SEGWIT_RECOVERY) == 0 && stack.empty() &&
            redeemScript.IsWitnessProgram()) {
            // Allow SegWit recovery; doesn't run redeemScript
            result.traceRedeemScript = std::nullopt;
            return result;
        }

        ScriptInterpreter interpreter(stack, redeemScript, flags, sigChecker,
                                      result.metrics);
        result.traceRedeemScript = RunScript(interpreter, false);

        if (result.traceRedeemScript->scriptError != ScriptError::OK) {
            return result;
        }

        if (stack.empty() || CastToBool(stack.back()) == false) {
            result.traceRedeemScript->scriptError = ScriptError::EVAL_FALSE;
            return result;
        }
        lastTrace = &*result.traceRedeemScript;
    }

    if ((flags & SCRIPT_VERIFY_CLEANSTACK) != 0) {
        if (stack.size() != 1) {
            lastTrace->scriptError = ScriptError::CLEANSTACK;
            return result;
        }
    }

    if ((flags & SCRIPT_VERIFY_INPUT_SIGCHECKS) != 0) {
        if (int(txin.scriptSig.size()) < result.metrics.nSigChecks * 43 - 60) {
            lastTrace->scriptError = ScriptError::INPUT_SIGCHECKS;
            return result;
        }
    }

    return result;
}

IguanaTrace IguanaInterpreter::RunScript(ScriptInterpreter &interpreter,
                                         bool isPushOnly) const {
    IguanaTrace trace;
    trace.scriptError = ScriptError::UNKNOWN;
    try {
        while (!interpreter.IsAtEnd()) {
            IguanaTraceEntry entry;
            if (!interpreter.GetNextOp(entry.opcode, entry.pushdata)) {
                // Override message for invalid encoding, since an unknown
                // opcode also results in BAD_OPCODE
                trace.errorMsg = "Invalidly encoded opcode";
                trace.scriptError = ScriptError::BAD_OPCODE;
                return trace;
            }

            entry.stacks.stack = interpreter.GetStack();
            entry.stacks.altstack = interpreter.GetAltStack();
            trace.entries.push_back(entry);

            if (isPushOnly && entry.opcode > OP_16) {
                trace.scriptError = ScriptError::SIG_PUSHONLY;
                return trace;
            }
            if (!interpreter.RunNextOp()) {
                trace.scriptError = interpreter.GetScriptError();
                return trace;
            }
        }
    } catch (std::exception &ex) {
        trace.errorMsg = strprintf("Exception: %s", ex.what());
        return trace;
    }
    trace.scriptError = ScriptError::OK;
    trace.finalStacks.stack = interpreter.GetStack();
    trace.finalStacks.altstack = interpreter.GetAltStack();
    return trace;
}
