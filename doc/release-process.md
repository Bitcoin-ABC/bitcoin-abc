Bitcoin ABC Release Process
===========================


## Before Release

1. Check feature completeness
    - Check features planned for the release are implemented and documented.
      Any incomplete items should be discussed with the Release Manager as soon as possible.
    - Known bugs should have tickets
    - Any known issues or limitations should be documented in release notes

2. Update the documents / code which needs to be updated every release
    - Check that [release-notes.md](/doc/release-notes.md) is complete, and fill in any missing items.
    - Verify the following were updated by automation since the last release:
        - Seeds (see [README](/contrib/seeds/README.md))
        - Chainparams were updated, such as assume-valid, chainwork, and disk size expectations.

3. Verify tests passed
    - Run `arc lint --everything` and check there is no linter error
    - Ensure that bitcoind and bitcoin-qt run with no issue on all supported platforms.
      Manually test bitcoin-qt by sending some transactions and navigating through the menus.

4. Add git tag for release
    a. Create the tag: `git tag vM.m.r` (M = major version, m = minor version, r = revision)
    b. Push the tag to Github: `git push <github remote> vM.m.r`

5. Increment version number for the next release in:
    - `CMakeLists.txt`
    - `contrib/aur/bitcoin-abc/PKGBUILD` and `contrib/aur/bitcoin-abc-qt/PKGBUILD`
    - `contrib/seeds/makeseeds.py` (only after a new major release)

## Release

6. Create GUIX Builds (see gui [README](/contrib/guix/README.md))

7. Verify matching GUIX Builds, gather signatures

8. Verify IBD both with and without `-checkpoints=0 -assumevalid=0`

9. Upload GUIX Builds to [bitcoinabc.org](https://download.bitcoinabc.org/)

10. Create a [GitHub release](https://github.com/Bitcoin-ABC/bitcoin-abc/releases):
    `contrib/release/github-release.sh -a <path to release binaries> -t <release tag> -o <file containing your Github OAuth token>`

11. Create [Ubuntu PPA packages](https://launchpad.net/~bitcoin-abc/+archive/ubuntu/ppa):
    `contrib/release/debian-packages.sh <name-or-email-for-gpg-signing>`

12. Notify maintainers of AUR and Docker images to build their packages.
    They should be given 1-day advance notice if possible.

## After Release

13. Publish signed checksums

14. Announce Release:
    - [Reddit](https://www.reddit.com/r/BitcoinABC/)
    - Twitter @Bitcoin_ABC
    - Telegram groups (like https://t.me/ecash)
