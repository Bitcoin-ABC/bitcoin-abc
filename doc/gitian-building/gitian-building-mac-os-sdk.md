Gitian building Mac OS SDK
==========================

On the host machine, register for a free Apple [developer account](https://developer.apple.com/register/), then download the SDK [here](https://developer.apple.com/devcenter/download.action?path=/Developer_Tools/Xcode_7.3.1/Xcode_7.3.1.dmg).

MacOS host
----------

Using Mac OS X, you can mount the dmg, and then extract the SDK with:
```
  $ hdiutil attach Xcode_7.3.1.dmg
  $ tar -C /Volumes/Xcode/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/ -czf MacOSX10.11.sdk.tar.gz MacOSX10.11.sdk
```

Clean up the files you don't need:

```sh
diskutil unmount /Volumes/Xcode
rm Xcode_7.3.1.dmg
```

Non-MacOS host:
---------------

Alternatively, you can use 7zip and SleuthKit to extract the files one by one.
The script [extract-osx-sdk.sh](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/contrib/macdeploy/extract-osx-sdk.sh) automates this. First ensure
the dmg file is in the current directory, and then run the script.

You may wish to delete the intermediate 5.hfs file and MacOSX10.11.sdk (the directory) when
you've confirmed the extraction succeeded.

```bash
apt-get install p7zip-full sleuthkit
contrib/macdeploy/extract-osx-sdk.sh
rm -rf 5.hfs MacOSX10.11.sdk
```

Copy SDK to Gitian VM:
----------------------
Copy it to the Gitian VM and clean up, e.g.:

```bash
scp MacOSX10.11.sdk.tar.gz gitian:
rm MacOSX10.11.sdk.tar.gz
```

Login to the VM and:

```bash
mkdir -p gitian-builder/inputs
mv MacOSX10.11.sdk.tar.gz gitian-builder/inputs
```

Troubleshooting
---------------
See [README_osx.md](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/README_osx.md) for troubleshooting tips.
