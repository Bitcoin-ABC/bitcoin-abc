# Gitian signing

Once you've followed the instructions in gitian-building.md and verified that
you have the same hashes as other developers, it's time to sign the Gitian
builds.

## PGP fingerprints of gitian build signers

The `contrib/gitian-signing/keys.txt` file contains the PGP fingerprints of
Gitian build signers. If you plan on signing Gitian builds on a regular basis,
please add you fingerprint here.

TODO: Add reference to gitian keys process instructions once that document is
written. It should be clear to signers that there are expectations associated
with the siginging process and that it's unacceptable to blindly sign builds.

## Sign your Gitian builds

### Sign your Gitian builds individually

TODO: Add scripts and instructions for checking for revoked keys and signing builds.
For now, refer to `contrib/check-keys.sh` for retrieving all signing keys.

### Sign your Gitian builds under a single SHA256SUMS file (optional)

These steps are optional, but makes sharing the build signatures easier.

1. After building all binaries using gitian, collect the hashes for the builds
    you care to sign. Exclude any debug binaries, unsigned builds, or metadata
    files that are built as part of the Gitian process, but be sure to include
    the source used to generate the binaries. These hashes will look something
    like this:

    8bc4becb83b532d3be841438e6145372a8bce8f37e087dbffb2aedaee985c0e4  bitcoin-abc-0.18.0-aarch64-linux-gnu.tar.gz
    deb3d15d6ccbce4725f0e0dc892931bfdcbcfa7ccbd35846ccbde90572248bed  bitcoin-abc-0.18.0-arm-linux-gnueabihf.tar.gz
    79a2bff6109307fd64a569270eeb1259cb6bba53ff609af4e5340d13e25e80b8  bitcoin-abc-0.18.0-i686-pc-linux-gnu.tar.gz
    f40ba895f21270d3a038361f9b2baed68df2688eaa01ad531b4ee29ee205cb98  bitcoin-abc-0.18.0-x86_64-linux-gnu.tar.gz
    11dc3ba7f193c70879b3fc3cc716fde56880dfebfab8bb556b7a355b2e64f09d  src/bitcoin-abc-0.18.0.tar.gz
    b83a25ad9050e7566fc6b4f5e33a78d71a39fd7d2f15e7143a37ffd37d501a17  bitcoin-abc-0.18.0-osx64.tar.gz
2. Save those hashes into `SHA256SUMS.0.x.0` where x is the version number.
3. `gpg --armor --clearsign --output SHA256SUMS.0.x.0.asc --sign SHA256SUMS`
