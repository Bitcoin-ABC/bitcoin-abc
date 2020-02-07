// Copyright (c) 2018-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKFILEINFO_H
#define BITCOIN_BLOCKFILEINFO_H

#include <serialize.h>

#include <cstdint>
#include <string>

class CBlockFileInfo {
public:
    //! number of blocks stored in file
    unsigned int nBlocks;
    //! number of used bytes of block file
    unsigned int nSize;
    //! number of used bytes in the undo file
    unsigned int nUndoSize;
    //! lowest height of block in file
    unsigned int nHeightFirst;
    //! highest height of block in file
    unsigned int nHeightLast;
    //! earliest time of block in file
    uint64_t nTimeFirst;
    //! latest time of block in file
    uint64_t nTimeLast;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(VARINT(nBlocks));
        READWRITE(VARINT(nSize));
        READWRITE(VARINT(nUndoSize));
        READWRITE(VARINT(nHeightFirst));
        READWRITE(VARINT(nHeightLast));
        READWRITE(VARINT(nTimeFirst));
        READWRITE(VARINT(nTimeLast));
    }

    void SetNull() {
        nBlocks = 0;
        nSize = 0;
        nUndoSize = 0;
        nHeightFirst = 0;
        nHeightLast = 0;
        nTimeFirst = 0;
        nTimeLast = 0;
    }

    CBlockFileInfo() { SetNull(); }

    std::string ToString() const;

    /** update statistics (does not update nSize) */
    void AddBlock(unsigned int nHeightIn, uint64_t nTimeIn) {
        if (nBlocks == 0 || nHeightFirst > nHeightIn) {
            nHeightFirst = nHeightIn;
        }
        if (nBlocks == 0 || nTimeFirst > nTimeIn) {
            nTimeFirst = nTimeIn;
        }
        nBlocks++;
        if (nHeightIn > nHeightLast) {
            nHeightLast = nHeightIn;
        }
        if (nTimeIn > nTimeLast) {
            nTimeLast = nTimeIn;
        }
    }
};

#endif // BITCOIN_BLOCKFILEINFO_H
