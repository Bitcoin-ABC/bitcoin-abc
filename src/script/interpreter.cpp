// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/interpreter.h>

#include <crypto/ripemd160.h>
#include <crypto/sha1.h>
#include <crypto/sha256.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <script/script.h>
#include <script/script_flags.h>
#include <script/sigencoding.h>
#include <uint256.h>

bool CastToBool(const valtype &vch) {
    for (size_t i = 0; i < vch.size(); i++) {
        if (vch[i] != 0) {
            // Can be negative zero
            if (i == vch.size() - 1 && vch[i] == 0x80) {
                return false;
            }
            return true;
        }
    }
    return false;
}

/**
 * Script is a stack machine (like Forth) that evaluates a predicate
 * returning a bool indicating valid or not.  There are no loops.
 */
#define stacktop(i) (stack.at(stack.size() + (i)))
#define altstacktop(i) (altstack.at(altstack.size() + (i)))
static inline void popstack(std::vector<valtype> &stack) {
    if (stack.empty()) {
        throw std::runtime_error("popstack(): stack empty");
    }
    stack.pop_back();
}

static void CleanupScriptCode(CScript &scriptCode,
                              const std::vector<uint8_t> &vchSig,
                              uint32_t flags) {
    // Drop the signature in scripts when SIGHASH_FORKID is not used.
    SigHashType sigHashType = GetHashType(vchSig);
    if (!(flags & SCRIPT_ENABLE_SIGHASH_FORKID) || !sigHashType.hasForkId()) {
        scriptCode.FindAndDelete(CScript(vchSig));
    }
}

static bool CheckMinimalPush(const valtype &data, opcodetype opcode) {
    if (data.size() == 0) {
        // Could have used OP_0.
        return opcode == OP_0;
    }
    if (data.size() == 1 && data[0] >= 1 && data[0] <= 16) {
        // Could have used OP_1 .. OP_16.
        return opcode == OP_1 + (data[0] - 1);
    }
    if (data.size() == 1 && data[0] == 0x81) {
        // Could have used OP_1NEGATE.
        return opcode == OP_1NEGATE;
    }
    if (data.size() <= 75) {
        // Could have used a direct push (opcode indicating number of bytes
        // pushed + those bytes).
        return opcode == data.size();
    }
    if (data.size() <= 255) {
        // Could have used OP_PUSHDATA.
        return opcode == OP_PUSHDATA1;
    }
    if (data.size() <= 65535) {
        // Could have used OP_PUSHDATA2.
        return opcode == OP_PUSHDATA2;
    }
    return true;
}

static bool IsOpcodeDisabled(opcodetype opcode, uint32_t flags) {
    switch (opcode) {
        case OP_INVERT:
        case OP_2MUL:
        case OP_2DIV:
        case OP_MUL:
        case OP_LSHIFT:
        case OP_RSHIFT:
            // Disabled opcodes.
            return true;

        default:
            break;
    }

    return false;
}

bool EvalScript(std::vector<valtype> &stack, const CScript &script,
                uint32_t flags, const BaseSignatureChecker &checker,
                ScriptError *serror) {
    static const CScriptNum bnZero(0);
    static const CScriptNum bnOne(1);
    static const valtype vchFalse(0);
    static const valtype vchTrue(1, 1);

    CScript::const_iterator pc = script.begin();
    CScript::const_iterator pend = script.end();
    CScript::const_iterator pbegincodehash = script.begin();
    opcodetype opcode;
    valtype vchPushValue;
    std::vector<bool> vfExec;
    std::vector<valtype> altstack;
    set_error(serror, SCRIPT_ERR_UNKNOWN_ERROR);
    if (script.size() > MAX_SCRIPT_SIZE) {
        return set_error(serror, SCRIPT_ERR_SCRIPT_SIZE);
    }
    int nOpCount = 0;
    bool fRequireMinimal = (flags & SCRIPT_VERIFY_MINIMALDATA) != 0;

    try {
        while (pc < pend) {
            bool fExec = !count(vfExec.begin(), vfExec.end(), false);

            //
            // Read instruction
            //
            if (!script.GetOp(pc, opcode, vchPushValue)) {
                return set_error(serror, SCRIPT_ERR_BAD_OPCODE);
            }
            if (vchPushValue.size() > MAX_SCRIPT_ELEMENT_SIZE) {
                return set_error(serror, SCRIPT_ERR_PUSH_SIZE);
            }

            // Note how OP_RESERVED does not count towards the opcode limit.
            if (opcode > OP_16 && ++nOpCount > MAX_OPS_PER_SCRIPT) {
                return set_error(serror, SCRIPT_ERR_OP_COUNT);
            }

            // Some opcodes are disabled.
            if (IsOpcodeDisabled(opcode, flags)) {
                return set_error(serror, SCRIPT_ERR_DISABLED_OPCODE);
            }

            if (fExec && 0 <= opcode && opcode <= OP_PUSHDATA4) {
                if (fRequireMinimal &&
                    !CheckMinimalPush(vchPushValue, opcode)) {
                    return set_error(serror, SCRIPT_ERR_MINIMALDATA);
                }
                stack.push_back(vchPushValue);
            } else if (fExec || (OP_IF <= opcode && opcode <= OP_ENDIF)) {
                switch (opcode) {
                    //
                    // Push value
                    //
                    case OP_1NEGATE:
                    case OP_1:
                    case OP_2:
                    case OP_3:
                    case OP_4:
                    case OP_5:
                    case OP_6:
                    case OP_7:
                    case OP_8:
                    case OP_9:
                    case OP_10:
                    case OP_11:
                    case OP_12:
                    case OP_13:
                    case OP_14:
                    case OP_15:
                    case OP_16: {
                        // ( -- value)
                        CScriptNum bn((int)opcode - (int)(OP_1 - 1));
                        stack.push_back(bn.getvch());
                        // The result of these opcodes should always be the
                        // minimal way to push the data they push, so no need
                        // for a CheckMinimalPush here.
                    } break;

                    //
                    // Control
                    //
                    case OP_NOP:
                        break;

                    case OP_CHECKLOCKTIMEVERIFY: {
                        if (!(flags & SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY)) {
                            // not enabled; treat as a NOP2
                            if (flags &
                                SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS) {
                                return set_error(
                                    serror,
                                    SCRIPT_ERR_DISCOURAGE_UPGRADABLE_NOPS);
                            }
                            break;
                        }

                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        // Note that elsewhere numeric opcodes are limited to
                        // operands in the range -2**31+1 to 2**31-1, however it
                        // is legal for opcodes to produce results exceeding
                        // that range. This limitation is implemented by
                        // CScriptNum's default 4-byte limit.
                        //
                        // If we kept to that limit we'd have a year 2038
                        // problem, even though the nLockTime field in
                        // transactions themselves is uint32 which only becomes
                        // meaningless after the year 2106.
                        //
                        // Thus as a special case we tell CScriptNum to accept
                        // up to 5-byte bignums, which are good until 2**39-1,
                        // well beyond the 2**32-1 limit of the nLockTime field
                        // itself.
                        const CScriptNum nLockTime(stacktop(-1),
                                                   fRequireMinimal, 5);

                        // In the rare event that the argument may be < 0 due to
                        // some arithmetic being done first, you can always use
                        // 0 MAX CHECKLOCKTIMEVERIFY.
                        if (nLockTime < 0) {
                            return set_error(serror,
                                             SCRIPT_ERR_NEGATIVE_LOCKTIME);
                        }

                        // Actually compare the specified lock time with the
                        // transaction.
                        if (!checker.CheckLockTime(nLockTime)) {
                            return set_error(serror,
                                             SCRIPT_ERR_UNSATISFIED_LOCKTIME);
                        }

                        break;
                    }

                    case OP_CHECKSEQUENCEVERIFY: {
                        if (!(flags & SCRIPT_VERIFY_CHECKSEQUENCEVERIFY)) {
                            // not enabled; treat as a NOP3
                            if (flags &
                                SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS) {
                                return set_error(
                                    serror,
                                    SCRIPT_ERR_DISCOURAGE_UPGRADABLE_NOPS);
                            }
                            break;
                        }

                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        // nSequence, like nLockTime, is a 32-bit unsigned
                        // integer field. See the comment in CHECKLOCKTIMEVERIFY
                        // regarding 5-byte numeric operands.
                        const CScriptNum nSequence(stacktop(-1),
                                                   fRequireMinimal, 5);

                        // In the rare event that the argument may be < 0 due to
                        // some arithmetic being done first, you can always use
                        // 0 MAX CHECKSEQUENCEVERIFY.
                        if (nSequence < 0) {
                            return set_error(serror,
                                             SCRIPT_ERR_NEGATIVE_LOCKTIME);
                        }

                        // To provide for future soft-fork extensibility, if the
                        // operand has the disabled lock-time flag set,
                        // CHECKSEQUENCEVERIFY behaves as a NOP.
                        if ((nSequence &
                             CTxIn::SEQUENCE_LOCKTIME_DISABLE_FLAG) != 0) {
                            break;
                        }

                        // Compare the specified sequence number with the input.
                        if (!checker.CheckSequence(nSequence)) {
                            return set_error(serror,
                                             SCRIPT_ERR_UNSATISFIED_LOCKTIME);
                        }

                        break;
                    }

                    case OP_NOP1:
                    case OP_NOP4:
                    case OP_NOP5:
                    case OP_NOP6:
                    case OP_NOP7:
                    case OP_NOP8:
                    case OP_NOP9:
                    case OP_NOP10: {
                        if (flags & SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS) {
                            return set_error(
                                serror, SCRIPT_ERR_DISCOURAGE_UPGRADABLE_NOPS);
                        }
                    } break;

                    case OP_IF:
                    case OP_NOTIF: {
                        // <expression> if [statements] [else [statements]]
                        // endif
                        bool fValue = false;
                        if (fExec) {
                            if (stack.size() < 1) {
                                return set_error(
                                    serror, SCRIPT_ERR_UNBALANCED_CONDITIONAL);
                            }
                            valtype &vch = stacktop(-1);
                            if (flags & SCRIPT_VERIFY_MINIMALIF) {
                                if (vch.size() > 1) {
                                    return set_error(serror,
                                                     SCRIPT_ERR_MINIMALIF);
                                }
                                if (vch.size() == 1 && vch[0] != 1) {
                                    return set_error(serror,
                                                     SCRIPT_ERR_MINIMALIF);
                                }
                            }
                            fValue = CastToBool(vch);
                            if (opcode == OP_NOTIF) {
                                fValue = !fValue;
                            }
                            popstack(stack);
                        }
                        vfExec.push_back(fValue);
                    } break;

                    case OP_ELSE: {
                        if (vfExec.empty()) {
                            return set_error(serror,
                                             SCRIPT_ERR_UNBALANCED_CONDITIONAL);
                        }
                        vfExec.back() = !vfExec.back();
                    } break;

                    case OP_ENDIF: {
                        if (vfExec.empty()) {
                            return set_error(serror,
                                             SCRIPT_ERR_UNBALANCED_CONDITIONAL);
                        }
                        vfExec.pop_back();
                    } break;

                    case OP_VERIFY: {
                        // (true -- ) or
                        // (false -- false) and return
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        bool fValue = CastToBool(stacktop(-1));
                        if (fValue) {
                            popstack(stack);
                        } else {
                            return set_error(serror, SCRIPT_ERR_VERIFY);
                        }
                    } break;

                    case OP_RETURN: {
                        return set_error(serror, SCRIPT_ERR_OP_RETURN);
                    } break;

                    //
                    // Stack ops
                    //
                    case OP_TOALTSTACK: {
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        altstack.push_back(stacktop(-1));
                        popstack(stack);
                    } break;

                    case OP_FROMALTSTACK: {
                        if (altstack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_ALTSTACK_OPERATION);
                        }
                        stack.push_back(altstacktop(-1));
                        popstack(altstack);
                    } break;

                    case OP_2DROP: {
                        // (x1 x2 -- )
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        popstack(stack);
                        popstack(stack);
                    } break;

                    case OP_2DUP: {
                        // (x1 x2 -- x1 x2 x1 x2)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch1 = stacktop(-2);
                        valtype vch2 = stacktop(-1);
                        stack.push_back(vch1);
                        stack.push_back(vch2);
                    } break;

                    case OP_3DUP: {
                        // (x1 x2 x3 -- x1 x2 x3 x1 x2 x3)
                        if (stack.size() < 3) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch1 = stacktop(-3);
                        valtype vch2 = stacktop(-2);
                        valtype vch3 = stacktop(-1);
                        stack.push_back(vch1);
                        stack.push_back(vch2);
                        stack.push_back(vch3);
                    } break;

                    case OP_2OVER: {
                        // (x1 x2 x3 x4 -- x1 x2 x3 x4 x1 x2)
                        if (stack.size() < 4) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch1 = stacktop(-4);
                        valtype vch2 = stacktop(-3);
                        stack.push_back(vch1);
                        stack.push_back(vch2);
                    } break;

                    case OP_2ROT: {
                        // (x1 x2 x3 x4 x5 x6 -- x3 x4 x5 x6 x1 x2)
                        if (stack.size() < 6) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch1 = stacktop(-6);
                        valtype vch2 = stacktop(-5);
                        stack.erase(stack.end() - 6, stack.end() - 4);
                        stack.push_back(vch1);
                        stack.push_back(vch2);
                    } break;

                    case OP_2SWAP: {
                        // (x1 x2 x3 x4 -- x3 x4 x1 x2)
                        if (stack.size() < 4) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        swap(stacktop(-4), stacktop(-2));
                        swap(stacktop(-3), stacktop(-1));
                    } break;

                    case OP_IFDUP: {
                        // (x - 0 | x x)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch = stacktop(-1);
                        if (CastToBool(vch)) {
                            stack.push_back(vch);
                        }
                    } break;

                    case OP_DEPTH: {
                        // -- stacksize
                        CScriptNum bn(stack.size());
                        stack.push_back(bn.getvch());
                    } break;

                    case OP_DROP: {
                        // (x -- )
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        popstack(stack);
                    } break;

                    case OP_DUP: {
                        // (x -- x x)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch = stacktop(-1);
                        stack.push_back(vch);
                    } break;

                    case OP_NIP: {
                        // (x1 x2 -- x2)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        stack.erase(stack.end() - 2);
                    } break;

                    case OP_OVER: {
                        // (x1 x2 -- x1 x2 x1)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch = stacktop(-2);
                        stack.push_back(vch);
                    } break;

                    case OP_PICK:
                    case OP_ROLL: {
                        // (xn ... x2 x1 x0 n - xn ... x2 x1 x0 xn)
                        // (xn ... x2 x1 x0 n - ... x2 x1 x0 xn)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        int n =
                            CScriptNum(stacktop(-1), fRequireMinimal).getint();
                        popstack(stack);
                        if (n < 0 || n >= (int)stack.size()) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch = stacktop(-n - 1);
                        if (opcode == OP_ROLL) {
                            stack.erase(stack.end() - n - 1);
                        }
                        stack.push_back(vch);
                    } break;

                    case OP_ROT: {
                        // (x1 x2 x3 -- x2 x3 x1)
                        //  x2 x1 x3  after first swap
                        //  x2 x3 x1  after second swap
                        if (stack.size() < 3) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        swap(stacktop(-3), stacktop(-2));
                        swap(stacktop(-2), stacktop(-1));
                    } break;

                    case OP_SWAP: {
                        // (x1 x2 -- x2 x1)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        swap(stacktop(-2), stacktop(-1));
                    } break;

                    case OP_TUCK: {
                        // (x1 x2 -- x2 x1 x2)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype vch = stacktop(-1);
                        stack.insert(stack.end() - 2, vch);
                    } break;

                    case OP_SIZE: {
                        // (in -- in size)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        CScriptNum bn(stacktop(-1).size());
                        stack.push_back(bn.getvch());
                    } break;

                    //
                    // Bitwise logic
                    //
                    case OP_AND:
                    case OP_OR:
                    case OP_XOR: {
                        // (x1 x2 - out)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype &vch1 = stacktop(-2);
                        valtype &vch2 = stacktop(-1);

                        // Inputs must be the same size
                        if (vch1.size() != vch2.size()) {
                            return set_error(serror,
                                             SCRIPT_ERR_INVALID_OPERAND_SIZE);
                        }

                        // To avoid allocating, we modify vch1 in place.
                        switch (opcode) {
                            case OP_AND:
                                for (size_t i = 0; i < vch1.size(); ++i) {
                                    vch1[i] &= vch2[i];
                                }
                                break;
                            case OP_OR:
                                for (size_t i = 0; i < vch1.size(); ++i) {
                                    vch1[i] |= vch2[i];
                                }
                                break;
                            case OP_XOR:
                                for (size_t i = 0; i < vch1.size(); ++i) {
                                    vch1[i] ^= vch2[i];
                                }
                                break;
                            default:
                                break;
                        }

                        // And pop vch2.
                        popstack(stack);
                    } break;

                    case OP_EQUAL:
                    case OP_EQUALVERIFY:
                        // case OP_NOTEQUAL: // use OP_NUMNOTEQUAL
                        {
                            // (x1 x2 - bool)
                            if (stack.size() < 2) {
                                return set_error(
                                    serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                            }
                            valtype &vch1 = stacktop(-2);
                            valtype &vch2 = stacktop(-1);

                            bool fEqual = (vch1 == vch2);
                            // OP_NOTEQUAL is disabled because it would be too
                            // easy to say something like n != 1 and have some
                            // wiseguy pass in 1 with extra zero bytes after it
                            // (numerically, 0x01 == 0x0001 == 0x000001)
                            // if (opcode == OP_NOTEQUAL)
                            //    fEqual = !fEqual;
                            popstack(stack);
                            popstack(stack);
                            stack.push_back(fEqual ? vchTrue : vchFalse);
                            if (opcode == OP_EQUALVERIFY) {
                                if (fEqual) {
                                    popstack(stack);
                                } else {
                                    return set_error(serror,
                                                     SCRIPT_ERR_EQUALVERIFY);
                                }
                            }
                        }
                        break;

                    //
                    // Numeric
                    //
                    case OP_1ADD:
                    case OP_1SUB:
                    case OP_NEGATE:
                    case OP_ABS:
                    case OP_NOT:
                    case OP_0NOTEQUAL: {
                        // (in -- out)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        CScriptNum bn(stacktop(-1), fRequireMinimal);
                        switch (opcode) {
                            case OP_1ADD:
                                bn += bnOne;
                                break;
                            case OP_1SUB:
                                bn -= bnOne;
                                break;
                            case OP_NEGATE:
                                bn = -bn;
                                break;
                            case OP_ABS:
                                if (bn < bnZero) {
                                    bn = -bn;
                                }
                                break;
                            case OP_NOT:
                                bn = (bn == bnZero);
                                break;
                            case OP_0NOTEQUAL:
                                bn = (bn != bnZero);
                                break;
                            default:
                                assert(!"invalid opcode");
                                break;
                        }
                        popstack(stack);
                        stack.push_back(bn.getvch());
                    } break;

                    case OP_ADD:
                    case OP_SUB:
                    case OP_DIV:
                    case OP_MOD:
                    case OP_BOOLAND:
                    case OP_BOOLOR:
                    case OP_NUMEQUAL:
                    case OP_NUMEQUALVERIFY:
                    case OP_NUMNOTEQUAL:
                    case OP_LESSTHAN:
                    case OP_GREATERTHAN:
                    case OP_LESSTHANOREQUAL:
                    case OP_GREATERTHANOREQUAL:
                    case OP_MIN:
                    case OP_MAX: {
                        // (x1 x2 -- out)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        CScriptNum bn1(stacktop(-2), fRequireMinimal);
                        CScriptNum bn2(stacktop(-1), fRequireMinimal);
                        CScriptNum bn(0);
                        switch (opcode) {
                            case OP_ADD:
                                bn = bn1 + bn2;
                                break;

                            case OP_SUB:
                                bn = bn1 - bn2;
                                break;

                            case OP_DIV:
                                // denominator must not be 0
                                if (bn2 == 0) {
                                    return set_error(serror,
                                                     SCRIPT_ERR_DIV_BY_ZERO);
                                }
                                bn = bn1 / bn2;
                                break;

                            case OP_MOD:
                                // divisor must not be 0
                                if (bn2 == 0) {
                                    return set_error(serror,
                                                     SCRIPT_ERR_MOD_BY_ZERO);
                                }
                                bn = bn1 % bn2;
                                break;

                            case OP_BOOLAND:
                                bn = (bn1 != bnZero && bn2 != bnZero);
                                break;
                            case OP_BOOLOR:
                                bn = (bn1 != bnZero || bn2 != bnZero);
                                break;
                            case OP_NUMEQUAL:
                                bn = (bn1 == bn2);
                                break;
                            case OP_NUMEQUALVERIFY:
                                bn = (bn1 == bn2);
                                break;
                            case OP_NUMNOTEQUAL:
                                bn = (bn1 != bn2);
                                break;
                            case OP_LESSTHAN:
                                bn = (bn1 < bn2);
                                break;
                            case OP_GREATERTHAN:
                                bn = (bn1 > bn2);
                                break;
                            case OP_LESSTHANOREQUAL:
                                bn = (bn1 <= bn2);
                                break;
                            case OP_GREATERTHANOREQUAL:
                                bn = (bn1 >= bn2);
                                break;
                            case OP_MIN:
                                bn = (bn1 < bn2 ? bn1 : bn2);
                                break;
                            case OP_MAX:
                                bn = (bn1 > bn2 ? bn1 : bn2);
                                break;
                            default:
                                assert(!"invalid opcode");
                                break;
                        }
                        popstack(stack);
                        popstack(stack);
                        stack.push_back(bn.getvch());

                        if (opcode == OP_NUMEQUALVERIFY) {
                            if (CastToBool(stacktop(-1))) {
                                popstack(stack);
                            } else {
                                return set_error(serror,
                                                 SCRIPT_ERR_NUMEQUALVERIFY);
                            }
                        }
                    } break;

                    case OP_WITHIN: {
                        // (x min max -- out)
                        if (stack.size() < 3) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        CScriptNum bn1(stacktop(-3), fRequireMinimal);
                        CScriptNum bn2(stacktop(-2), fRequireMinimal);
                        CScriptNum bn3(stacktop(-1), fRequireMinimal);
                        bool fValue = (bn2 <= bn1 && bn1 < bn3);
                        popstack(stack);
                        popstack(stack);
                        popstack(stack);
                        stack.push_back(fValue ? vchTrue : vchFalse);
                    } break;

                    //
                    // Crypto
                    //
                    case OP_RIPEMD160:
                    case OP_SHA1:
                    case OP_SHA256:
                    case OP_HASH160:
                    case OP_HASH256: {
                        // (in -- hash)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype &vch = stacktop(-1);
                        valtype vchHash((opcode == OP_RIPEMD160 ||
                                         opcode == OP_SHA1 ||
                                         opcode == OP_HASH160)
                                            ? 20
                                            : 32);
                        if (opcode == OP_RIPEMD160) {
                            CRIPEMD160()
                                .Write(vch.data(), vch.size())
                                .Finalize(vchHash.data());
                        } else if (opcode == OP_SHA1) {
                            CSHA1()
                                .Write(vch.data(), vch.size())
                                .Finalize(vchHash.data());
                        } else if (opcode == OP_SHA256) {
                            CSHA256()
                                .Write(vch.data(), vch.size())
                                .Finalize(vchHash.data());
                        } else if (opcode == OP_HASH160) {
                            CHash160()
                                .Write(vch.data(), vch.size())
                                .Finalize(vchHash.data());
                        } else if (opcode == OP_HASH256) {
                            CHash256()
                                .Write(vch.data(), vch.size())
                                .Finalize(vchHash.data());
                        }
                        popstack(stack);
                        stack.push_back(vchHash);
                    } break;

                    case OP_CODESEPARATOR: {
                        // Hash starts after the code separator
                        pbegincodehash = pc;
                    } break;

                    case OP_CHECKSIG:
                    case OP_CHECKSIGVERIFY: {
                        // (sig pubkey -- bool)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype &vchSig = stacktop(-2);
                        valtype &vchPubKey = stacktop(-1);

                        if (!CheckTransactionSignatureEncoding(vchSig, flags,
                                                               serror) ||
                            !CheckPubKeyEncoding(vchPubKey, flags, serror)) {
                            // serror is set
                            return false;
                        }

                        // Subset of script starting at the most recent
                        // codeseparator
                        CScript scriptCode(pbegincodehash, pend);

                        // Remove signature for pre-fork scripts
                        CleanupScriptCode(scriptCode, vchSig, flags);

                        bool fSuccess = checker.CheckSig(vchSig, vchPubKey,
                                                         scriptCode, flags);

                        if (!fSuccess && (flags & SCRIPT_VERIFY_NULLFAIL) &&
                            vchSig.size()) {
                            return set_error(serror, SCRIPT_ERR_SIG_NULLFAIL);
                        }

                        popstack(stack);
                        popstack(stack);
                        stack.push_back(fSuccess ? vchTrue : vchFalse);
                        if (opcode == OP_CHECKSIGVERIFY) {
                            if (fSuccess) {
                                popstack(stack);
                            } else {
                                return set_error(serror,
                                                 SCRIPT_ERR_CHECKSIGVERIFY);
                            }
                        }
                    } break;

                    case OP_CHECKDATASIG:
                    case OP_CHECKDATASIGVERIFY: {
                        // Make sure this remains an error before activation.
                        if ((flags & SCRIPT_ENABLE_CHECKDATASIG) == 0) {
                            return set_error(serror, SCRIPT_ERR_BAD_OPCODE);
                        }

                        // (sig message pubkey -- bool)
                        if (stack.size() < 3) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        valtype &vchSig = stacktop(-3);
                        valtype &vchMessage = stacktop(-2);
                        valtype &vchPubKey = stacktop(-1);

                        if (!CheckDataSignatureEncoding(vchSig, flags,
                                                        serror) ||
                            !CheckPubKeyEncoding(vchPubKey, flags, serror)) {
                            // serror is set
                            return false;
                        }

                        bool fSuccess = false;
                        if (vchSig.size()) {
                            valtype vchHash(32);
                            CSHA256()
                                .Write(vchMessage.data(), vchMessage.size())
                                .Finalize(vchHash.data());
                            fSuccess = checker.VerifySignature(
                                vchSig, CPubKey(vchPubKey), uint256(vchHash),
                                flags);
                        }

                        if (!fSuccess && (flags & SCRIPT_VERIFY_NULLFAIL) &&
                            vchSig.size()) {
                            return set_error(serror, SCRIPT_ERR_SIG_NULLFAIL);
                        }

                        popstack(stack);
                        popstack(stack);
                        popstack(stack);
                        stack.push_back(fSuccess ? vchTrue : vchFalse);
                        if (opcode == OP_CHECKDATASIGVERIFY) {
                            if (fSuccess) {
                                popstack(stack);
                            } else {
                                return set_error(serror,
                                                 SCRIPT_ERR_CHECKDATASIGVERIFY);
                            }
                        }
                    } break;

                    case OP_CHECKMULTISIG:
                    case OP_CHECKMULTISIGVERIFY: {
                        // ([sig ...] num_of_signatures [pubkey ...]
                        // num_of_pubkeys -- bool)

                        int i = 1;
                        if ((int)stack.size() < i) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        int nKeysCount =
                            CScriptNum(stacktop(-i), fRequireMinimal).getint();
                        if (nKeysCount < 0 ||
                            nKeysCount > MAX_PUBKEYS_PER_MULTISIG) {
                            return set_error(serror, SCRIPT_ERR_PUBKEY_COUNT);
                        }
                        nOpCount += nKeysCount;
                        if (nOpCount > MAX_OPS_PER_SCRIPT) {
                            return set_error(serror, SCRIPT_ERR_OP_COUNT);
                        }
                        int ikey = ++i;
                        // ikey2 is the position of last non-signature item in
                        // the stack. Top stack item = 1. With
                        // SCRIPT_VERIFY_NULLFAIL, this is used for cleanup if
                        // operation fails.
                        int ikey2 = nKeysCount + 2;
                        i += nKeysCount;
                        if ((int)stack.size() < i) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        int nSigsCount =
                            CScriptNum(stacktop(-i), fRequireMinimal).getint();
                        if (nSigsCount < 0 || nSigsCount > nKeysCount) {
                            return set_error(serror, SCRIPT_ERR_SIG_COUNT);
                        }
                        int isig = ++i;
                        i += nSigsCount;
                        if ((int)stack.size() < i) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        // Subset of script starting at the most recent
                        // codeseparator
                        CScript scriptCode(pbegincodehash, pend);

                        // Remove signature for pre-fork scripts
                        for (int k = 0; k < nSigsCount; k++) {
                            valtype &vchSig = stacktop(-isig - k);
                            CleanupScriptCode(scriptCode, vchSig, flags);
                        }

                        bool fSuccess = true;
                        while (fSuccess && nSigsCount > 0) {
                            valtype &vchSig = stacktop(-isig);
                            valtype &vchPubKey = stacktop(-ikey);

                            // Note how this makes the exact order of
                            // pubkey/signature evaluation distinguishable by
                            // CHECKMULTISIG NOT if the STRICTENC flag is set.
                            // See the script_(in)valid tests for details.
                            if (!CheckTransactionECDSASignatureEncoding(
                                    vchSig, flags, serror) ||
                                !CheckPubKeyEncoding(vchPubKey, flags,
                                                     serror)) {
                                // serror is set
                                return false;
                            }

                            // Check signature
                            bool fOk = checker.CheckSig(vchSig, vchPubKey,
                                                        scriptCode, flags);

                            if (fOk) {
                                isig++;
                                nSigsCount--;
                            }
                            ikey++;
                            nKeysCount--;

                            // If there are more signatures left than keys left,
                            // then too many signatures have failed. Exit early,
                            // without checking any further signatures.
                            if (nSigsCount > nKeysCount) {
                                fSuccess = false;
                            }
                        }

                        // Clean up stack of actual arguments
                        while (i-- > 1) {
                            // If the operation failed, we require that all
                            // signatures must be empty vector
                            if (!fSuccess && (flags & SCRIPT_VERIFY_NULLFAIL) &&
                                !ikey2 && stacktop(-1).size()) {
                                return set_error(serror,
                                                 SCRIPT_ERR_SIG_NULLFAIL);
                            }
                            if (ikey2 > 0) {
                                ikey2--;
                            }
                            popstack(stack);
                        }

                        // A bug causes CHECKMULTISIG to consume one extra
                        // argument whose contents were not checked in any way.
                        //
                        // Unfortunately this is a potential source of
                        // mutability, so optionally verify it is exactly equal
                        // to zero prior to removing it from the stack.
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        if ((flags & SCRIPT_VERIFY_NULLDUMMY) &&
                            stacktop(-1).size()) {
                            return set_error(serror, SCRIPT_ERR_SIG_NULLDUMMY);
                        }
                        popstack(stack);

                        stack.push_back(fSuccess ? vchTrue : vchFalse);

                        if (opcode == OP_CHECKMULTISIGVERIFY) {
                            if (fSuccess) {
                                popstack(stack);
                            } else {
                                return set_error(
                                    serror, SCRIPT_ERR_CHECKMULTISIGVERIFY);
                            }
                        }
                    } break;

                    //
                    // Byte string operations
                    //
                    case OP_CAT: {
                        // (x1 x2 -- out)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }
                        valtype &vch1 = stacktop(-2);
                        valtype &vch2 = stacktop(-1);
                        if (vch1.size() + vch2.size() >
                            MAX_SCRIPT_ELEMENT_SIZE) {
                            return set_error(serror, SCRIPT_ERR_PUSH_SIZE);
                        }
                        vch1.insert(vch1.end(), vch2.begin(), vch2.end());
                        popstack(stack);
                    } break;

                    case OP_SPLIT: {
                        // (in position -- x1 x2)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        const valtype &data = stacktop(-2);

                        // Make sure the split point is apropriate.
                        uint64_t position =
                            CScriptNum(stacktop(-1), fRequireMinimal).getint();
                        if (position > data.size()) {
                            return set_error(serror,
                                             SCRIPT_ERR_INVALID_SPLIT_RANGE);
                        }

                        // Prepare the results in their own buffer as `data`
                        // will be invalidated.
                        valtype n1(data.begin(), data.begin() + position);
                        valtype n2(data.begin() + position, data.end());

                        // Replace existing stack values by the new values.
                        stacktop(-2) = std::move(n1);
                        stacktop(-1) = std::move(n2);
                    } break;

                    //
                    // Conversion operations
                    //
                    case OP_NUM2BIN: {
                        // (in size -- out)
                        if (stack.size() < 2) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        uint64_t size =
                            CScriptNum(stacktop(-1), fRequireMinimal).getint();
                        if (size > MAX_SCRIPT_ELEMENT_SIZE) {
                            return set_error(serror, SCRIPT_ERR_PUSH_SIZE);
                        }

                        popstack(stack);
                        valtype &rawnum = stacktop(-1);

                        // Try to see if we can fit that number in the number of
                        // byte requested.
                        CScriptNum::MinimallyEncode(rawnum);
                        if (rawnum.size() > size) {
                            // We definitively cannot.
                            return set_error(serror,
                                             SCRIPT_ERR_IMPOSSIBLE_ENCODING);
                        }

                        // We already have an element of the right size, we
                        // don't need to do anything.
                        if (rawnum.size() == size) {
                            break;
                        }

                        uint8_t signbit = 0x00;
                        if (rawnum.size() > 0) {
                            signbit = rawnum.back() & 0x80;
                            rawnum[rawnum.size() - 1] &= 0x7f;
                        }

                        rawnum.reserve(size);
                        while (rawnum.size() < size - 1) {
                            rawnum.push_back(0x00);
                        }

                        rawnum.push_back(signbit);
                    } break;

                    case OP_BIN2NUM: {
                        // (in -- out)
                        if (stack.size() < 1) {
                            return set_error(
                                serror, SCRIPT_ERR_INVALID_STACK_OPERATION);
                        }

                        valtype &n = stacktop(-1);
                        CScriptNum::MinimallyEncode(n);

                        // The resulting number must be a valid number.
                        if (!CScriptNum::IsMinimallyEncoded(n)) {
                            return set_error(serror,
                                             SCRIPT_ERR_INVALID_NUMBER_RANGE);
                        }
                    } break;

                    default:
                        return set_error(serror, SCRIPT_ERR_BAD_OPCODE);
                }
            }

            // Size limits
            if (stack.size() + altstack.size() > 1000) {
                return set_error(serror, SCRIPT_ERR_STACK_SIZE);
            }
        }
    } catch (...) {
        return set_error(serror, SCRIPT_ERR_UNKNOWN_ERROR);
    }

    if (!vfExec.empty()) {
        return set_error(serror, SCRIPT_ERR_UNBALANCED_CONDITIONAL);
    }

    return set_success(serror);
}

namespace {

/**
 * Wrapper that serializes like CTransaction, but with the modifications
 *  required for the signature hash done in-place
 */
class CTransactionSignatureSerializer {
private:
    //!< reference to the spending transaction (the one being serialized)
    const CTransaction &txTo;
    //!< output script being consumed
    const CScript &scriptCode;
    //!< input index of txTo being signed
    const unsigned int nIn;
    //!< container for hashtype flags
    const SigHashType sigHashType;

public:
    CTransactionSignatureSerializer(const CTransaction &txToIn,
                                    const CScript &scriptCodeIn,
                                    unsigned int nInIn,
                                    SigHashType sigHashTypeIn)
        : txTo(txToIn), scriptCode(scriptCodeIn), nIn(nInIn),
          sigHashType(sigHashTypeIn) {}

    /** Serialize the passed scriptCode, skipping OP_CODESEPARATORs */
    template <typename S> void SerializeScriptCode(S &s) const {
        CScript::const_iterator it = scriptCode.begin();
        CScript::const_iterator itBegin = it;
        opcodetype opcode;
        unsigned int nCodeSeparators = 0;
        while (scriptCode.GetOp(it, opcode)) {
            if (opcode == OP_CODESEPARATOR) {
                nCodeSeparators++;
            }
        }
        ::WriteCompactSize(s, scriptCode.size() - nCodeSeparators);
        it = itBegin;
        while (scriptCode.GetOp(it, opcode)) {
            if (opcode == OP_CODESEPARATOR) {
                s.write((char *)&itBegin[0], it - itBegin - 1);
                itBegin = it;
            }
        }
        if (itBegin != scriptCode.end()) {
            s.write((char *)&itBegin[0], it - itBegin);
        }
    }

    /** Serialize an input of txTo */
    template <typename S> void SerializeInput(S &s, unsigned int nInput) const {
        // In case of SIGHASH_ANYONECANPAY, only the input being signed is
        // serialized
        if (sigHashType.hasAnyoneCanPay()) {
            nInput = nIn;
        }
        // Serialize the prevout
        ::Serialize(s, txTo.vin[nInput].prevout);
        // Serialize the script
        if (nInput != nIn) {
            // Blank out other inputs' signatures
            ::Serialize(s, CScript());
        } else {
            SerializeScriptCode(s);
        }
        // Serialize the nSequence
        if (nInput != nIn &&
            (sigHashType.getBaseType() == BaseSigHashType::SINGLE ||
             sigHashType.getBaseType() == BaseSigHashType::NONE)) {
            // let the others update at will
            ::Serialize(s, (int)0);
        } else {
            ::Serialize(s, txTo.vin[nInput].nSequence);
        }
    }

    /** Serialize an output of txTo */
    template <typename S>
    void SerializeOutput(S &s, unsigned int nOutput) const {
        if (sigHashType.getBaseType() == BaseSigHashType::SINGLE &&
            nOutput != nIn) {
            // Do not lock-in the txout payee at other indices as txin
            ::Serialize(s, CTxOut());
        } else {
            ::Serialize(s, txTo.vout[nOutput]);
        }
    }

    /** Serialize txTo */
    template <typename S> void Serialize(S &s) const {
        // Serialize nVersion
        ::Serialize(s, txTo.nVersion);
        // Serialize vin
        unsigned int nInputs =
            sigHashType.hasAnyoneCanPay() ? 1 : txTo.vin.size();
        ::WriteCompactSize(s, nInputs);
        for (unsigned int nInput = 0; nInput < nInputs; nInput++) {
            SerializeInput(s, nInput);
        }
        // Serialize vout
        unsigned int nOutputs =
            (sigHashType.getBaseType() == BaseSigHashType::NONE)
                ? 0
                : ((sigHashType.getBaseType() == BaseSigHashType::SINGLE)
                       ? nIn + 1
                       : txTo.vout.size());
        ::WriteCompactSize(s, nOutputs);
        for (unsigned int nOutput = 0; nOutput < nOutputs; nOutput++) {
            SerializeOutput(s, nOutput);
        }
        // Serialize nLockTime
        ::Serialize(s, txTo.nLockTime);
    }
};

uint256 GetPrevoutHash(const CTransaction &txTo) {
    CHashWriter ss(SER_GETHASH, 0);
    for (size_t n = 0; n < txTo.vin.size(); n++) {
        ss << txTo.vin[n].prevout;
    }
    return ss.GetHash();
}

uint256 GetSequenceHash(const CTransaction &txTo) {
    CHashWriter ss(SER_GETHASH, 0);
    for (size_t n = 0; n < txTo.vin.size(); n++) {
        ss << txTo.vin[n].nSequence;
    }
    return ss.GetHash();
}

uint256 GetOutputsHash(const CTransaction &txTo) {
    CHashWriter ss(SER_GETHASH, 0);
    for (size_t n = 0; n < txTo.vout.size(); n++) {
        ss << txTo.vout[n];
    }
    return ss.GetHash();
}

} // namespace

PrecomputedTransactionData::PrecomputedTransactionData(
    const CTransaction &txTo) {
    hashPrevouts = GetPrevoutHash(txTo);
    hashSequence = GetSequenceHash(txTo);
    hashOutputs = GetOutputsHash(txTo);
}

uint256 SignatureHash(const CScript &scriptCode, const CTransaction &txTo,
                      unsigned int nIn, SigHashType sigHashType,
                      const Amount amount,
                      const PrecomputedTransactionData *cache, uint32_t flags) {
    if (flags & SCRIPT_ENABLE_REPLAY_PROTECTION) {
        // Legacy chain's value for fork id must be of the form 0xffxxxx.
        // By xoring with 0xdead, we ensure that the value will be different
        // from the original one, even if it already starts with 0xff.
        uint32_t newForkValue = sigHashType.getForkValue() ^ 0xdead;
        sigHashType = sigHashType.withForkValue(0xff0000 | newForkValue);
    }

    if (sigHashType.hasForkId() && (flags & SCRIPT_ENABLE_SIGHASH_FORKID)) {
        uint256 hashPrevouts;
        uint256 hashSequence;
        uint256 hashOutputs;

        if (!sigHashType.hasAnyoneCanPay()) {
            hashPrevouts = cache ? cache->hashPrevouts : GetPrevoutHash(txTo);
        }

        if (!sigHashType.hasAnyoneCanPay() &&
            (sigHashType.getBaseType() != BaseSigHashType::SINGLE) &&
            (sigHashType.getBaseType() != BaseSigHashType::NONE)) {
            hashSequence = cache ? cache->hashSequence : GetSequenceHash(txTo);
        }

        if ((sigHashType.getBaseType() != BaseSigHashType::SINGLE) &&
            (sigHashType.getBaseType() != BaseSigHashType::NONE)) {
            hashOutputs = cache ? cache->hashOutputs : GetOutputsHash(txTo);
        } else if ((sigHashType.getBaseType() == BaseSigHashType::SINGLE) &&
                   (nIn < txTo.vout.size())) {
            CHashWriter ss(SER_GETHASH, 0);
            ss << txTo.vout[nIn];
            hashOutputs = ss.GetHash();
        }

        CHashWriter ss(SER_GETHASH, 0);
        // Version
        ss << txTo.nVersion;
        // Input prevouts/nSequence (none/all, depending on flags)
        ss << hashPrevouts;
        ss << hashSequence;
        // The input being signed (replacing the scriptSig with scriptCode +
        // amount). The prevout may already be contained in hashPrevout, and the
        // nSequence may already be contain in hashSequence.
        ss << txTo.vin[nIn].prevout;
        ss << scriptCode;
        ss << amount;
        ss << txTo.vin[nIn].nSequence;
        // Outputs (none/one/all, depending on flags)
        ss << hashOutputs;
        // Locktime
        ss << txTo.nLockTime;
        // Sighash type
        ss << sigHashType;

        return ss.GetHash();
    }

    static const uint256 one(uint256S(
        "0000000000000000000000000000000000000000000000000000000000000001"));
    if (nIn >= txTo.vin.size()) {
        //  nIn out of range
        return one;
    }

    // Check for invalid use of SIGHASH_SINGLE
    if ((sigHashType.getBaseType() == BaseSigHashType::SINGLE) &&
        (nIn >= txTo.vout.size())) {
        //  nOut out of range
        return one;
    }

    // Wrapper to serialize only the necessary parts of the transaction being
    // signed
    CTransactionSignatureSerializer txTmp(txTo, scriptCode, nIn, sigHashType);

    // Serialize and hash
    CHashWriter ss(SER_GETHASH, 0);
    ss << txTmp << sigHashType;
    return ss.GetHash();
}

bool BaseSignatureChecker::VerifySignature(const std::vector<uint8_t> &vchSig,
                                           const CPubKey &pubkey,
                                           const uint256 &sighash,
                                           uint32_t flags) const {
    if ((flags & SCRIPT_ENABLE_SCHNORR) && (vchSig.size() == 64)) {
        return pubkey.VerifySchnorr(sighash, vchSig);
    } else {
        return pubkey.VerifyECDSA(sighash, vchSig);
    }
}

bool TransactionSignatureChecker::CheckSig(
    const std::vector<uint8_t> &vchSigIn, const std::vector<uint8_t> &vchPubKey,
    const CScript &scriptCode, uint32_t flags) const {
    CPubKey pubkey(vchPubKey);
    if (!pubkey.IsValid()) {
        return false;
    }

    // Hash type is one byte tacked on to the end of the signature
    std::vector<uint8_t> vchSig(vchSigIn);
    if (vchSig.empty()) {
        return false;
    }
    SigHashType sigHashType = GetHashType(vchSig);
    vchSig.pop_back();

    uint256 sighash = SignatureHash(scriptCode, *txTo, nIn, sigHashType, amount,
                                    this->txdata, flags);

    if (!VerifySignature(vchSig, pubkey, sighash, flags)) {
        return false;
    }

    return true;
}

bool TransactionSignatureChecker::CheckLockTime(
    const CScriptNum &nLockTime) const {
    // There are two kinds of nLockTime: lock-by-blockheight and
    // lock-by-blocktime, distinguished by whether nLockTime <
    // LOCKTIME_THRESHOLD.
    //
    // We want to compare apples to apples, so fail the script unless the type
    // of nLockTime being tested is the same as the nLockTime in the
    // transaction.
    if (!((txTo->nLockTime < LOCKTIME_THRESHOLD &&
           nLockTime < LOCKTIME_THRESHOLD) ||
          (txTo->nLockTime >= LOCKTIME_THRESHOLD &&
           nLockTime >= LOCKTIME_THRESHOLD))) {
        return false;
    }

    // Now that we know we're comparing apples-to-apples, the comparison is a
    // simple numeric one.
    if (nLockTime > int64_t(txTo->nLockTime)) {
        return false;
    }

    // Finally the nLockTime feature can be disabled and thus
    // CHECKLOCKTIMEVERIFY bypassed if every txin has been finalized by setting
    // nSequence to maxint. The transaction would be allowed into the
    // blockchain, making the opcode ineffective.
    //
    // Testing if this vin is not final is sufficient to prevent this condition.
    // Alternatively we could test all inputs, but testing just this input
    // minimizes the data required to prove correct CHECKLOCKTIMEVERIFY
    // execution.
    if (CTxIn::SEQUENCE_FINAL == txTo->vin[nIn].nSequence) {
        return false;
    }

    return true;
}

bool TransactionSignatureChecker::CheckSequence(
    const CScriptNum &nSequence) const {
    // Relative lock times are supported by comparing the passed in operand to
    // the sequence number of the input.
    const int64_t txToSequence = int64_t(txTo->vin[nIn].nSequence);

    // Fail if the transaction's version number is not set high enough to
    // trigger BIP 68 rules.
    if (static_cast<uint32_t>(txTo->nVersion) < 2) {
        return false;
    }

    // Sequence numbers with their most significant bit set are not consensus
    // constrained. Testing that the transaction's sequence number do not have
    // this bit set prevents using this property to get around a
    // CHECKSEQUENCEVERIFY check.
    if (txToSequence & CTxIn::SEQUENCE_LOCKTIME_DISABLE_FLAG) {
        return false;
    }

    // Mask off any bits that do not have consensus-enforced meaning before
    // doing the integer comparisons
    const uint32_t nLockTimeMask =
        CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG | CTxIn::SEQUENCE_LOCKTIME_MASK;
    const int64_t txToSequenceMasked = txToSequence & nLockTimeMask;
    const CScriptNum nSequenceMasked = nSequence & nLockTimeMask;

    // There are two kinds of nSequence: lock-by-blockheight and
    // lock-by-blocktime, distinguished by whether nSequenceMasked <
    // CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG.
    //
    // We want to compare apples to apples, so fail the script unless the type
    // of nSequenceMasked being tested is the same as the nSequenceMasked in the
    // transaction.
    if (!((txToSequenceMasked < CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG &&
           nSequenceMasked < CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG) ||
          (txToSequenceMasked >= CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG &&
           nSequenceMasked >= CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG))) {
        return false;
    }

    // Now that we know we're comparing apples-to-apples, the comparison is a
    // simple numeric one.
    if (nSequenceMasked > txToSequenceMasked) {
        return false;
    }

    return true;
}

bool VerifyScript(const CScript &scriptSig, const CScript &scriptPubKey,
                  uint32_t flags, const BaseSignatureChecker &checker,
                  ScriptError *serror) {
    set_error(serror, SCRIPT_ERR_UNKNOWN_ERROR);

    // If FORKID is enabled, we also ensure strict encoding.
    if (flags & SCRIPT_ENABLE_SIGHASH_FORKID) {
        flags |= SCRIPT_VERIFY_STRICTENC;
    }

    if ((flags & SCRIPT_VERIFY_SIGPUSHONLY) != 0 && !scriptSig.IsPushOnly()) {
        return set_error(serror, SCRIPT_ERR_SIG_PUSHONLY);
    }

    std::vector<valtype> stack, stackCopy;
    if (!EvalScript(stack, scriptSig, flags, checker, serror)) {
        // serror is set
        return false;
    }
    if (flags & SCRIPT_VERIFY_P2SH) {
        stackCopy = stack;
    }
    if (!EvalScript(stack, scriptPubKey, flags, checker, serror)) {
        // serror is set
        return false;
    }
    if (stack.empty()) {
        return set_error(serror, SCRIPT_ERR_EVAL_FALSE);
    }
    if (CastToBool(stack.back()) == false) {
        return set_error(serror, SCRIPT_ERR_EVAL_FALSE);
    }

    // Additional validation for spend-to-script-hash transactions:
    if ((flags & SCRIPT_VERIFY_P2SH) && scriptPubKey.IsPayToScriptHash()) {
        // scriptSig must be literals-only or validation fails
        if (!scriptSig.IsPushOnly()) {
            return set_error(serror, SCRIPT_ERR_SIG_PUSHONLY);
        }

        // Restore stack.
        swap(stack, stackCopy);

        // stack cannot be empty here, because if it was the P2SH  HASH <> EQUAL
        // scriptPubKey would be evaluated with an empty stack and the
        // EvalScript above would return false.
        assert(!stack.empty());

        const valtype &pubKeySerialized = stack.back();
        CScript pubKey2(pubKeySerialized.begin(), pubKeySerialized.end());
        popstack(stack);

        // Bail out early if ALLOW_SEGWIT_RECOVERY is set, the redeem script is
        // a p2sh segwit program and it was the only item pushed into the stack
        if ((flags & SCRIPT_ALLOW_SEGWIT_RECOVERY) != 0 && stack.empty() &&
            pubKey2.IsWitnessProgram()) {
            return set_success(serror);
        }

        if (!EvalScript(stack, pubKey2, flags, checker, serror)) {
            // serror is set
            return false;
        }
        if (stack.empty()) {
            return set_error(serror, SCRIPT_ERR_EVAL_FALSE);
        }
        if (!CastToBool(stack.back())) {
            return set_error(serror, SCRIPT_ERR_EVAL_FALSE);
        }
    }

    // The CLEANSTACK check is only performed after potential P2SH evaluation,
    // as the non-P2SH evaluation of a P2SH script will obviously not result in
    // a clean stack (the P2SH inputs remain). The same holds for witness
    // evaluation.
    if ((flags & SCRIPT_VERIFY_CLEANSTACK) != 0) {
        // Disallow CLEANSTACK without P2SH, as otherwise a switch
        // CLEANSTACK->P2SH+CLEANSTACK would be possible, which is not a
        // softfork (and P2SH should be one).
        assert((flags & SCRIPT_VERIFY_P2SH) != 0);
        if (stack.size() != 1) {
            return set_error(serror, SCRIPT_ERR_CLEANSTACK);
        }
    }

    return set_success(serror);
}
