// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_POLICY_H
#define BITCOIN_POLICY_POLICY_H

#include <consensus/consensus.h>
#include <feerate.h>
#include <script/standard.h>

#include <string>

class CCoinsViewCache;
class CTransaction;
class CTxIn;
class CTxOut;

/**
 * Default for -blockmaxsize, which controls the maximum size of block the
 * mining code will create.
 */
static constexpr uint64_t DEFAULT_MAX_GENERATED_BLOCK_SIZE{2 * ONE_MEGABYTE};
/**
 * Default for -blockmintxfee, which sets the minimum feerate for a transaction
 * in blocks created by mining code.
 */
static constexpr Amount DEFAULT_BLOCK_MIN_TX_FEE_PER_KB(1000 * SATOSHI);
/**
 * The maximum size for transactions we're willing to relay/mine.
 */
static constexpr unsigned int MAX_STANDARD_TX_SIZE{100000};

/**
 * Biggest 'standard' txin is a 15-of-15 P2SH multisig with compressed
 * keys (remember the 520 byte limit on redeemScript size). That works
 * out to a (15*(33+1))+3=513 byte redeemScript, 513+1+15*(73+1)+3=1627
 * bytes of scriptSig, which we round off to 1650 bytes for some minor
 * future-proofing. That's also enough to spend a 20-of-20 CHECKMULTISIG
 * scriptPubKey, though such a scriptPubKey is not considered standard.
 */
static constexpr unsigned int MAX_TX_IN_SCRIPT_SIG_SIZE{1650};

/**
 * Default for -incrementalrelayfee, which sets the minimum feerate increase for
 * mempool limiting or BIP 125 replacement.
 */
static constexpr CFeeRate MEMPOOL_FULL_FEE_INCREMENT(1000 * SATOSHI);
/**
 * Default for -bytespersigcheck .
 */
static constexpr unsigned int DEFAULT_BYTES_PER_SIGCHECK{50};
/** Default for -permitbaremultisig */
static constexpr bool DEFAULT_PERMIT_BAREMULTISIG{true};
/**
 * Min feerate for defining dust. Historically this has been the same as the
 * minRelayTxFee, however changing the dust limit changes which transactions are
 * standard and should be done with care and ideally rarely. It makes sense to
 * only increase the dust limit after prior releases were already not creating
 * outputs below the new threshold.
 */
static constexpr Amount DUST_RELAY_TX_FEE(1000 * SATOSHI);

/** Default for -minrelaytxfee, minimum relay fee for transactions */
static constexpr Amount DEFAULT_MIN_RELAY_TX_FEE_PER_KB(1000 * SATOSHI);

/**
 * When transactions fail script evaluations under standard flags, this flagset
 * influences the decision of whether to drop them or to also ban the originator
 * (see CheckInputScripts).
 */
static constexpr uint32_t MANDATORY_SCRIPT_VERIFY_FLAGS{
    SCRIPT_VERIFY_P2SH | SCRIPT_VERIFY_STRICTENC |
    SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_VERIFY_LOW_S |
    SCRIPT_VERIFY_NULLFAIL | SCRIPT_VERIFY_MINIMALDATA |
    SCRIPT_ENABLE_SCHNORR_MULTISIG | SCRIPT_ENFORCE_SIGCHECKS};

/**
 * Standard script verification flags that standard transactions will comply
 * with. However scripts violating these flags may still be present in valid
 * blocks and we must accept those blocks.
 *
 * Note that the actual mempool validation flags may be slightly different (see
 * GetStandardScriptFlags), however this constant should be set to the most
 * restrictive flag set that applies in the current / next upgrade, since it is
 * used in numerous parts of the codebase that are unable to access the
 * contextual information of which upgrades are currently active.
 */
static constexpr uint32_t STANDARD_SCRIPT_VERIFY_FLAGS{
    MANDATORY_SCRIPT_VERIFY_FLAGS | SCRIPT_VERIFY_DERSIG |
    SCRIPT_VERIFY_SIGPUSHONLY | SCRIPT_VERIFY_MINIMALDATA |
    SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS | SCRIPT_VERIFY_CLEANSTACK |
    SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | SCRIPT_VERIFY_CHECKSEQUENCEVERIFY |
    SCRIPT_DISALLOW_SEGWIT_RECOVERY | SCRIPT_VERIFY_INPUT_SIGCHECKS};

/**
 * For convenience, standard but not mandatory verify flags.
 */
static constexpr uint32_t STANDARD_NOT_MANDATORY_VERIFY_FLAGS{
    STANDARD_SCRIPT_VERIFY_FLAGS & ~MANDATORY_SCRIPT_VERIFY_FLAGS};

/**
 * Used as the flags parameter to sequence and nLocktime checks in non-consensus
 * code.
 */
static constexpr uint32_t STANDARD_LOCKTIME_VERIFY_FLAGS{
    LOCKTIME_VERIFY_SEQUENCE};

Amount GetDustThreshold(const CTxOut &txout, const CFeeRate &dustRelayFee);

bool IsDust(const CTxOut &txout, const CFeeRate &dustRelayFee);

bool IsStandard(const CScript &scriptPubKey, TxoutType &whichType);

/**
 * Check for standard transaction types
 * @return True if all outputs (scriptPubKeys) use only standard transaction
 * forms
 */
bool IsStandardTx(const CTransaction &tx, bool permit_bare_multisig,
                  const CFeeRate &dust_relay_fee, std::string &reason);

/**
 * Check for standard transaction types
 * @param[in] mapInputs    Map of previous transactions that have outputs we're
 * spending
 * @return True if all inputs (scriptSigs) use only standard transaction forms
 */
bool AreInputsStandard(const CTransaction &tx, const CCoinsViewCache &mapInputs,
                       uint32_t flags);

/**
 * Compute the virtual transaction size (size, or more if sigChecks are too
 * dense).
 */
int64_t GetVirtualTransactionSize(int64_t nSize, int64_t nSigChecks,
                                  unsigned int bytes_per_sigCheck);
int64_t GetVirtualTransactionSize(const CTransaction &tx, int64_t nSigChecks,
                                  unsigned int bytes_per_sigCheck);
int64_t GetVirtualTransactionInputSize(const CTxIn &txin, int64_t nSigChecks,
                                       unsigned int bytes_per_sigChecks);

static inline int64_t GetVirtualTransactionSize(const CTransaction &tx) {
    return GetVirtualTransactionSize(tx, 0, 0);
}

static inline int64_t GetVirtualTransactionInputSize(const CTxIn &tx) {
    return GetVirtualTransactionInputSize(tx, 0, 0);
}

#endif // BITCOIN_POLICY_POLICY_H
