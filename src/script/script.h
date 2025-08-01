// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SCRIPT_H
#define BITCOIN_SCRIPT_SCRIPT_H

#include <attributes.h>
#include <crypto/common.h>
#include <prevector.h>
#include <serialize.h>

#include <cassert>
#include <climits>
#include <cstdint>
#include <cstring>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

// Maximum number of bytes pushable to the stack
static const unsigned int MAX_SCRIPT_ELEMENT_SIZE = 520;

// Maximum number of non-push operations per script
static const int MAX_OPS_PER_SCRIPT = 201;

// Maximum number of public keys per multisig
static const int MAX_PUBKEYS_PER_MULTISIG = 20;

// Maximum script length in bytes
static const int MAX_SCRIPT_SIZE = 10000;

// Maximum number of values on script interpreter stack
static const int MAX_STACK_SIZE = 1000;

// Maximum byte size of integers for arithmetic opcodes when interpreting Script
constexpr size_t MAX_SCRIPTNUM_BYTE_SIZE = 4;

// Threshold for nLockTime: below this value it is interpreted as block number,
// otherwise as UNIX timestamp. Thresold is Tue Nov 5 00:53:20 1985 UTC
static const unsigned int LOCKTIME_THRESHOLD = 500000000;

template <typename T> std::vector<uint8_t> ToByteVector(const T &in) {
    return std::vector<uint8_t>(in.begin(), in.end());
}

/** Script opcodes */
enum opcodetype {
    // push value
    OP_0 = 0x00,
    OP_FALSE = OP_0,
    OP_PUSHDATA1 = 0x4c,
    OP_PUSHDATA2 = 0x4d,
    OP_PUSHDATA4 = 0x4e,
    OP_1NEGATE = 0x4f,
    OP_RESERVED = 0x50,
    OP_1 = 0x51,
    OP_TRUE = OP_1,
    OP_2 = 0x52,
    OP_3 = 0x53,
    OP_4 = 0x54,
    OP_5 = 0x55,
    OP_6 = 0x56,
    OP_7 = 0x57,
    OP_8 = 0x58,
    OP_9 = 0x59,
    OP_10 = 0x5a,
    OP_11 = 0x5b,
    OP_12 = 0x5c,
    OP_13 = 0x5d,
    OP_14 = 0x5e,
    OP_15 = 0x5f,
    OP_16 = 0x60,

    // control
    OP_NOP = 0x61,
    OP_VER = 0x62,
    OP_IF = 0x63,
    OP_NOTIF = 0x64,
    OP_VERIF = 0x65,
    OP_VERNOTIF = 0x66,
    OP_ELSE = 0x67,
    OP_ENDIF = 0x68,
    OP_VERIFY = 0x69,
    OP_RETURN = 0x6a,

    // stack ops
    OP_TOALTSTACK = 0x6b,
    OP_FROMALTSTACK = 0x6c,
    OP_2DROP = 0x6d,
    OP_2DUP = 0x6e,
    OP_3DUP = 0x6f,
    OP_2OVER = 0x70,
    OP_2ROT = 0x71,
    OP_2SWAP = 0x72,
    OP_IFDUP = 0x73,
    OP_DEPTH = 0x74,
    OP_DROP = 0x75,
    OP_DUP = 0x76,
    OP_NIP = 0x77,
    OP_OVER = 0x78,
    OP_PICK = 0x79,
    OP_ROLL = 0x7a,
    OP_ROT = 0x7b,
    OP_SWAP = 0x7c,
    OP_TUCK = 0x7d,

    // splice ops
    OP_CAT = 0x7e,
    OP_SPLIT = 0x7f,   // after monolith upgrade (May 2018)
    OP_NUM2BIN = 0x80, // after monolith upgrade (May 2018)
    OP_BIN2NUM = 0x81, // after monolith upgrade (May 2018)
    OP_SIZE = 0x82,

    // bit logic
    OP_INVERT = 0x83,
    OP_AND = 0x84,
    OP_OR = 0x85,
    OP_XOR = 0x86,
    OP_EQUAL = 0x87,
    OP_EQUALVERIFY = 0x88,
    OP_RESERVED1 = 0x89,
    OP_RESERVED2 = 0x8a,

    // numeric
    OP_1ADD = 0x8b,
    OP_1SUB = 0x8c,
    OP_2MUL = 0x8d,
    OP_2DIV = 0x8e,
    OP_NEGATE = 0x8f,
    OP_ABS = 0x90,
    OP_NOT = 0x91,
    OP_0NOTEQUAL = 0x92,

    OP_ADD = 0x93,
    OP_SUB = 0x94,
    OP_MUL = 0x95,
    OP_DIV = 0x96,
    OP_MOD = 0x97,
    OP_LSHIFT = 0x98,
    OP_RSHIFT = 0x99,

    OP_BOOLAND = 0x9a,
    OP_BOOLOR = 0x9b,
    OP_NUMEQUAL = 0x9c,
    OP_NUMEQUALVERIFY = 0x9d,
    OP_NUMNOTEQUAL = 0x9e,
    OP_LESSTHAN = 0x9f,
    OP_GREATERTHAN = 0xa0,
    OP_LESSTHANOREQUAL = 0xa1,
    OP_GREATERTHANOREQUAL = 0xa2,
    OP_MIN = 0xa3,
    OP_MAX = 0xa4,

    OP_WITHIN = 0xa5,

    // crypto
    OP_RIPEMD160 = 0xa6,
    OP_SHA1 = 0xa7,
    OP_SHA256 = 0xa8,
    OP_HASH160 = 0xa9,
    OP_HASH256 = 0xaa,
    OP_CODESEPARATOR = 0xab,
    OP_CHECKSIG = 0xac,
    OP_CHECKSIGVERIFY = 0xad,
    OP_CHECKMULTISIG = 0xae,
    OP_CHECKMULTISIGVERIFY = 0xaf,

    // expansion
    OP_NOP1 = 0xb0,
    OP_CHECKLOCKTIMEVERIFY = 0xb1,
    OP_NOP2 = OP_CHECKLOCKTIMEVERIFY,
    OP_CHECKSEQUENCEVERIFY = 0xb2,
    OP_NOP3 = OP_CHECKSEQUENCEVERIFY,
    OP_NOP4 = 0xb3,
    OP_NOP5 = 0xb4,
    OP_NOP6 = 0xb5,
    OP_NOP7 = 0xb6,
    OP_NOP8 = 0xb7,
    OP_NOP9 = 0xb8,
    OP_NOP10 = 0xb9,

    // More crypto
    OP_CHECKDATASIG = 0xba,
    OP_CHECKDATASIGVERIFY = 0xbb,

    // additional byte string operations
    OP_REVERSEBYTES = 0xbc,

    // The first op_code value after all defined opcodes
    FIRST_UNDEFINED_OP_VALUE,

    // multi-byte opcodes
    OP_PREFIX_BEGIN = 0xf0,
    OP_PREFIX_END = 0xf7,

    OP_INVALIDOPCODE = 0xff,
};

// Maximum value that an opcode can be
static const unsigned int MAX_OPCODE = FIRST_UNDEFINED_OP_VALUE - 1;

std::string GetOpName(opcodetype opcode);

/**
 * Check whether the given stack element data would be minimally pushed using
 * the given opcode.
 */
bool CheckMinimalPush(const std::vector<uint8_t> &data, opcodetype opcode);

class scriptnum_error : public std::runtime_error {
public:
    explicit scriptnum_error(const std::string &str)
        : std::runtime_error(str) {}
};

class CScriptNum {
    /**
     * Numeric opcodes (OP_1ADD, etc) are restricted to operating on 4-byte
     * integers. The semantics are subtle, though: operands must be in the range
     * [-2^31 +1...2^31 -1], but results may overflow (and are valid as long as
     * they are not used in a subsequent numeric operation). CScriptNum enforces
     * those semantics by storing results as an int64 and allowing out-of-range
     * values to be returned as a vector of bytes but throwing an exception if
     * arithmetic is done or the result is interpreted as an integer.
     */
public:
    explicit CScriptNum(const int64_t &n) { m_value = n; }

    explicit CScriptNum(const std::vector<uint8_t> &vch, bool fRequireMinimal,
                        const size_t nMaxNumSize) {
        if (vch.size() > nMaxNumSize) {
            throw scriptnum_error("script number overflow");
        }
        if (fRequireMinimal && !IsMinimallyEncoded(vch, nMaxNumSize)) {
            throw scriptnum_error("non-minimally encoded script number");
        }
        m_value = set_vch(vch);
    }

    static bool IsMinimallyEncoded(const std::vector<uint8_t> &vch,
                                   const size_t nMaxNumSize);

    static bool MinimallyEncode(std::vector<uint8_t> &data);

    inline bool operator==(const int64_t &rhs) const { return m_value == rhs; }
    inline bool operator!=(const int64_t &rhs) const { return m_value != rhs; }
    inline bool operator<=(const int64_t &rhs) const { return m_value <= rhs; }
    inline bool operator<(const int64_t &rhs) const { return m_value < rhs; }
    inline bool operator>=(const int64_t &rhs) const { return m_value >= rhs; }
    inline bool operator>(const int64_t &rhs) const { return m_value > rhs; }

    inline bool operator==(const CScriptNum &rhs) const {
        return operator==(rhs.m_value);
    }
    inline bool operator!=(const CScriptNum &rhs) const {
        return operator!=(rhs.m_value);
    }
    inline bool operator<=(const CScriptNum &rhs) const {
        return operator<=(rhs.m_value);
    }
    inline bool operator<(const CScriptNum &rhs) const {
        return operator<(rhs.m_value);
    }
    inline bool operator>=(const CScriptNum &rhs) const {
        return operator>=(rhs.m_value);
    }
    inline bool operator>(const CScriptNum &rhs) const {
        return operator>(rhs.m_value);
    }

    inline CScriptNum operator+(const int64_t &rhs) const {
        return CScriptNum(m_value + rhs);
    }
    inline CScriptNum operator-(const int64_t &rhs) const {
        return CScriptNum(m_value - rhs);
    }
    inline CScriptNum operator+(const CScriptNum &rhs) const {
        return operator+(rhs.m_value);
    }
    inline CScriptNum operator-(const CScriptNum &rhs) const {
        return operator-(rhs.m_value);
    }

    inline CScriptNum operator/(const int64_t &rhs) const {
        return CScriptNum(m_value / rhs);
    }
    inline CScriptNum operator/(const CScriptNum &rhs) const {
        return operator/(rhs.m_value);
    }

    inline CScriptNum operator%(const int64_t &rhs) const {
        return CScriptNum(m_value % rhs);
    }
    inline CScriptNum operator%(const CScriptNum &rhs) const {
        return operator%(rhs.m_value);
    }

    inline CScriptNum &operator+=(const CScriptNum &rhs) {
        return operator+=(rhs.m_value);
    }
    inline CScriptNum &operator-=(const CScriptNum &rhs) {
        return operator-=(rhs.m_value);
    }

    inline CScriptNum operator&(const int64_t &rhs) const {
        return CScriptNum(m_value & rhs);
    }
    inline CScriptNum operator&(const CScriptNum &rhs) const {
        return operator&(rhs.m_value);
    }

    inline CScriptNum &operator&=(const CScriptNum &rhs) {
        return operator&=(rhs.m_value);
    }

    inline CScriptNum operator-() const {
        assert(m_value != std::numeric_limits<int64_t>::min());
        return CScriptNum(-m_value);
    }

    inline CScriptNum &operator=(const int64_t &rhs) {
        m_value = rhs;
        return *this;
    }

    inline CScriptNum &operator+=(const int64_t &rhs) {
        assert(
            rhs == 0 ||
            (rhs > 0 && m_value <= std::numeric_limits<int64_t>::max() - rhs) ||
            (rhs < 0 && m_value >= std::numeric_limits<int64_t>::min() - rhs));
        m_value += rhs;
        return *this;
    }

    inline CScriptNum &operator-=(const int64_t &rhs) {
        assert(
            rhs == 0 ||
            (rhs > 0 && m_value >= std::numeric_limits<int64_t>::min() + rhs) ||
            (rhs < 0 && m_value <= std::numeric_limits<int64_t>::max() + rhs));
        m_value -= rhs;
        return *this;
    }

    inline CScriptNum &operator&=(const int64_t &rhs) {
        m_value &= rhs;
        return *this;
    }

    int64_t getint() const { return m_value; }

    std::vector<uint8_t> getvch() const { return serialize(m_value); }

    static std::vector<uint8_t> serialize(const int64_t &value) {
        if (value == 0) {
            return {};
        }

        std::vector<uint8_t> result;
        const bool neg = value < 0;
        uint64_t absvalue = neg ? ~static_cast<uint64_t>(value) + 1
                                : static_cast<uint64_t>(value);

        while (absvalue) {
            result.push_back(absvalue & 0xff);
            absvalue >>= 8;
        }

        // - If the most significant byte is >= 0x80 and the value is positive,
        // push a new zero-byte to make the significant byte < 0x80 again.
        // - If the most significant byte is >= 0x80 and the value is negative,
        // push a new 0x80 byte that will be popped off when converting to an
        // integral.
        // - If the most significant byte is < 0x80 and the value is negative,
        // add 0x80 to it, since it will be subtracted and interpreted as a
        // negative when converting to an integral.
        if (result.back() & 0x80) {
            result.push_back(neg ? 0x80 : 0);
        } else if (neg) {
            result.back() |= 0x80;
        }

        return result;
    }

private:
    static int64_t set_vch(const std::vector<uint8_t> &vch) {
        if (vch.empty()) {
            return 0;
        }

        int64_t result = 0;
        for (size_t i = 0; i != vch.size(); ++i) {
            result |= int64_t(vch[i]) << 8 * i;
        }

        // If the input vector's most significant byte is 0x80, remove it from
        // the result's msb and return a negative.
        if (vch.back() & 0x80) {
            return -int64_t(result & ~(0x80ULL << (8 * (vch.size() - 1))));
        }

        return result;
    }

    int64_t m_value;
};

/**
 * We use a prevector for the script to reduce the considerable memory overhead
 * of vectors in cases where they normally contain a small number of small
 * elements. Tests in October 2015 showed use of this reduced dbcache memory
 * usage by 23% and made an initial sync 13% faster.
 */
typedef prevector<28, uint8_t> CScriptBase;

bool GetScriptOp(CScriptBase::const_iterator &pc,
                 CScriptBase::const_iterator end, opcodetype &opcodeRet,
                 std::vector<uint8_t> *pvchRet);

/** Serialized script, used inside transaction inputs and outputs */
class CScript : public CScriptBase {
protected:
    CScript &push_int64(int64_t n) {
        if (n == -1 || (n >= 1 && n <= 16)) {
            push_back(n + (OP_1 - 1));
        } else if (n == 0) {
            push_back(OP_0);
        } else {
            *this << CScriptNum::serialize(n);
        }
        return *this;
    }

public:
    CScript() {}
    CScript(const_iterator pbegin, const_iterator pend)
        : CScriptBase(pbegin, pend) {}
    CScript(std::vector<uint8_t>::const_iterator pbegin,
            std::vector<uint8_t>::const_iterator pend)
        : CScriptBase(pbegin, pend) {}
    CScript(const uint8_t *pbegin, const uint8_t *pend)
        : CScriptBase(pbegin, pend) {}

    SERIALIZE_METHODS(CScript, obj) { READWRITEAS(CScriptBase, obj); }

    explicit CScript(int64_t b) { operator<<(b); }
    explicit CScript(opcodetype b) { operator<<(b); }
    explicit CScript(const CScriptNum &b) { operator<<(b); }
    // delete non-existent constructor to defend against future introduction
    // e.g. via prevector
    explicit CScript(const std::vector<uint8_t> &b) = delete;

    /** Delete non-existent operator to defend against future introduction */
    CScript &operator<<(const CScript &b) = delete;

    CScript &operator<<(int64_t b) LIFETIMEBOUND { return push_int64(b); }

    CScript &operator<<(opcodetype opcode) LIFETIMEBOUND {
        if (opcode < 0 || opcode > 0xff) {
            throw std::runtime_error("CScript::operator<<(): invalid opcode");
        }
        insert(end(), uint8_t(opcode));
        return *this;
    }

    CScript &operator<<(const CScriptNum &b) LIFETIMEBOUND {
        *this << b.getvch();
        return *this;
    }

    CScript &operator<<(const std::vector<uint8_t> &b) LIFETIMEBOUND {
        if (b.size() < OP_PUSHDATA1) {
            insert(end(), uint8_t(b.size()));
        } else if (b.size() <= 0xff) {
            insert(end(), OP_PUSHDATA1);
            insert(end(), uint8_t(b.size()));
        } else if (b.size() <= 0xffff) {
            insert(end(), OP_PUSHDATA2);
            uint8_t _data[2];
            WriteLE16(_data, b.size());
            insert(end(), _data, _data + sizeof(_data));
        } else {
            insert(end(), OP_PUSHDATA4);
            uint8_t _data[4];
            WriteLE32(_data, b.size());
            insert(end(), _data, _data + sizeof(_data));
        }
        insert(end(), b.begin(), b.end());
        return *this;
    }

    bool GetOp(const_iterator &pc, opcodetype &opcodeRet,
               std::vector<uint8_t> &vchRet) const {
        return GetScriptOp(pc, end(), opcodeRet, &vchRet);
    }

    bool GetOp(const_iterator &pc, opcodetype &opcodeRet) const {
        return GetScriptOp(pc, end(), opcodeRet, nullptr);
    }

    /** Encode/decode small integers: */
    static int DecodeOP_N(opcodetype opcode) {
        if (opcode == OP_0) {
            return 0;
        }

        assert(opcode >= OP_1 && opcode <= OP_16);
        return int(opcode) - int(OP_1 - 1);
    }
    static opcodetype EncodeOP_N(int n) {
        assert(n >= 0 && n <= 16);
        if (n == 0) {
            return OP_0;
        }

        return (opcodetype)(OP_1 + n - 1);
    }

    bool IsPayToScriptHash() const;
    bool IsWitnessProgram(int &version, std::vector<uint8_t> &program) const;
    bool IsWitnessProgram() const;

    /**
     * Called by IsStandardTx and P2SH/BIP62 VerifyScript (which makes it
     * consensus-critical).
     */
    bool IsPushOnly(const_iterator pc) const;
    bool IsPushOnly() const;

    /** Check if the script contains valid OP_CODES */
    bool HasValidOps() const;

    /**
     * Returns whether the script is guaranteed to fail at execution, regardless
     * of the initial stack. This allows outputs to be pruned instantly when
     * entering the UTXO set.
     */
    bool IsUnspendable() const {
        return (size() > 0 && *begin() == OP_RETURN) ||
               (size() > MAX_SCRIPT_SIZE);
    }

    void clear() {
        // The default prevector::clear() does not release memory
        CScriptBase::clear();
        shrink_to_fit();
    }
};

#endif // BITCOIN_SCRIPT_SCRIPT_H
