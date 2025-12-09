# Marlin Wallet for IOS

You can build and run the Marlin Wallet IOS application by following these instructions.

First you need to buy a few mandatory devices:

- An Apple computer
- An IPhone
- An Apple Watch is you want to run the Watch OS companion application

Then you need to install XCode and the command line tools. XCode can be found on the App Store, and you can install the command line tools with:

```bash
xcode-select --install
```

Install [Homebrew](https://brew.sh/) if not done already by following the instructions from the website and use it to install nodejs:

```bash
brew install node
```

If you installed nodejs via another method, please make sure to edit the `ios/.xcode.env` file to match your actual nodejs path.

## XCode

To build the IOS application using the XCode IDE, open the workspace:

```bash
cd ios
open MarlinWallet.xcworkspace
```

Before you can build anything you need to associate a signing Team. From XCode select the Marlin Wallet folder in the project view, then select the `MarlinWallet` target.
In the `Signing & Capabilities` tab, expand the `Signing` section and select your signing Team.
Repeat the same process with the `MarlinWalletWatch` target if you plan to build the Watch OS application.

Now you can build from XCode by selecting the desired build scheme (`MarlinWallet` for IOS or `MarlinWalletWatch` for Watch OS), select a target device to build for and click the run button (or use the CMD+R keyboard shortcut).

Note that while it is possible to use an emulator, it is not recommended. This will just make it impossible to properly experience the application properly as the hardware emulation (camera, biometrics, etc.) is very bad and the application uses them a lot.

## Build using the command line

Before proceeding, make sure to select a signing Team using XCode as described above.
You need to connect your IPhone and pair it to your Apple Watch. The watch needs to have both Wifi and Bluetooth enabled.

First install cocoapods and use it to install the dependency. This only needs to be run once:

```bash
sudo gem install cocoapods
cd ios
pod install
cd ..
```

Then you can build and install the IOS application on the connected IPhone with:

```bash
pnpm run ios
```

and the Watch OS companion application to the Apple Watch with:

```bash
pnpm run watchos
```
