# Responsible Disclosure Policy

Bitcoin ABC takes security very seriously.  We greatly appreciate any and all disclosures of bugs and vulnerabilities that are done in a responsible manner.  We will engage responsible disclosures according to this policy and put forth our best effort to fix disclosed vulnerabilities as well as reaching out to numerous node operators to deploy fixes in a timely manner.

This disclosure policy is also intended to conform to [this proposed standard](https://github.com/RD-Crypto-Spec/Responsible-Disclosure/blob/184391fcbc1bbf3c158c527a841e611ac9ae8388/README.md) with some modifications (see below).

## Responsible Disclosure Guidelines

Do not disclose any bug or vulnerability on public forums, message boards, mailing lists, etc. prior to responsibly disclosing to Bitcoin ABC and giving sufficient time for the issue to be fixed and deployed.
Do not execute on or exploit any vulnerability.  This includes testnet, as both mainnet and testnet exploits are effectively public disclosure.  Regtest mode may be used to test bugs locally.

## Reporting a Bug or Vulnerability

When reporting a bug or vulnerability, please provide the following to security@bitcoinabc.org:
* A short summary of the potential impact of the issue (if known).
* Details explaining how to reproduce the issue or how an exploit may be formed.
* Your name (optional).  If provided, we will provide credit for disclosure.  Otherwise, you will be treated anonymously and your privacy will be respected.
* Your email or other means of contacting you.
* A PGP key/fingerprint for us to provide encrypted responses to your disclosure.  If this is not provided, we cannot guarantee that you will receive a response prior to a fix being made and deployed.

## Encrypting the Disclosure

We highly encourage all disclosures to be encrypted to prevent interception and exploitation by third-parties prior to a fix being developed and deployed.  Please encrypt using the PGP public key with fingerprint: `5442AB0B9178E0D1567479B471A3ED7ECF82C6A7`

It may be obtained via:
```
gpg --recv-keys 5442AB0B9178E0D1567479B471A3ED7ECF82C6A7
```

Below are some basic instructions for encrypting your disclosure on Linux if you are unfamiliar with GPG:

1. If you don’t already have a PGP key, first download GPG:
For Debian based distributions:
```
sudo apt-get install gpg
```
For Archlinux based distributions:
```
pacman -S gnupg
```
2. Generate a PGP key:
```
gpg --full-generate-key
```
3. Select “RSA and RSA”
4. Enter a key size of 4096.
5. Follow the remaining prompts.
6. Save your disclosure report to a plain text file, then encrypt:
```
gpg --output mydisclosurefile.asc --encrypt --recipient security@bitcoinabc.org mydisclosurefile
```

## Backup PGP Keys

These PGP fingerprints and emails are provided only as backups in case you are unable to contact Bitcoin ABC via the security email above.

#### Amaury Sechet
```
Bitcoin ABC Lead Developer
deadalnix at gmail dot com
629D7E5DDDA0512BD5860F2C5D7922BBD649C4A7
```

#### Jason B. Cox
```
Bitcoin ABC Developer
contact at jasonbcox dot com
3BB16D00D9A6D281591BDC76E4486356E7A81D2C
```

## Disclosure Relationships

Neighboring projects that may be affected by bugs, potential exploits, or other security vulnerabilities that are disclosed to Bitcoin ABC will be passed along information regarding disclosures that we believe could impact them.  As per the standard referenced above, we are disclosing these relationships here:

* [ZCash](https://github.com/zcash/zcash/)
  * [Security Contact(s)](https://z.cash/support/security/)
  * [Disclosure Policy](https://github.com/zcash/zcash/blob/master/responsible_disclosure.md)

## Bounty Payments

Bitcoin ABC cannot commit to bounty payments ahead of time.  However, we will use our best judgement and do intend on rewarding those who provide valuable disclosures (with a strong emphasis on easy to read and reproduce disclosures).

## Deviations from the Standard

While Bitcoin ABC believes that strong cohesion among neighoring projects and ethical behavior can be standardized to reduce poorly handled disclosure incidents, we also believe that it's in the best interest of Bitcoin Cash for us to deviate from the standard in the following ways:

* The standard calls for coordinated releases. While Bitcoin ABC will make attempts to coordinate releases when possible, it's not always feasible to coordinate urgent fixes for catastrophic exploits (ie. chain splitting events).  For critical fixes, Bitcoin ABC will release them in the next release when possible.

## Making changes to this disclosure

Note that any changes to this disclosure should be mirrored in a pull request to the [bitcoinabc.org repo](https://github.com/Bitcoin-ABC/bitcoinabc.org).
