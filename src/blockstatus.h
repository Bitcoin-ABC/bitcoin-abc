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

    /**
     * If ASSUMED_VALID_FLAG is set, it means that this block has not been
     * validated and has validity status less than VALID_SCRIPTS. Also that it
     * may have descendant blocks with VALID_SCRIPTS set, because they can be
     * validated based on an assumeutxo snapshot.
     *
     * When an assumeutxo snapshot is loaded, the ASSUMED_VALID flag is added to
     * unvalidated blocks at the snapshot height and below. Then, as the
     * background validation progresses, and these blocks are validated, the
     * ASSUMED_VALID flags are removed. See `doc/design/assumeutxo.md` for
     * details.
     *
     * This flag is only used to implement checks in CheckBlockIndex() and
     * should not be used elsewhere.
     */
    static const uint32_t ASSUMED_VALID_FLAG = 0x200;

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

    bool isAssumedValid() const { return status & ASSUMED_VALID_FLAG; }
    BlockStatus withAssumedValid(bool assumed_valid = true) const {
        return BlockStatus((status & ~ASSUMED_VALID_FLAG) |
                           (assumed_valid ? ASSUMED_VALID_FLAG : 0));
    }
    BlockStatus withClearedAssumedValidFlags() const {
        return BlockStatus(status & ~ASSUMED_VALID_FLAG);
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
