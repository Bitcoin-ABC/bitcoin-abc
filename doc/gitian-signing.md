# Gitian signing

Once you've followed the instructions in gitian-building.md and verified that
you have the same hashes as other developers, it's time to sign the gitian
builds.

## PGP fingerprints of gitian build signers

The `contrib/gitian-signing/keys.txt` file contains the PGP fingerprints of
gitian build signers. If you plan on signing gitian builds on a regular basis,
please add you fingerprint here.

TODO: Add reference to gitian keys process instructions once that document is
written. It should be clear to signers that there are expectations associated
with the siginging process and that it's unacceptable to blindly sign builds.

## Sign your gitian builds

TODO: Add scripts and instructions for checking for revoked keys and signing builds.
For now, refer to `contrib/check-keys.sh` for retrieving all signing keys.
