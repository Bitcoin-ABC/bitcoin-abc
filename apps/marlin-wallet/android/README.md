# Marlin Wallet for Android

You can build and run the Marlin Wallet Android app by following these instructions.

First you need to install the `npx` utility (https://docs.npmjs.com/cli/v8/commands/npx):

```bash
sudo npm install --global npx
```

Then install the Android SDK, NDK and Kotlin versions as specified in the `android/build.gradle` file.
Also install the latest version of the Android Build Tools and Platform Tools.

## Android Studio

The recommended way to install these dependencies is to use Android Studio.
All you need is to open the SDK manager tool from the IDE and select the packages to install.
Please note the path to the SDK because you'll need it for the next steps.

You can also open the project in this IDE and let it sync the Gradle config if you want to.
From there it is possible to build and run the application from the IDE like any Android app.
Note that if you use Android Studio you don't need to define the `ANDROID_HOME` variable as the IDE will create a `local.properties` file containing the path automatically for you.

## CLI

Once you installed the dependencies, you need to set the `ANDROID_HOME` environment variable and point it to your Android SDK folder. On Linux this will typically be done with this command:

```bash
export ANDROID_HOME="${HOME}$/Android/Sdk"
```

Then you need to connect a device. This can be either a real Android device connected via USB or Wifi, or an emulator (available through the Android Studio's Virtual Device Manager).

You can use the command `adb devices` to check your device is connected.
Note that for real devices this requires enabling the [Developer Mode](https://developer.android.com/studio/debug/dev-options) and turning on USB Debugging in the menu.

Once your device is connected you can install and run a debug build of the Marlin Wallet application by running this command **from the marlin-wallet folder**:

```bash
npm run android
```

**Note**: if this hangs, you might need to start the Metro dev server manually.
In a new terminal window, from the marlin-wallet folder, run:

```bash
npx react-native start
```

You can then come back to the previous terminal window and run the command to build and install the app.

## Build a release version

The release versions have to be signed with a real key (not the debug key), so the first step is to create one if not done already. You can use the `keytool` command from the android/ directory to do so:

```bash
keytool -genkey -v -keystore marlin-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias marlin-key
```

Don't forget to backup your key if you plan to use it for submitting the app to the Play Store. You will have to use the same key for all subsequent releases.

Follow the instructions to complete the form and create your keystore.
Then create a file `android/keystore.properties` in the android/ directory:

```
RELEASE_STORE_FILE=marlin-release-key.jks
RELEASE_STORE_PASSWORD=your_store_password_here
RELEASE_KEY_ALIAS=marlin-key
RELEASE_KEY_PASSWORD=your_key_password_here
```

The from the marlin-wallet/ directory, build either the AAB bundle (for Play Store submission):

```bash
npm run build-android-release-aab
```

or the APK package (for sideloading):

```bash
npm run build-android-release-apk
```

You might want to clean the existing build files first, which can be done using this command:

```bash
npm run clean-android
```
