Gitian building Mac OS SDK
==========================

On the host machine, register for a free Apple [developer account](https://developer.apple.com/register/), then download the SDK [here](https://download.developer.apple.com/Developer_Tools/Xcode_11.3.1/Xcode_11.3.1.xip).

Extract the SDK
---------------

Follow [these instructions](../../contrib/macdeploy/README.md#SDK-Extraction) to extract the SDK archive from the download.

Copy SDK to Gitian VM:
----------------------
Copy it to the Gitian VM and clean up, e.g.:

```bash
scp Xcode-11.3.1-11C505-extracted-SDK-with-libcxx-headers.tar.gz gitian:
rm Xcode-11.3.1-11C505-extracted-SDK-with-libcxx-headers.tar.gz
```

Login to the VM and:

```bash
mkdir -p gitian-builder/inputs
mv Xcode-11.3.1-11C505-extracted-SDK-with-libcxx-headers.tar.gz gitian-builder/inputs
```

Troubleshooting
---------------
See [README_osx.md](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/README_osx.md) for troubleshooting tips.
