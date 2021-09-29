// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <crypto/common.h>

#include <cassert>
#include <map>
#include <vector>

namespace {

constexpr uint32_t INVALID = 0xFFFFFFFF;

uint32_t DecodeBits(std::vector<bool>::const_iterator &bitpos,
                    const std::vector<bool>::const_iterator &endpos,
                    uint8_t minval, const std::vector<uint8_t> &bit_sizes) {
    uint32_t val = minval;
    bool bit;
    for (std::vector<uint8_t>::const_iterator bit_sizes_it = bit_sizes.begin();
         bit_sizes_it != bit_sizes.end(); ++bit_sizes_it) {
        if (bit_sizes_it + 1 != bit_sizes.end()) {
            if (bitpos == endpos) {
                break;
            }
            bit = *bitpos;
            bitpos++;
        } else {
            bit = 0;
        }
        if (bit) {
            val += (1 << *bit_sizes_it);
        } else {
            for (int b = 0; b < *bit_sizes_it; b++) {
                if (bitpos == endpos) {
                    // Reached EOF in mantissa
                    return INVALID;
                }
                bit = *bitpos;
                bitpos++;
                val += bit << (*bit_sizes_it - 1 - b);
            }
            return val;
        }
    }
    // Reached EOF in exponent
    return INVALID;
}

enum class Instruction : uint32_t {
    RETURN = 0,
    JUMP = 1,
    MATCH = 2,
    DEFAULT = 3,
};

const std::vector<uint8_t> TYPE_BIT_SIZES{0, 0, 1};
Instruction DecodeType(std::vector<bool>::const_iterator &bitpos,
                       const std::vector<bool>::const_iterator &endpos) {
    return Instruction(DecodeBits(bitpos, endpos, 0, TYPE_BIT_SIZES));
}

const std::vector<uint8_t> ASN_BIT_SIZES{15, 16, 17, 18, 19,
                                         20, 21, 22, 23, 24};
uint32_t DecodeASN(std::vector<bool>::const_iterator &bitpos,
                   const std::vector<bool>::const_iterator &endpos) {
    return DecodeBits(bitpos, endpos, 1, ASN_BIT_SIZES);
}

const std::vector<uint8_t> MATCH_BIT_SIZES{1, 2, 3, 4, 5, 6, 7, 8};
uint32_t DecodeMatch(std::vector<bool>::const_iterator &bitpos,
                     const std::vector<bool>::const_iterator &endpos) {
    return DecodeBits(bitpos, endpos, 2, MATCH_BIT_SIZES);
}

const std::vector<uint8_t> JUMP_BIT_SIZES{5,  6,  7,  8,  9,  10, 11, 12, 13,
                                          14, 15, 16, 17, 18, 19, 20, 21, 22,
                                          23, 24, 25, 26, 27, 28, 29, 30};
uint32_t DecodeJump(std::vector<bool>::const_iterator &bitpos,
                    const std::vector<bool>::const_iterator &endpos) {
    return DecodeBits(bitpos, endpos, 17, JUMP_BIT_SIZES);
}

} // namespace

uint32_t Interpret(const std::vector<bool> &asmap,
                   const std::vector<bool> &ip) {
    std::vector<bool>::const_iterator pos = asmap.begin();
    const std::vector<bool>::const_iterator endpos = asmap.end();
    uint8_t bits = ip.size();
    uint32_t default_asn = 0;
    uint32_t jump, match, matchlen;
    Instruction opcode;
    while (pos != endpos) {
        opcode = DecodeType(pos, endpos);
        if (opcode == Instruction::RETURN) {
            default_asn = DecodeASN(pos, endpos);
            if (default_asn == INVALID) {
                // ASN straddles EOF
                break;
            }
            return default_asn;
        } else if (opcode == Instruction::JUMP) {
            jump = DecodeJump(pos, endpos);
            if (jump == INVALID) {
                // Jump offset straddles EOF
                break;
            }
            if (bits == 0) {
                // No input bits left
                break;
            }
            if (pos + jump < pos) {
                // overflow
                break;
            }
            if (pos + jump >= endpos) {
                // Jumping past EOF
                break;
            }
            if (ip[ip.size() - bits]) {
                pos += jump;
            }
            bits--;
        } else if (opcode == Instruction::MATCH) {
            match = DecodeMatch(pos, endpos);
            if (match == INVALID) {
                // Match bits straddle EOF
                break;
            }
            matchlen = CountBits(match) - 1;
            if (bits < matchlen) {
                // Not enough input bits
                break;
            }
            for (uint32_t bit = 0; bit < matchlen; bit++) {
                if ((ip[ip.size() - bits]) !=
                    ((match >> (matchlen - 1 - bit)) & 1)) {
                    return default_asn;
                }
                bits--;
            }
        } else if (opcode == Instruction::DEFAULT) {
            default_asn = DecodeASN(pos, endpos);
            if (default_asn == INVALID) {
                // ASN straddles EOF
                break;
            }
        } else {
            // Instruction straddles EOF
            break;
        }
    }

    // Reached EOF without RETURN, or aborted (see any of the breaks above) -
    // should have been caught by SanityCheckASMap below
    assert(false);

    // 0 is not a valid ASN
    return 0;
}

bool SanityCheckASMap(const std::vector<bool> &asmap, int bits) {
    const std::vector<bool>::const_iterator begin = asmap.begin(),
                                            endpos = asmap.end();
    std::vector<bool>::const_iterator pos = begin;
    // All future positions we may jump to (bit offset in asmap -> bits to
    // consume left)
    std::vector<std::pair<uint32_t, int>> jumps;
    jumps.reserve(bits);
    Instruction prevopcode = Instruction::JUMP;
    bool had_incomplete_match = false;
    while (pos != endpos) {
        uint32_t offset = pos - begin;
        if (!jumps.empty() && offset >= jumps.back().first) {
            // There was a jump into the middle of the previous instruction
            return false;
        }
        Instruction opcode = DecodeType(pos, endpos);
        if (opcode == Instruction::RETURN) {
            if (prevopcode == Instruction::DEFAULT) {
                // There should not be any RETURN immediately after a DEFAULT
                // (could be combined into just RETURN)
                return false;
            }
            uint32_t asn = DecodeASN(pos, endpos);
            if (asn == INVALID) {
                // ASN straddles EOF
                return false;
            }
            if (jumps.empty()) {
                // Nothing to execute anymore
                if (endpos - pos > 7) {
                    // Excessive padding
                    return false;
                }
                while (pos != endpos) {
                    if (*pos) {
                        // Nonzero padding bit
                        return false;
                    }
                    ++pos;
                }
                // Sanely reached EOF
                return true;
            } else {
                // Continue by pretending we jumped to the next instruction
                offset = pos - begin;
                if (offset != jumps.back().first) {
                    // Unreachable code
                    return false;
                }
                // Restore the number of bits we would have had left after this
                // jump
                bits = jumps.back().second;
                jumps.pop_back();
                prevopcode = Instruction::JUMP;
            }
        } else if (opcode == Instruction::JUMP) {
            uint32_t jump = DecodeJump(pos, endpos);
            if (jump == INVALID) {
                // Jump offset straddles EOF
                return false;
            }
            if (pos + jump < pos) {
                // overflow
                return false;
            }
            if (pos + jump > endpos) {
                // Jump out of range
                return false;
            }
            if (bits == 0) {
                // Consuming bits past the end of the input
                return false;
            }
            --bits;
            uint32_t jump_offset = pos - begin + jump;
            if (!jumps.empty() && jump_offset >= jumps.back().first) {
                // Intersecting jumps
                return false;
            }
            jumps.emplace_back(jump_offset, bits);
            prevopcode = Instruction::JUMP;
        } else if (opcode == Instruction::MATCH) {
            uint32_t match = DecodeMatch(pos, endpos);
            if (match == INVALID) {
                // Match bits straddle EOF
                return false;
            }
            int matchlen = CountBits(match) - 1;
            if (prevopcode != Instruction::MATCH) {
                had_incomplete_match = false;
            }
            if (matchlen < 8 && had_incomplete_match) {
                // Within a sequence of matches only at most one should be
                // incomplete
                return false;
            }
            had_incomplete_match = (matchlen < 8);
            if (bits < matchlen) {
                // Consuming bits past the end of the input
                return false;
            }
            bits -= matchlen;
            prevopcode = Instruction::MATCH;
        } else if (opcode == Instruction::DEFAULT) {
            if (prevopcode == Instruction::DEFAULT) {
                // There should not be two successive DEFAULTs (they could be
                // combined into one)
                return false;
            }
            uint32_t asn = DecodeASN(pos, endpos);
            if (asn == INVALID) {
                // ASN straddles EOF
                return false;
            }
            prevopcode = Instruction::DEFAULT;
        } else {
            // Instruction straddles EOF
            return false;
        }
    }
    // Reached EOF without RETURN instruction
    return false;
}
