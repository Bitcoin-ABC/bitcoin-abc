// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_POLICY_H
#define BITCOIN_POLICY_POLICY_H

#include "consensus/consensus.h"
#include "feerate.h"
#include "script/standard.h"

#include <string>

class CCoinsViewCache;
class CTransaction;

/**
 * Default for -blockmaxsize, which controls the maximum size of block the
 * mining code will create.
 */
static const uint64_t DEFAULT_MAX_GENERATED_BLOCK_SIZE = 2 * ONE_MEGABYTE;
/**
 * Default for -blockprioritypercentage, define the amount of block space
 * reserved to high priority transactions.
 */
static const uint64_t DEFAULT_BLOCK_PRIORITY_PERCENTAGE = 5;
/**
 * Default for -blockmintxfee, which sets the minimum feerate for a transaction
 * in blocks created by mining code.
 */
static const Amount DEFAULT_BLOCK_MIN_TX_FEE_PER_KB(1000 * SATOSHI);
/**
 * The maximum size for transactions we're willing to relay/mine.
 */
static const unsigned int MAX_STANDARD_TX_SIZE = 100000;

/**
 * Biggest 'standard' txin is a 15-of-15 P2SH multisig with compressed
 * keys (remember the 520 byte limit on redeemScript size). That works
 * out to a (15*(33+1))+3=513 byte redeemScript, 513+1+15*(73+1)+3=1627
 * bytes of scriptSig, which we round off to 1650 bytes for some minor
 * future-proofing. That's also enough to spend a 20-of-20 CHECKMULTISIG
 * scriptPubKey, though such a scriptPubKey is not considered standard.
 */
static const unsigned int MAX_TX_IN_SCRIPT_SIG_SIZE = 1650;

/**
 * Maximum number of signature check operations in an IsStandard() P2SH script.
 */
static const unsigned int MAX_P2SH_SIGOPS = 15;
/**
 * The maximum number of sigops we're willing to relay/mine in a single tx.
 */
static const unsigned int MAX_STANDARD_TX_SIGOPS = MAX_TX_SIGOPS_COUNT / 5;
/**
 * Default for -maxmempool, maximum megabytes of mempool memory usage.
 */
static const unsigned int DEFAULT_MAX_MEMPOOL_SIZE = 300;
/**
 * Default for -incrementalrelayfee, which sets the minimum feerate increase for
 * mempool limiting or BIP 125 replacement.
 */
static const CFeeRate MEMPOOL_FULL_FEE_INCREMENT(1000 * SATOSHI);
/**
 * Default for -bytespersigop .
 */
static const unsigned int DEFAULT_BYTES_PER_SIGOP = 20;
/**
 * Min feerate for defining dust. Historically this has been the same as the
 * minRelayTxFee, however changing the dust limit changes which transactions are
 * standard and should be done with care and ideally rarely. It makes sense to
 * only increase the dust limit after prior releases were already not creating
 * outputs below the new threshold.
 */
static const Amount DUST_RELAY_TX_FEE(1000 * SATOSHI);

/**
 * Standard script verification flags that standard transactions will comply
 * with. However scripts violating these flags may still be present in valid
 * blocks and we must accept those blocks.
 */
static const uint32_t STANDARD_SCRIPT_VERIFY_FLAGS =
    MANDATORY_SCRIPT_VERIFY_FLAGS | SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_LOW_S |
    SCRIPT_VERIFY_NULLDUMMY | SCRIPT_VERIFY_SIGPUSHONLY |
    SCRIPT_VERIFY_MINIMALDATA | SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS |
    SCRIPT_VERIFY_CLEANSTACK | SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY |
    SCRIPT_VERIFY_CHECKSEQUENCEVERIFY | SCRIPT_VERIFY_NULLFAIL;

/**
 * For convenience, standard but not mandatory verify flags.
 */
static const uint32_t STANDARD_NOT_MANDATORY_VERIFY_FLAGS =
    STANDARD_SCRIPT_VERIFY_FLAGS & ~MANDATORY_SCRIPT_VERIFY_FLAGS;

/**
 * Used as the flags parameter to sequence and nLocktime checks in non-consensus
 * code.
 */
static const uint32_t STANDARD_LOCKTIME_VERIFY_FLAGS =
    LOCKTIME_VERIFY_SEQUENCE | LOCKTIME_MEDIAN_TIME_PAST;

/**
 * Used as the flags parameters to check for sigops as if OP_CHECKDATASIG is
 * enabled. Can be removed after OP_CHECKDATASIG is activated as the flag is
 * made standard.
 */
static const uint32_t STANDARD_CHECKDATASIG_VERIFY_FLAGS =
    STANDARD_SCRIPT_VERIFY_FLAGS | SCRIPT_ENABLE_CHECKDATASIG;

bool IsStandard(const CScript &scriptPubKey, txnouttype &whichType);

/**
 * Check for standard transaction types
 * @return True if all outputs (scriptPubKeys) use only standard transaction
 * forms
 */
bool IsStandardTx(const CTransaction &tx, std::string &reason);

/**
 * Check for standard transaction types
 * @param[in] mapInputs    Map of previous transactions that have outputs we're
 * spending
 * @return True if all inputs (scriptSigs) use only standard transaction forms
 */
bool AreInputsStandard(const CTransaction &tx,
                       const CCoinsViewCache &mapInputs);

extern CFeeRate incrementalRelayFee;
extern CFeeRate dustRelayFee;
extern uint32_t nBytesPerSigOp;

#endif // BITCOIN_POLICY_POLICY_H
