# eCash Trezor firmware

The firmwares in this folder have been built from [Bitcoin ABC ecash-trezor-firmware repository](https://github.com/Bitcoin-ABC/ecash-trezor-firmware).

The build is deterministic when using docker.
Select the version you want to build by using the tag `ecash/<version>`.
In the following example we are building the version 2.8.9.

```bash
git clone https://github.com/Bitcoin-ABC/ecash-trezor-firmware.git
cd ecash-trezor-firmware
PRODUCTION=0 ./build-docker.sh --skip-bitcoinonly --models T2B1,T2T1,T3B1,T3T1 ecash/2.8.9
```

The firmware files will be placed in `build/core-<model>/firmware/firmware.bin`.

The fingerprints are printed for each firmware file so you can compare against
the fingerprint of the firmwares shipping with Electrum ABC. You can extract
the fingerprint from a built firmware file using this command from the root of
the `ecash-trezor-firmware` repository:

```bash
./core/tools/trezor_core_tools/headertool.py <path to firmware>
```
