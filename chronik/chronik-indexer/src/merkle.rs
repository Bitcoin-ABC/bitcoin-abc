// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Merkle proof helpers for header checkpoints and in-block tx proofs.
//!
//! [`MerkleTree`] caches a mid-level of the header hash tree so a proof only
//! needs a small contiguous segment of leaf hashes (~sqrt of the chain length)
//! instead of the full tip-length vector on every request.

use abc_rust_error::Result;
use bitcoinsuite_core::hash::{Hashed, Sha256d};
use thiserror::Error;

/// Errors from [`MerkleTree`] operations.
#[derive(Debug, Error, PartialEq)]
pub enum MerkleTreeError {
    /// Caller passed inconsistent length/index/hash-count arguments.
    #[error("Invalid merkle tree arguments")]
    BadArgs,
    /// Hash provider returned fewer hashes than requested.
    #[error("Expected {expected} hashes from provider, got {actual}")]
    HashCountMismatch {
        /// Number of hashes requested.
        expected: usize,
        /// Number of hashes returned.
        actual: usize,
    },
}

/// Return the length of a merkle branch for `count` hashes
/// (`ceil(log2(count))`).
pub fn calc_branch_len(num_hashes: usize) -> usize {
    assert!(num_hashes > 0);
    // Ceil of log2(num_blocks) without floating-point arithmetic.
    // This is the number of levels in the merkle tree minus 1.
    (u64::BITS - ((num_hashes - 1) as u64).leading_zeros()) as usize
}

fn hash_concatenated_bytes(h1: &Sha256d, h2: &Sha256d) -> Sha256d {
    let mut concatenated = [0u8; 64];
    concatenated[..32].copy_from_slice(h1.as_le_bytes());
    concatenated[32..].copy_from_slice(h2.as_le_bytes());
    Sha256d::digest(concatenated)
}

/// Compute a merkle root and branch for a full list of leaf hashes.
///
/// Used for in-block transaction merkle proofs where the leaf set is small.
/// Returns `(root, branch)`.
pub fn merkle_root_and_branch(
    hashes: &[Sha256d],
    index: usize,
) -> (Sha256d, Vec<Sha256d>) {
    branch_and_root(hashes, index, None)
        .expect("merkle_root_and_branch called with invalid args")
}

fn branch_and_root(
    hashes: &[Sha256d],
    mut index: usize,
    length: Option<usize>,
) -> Result<(Sha256d, Vec<Sha256d>), MerkleTreeError> {
    if hashes.is_empty() || index >= hashes.len() {
        return Err(MerkleTreeError::BadArgs);
    }
    let nat_len = calc_branch_len(hashes.len());
    let length = length.unwrap_or(nat_len);
    if length < nat_len {
        return Err(MerkleTreeError::BadArgs);
    }

    let mut working = hashes.to_vec();
    let mut branch = Vec::with_capacity(length);
    for _ in 0..length {
        // Bitcoin-style merkle: odd levels duplicate the last hash so pairs
        // are even before hashing.
        if working.len() % 2 == 1 {
            working.push(*working.last().unwrap());
        }
        branch.push(working[index ^ 1]);
        index >>= 1;
        let mut next = Vec::with_capacity(working.len() / 2);
        for i in (0..working.len()).step_by(2) {
            next.push(hash_concatenated_bytes(&working[i], &working[i + 1]));
        }
        working = next;
    }
    working
        .into_iter()
        .next()
        .map(|root| (root, branch))
        .ok_or(MerkleTreeError::BadArgs)
}

fn merkle_level(
    hashes: &[Sha256d],
    depth_higher: usize,
) -> Result<Vec<Sha256d>, MerkleTreeError> {
    // length aligned to the segment size yields an empty partial segment.
    if hashes.is_empty() {
        return Ok(Vec::new());
    }
    let size = 1usize << depth_higher;
    let mut level = Vec::with_capacity(hashes.len().div_ceil(size));
    let mut i = 0;
    while i < hashes.len() {
        let end = (i + size).min(hashes.len());
        let (root, _branch) =
            branch_and_root(&hashes[i..end], 0, Some(depth_higher))?;
        level.push(root);
        i = end;
    }
    Ok(level)
}

fn branch_and_root_from_level(
    level: &[Sha256d],
    leaf_hashes: &[Sha256d],
    index: usize,
    depth_higher: usize,
) -> Result<(Sha256d, Vec<Sha256d>), MerkleTreeError> {
    if level.is_empty() || leaf_hashes.is_empty() {
        return Err(MerkleTreeError::BadArgs);
    }
    let leaf_index = (index >> depth_higher) << depth_higher;
    let (leaf_root, mut leaf_branch) =
        branch_and_root(leaf_hashes, index - leaf_index, Some(depth_higher))?;
    let level_index = index >> depth_higher;
    if level_index >= level.len() || leaf_root != level[level_index] {
        return Err(MerkleTreeError::BadArgs);
    }
    let (root, level_branch) = branch_and_root(level, level_index, None)?;
    leaf_branch.extend(level_branch);
    Ok((root, leaf_branch))
}

/// Cached mid-level merkle tree over the block-hash chain.
///
/// Stores hashes at `depth_higher` above the leaves. Proofs fetch only one
/// leaf segment of size `1 << depth_higher` and combine it with the cache.
#[derive(Debug, Default)]
pub struct MerkleTree {
    length: usize,
    depth_higher: usize,
    level: Vec<Sha256d>,
    initialized: bool,
}

impl MerkleTree {
    /// Create an empty, uninitialized cache.
    pub fn new() -> Self {
        Self::default()
    }

    /// Whether the mid-level cache has been built.
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Number of leaf hashes the cache currently covers.
    pub fn length(&self) -> usize {
        self.length
    }

    fn segment_length(&self) -> usize {
        1usize << self.depth_higher
    }

    fn leaf_start(&self, index: usize) -> usize {
        (index >> self.depth_higher) << self.depth_higher
    }

    fn initialize_with_hashes(
        &mut self,
        hashes: &[Sha256d],
    ) -> Result<(), MerkleTreeError> {
        if hashes.is_empty() {
            return Err(MerkleTreeError::BadArgs);
        }
        self.length = hashes.len();
        // Cache mid-tree: (branch_len + 1) / 2 above the leaves.
        self.depth_higher = calc_branch_len(self.length).div_ceil(2);
        self.level = merkle_level(hashes, self.depth_higher)?;
        self.initialized = true;
        Ok(())
    }

    fn get_hashes<F>(
        get_hashes: &mut F,
        start: usize,
        count: usize,
    ) -> Result<Vec<Sha256d>>
    where
        F: FnMut(usize, usize) -> Result<Vec<Sha256d>>,
    {
        let hashes = get_hashes(start, count)?;
        if hashes.len() != count {
            return Err(MerkleTreeError::HashCountMismatch {
                expected: count,
                actual: hashes.len(),
            }
            .into());
        }
        Ok(hashes)
    }

    fn extend_to<F>(&mut self, length: usize, get_hashes: &mut F) -> Result<()>
    where
        F: FnMut(usize, usize) -> Result<Vec<Sha256d>>,
    {
        if length <= self.length {
            return Ok(());
        }
        // Cache mid-tree: (branch_len + 1) / 2 above the leaves.
        let new_depth = calc_branch_len(length).div_ceil(2);
        if new_depth != self.depth_higher {
            let hashes = Self::get_hashes(get_hashes, 0, length)?;
            self.initialize_with_hashes(&hashes)?;
            return Ok(());
        }

        let start = self.leaf_start(self.length);
        let hashes = Self::get_hashes(get_hashes, start, length - start)?;
        let limit = start >> self.depth_higher;
        if limit > self.level.len() {
            return Err(MerkleTreeError::BadArgs.into());
        }
        self.level.truncate(limit);
        let extra = merkle_level(&hashes, self.depth_higher)?;
        self.level.extend(extra);
        self.length = length;
        Ok(())
    }

    fn level_for<F>(
        &self,
        length: usize,
        get_hashes: &mut F,
    ) -> Result<Vec<Sha256d>>
    where
        F: FnMut(usize, usize) -> Result<Vec<Sha256d>>,
    {
        // When length is segment-aligned and equals the cache length, the
        // cached mid-level is already complete.
        if length == self.length && self.leaf_start(length) == length {
            return Ok(self.level.clone());
        }
        let limit = length >> self.depth_higher;
        if limit > self.level.len() {
            return Err(MerkleTreeError::BadArgs.into());
        }
        let mut ret = self.level[..limit].to_vec();
        let leaf_start = self.leaf_start(length);
        let count =
            self.segment_length().min(length.saturating_sub(leaf_start));
        if count > 0 {
            let hashes = Self::get_hashes(get_hashes, leaf_start, count)?;
            ret.extend(merkle_level(&hashes, self.depth_higher)?);
        }
        Ok(ret)
    }

    /// Truncate the cache to at most `length` leaf hashes (e.g. after a reorg).
    ///
    /// The length is rounded down to a segment boundary so the cached mid-level
    /// never retains a partial segment that may contain invalidated hashes.
    /// Passing `0` clears the cache entirely.
    pub fn truncate(&mut self, length: usize) {
        if !self.initialized {
            return;
        }
        if length == 0 {
            *self = Self::new();
            return;
        }
        if length >= self.length {
            return;
        }
        // Drop any partial segment that intersects the truncated region.
        let length = self.leaf_start(length);
        if length == 0 {
            *self = Self::new();
            return;
        }
        let limit = length >> self.depth_higher;
        self.level.truncate(limit);
        self.length = length;
    }

    /// Return the merkle root of the first `length` block hashes and the branch
    /// proving that the hash at `index` is included.
    ///
    /// `get_hashes(start, count)` must return exactly `count` leaf hashes
    /// starting at height `start`. Only a small segment is requested after the
    /// cache is warm.
    pub fn merkle_root_and_branch<F>(
        &mut self,
        length: usize,
        index: usize,
        mut get_hashes: F,
    ) -> Result<(Sha256d, Vec<Sha256d>)>
    where
        F: FnMut(usize, usize) -> Result<Vec<Sha256d>>,
    {
        if length == 0 || index >= length {
            return Err(MerkleTreeError::BadArgs.into());
        }

        if !self.initialized {
            let hashes = Self::get_hashes(&mut get_hashes, 0, length)?;
            self.initialize_with_hashes(&hashes)?;
        } else {
            self.extend_to(length, &mut get_hashes)?;
        }

        if length > self.length {
            return Err(MerkleTreeError::BadArgs.into());
        }

        let leaf_start = self.leaf_start(index);
        let count = self.segment_length().min(length - leaf_start);
        let leaf_hashes = Self::get_hashes(&mut get_hashes, leaf_start, count)?;

        if length < self.segment_length() {
            return branch_and_root(&leaf_hashes, index, None)
                .map_err(Into::into);
        }

        let level = self.level_for(length, &mut get_hashes)?;
        branch_and_root_from_level(
            &level,
            &leaf_hashes,
            index,
            self.depth_higher,
        )
        .map_err(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::hash::{Hashed, Sha256d};

    use crate::merkle::{
        calc_branch_len, merkle_root_and_branch, MerkleTree, MerkleTreeError,
    };

    fn hex_to_sha256d(hex: &str) -> Sha256d {
        Sha256d::from_be_hex(hex).unwrap()
    }

    fn get_blockchain_hashes() -> Vec<Sha256d> {
        // First block hashes in the bitcoin blockchain
        let block_hashes = vec![
            "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048",
            "000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd",
            "0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449",
            "000000004ebadb55ee9096c9a2f8880e09da59c0d68b1c228da88e48844a1485",
            "000000009b7262315dbf071787ad3656097b892abffd1f95a1a022f896f533fc",
            "000000003031a0e73735690c5a1ff2a4be82553b2a12b776fbd3a215dc8f778d",
            "0000000071966c2b1d065fd446b1e485b2c9d9594acd2007ccbd5441cfc89444",
            "00000000408c48f847aa786c2268fc3e6ec2af68e8468a34a28c61b7f1de0dc6",
            "000000008d9dc510f23c2657fc4f67bea30078cc05a90eb89e84cc475c080805",
            "000000002c05cc2e78923c34df87fd108b22221ac6076c18f3ade378a4d915e9",
            "0000000097be56d606cdd9c54b04d4747e957d3608abe69198c661f2add73073",
            "0000000027c2488e2510d1acf4369787784fa20ee084c258b58d9fbd43802b5e",
            "000000005c51de2031a895adc145ee2242e919a01c6d61fb222a54a54b4d3089",
            "0000000080f17a0c5a67f663a9bc9969eb37e81666d9321125f0e293656f8a37",
            "00000000b3322c8c3ef7d2cf6da009a776e6a99ee65ec5a32f3f345712238473",
            "00000000174a25bb399b009cc8deff1c4b3ea84df7e93affaaf60dc3416cc4f5",
        ];
        block_hashes
            .iter()
            .map(|&hex| hex_to_sha256d(hex))
            .collect()
    }

    // These roots as well as the merkle branches tested below can be checked
    // using Electrum ABC's console.
    //
    // network.synchronous_get(("blockchain.block.header", [height, cp_h]))
    // For example, to get the merkle root of all blockchain headers up to and
    // including block 9 and the merkle branch needed to prove that block 4
    // is in the same chain, type this in the console:
    //     network.synchronous_get(("blockchain.block.header", [4, 9]))
    fn get_merkle_roots() -> Vec<Sha256d> {
        let roots = vec![
            "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            "abdc2227d02d114b77be15085c1257709252a7a103f9ac0ab3c85d67e12bc0b8",
            "6ce668e2ec49dae449c0d55de7b1c973696c7d4a47024dbcb26ee99411244ff6",
            "965ac94082cebbcffe458075651e9cc33ce703ab0115c72d9e8b1a9906b2b636",
            "a7b8e38ec91da1483864ecd86a19580a79c385c3871c1b74e4c9cca38a9a43a5",
            "8128c71269a41befbdbacb87e90cf246991cc305a357df36ddb4345f1e691f52",
            "1872dce49586510591bb2a2a10fba53300694c85995cdb64aa72f871bb688d88",
            "c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe302660dfe6bd1969224a2",
            "e347b1c43fd9b5415bf0d92708db8284b78daf4d0e24f9c3405f45feb85e25db",
            "8a5027e722a53eef05400679fe711bd5cea74ba0b604d9a98caabf8ac0986a7e",
            "8b8f513a34feeb1f2cdac70fcd97042be23ccd64de9d66d36f9407bbc1809f5f",
            "b05152646ed9384d234ae37e034db54e1ff65314200edd9617c53cd72a2e706d",
            "15288b27a233994b809901c91af1bd27992b20b26cf187b4eb72d6a2858ff5f0",
            "77f9bc6eae1e18f92f746fb2f6b8f66c11086833ae2177f60905f0b2397ef67a",
            "4ffb2fac9ecd33b1925bae9c8e2ae89b85078b90853b1feb5d7038a8fdbd1176",
            "3cdcb64f35c3fc45a2737c2c22c5b61ccb8b93d36af10d21ae953b7d91e094d7",
            "ad1bb2b84eeb782e3cc281cc801ae5da49a43b60b2a37c265c37737553709f21",
        ];
        roots.iter().map(|&hex| hex_to_sha256d(hex)).collect()
    }

    fn make_getter(
        hashes: &[Sha256d],
    ) -> impl FnMut(usize, usize) -> Result<Vec<Sha256d>> + '_ {
        move |start, count| Ok(hashes[start..start + count].to_vec())
    }

    #[test]
    fn test_roots() {
        let blockhashes = get_blockchain_hashes();
        let roots = get_merkle_roots();
        assert_eq!(blockhashes.len(), roots.len());
        for i in 0..blockhashes.len() {
            let (root, _) = merkle_root_and_branch(&blockhashes[..=i], 0);
            assert_eq!(root, roots[i]);
        }
    }

    #[test]
    fn test_branches() {
        let blockhashes = get_blockchain_hashes();

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=0], 0);
        let expected_branch: Vec<Sha256d> = Vec::new();
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=1], 0);
        assert_eq!(branch.len(), 1);
        assert_eq!(branch[0], blockhashes[1]);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=1], 1);
        assert_eq!(branch.len(), 1);
        assert_eq!(branch[0], blockhashes[0]);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=2], 0);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[1],
            hex_to_sha256d("66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7\
                            b19836c433c5c92b"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=2], 1);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[0],
            hex_to_sha256d("66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7\
                            b19836c433c5c92b"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=2], 2);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[2],
            hex_to_sha256d("abdc2227d02d114b77be15085c1257709252a7a103f9ac0a\
                            b3c85d67e12bc0b8"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=15], 7);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[6],
            hex_to_sha256d("f9f17a3c6d02b0920eccb11156df370bf4117fae2233dfee\
                            40817586ba981ca5"),
            hex_to_sha256d("965ac94082cebbcffe458075651e9cc33ce703ab0115c72d\
                            9e8b1a9906b2b636"),
            hex_to_sha256d("a0c4df031de8f1370f278ac9f3dcdca4f627f86ff6238f09\
                            e40270bb9ecd3f62"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=15], 10);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[11],
            hex_to_sha256d("cd5d21a5bc8ad65c8dc862bd9e6ec38f914ee6499d7e0ad2\
                            3d7ca9582770b6c2"),
            hex_to_sha256d("d84ed7114670b8d129dd1d50970315995c0d6309e0935e7b\
                            bc91477bfc717d3a"),
            hex_to_sha256d("c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe30266\
                            0dfe6bd1969224a2"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) = merkle_root_and_branch(&blockhashes[..=15], 15);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[14],
            hex_to_sha256d("e55021736ef89c3787e2729058a76a3cf6decf561b856c57\
                            eb88ed99899009d1"),
            hex_to_sha256d("e9106987dc15c9ea710feeed3c2b3252cbfe21925803696e\
                            a52aa7b50a0f1085"),
            hex_to_sha256d("c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe30266\
                            0dfe6bd1969224a2"),
        ];
        assert_eq!(branch, expected_branch);
    }

    #[test]
    fn test_cached_matches_uncached() -> Result<()> {
        let blockhashes = get_blockchain_hashes();
        let roots = get_merkle_roots();
        let mut cache = MerkleTree::new();

        for i in 0..blockhashes.len() {
            let length = i + 1;
            for index in 0..length {
                let (root, branch) = cache.merkle_root_and_branch(
                    length,
                    index,
                    make_getter(&blockhashes),
                )?;
                let (expected_root, expected_branch) =
                    merkle_root_and_branch(&blockhashes[..length], index);
                assert_eq!(root, expected_root);
                assert_eq!(branch, expected_branch);
                if index == 0 {
                    assert_eq!(root, roots[i]);
                }
            }
        }
        Ok(())
    }

    #[test]
    fn test_cache_fetches_only_segment_when_warm() -> Result<()> {
        let blockhashes = get_blockchain_hashes();
        let mut cache = MerkleTree::new();
        // Warm the cache for all hashes.
        cache.merkle_root_and_branch(
            blockhashes.len(),
            0,
            make_getter(&blockhashes),
        )?;

        let mut max_count = 0usize;
        let mut total_fetched = 0usize;
        cache.merkle_root_and_branch(
            blockhashes.len(),
            7,
            |start, count| {
                assert!(start + count <= blockhashes.len());
                max_count = max_count.max(count);
                total_fetched += count;
                Ok(blockhashes[start..start + count].to_vec())
            },
        )?;
        // After warm-up, a proof should only pull one mid-level segment.
        assert!(max_count < blockhashes.len());
        assert!(total_fetched < blockhashes.len());
        Ok(())
    }

    #[test]
    fn test_truncate() -> Result<()> {
        let blockhashes = get_blockchain_hashes();
        let mut cache = MerkleTree::new();
        cache.merkle_root_and_branch(
            blockhashes.len(),
            0,
            make_getter(&blockhashes),
        )?;
        assert!(cache.is_initialized());
        assert_eq!(cache.length(), blockhashes.len());

        cache.truncate(8);
        assert!(cache.is_initialized());
        assert_eq!(cache.length(), 8);

        let (root, branch) =
            cache.merkle_root_and_branch(8, 3, make_getter(&blockhashes))?;
        let (expected_root, expected_branch) =
            merkle_root_and_branch(&blockhashes[..8], 3);
        assert_eq!(root, expected_root);
        assert_eq!(branch, expected_branch);

        cache.truncate(0);
        assert!(!cache.is_initialized());
        assert_eq!(cache.length(), 0);
        Ok(())
    }

    #[test]
    fn test_functional_sequence() -> Result<()> {
        // Mirrors chronik_block_header.py: grow cache tip-first, then query
        // shorter checkpoints (including lengths aligned to the segment size).
        let blockhashes = get_blockchain_hashes();
        let mut cache = MerkleTree::new();
        for i in 1..11 {
            let length = i + 1;
            let index = i;
            let (root, branch) = cache.merkle_root_and_branch(
                length,
                index,
                make_getter(&blockhashes),
            )?;
            let (expected_root, expected_branch) =
                merkle_root_and_branch(&blockhashes[..length], index);
            assert_eq!(
                (root, branch),
                (expected_root, expected_branch),
                "grow i={i}"
            );
        }
        for checkpoint_height in 1..11 {
            let length = checkpoint_height + 1;
            for block_height in 0..length {
                let (root, branch) = cache.merkle_root_and_branch(
                    length,
                    block_height,
                    make_getter(&blockhashes),
                )?;
                let (expected_root, expected_branch) = merkle_root_and_branch(
                    &blockhashes[..length],
                    block_height,
                );
                assert_eq!(
                    (root, branch),
                    (expected_root, expected_branch),
                    "cp={checkpoint_height} h={block_height}"
                );
            }
        }
        Ok(())
    }

    #[test]
    fn test_truncate_then_extend_after_reorg() -> Result<()> {
        let mut blockhashes = get_blockchain_hashes();
        let mut cache = MerkleTree::new();
        cache.merkle_root_and_branch(
            blockhashes.len(),
            0,
            make_getter(&blockhashes),
        )?;

        // Invalidate from height 5 upward (same idea as
        // chronik_block_header.py).
        cache.truncate(5);
        // Replace the tip and grow a new fork.
        blockhashes.truncate(5);
        blockhashes.push(hex_to_sha256d(
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ));
        for _ in 0..10 {
            let n = blockhashes.len() as u8;
            blockhashes.push(Sha256d([n; 32]));
        }

        for checkpoint_height in 1..blockhashes.len() {
            let length = checkpoint_height + 1;
            for block_height in 0..length {
                let (root, branch) = cache.merkle_root_and_branch(
                    length,
                    block_height,
                    make_getter(&blockhashes),
                )?;
                let (expected_root, expected_branch) = merkle_root_and_branch(
                    &blockhashes[..length],
                    block_height,
                );
                assert_eq!(
                    (root, branch),
                    (expected_root, expected_branch),
                    "cp={checkpoint_height} h={block_height}"
                );
            }
        }
        Ok(())
    }

    #[test]
    fn test_bad_args() {
        let mut cache = MerkleTree::new();
        let hashes = get_blockchain_hashes();
        let err = cache
            .merkle_root_and_branch(0, 0, make_getter(&hashes))
            .unwrap_err();
        assert_eq!(
            err.downcast_ref::<MerkleTreeError>(),
            Some(&MerkleTreeError::BadArgs)
        );
    }

    #[test]
    #[should_panic]
    fn test_calc_branch_len_0_panics() {
        calc_branch_len(0);
    }

    #[test]
    fn test_calc_branch_len() {
        assert_eq!(calc_branch_len(1), 0);
        assert_eq!(calc_branch_len(2), 1);
        for i in 2..usize::MAX.ilog2() {
            assert_eq!(calc_branch_len(2usize.pow(i) - 1), i as usize);
            assert_eq!(calc_branch_len(2usize.pow(i)), i as usize);
            assert_eq!(calc_branch_len(2usize.pow(i) + 1), (i + 1) as usize);
        }
    }
}
