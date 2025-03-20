// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/compactproofs.h>

#include <avalanche/test/util.h>
#include <streams.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>

namespace avalanche {
namespace {
    struct TestCompactProofs {
        static std::vector<uint64_t> getShortProofIds(const CompactProofs &cp) {
            return cp.shortproofids;
        }

        static std::vector<PrefilledProof>
        getPrefilledProofs(const CompactProofs &cp) {
            return cp.prefilledProofs;
        }

        static void addPrefilledProof(CompactProofs &cp, uint32_t index,
                                      const ProofRef &proof) {
            PrefilledProof pp{index, proof};
            cp.prefilledProofs.push_back(std::move(pp));
        }
    };
} // namespace
} // namespace avalanche

using namespace avalanche;

// TestingSetup is required for buildRandomProof()
BOOST_FIXTURE_TEST_SUITE(compactproofs_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(compactproofs_roundtrip) {
    {
        CompactProofs cpw;
        BOOST_CHECK_EQUAL(cpw.size(), 0);

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_NO_THROW(ss << cpw);

        CompactProofs cpr;
        BOOST_CHECK_NO_THROW(ss >> cpr);

        BOOST_CHECK_EQUAL(cpr.size(), 0);
        BOOST_CHECK_EQUAL(cpr.getKeys().first, cpw.getKeys().first);
        BOOST_CHECK_EQUAL(cpr.getKeys().second, cpw.getKeys().second);
    }

    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();

    {
        // Check index boundaries
        CompactProofs cp;

        TestCompactProofs::addPrefilledProof(
            cp, 0, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
        TestCompactProofs::addPrefilledProof(
            cp, std::numeric_limits<uint32_t>::max(),
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_NO_THROW(ss << cp);

        auto prefilledProofs = TestCompactProofs::getPrefilledProofs(cp);
        BOOST_CHECK_EQUAL(prefilledProofs.size(), 2);

        BOOST_CHECK_EQUAL(prefilledProofs[0].index, 0);
        BOOST_CHECK_EQUAL(prefilledProofs[1].index,
                          std::numeric_limits<uint32_t>::max());
    }

    auto checkCompactProof = [&](size_t numofProof,
                                 size_t numofPrefilledProof) {
        RadixTree<const Proof, ProofRadixTreeAdapter> proofs;
        for (size_t i = 0; i < numofProof; i++) {
            BOOST_CHECK(proofs.insert(
                buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE)));
        }

        CompactProofs cpw(proofs);
        BOOST_CHECK_EQUAL(cpw.size(), numofProof);

        uint32_t prefilledProofIndex = 0;
        for (size_t i = 0; i < numofPrefilledProof; i++) {
            TestCompactProofs::addPrefilledProof(
                cpw, prefilledProofIndex++,
                buildRandomProof(active_chainstate, GetRand<uint32_t>()));
        }
        auto prefilledProofs = TestCompactProofs::getPrefilledProofs(cpw);
        BOOST_CHECK_EQUAL(prefilledProofs.size(), numofPrefilledProof);

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_NO_THROW(ss << cpw);

        CompactProofs cpr;
        BOOST_CHECK_NO_THROW(ss >> cpr);

        BOOST_CHECK_EQUAL(cpr.size(), numofProof + numofPrefilledProof);
        BOOST_CHECK_EQUAL(cpr.getKeys().first, cpw.getKeys().first);
        BOOST_CHECK_EQUAL(cpr.getKeys().second, cpw.getKeys().second);

        auto comparePrefilledProof = [](const PrefilledProof &lhs,
                                        const PrefilledProof &rhs) {
            return lhs.index == rhs.index &&
                   lhs.proof->getId() == rhs.proof->getId() &&
                   lhs.proof->getSignature() == rhs.proof->getSignature();
        };

        auto prefilledProofsCpr = TestCompactProofs::getPrefilledProofs(cpr);
        BOOST_CHECK(std::equal(prefilledProofsCpr.begin(),
                               prefilledProofsCpr.end(),
                               prefilledProofs.begin(), comparePrefilledProof));

        auto shortIds = TestCompactProofs::getShortProofIds(cpr);
        size_t index = 0;
        proofs.forEachLeaf([&](auto pLeaf) {
            const ProofId &proofid = pLeaf->getId();
            BOOST_CHECK_EQUAL(cpr.getShortID(proofid), cpw.getShortID(proofid));
            BOOST_CHECK_EQUAL(cpr.getShortID(proofid), shortIds[index]);
            ++index;

            return true;
        });
    };

    // No proof at all
    checkCompactProof(0, 0);

    // No prefilled proofs
    checkCompactProof(1000, 0);

    // Only prefilled proofs
    checkCompactProof(0, 1000);

    // Mixed case
    checkCompactProof(1000, 1000);
}

BOOST_AUTO_TEST_CASE(compactproofs_overflow) {
    Chainstate &active_chainstate = Assert(m_node.chainman)->ActiveChainstate();
    {
        CompactProofs cp;

        TestCompactProofs::addPrefilledProof(
            cp, 0, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
        TestCompactProofs::addPrefilledProof(
            cp, 0, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_EXCEPTION(ss << cp, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    {
        CompactProofs cp;

        TestCompactProofs::addPrefilledProof(
            cp, 1, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
        TestCompactProofs::addPrefilledProof(
            cp, 0, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_EXCEPTION(ss << cp, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    {
        CompactProofs cp;

        TestCompactProofs::addPrefilledProof(
            cp, std::numeric_limits<uint32_t>::max(),
            buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));
        TestCompactProofs::addPrefilledProof(
            cp, 0, buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE));

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_EXCEPTION(ss << cp, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, MAX_SIZE + 1);

        CompactProofs cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("ReadCompactSize(): size too large"));
    }

    {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, 0);
        // prefilledProofs.size()
        WriteCompactSize(ss, MAX_SIZE + 1);

        CompactProofs cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("ReadCompactSize(): size too large"));
    }

    {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, 0);
        // prefilledProofs.size()
        WriteCompactSize(ss, 1);
        // prefilledProofs[0].index
        WriteCompactSize(ss, MAX_SIZE + 1);
        // prefilledProofs[0].proof
        ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);

        CompactProofs cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("ReadCompactSize(): size too large"));
    }

    // Compute the number of MAX_SIZE increment we need to cause an overflow
    const uint64_t overflow =
        uint64_t(std::numeric_limits<uint32_t>::max()) + 1;
    // Due to differential encoding, a value of MAX_SIZE bumps the index by
    // MAX_SIZE + 1
    BOOST_CHECK_GE(overflow, MAX_SIZE + 1);
    const uint64_t overflowIter = overflow / (MAX_SIZE + 1);

    // Make sure the iteration fits in an uint32_t and is <= MAX_SIZE
    BOOST_CHECK_LE(overflowIter, std::numeric_limits<uint32_t>::max());
    BOOST_CHECK_LE(overflowIter, MAX_SIZE);
    uint32_t remainder = uint32_t(overflow - ((MAX_SIZE + 1) * overflowIter));

    {
        CDataStream ss(SER_DISK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, 0);
        // prefilledProofs.size()
        WriteCompactSize(ss, overflowIter + 1);
        for (uint32_t i = 0; i < overflowIter; i++) {
            // prefilledProofs[i].index
            WriteCompactSize(ss, MAX_SIZE);
            // prefilledProofs[i].proof
            ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        }
        // This is the prefilled proof causing the overflow
        WriteCompactSize(ss, remainder);
        ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);

        CompactProofs cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    {
        CDataStream ss(SER_DISK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, 1);
        // shortproofids[0]
        CustomUintFormatter<CompactProofs::SHORTPROOFIDS_LENGTH>().Ser(ss, 0u);
        // prefilledProofs.size()
        WriteCompactSize(ss, overflowIter + 1);
        for (uint32_t i = 0; i < overflowIter; i++) {
            // prefilledProofs[i].index
            WriteCompactSize(ss, MAX_SIZE);
            // prefilledProofs[i].proof
            ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        }
        // This prefilled proof isn't enough to cause the overflow alone, but it
        // overflows due to the extra shortid.
        WriteCompactSize(ss, remainder - 1);
        ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);

        CompactProofs cp;
        // ss >> cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("indexes overflowed 32 bits"));
    }

    {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // shortproofidk0, shortproofidk1
        ss << uint64_t(0) << uint64_t(0);
        // shortproofids.size()
        WriteCompactSize(ss, 0);
        // prefilledProofs.size()
        WriteCompactSize(ss, 2);
        // prefilledProofs[0].index
        WriteCompactSize(ss, 0);
        // prefilledProofs[0].proof
        ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);
        // prefilledProofs[1].index = 1 is differentially encoded, which means
        // it has an absolute index of 2. This leaves no proof at index 1.
        WriteCompactSize(ss, 1);
        // prefilledProofs[1].proof
        ss << buildRandomProof(active_chainstate, MIN_VALID_PROOF_SCORE);

        CompactProofs cp;
        BOOST_CHECK_EXCEPTION(ss >> cp, std::ios_base::failure,
                              HasReason("non contiguous indexes"));
    }
}

BOOST_AUTO_TEST_SUITE_END()
