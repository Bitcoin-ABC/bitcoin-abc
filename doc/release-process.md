Bitcoin ABC Release Process
===========================


## Before Release

1. Check configuration
    - Check features planned for the release are implemented and documented
      (or more informally, that the Release Manager agrees it is feature complete)
    - Check that finished tasks / tickets are marked as resolved

2. Verify tests passed
    - Any known issues or limitations should be documented in release notes
    - Known bugs should have tickets
    - Run `arc lint --everything` and check there is no linter error
    - Verify IBD without checkpoints and without assumevalid.
 
3. Update the documents / code which needs to be updated every release
    - Check that doc/release-notes.md is complete, and fill in any missing items.
    - Update [bips.md](/doc/bips.md) to account for changes since the last release.
    - (major releases) Update [`BLOCK_CHAIN_SIZE`](/src/qt/intro.cpp) to the current size plus
      some overhead.
    - Update `src/chainparams.cpp` defaultAssumeValid and nMinimumChainWork with information from
      the getblockhash rpc.
    - The selected value must not be orphaned so it may be useful to set the value two blocks back 
      from the tip.
    - Testnet should be set some tens of thousands back from the tip due to reorgs there.
    - This update should be reviewed with a reindex-chainstate with assumevalid=0 to catch any defect
      that causes rejection of blocks in the past history.
    - Regenerate manpages (run `contrib/devtools/gen-manpages.sh`, or for out-of-tree builds run
      `BUILDDIR=$PWD/build contrib/devtools/gen-manpages.sh`).
    - Update seeds as per [contrib/seeds/README.md](/contrib/seeds/README.md)

4. Add git tag for release

## Release

5. Create Gitian Builds (see [gitian-building.md](/doc/gitian-building.md))

6. Verify matching gitian builds, gather signatures

7. Upload gitian build to [bitcoinabc.org](https://download.bitcoinabc.org/)

8. Create a [GitHub release](https://github.com/Bitcoin-ABC/bitcoin-abc/releases).
    The Github release name should be the same as the tag (without the prepended 'v'), and
    the contents of the release notes should be copied from release-notes.md.

## After Release

9. Notify maintainers of Ubuntu PPA, AUR, and Docker images to build their packages.

10. Increment version number in:
    - doc/Doxyfile
    - doc/release-notes.md (and copy existing one to versioned doc/release-notes/*.md)
    - configure.ac
    - src/config/CMakeLists.txt
    - contrib/gitian-descriptors/*.yml (before a new major release)

11. Update version number on www.bitcoinabc.org

12. Publish signed checksums (various places, e.g. blog, reddit/r/BitcoinABC)

13. Announce Release:
    - [Reddit](https://www.reddit.com/r/BitcoinABC/)
    - Twitter @Bitcoin_ABC
    - Public slack channels friendly to Bitcoin ABC announcements 
      (eg. #abc-announce on BTCforks,  #hardfork on BTCchat)

