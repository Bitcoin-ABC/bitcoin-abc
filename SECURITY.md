# Responsible Disclosure Policy

Bitcoin ABC takes security very seriously.  We greatly appreciate any and all disclosures of bugs and vulnerabilities that are done in a responsible manner.  We will engage responsible disclosures according to this policy and put forth our best effort to fix disclosed vulnerabilities as well as reaching out to numerous node operators to deploy fixes in a timely manner.

This disclosure policy is also intended to conform to [this proposed standard](https://github.com/RD-Crypto-Spec/Responsible-Disclosure/blob/184391fcbc1bbf3c158c527a841e611ac9ae8388/README.md) with some modifications (see below).

## Responsible Disclosure Guidelines

Do not disclose any bug or vulnerability on public forums, message boards, mailing lists, etc. prior to responsibly disclosing to Bitcoin ABC and giving sufficient time for the issue to be fixed and deployed.
Do not execute on or exploit any vulnerability.  This includes testnet, as both mainnet and testnet exploits are effectively public disclosure.  Regtest mode may be used to test bugs locally.

## Reporting a Bug or Vulnerability

When reporting a bug or vulnerability, please provide the following to security@bitcoinabc.org:
* A short summary of the potential impact of the issue (if known).
* A working proof of concept, or details sufficient to reproduce the issue or
  form an exploit. Reports without this may be ignored (see Severity assessment).
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

## Disclosure Relationships

Neighboring projects that may be affected by bugs, potential exploits, or other security vulnerabilities that are disclosed to Bitcoin ABC will be passed along information regarding disclosures that we believe could impact them.  As per the standard referenced above, we are disclosing these relationships here:

* [ZCash](https://github.com/zcash/zcash/)
  * [Security Contact(s)](https://z.cash/support/security/)
  * [Disclosure Policy](https://github.com/zcash/zcash/blob/master/responsible_disclosure.md)

## Deviations from the Standard

While Bitcoin ABC believes that strong cohesion among neighboring projects and ethical behavior can be standardized to reduce poorly handled disclosure incidents, we also believe that it's in the best interest of eCash for us to deviate from the standard in the following ways:

* The standard calls for coordinated releases. While Bitcoin ABC will make attempts to coordinate releases when possible, it's not always feasible to coordinate urgent fixes for catastrophic exploits (ie. chain splitting events).  For critical fixes, Bitcoin ABC will release them in the next release when possible.

## Severity assessment

Reports sent to security@bitcoinabc.org are assessed only if they describe a
credible security issue in Bitcoin ABC software (node, wallet, Avalanche,
Chronik, and related components shipped by this project), with enough detail
to reproduce or otherwise verify the claim.

We use the following severity classes for eligible issues:

* Critical: Threats to the integrity of the eCash network or user funds at the
  protocol level — for example inflation (coins created outside the issuance
  schedule), theft of funds without user action, or permanent network-wide chain
  splits.
* High: Significant impact on affected nodes, wallets, or the network under
  default (or commonly used) configurations — for example remotely triggerable
  crashes, severe denial-of-service that stalls block or transaction processing,
  remote code execution reachable without unusual local privileges, or wallet
  bugs that can cause loss of funds (without requiring a protocol-level exploit).
* Medium: Significant impact but limited in scope or exploitability
  (non-default settings, special conditions, or degradation rather than full
  failure).
* Low: Hard to exploit or minor operational impact; typically local-network
  only, non-default configuration, or a non-critical component (e.g. optional
  tooling). This includes client issues that require a malicious or already
  compromised trusted server, or a man-in-the-middle between client and that
  server, in architectures where the client is designed to trust the server.

The following are generally **not** security issues for the purpose of this
policy and are not eligible for assessment or bounty:

* Speculative or theoretical findings without a working proof of concept or
  concrete impact on funds, consensus, privacy of keys/seeds, or availability
  of nodes under realistic conditions
* Style concerns, hardening suggestions, or "best practice" reports that do
  not demonstrate an exploitable vulnerability
* Reports from automated scanners or language models without manual
  verification and demonstrated exploitability
* Outdated dependencies, missing HTTP security headers, or weak TLS/cipher
  configurations unless a practical exploit against Bitcoin ABC software is shown
* Duplicates of issues already fixed, already public, or already reported
* Issues that only affect outdated releases and are not present in the latest
  released version (or current master, for unreleased code)
* Vulnerabilities in third-party services, websites, or infrastructure not
  operated as part of this software (see Bounty Payments), unless users face
  direct and immediate risk
* Phishing, social engineering, or other attacks that rely on deceiving users
  without exploiting a technical vulnerability in the software
* Support requests, configuration questions, and feature requests

Bitcoin ABC's judgment of severity and eligibility is final.

**Reports that are not eligible under this assessment may receive no response
and may be closed without a detailed explanation.** This includes incomplete
reports, non-reproducible claims, duplicates, unverified automated or AI
output, reports that materially overstate severity, and issues that are not
security vulnerabilities as defined above. Lack of a reply must not be
interpreted as confirmation that an issue is valid or novel. Reporters who
repeatedly submit ineligible reports may have further submissions declined
without review.

Reviewing reports takes time. Absence of a reply does not mean the report was
ignored or rejected. Please do not send reminders solely because you have not
received a response; ineligible reports may never be answered.

## Bounty Payments

Bitcoin ABC cannot commit to bounty payments ahead of time. However, we will use
our best judgement and do intend on rewarding those who provide valuable
disclosures (with a strong emphasis on easy to read and reproduce disclosures).

Only reports assessed as **Critical** or **High** under Severity assessment are
eligible for a bounty. Medium and Low severity issues, and reports that are not
eligible under that assessment, will not receive a bounty.

Reports that materially overstate severity may be ignored without review and are
not eligible for a bounty.

We do not disclose or negotiate bounty amounts. If a bounty is paid, the amount
is determined solely by Bitcoin ABC.

Please note that reports for website, email, social engineering or other domains
not directly related to the software will not be eligible for bounty unless it
can be demonstrated that users are at direct and immediate risk.

Issues that only affect experimental, unfinished, or explicitly unstable
features are not eligible for a bounty.

## AI disclosures

With the progress of AI capabilities, we expect to see more automated reports from AI investigations and/or tooling.
This may lead to more bugs being discovered, but unfortunately also to more false positive reports.
Evaluating false positive reports is a costly operation as a proper security review implies that a knowledgeable developer spends time investigating the reports.

As a consequence, the following rules are applicable to AI reports:
 - False positive and otherwise ineligible reports are handled under Severity assessment (including the possibility of no response)
 - False positive reports, and reports that overstate severity, may reduce or eliminate any bug bounty the reporter might be eligible to receive

This policy applies to reports that are obviously AI-generated according to Bitcoin ABC's judgment.
