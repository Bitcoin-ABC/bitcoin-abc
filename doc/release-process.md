Bitcoin ABC Release Process
===========================


## Before Release

1. Check configuration
    - Check features planned for the release are implemented and documented
      (or more informally, that the Release Manager agrees it is feature complete)
    - Check that finished tasks / tickets are marked as resolved

2. Verify tests passed
    - any known issues or limitations should be documented in release notes
    - known bugs should have tickets
 
3. Update the documents / code which needs to be updated every release
    - Fill in doc/release-notes.md (copy existing one to versioned doc/release-notes/*.md document 
      and update doc/release-notes.md)
    - Update [bips.md](bips.md) to account for changes since the last release
    - (major releases) Update [`BLOCK_CHAIN_SIZE`](/src/qt/intro.cpp) to the current size plus
      some overhead.
    - Update `src/chainparams.cpp` defaultAssumeValid  with information from the getblockhash rpc.
    - The selected value must not be orphaned so it may be useful to set the value two blocks back 
      from the tip.
    - Testnet should be set some tens of thousands back from the tip due to reorgs there.
    - This update should be reviewed with a reindex-chainstate with assumevalid=0 to catch any defect
      that causes rejection of blocks in the past history.
    - Regenerate manpages (run contrib/devtools/gen-manpages.sh).

4. Increment version number in:
    - doc/Doxyfile
    - doc/release-notes.md
    - configure.ac
    - src/config/CMakeLists.txt
    - src/test/net_tests.cpp
    - src/clientversion.h
    - contrib/gitian-descriptors/*.yml (before a new major release)

5. Add git tag for release


## Release
    
6. Create Gitian Builds (see doc/gitian-building.md), notify PPA buildmaster to start creating Ubuntu PPAs
    
7. Verify matching gitian builds, gather signatures

8. Upload gitian build to [bitcoinabc.org](https://download.bitcoinabc.org/)

9. Re-verify the uploads (make sure that downloading them, their checksums are ok)

10. Create a [GitHub release](https://github.com/Bitcoin-ABC/bitcoin-abc/releases) 


## After Release

11. Update version number on www.bitcoinabc.org

12. Publish signed checksums (various places, e.g. blog, reddit/r/BitcoinABC)

13. Announce Release:
    - [Reddit](https://www.reddit.com/r/BitcoinABC/)
    - Twitter @Bitcoin_ABC
    - Public slack channels friendly to Bitcoin ABC announcements 
      (eg. #abc-announce on BTCforks,  #hardfork on BTCchat)
