// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKSTATUS_H
#define BITCOIN_BLOCKSTATUS_H

#include <blockvalidity.h>
#include <serialize.h>

#include <cstdint>

struct BlockStatus {
private:
    uint32_t status;

    explicit constexpr BlockStatus(uint32_t nStatusIn) : status(nStatusIn) {}

    static const uint32_t VALIDITY_MASK = 0x07;

    // Full block available in blk*.dat
    static const uint32_t HAS_DATA_FLAG = 0x08;
    // Undo data available in rev*.dat
    static const uint32_t HAS_UNDO_FLAG = 0x10;

    // The block is invalid.
    static const uint32_t FAILED_FLAG = 0x20;
    // The block has an invalid parent.
    static const uint32_t FAILED_PARENT_FLAG = 0x40;

    // Mask used to check if the block failed.
    static const uint32_t INVALID_MASK = FAILED_FLAG | FAILED_PARENT_FLAG;

    // The block is being parked for some reason. It will be reconsidered if its
    // chains grows.
    static const uint32_t PARKED_FLAG = 0x80;
    // One of the block's parent is parked.
    static const uint32_t PARKED_PARENT_FLAG = 0x100;

    // Mask used to check for parked blocks.
    static const uint32_t PARKED_MASK = PARKED_FLAG | PARKED_PARENT_FLAG;

    // Unused flag that was previously set on assumeutxo snapshot blocks and
    // their ancestors before they were validated, and unset when they were
    // validated.
    static const uint32_t RESERVED_FLAG = 0x200;

public:
    explicit constexpr BlockStatus() : status(0) {}

    BlockValidity getValidity() const {
        return BlockValidity(status & VALIDITY_MASK);
    }

    BlockStatus withValidity(BlockValidity validity) const {
        return BlockStatus((status & ~VALIDITY_MASK) | uint32_t(validity));
    }

    bool hasData() const { return status & HAS_DATA_FLAG; }
    BlockStatus withData(bool hasData = true) const {
        return BlockStatus((status & ~HAS_DATA_FLAG) |
                           (hasData ? HAS_DATA_FLAG : 0));
    }

    bool hasUndo() const { return status & HAS_UNDO_FLAG; }
    BlockStatus withUndo(bool hasUndo = true) const {
        return BlockStatus((status & ~HAS_UNDO_FLAG) |
                           (hasUndo ? HAS_UNDO_FLAG : 0));
    }

    bool hasFailed() const { return status & FAILED_FLAG; }
    BlockStatus withFailed(bool hasFailed = true) const {
        return BlockStatus((status & ~FAILED_FLAG) |
                           (hasFailed ? FAILED_FLAG : 0));
    }

    bool hasFailedParent() const { return status & FAILED_PARENT_FLAG; }
    BlockStatus withFailedParent(bool hasFailedParent = true) const {
        return BlockStatus((status & ~FAILED_PARENT_FLAG) |
                           (hasFailedParent ? FAILED_PARENT_FLAG : 0));
    }

    bool isParked() const { return status & PARKED_FLAG; }
    BlockStatus withParked(bool parked = true) const {
        return BlockStatus((status & ~PARKED_FLAG) |
                           (parked ? PARKED_FLAG : 0));
    }

    bool hasParkedParent() const { return status & PARKED_PARENT_FLAG; }
    BlockStatus withParkedParent(bool parkedParent = true) const {
        return BlockStatus((status & ~PARKED_PARENT_FLAG) |
                           (parkedParent ? PARKED_PARENT_FLAG : 0));
    }

    /**
     * Check whether this block index entry is valid up to the passed validity
     * level.
     */
    bool isValid(enum BlockValidity nUpTo = BlockValidity::TRANSACTIONS) const {
        if (isInvalid()) {
            return false;
        }

        return getValidity() >= nUpTo;
    }

    bool isInvalid() const { return status & INVALID_MASK; }
    BlockStatus withClearedFailureFlags() const {
        return BlockStatus(status & ~INVALID_MASK);
    }

    bool isOnParkedChain() const { return status & PARKED_MASK; }
    BlockStatus withClearedParkedFlags() const {
        return BlockStatus(status & ~PARKED_MASK);
    }

    SERIALIZE_METHODS(BlockStatus, obj) { READWRITE(VARINT(obj.status)); }

    friend constexpr bool operator==(const BlockStatus a, const BlockStatus b) {
        return a.status == b.status;
    }

    friend constexpr bool operator!=(const BlockStatus a, const BlockStatus b) {
        return !(a == b);
    }
};

#endif // BITCOIN_BLOCKSTATUS_H
