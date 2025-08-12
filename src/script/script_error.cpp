// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/script_error.h>

#include <string>

std::string ScriptErrorString(const ScriptError serror) {
    switch (serror) {
        case ScriptError::OK:
            return "No error";
        case ScriptError::EVAL_FALSE:
            return "Script evaluated without error but finished with a "
                   "false/empty top stack element";
        case ScriptError::VERIFY:
            return "Script failed an OP_VERIFY operation";
        case ScriptError::EQUALVERIFY:
            return "Script failed an OP_EQUALVERIFY operation";
        case ScriptError::CHECKMULTISIGVERIFY:
            return "Script failed an OP_CHECKMULTISIGVERIFY operation";
        case ScriptError::CHECKSIGVERIFY:
            return "Script failed an OP_CHECKSIGVERIFY operation";
        case ScriptError::CHECKDATASIGVERIFY:
            return "Script failed an OP_CHECKDATASIGVERIFY operation";
        case ScriptError::NUMEQUALVERIFY:
            return "Script failed an OP_NUMEQUALVERIFY operation";
        case ScriptError::SCRIPT_SIZE:
            return "Script is too big";
        case ScriptError::PUSH_SIZE:
            return "Push value size limit exceeded";
        case ScriptError::OP_COUNT:
            return "Operation limit exceeded";
        case ScriptError::STACK_SIZE:
            return "Stack size limit exceeded";
        case ScriptError::SIG_COUNT:
            return "Signature count negative or greater than pubkey count";
        case ScriptError::PUBKEY_COUNT:
            return "Pubkey count negative or limit exceeded";
        case ScriptError::INPUT_SIGCHECKS:
            return "Input SigChecks limit exceeded";
        case ScriptError::INVALID_OPERAND_SIZE:
            return "Invalid operand size";
        case ScriptError::INTEGER_OVERFLOW:
            return "Integer overflow";
        case ScriptError::BAD_INTEGER_ENCODING:
            return "Integer non-minimally encoded";
        case ScriptError::IMPOSSIBLE_ENCODING:
            return "The requested encoding is impossible to satisfy";
        case ScriptError::INVALID_SPLIT_RANGE:
            return "Invalid OP_SPLIT range";
        case ScriptError::INVALID_BIT_COUNT:
            return "Invalid number of bit set in OP_CHECKMULTISIG";
        case ScriptError::BAD_OPCODE:
            return "Opcode missing or not understood";
        case ScriptError::DISABLED_OPCODE:
            return "Attempted to use a disabled opcode";
        case ScriptError::INVALID_STACK_OPERATION:
            return "Operation not valid with the current stack size";
        case ScriptError::INVALID_ALTSTACK_OPERATION:
            return "Operation not valid with the current altstack size";
        case ScriptError::OP_RETURN:
            return "OP_RETURN was encountered";
        case ScriptError::UNBALANCED_CONDITIONAL:
            return "Invalid OP_IF construction";
        case ScriptError::DIV_BY_ZERO:
            return "Division by zero error";
        case ScriptError::MOD_BY_ZERO:
            return "Modulo by zero error";
        case ScriptError::INVALID_BITFIELD_SIZE:
            return "Bitfield of unexpected size error";
        case ScriptError::INVALID_BIT_RANGE:
            return "Bitfield's bit out of the expected range";
        case ScriptError::NEGATIVE_LOCKTIME:
            return "Negative locktime";
        case ScriptError::UNSATISFIED_LOCKTIME:
            return "Locktime requirement not satisfied";
        case ScriptError::SIG_HASHTYPE:
            return "Signature hash type missing or not understood";
        case ScriptError::SIG_DER:
            return "Non-canonical DER signature";
        case ScriptError::MINIMALDATA:
            return "Data push larger than necessary";
        case ScriptError::SIG_PUSHONLY:
            return "Only push operators allowed in signatures";
        case ScriptError::SIG_HIGH_S:
            return "Non-canonical signature: S value is unnecessarily high";
        case ScriptError::MINIMALIF:
            return "OP_IF/NOTIF argument must be minimal";
        case ScriptError::SIG_NULLFAIL:
            return "Signature must be zero for failed CHECK(MULTI)SIG "
                   "operation";
        case ScriptError::SIG_BADLENGTH:
            return "Signature cannot be 65 bytes in CHECKMULTISIG";
        case ScriptError::SIG_NONSCHNORR:
            return "Only Schnorr signatures allowed in this operation";
        case ScriptError::DISCOURAGE_UPGRADABLE_NOPS:
            return "NOPx reserved for soft-fork upgrades";
        case ScriptError::PUBKEYTYPE:
            return "Public key is neither compressed or uncompressed";
        case ScriptError::CLEANSTACK:
            return "Stack size must be exactly one after execution";
        case ScriptError::ILLEGAL_FORKID:
            return "Illegal use of SIGHASH_FORKID";
        case ScriptError::MUST_USE_FORKID:
            return "Signature must use SIGHASH_FORKID";
        case ScriptError::SIGCHECKS_LIMIT_EXCEEDED:
            return "Validation resources exceeded (SigChecks)";
        case ScriptError::UNKNOWN:
        case ScriptError::ERROR_COUNT:
        default:
            break;
    }
    return "unknown error";
}
