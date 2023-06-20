## Verification of File Hashes

Download the SHA256SUMS files that is available on the
[release page](https://github.com/Bitcoin-ABC/ElectrumABC/releases).
Open it with a text viewer.

Generate a SHA256 hash of the file you downloaded. For example, if
you downloaded the Linux AppImage file for the 5.0.3 release, open a
terminal window, `cd` to the download directory and type:

    $ sha256sum ElectrumABC-5.0.3-x86_64.AppImage
    3b1c5922682da424f2a1d6a6236bf92162777a6b9d1964d46eb85f6596a8bb40  ElectrumABC-5.0.3-x86_64.AppImage

Now compare the hash that your machine calculated with the corresponding
hash in the SHA256SUMS file.

When both hashes match exactly then the downloaded file is almost certainly
intact.

This procedure allows you to verify that a binary release file downloaded
on the official release page was properly downloaded without data corruption.
It can also allow you to verify that a file downloaded from a different
sources is the same as the one provided on the official download page.

It does not, however, tell you whether the official download page was
compromised, as an attacker able to modify a binary file on the github
release page can also modify the SHA256SUMS file.

# Verifying ElectrumABC Downloads using GNU Privacy Guard

## TLDR

    gpg --verify <SIGNATURE> <FILE>

## Detailed Steps
1. Create your private key with

        gpg --generate-key

    Choose RSA/DSA key with 4096 bits.
    Enter your name, email and make sure to choose a strong password.

2. Download the public key of the person you want to verify.
   You can find verify the keys provided in this directory with the
   same key from a public GPG key server, such as http://keys.gnupg.net.

   The keys used to sign the binaries have the following fingerprints:
      - PiRK: `D77B FAED C2C0 AD61 D9D5  DC32 B838 D022 AFCF 71C9`


3. Import the person’s public key into your key ring

        gpg --import PiRK.asc

4. You need to sign the person’s public key with your private key, to tell GPG that you “accept” the key.

        $ gpg --list-keys
        pub   rsa4096 2020-12-03 [SC]
              D77BFAEDC2C0AD61D9D5DC32B838D022AFCF71C9
        uid           [ultimate] Pierre K <......@.....com>

        $ gpg --sign-key D77BFAEDC2C0AD61D9D5DC32B838D022AFCF71C9

5. Download the corresponding signature file on the
   [release page](https://github.com/Bitcoin-ABC/ElectrumABC/releases).
   Extract the signature you want to verify into the same directory
   as the corresponding release file.

7. Now you can verify the signature of the file you downloaded

        gpg --verify sha256_checksums-5.0.3.txt.sig sha256_checksums-5.0.3.txt

    A successful output should end with the following line:

        gpg: Good signature from "Pierre K <.......@....com>" [final]

# Installing GnuPG MAC OS
Can be installed using [Homebrew](https://brew.sh/)

    brew install gpg
