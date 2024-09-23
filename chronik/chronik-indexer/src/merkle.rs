// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`BlockMerkleTree`], a class that computes the merkle tree
//! for block hashes and caches intermediate hashes to avoid computing the
//! same values again and again for different blocks.

use bitcoinsuite_core::hash::{Hashed, Sha256d};

fn is_odd(n: usize) -> bool {
    n % 2 == 1
}

fn calc_branch_len(num_blocks: usize) -> usize {
    assert!(num_blocks > 0);
    // Ceil of log2(num_blocks) without floating-point arithmetic.
    // This is the number of levels in the merkle tree minus 1.
    (u64::BITS - ((num_blocks - 1) as u64).leading_zeros()) as usize
}

fn hash_concatenated_bytes(h1: &Sha256d, h2: &Sha256d) -> Sha256d {
    let mut concatenated = [0u8; 64];
    concatenated[..32].copy_from_slice(h1.as_le_bytes());
    concatenated[32..].copy_from_slice(h2.as_le_bytes());
    Sha256d::digest(concatenated)
}

/// A struct that computes a merkle root and merkle branch for block hashes,
/// while caching intermediate hashes that can be reused to compute the merkle
/// tree for later blocks.
#[derive(Debug, Default)]
pub struct BlockMerkleTree {
    levels: Vec<Vec<Sha256d>>,
}

impl BlockMerkleTree {
    /// Initialize a merkle tree cache.
    pub fn new() -> Self {
        BlockMerkleTree { levels: Vec::new() }
    }

    fn hash_one_level(
        &mut self,
        hashes: &[Sha256d],
        cache_level: usize,
        ignore_last_cached_hash: bool,
    ) -> Vec<Sha256d> {
        assert!(!is_odd(hashes.len()));
        let num_hashes_to_reuse =
            hashes.len() / 2 - ignore_last_cached_hash as usize;
        let mut out = if cache_level < self.levels.len()
            && num_hashes_to_reuse <= self.levels[cache_level].len()
        {
            // The cache has more intermediate hashes than we need, i.e. we
            // previously already computed the merkle root for a higher block
            // number. Take the slice that we need.
            self.levels[cache_level][..num_hashes_to_reuse].to_vec()
        } else if cache_level < self.levels.len() {
            // The cache has some intermediate hashes already computed.
            self.levels[cache_level].to_vec()
        } else {
            Vec::new()
        };

        for i in (2 * out.len()..hashes.len()).step_by(2) {
            out.push(hash_concatenated_bytes(&hashes[i], &hashes[i + 1]));
        }
        out
    }

    /// Return the merkle root for a sequence of block hashes as well as the
    /// branch of hashes verifying that the block at the specified index
    /// is part of that tree (deepest pairing first).
    pub fn merkle_root_and_branch(
        &mut self,
        hashes: &[Sha256d],
        mut index: usize,
    ) -> (Sha256d, Vec<Sha256d>) {
        assert!(index <= hashes.len());

        let branch_len = calc_branch_len(hashes.len());
        let mut branch = Vec::with_capacity(branch_len);

        let mut working_hashes = hashes.to_vec();
        let mut do_cache_last_hash = true;

        for i in 0..branch_len {
            if is_odd(working_hashes.len()) {
                working_hashes.push(*working_hashes.last().unwrap());
                do_cache_last_hash = false;
            }

            branch.push(working_hashes[index ^ 1]);
            index >>= 1;

            working_hashes =
                self.hash_one_level(&working_hashes, i, !do_cache_last_hash);

            let num_hashes_to_cache = if do_cache_last_hash {
                working_hashes.len()
            } else {
                working_hashes.len() - 1
            };

            if i < self.levels.len() {
                self.levels[i] = working_hashes[..num_hashes_to_cache].to_vec();
            } else if num_hashes_to_cache > 0 {
                self.levels
                    .push(working_hashes[..num_hashes_to_cache].to_vec());
            }
        }

        assert_eq!(working_hashes.len(), 1);
        (working_hashes[0], branch)
    }

    /// Invalidate a block by height: prune all previously cached hashes that
    /// are affected by this block or any higher block.
    pub fn invalidate_block(&mut self, height: usize) {
        let mut last_valid_index = height / 2;
        for level in &mut self.levels {
            *level = level.iter().cloned().take(last_valid_index).collect();
            last_valid_index /= 2;
        }
    }
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::hash::{Hashed, Sha256d};

    use crate::merkle::{calc_branch_len, BlockMerkleTree};

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

    #[test]
    fn test_roots() {
        let blockhashes = get_blockchain_hashes();
        let roots = get_merkle_roots();
        assert_eq!(blockhashes.len(), roots.len());
        let mut merkle_tree_cached = BlockMerkleTree::new();
        for i in 0..blockhashes.len() {
            let (root_with_cache, _branch_with_cache) = merkle_tree_cached
                .merkle_root_and_branch(&blockhashes[..=i], 0);
            assert_eq!(root_with_cache, roots[i]);

            // Same computation with a fresh merkle tree (without cached hashes
            // from previous iterations)
            let mut fresh_merkle_tree = BlockMerkleTree::new();
            let (root_without_cache, _) =
                fresh_merkle_tree.merkle_root_and_branch(&blockhashes[..=i], 0);
            assert_eq!(root_without_cache, roots[i]);
        }
    }

    #[test]
    fn test_branches() {
        let blockhashes = get_blockchain_hashes();
        let mut merkle_tree_cached = BlockMerkleTree::new();

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=0], 0);
        let expected_branch: Vec<Sha256d> = Vec::new();
        assert_eq!(branch, expected_branch);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=1], 0);
        assert_eq!(branch.len(), 1);
        assert_eq!(branch[0], blockhashes[1]);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=1], 1);
        assert_eq!(branch.len(), 1);
        assert_eq!(branch[0], blockhashes[0]);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=2], 0);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[1],
            hex_to_sha256d("66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7\
                            b19836c433c5c92b"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=2], 1);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[0],
            hex_to_sha256d("66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7\
                            b19836c433c5c92b"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=2], 2);
        let expected_branch: Vec<Sha256d> = vec![
            blockhashes[2],
            hex_to_sha256d("abdc2227d02d114b77be15085c1257709252a7a103f9ac0a\
                            b3c85d67e12bc0b8"),
        ];
        assert_eq!(branch, expected_branch);

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=15], 7);
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

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=15], 10);
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

        let (_, branch) =
            merkle_tree_cached.merkle_root_and_branch(&blockhashes[..=15], 15);
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
    fn test_cache_levels() {
        let blockhashes = get_blockchain_hashes();
        let mut merkle_tree = BlockMerkleTree::new();
        for i in 1..blockhashes.len() {
            let (_, _) =
                merkle_tree.merkle_root_and_branch(&blockhashes[..=i], 0);

            let num_block_hashes = i + 1;
            let expected_num_levels = num_block_hashes.ilog2() as usize;
            assert_eq!(merkle_tree.levels.len(), expected_num_levels);

            let mut expected_num_hashes = num_block_hashes;
            for j in 0..expected_num_levels {
                expected_num_hashes = expected_num_hashes / 2;
                assert_eq!(merkle_tree.levels[j].len(), expected_num_hashes);
            }
        }

        // We cached results up to 17 blocks (block height #16)
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 8);
        assert_eq!(merkle_tree.levels[1].len(), 4);
        assert_eq!(merkle_tree.levels[2].len(), 2);
        assert_eq!(merkle_tree.levels[3].len(), 1);

        // Invalidate the 17th block: no change in the cached tree as this odd
        // block index was not contributing to the cached hashes
        merkle_tree.invalidate_block(16);
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 8);
        assert_eq!(merkle_tree.levels[1].len(), 4);
        assert_eq!(merkle_tree.levels[2].len(), 2);
        assert_eq!(merkle_tree.levels[3].len(), 1);

        // Invalidate the 16th block
        merkle_tree.invalidate_block(15);
        // Note that we don't remove empty levels
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 7);
        assert_eq!(merkle_tree.levels[1].len(), 3);
        assert_eq!(merkle_tree.levels[2].len(), 1);
        assert_eq!(merkle_tree.levels[3].len(), 0);

        // Invalidate the 15th block: same result, as this odd block was not
        // contributing to the cached hashes
        merkle_tree.invalidate_block(14);
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 7);
        assert_eq!(merkle_tree.levels[1].len(), 3);
        assert_eq!(merkle_tree.levels[2].len(), 1);
        assert_eq!(merkle_tree.levels[3].len(), 0);

        // Invalidate the 10th block
        merkle_tree.invalidate_block(9);
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 4);
        assert_eq!(merkle_tree.levels[1].len(), 2);
        assert_eq!(merkle_tree.levels[2].len(), 1);
        assert_eq!(merkle_tree.levels[3].len(), 0);

        // Invalidate the 3rd block
        merkle_tree.invalidate_block(2);
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[0].len(), 1);
        assert_eq!(merkle_tree.levels[1].len(), 0);
        assert_eq!(merkle_tree.levels[2].len(), 0);
        assert_eq!(merkle_tree.levels[3].len(), 0);

        // The remaining cached hash happens to be the merkle root for the
        // first two blocks.
        let expected_root = merkle_tree.levels[0][0];
        let (root, _) =
            merkle_tree.merkle_root_and_branch(&blockhashes[..=1], 0);
        assert_eq!(root, expected_root);

        // For any power-of-2 number of blocks, the root is the lone hash in
        // the top lovel.
        let (root, _) =
            merkle_tree.merkle_root_and_branch(&blockhashes[..=15], 0);
        assert_eq!(merkle_tree.levels.len(), 4);
        assert_eq!(merkle_tree.levels[3].len(), 1);
        assert_eq!(root, merkle_tree.levels[3][0])
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
