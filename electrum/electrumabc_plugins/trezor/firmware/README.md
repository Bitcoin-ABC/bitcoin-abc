# eCash Trezor firmware

The firmwares in this folder have been built from [Bitcoin ABC ecash-trezor-firmware repository](https://github.com/Bitcoin-ABC/ecash-trezor-firmware).

The build is deterministic when using docker.
Select the version you want to build by using the tag `ecash/legacy_<version>` for the Trezor One or `ecash/<version>` for any other Trezor device.

In the example below we are building the version 2.8.9 for the Trezor T (T2T1), the Safe 3 (T2B1 and T3B1) and Safe 5 (T3T1) devices:

```bash
git clone https://github.com/Bitcoin-ABC/ecash-trezor-firmware.git
cd ecash-trezor-firmware
PRODUCTION=0 ./build-docker.sh --skip-bitcoinonly --models T2B1,T2T1,T3B1,T3T1 ecash/2.8.9
```

In this other example we are building the legacy firmware 1.13.1 for the Trezor One (T1B1):

```bash
git clone https://github.com/Bitcoin-ABC/ecash-trezor-firmware.git
cd ecash-trezor-firmware
PRODUCTION=0 ./build-docker.sh --skip-bitcoinonly --models T1B1 ecash/legacy_1.13.1
```

The firmware files will be placed in `build/core-<model>/firmware/firmware.bin` (or `build/legacy-T1B1/firmware/firmware.bin` for the Trezor One).

*Note:* The Trezor One firmware is not shipped as part of Electrum ABC and is not officially supported.

The fingerprints are printed for each firmware file so you can compare against
the fingerprint of the firmwares shipping with Electrum ABC. You can extract
the fingerprint from a built firmware file using this command from the root of
the `ecash-trezor-firmware` repository:

```bash
./core/tools/trezor_core_tools/headertool.py <path to firmware>
```
