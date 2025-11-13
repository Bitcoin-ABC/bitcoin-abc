# Building Cashtab for Android Play Store Release

This guide explains how to build a signed release APK or AAB (Android App Bundle) for publishing to the Google Play Store.

## Prerequisites

1. **Approved Google Play Developer Account**
2. **Java Development Kit (JDK)** - Required for building Android apps
3. **Android SDK** - Usually comes with Android Studio
4. **Keystore file** - For signing your app (see below)

## Step 1: Create a Keystore (If you don't have one)

You need a keystore file to sign your app. **Keep this file safe and backed up!** You'll need it for all future updates.

### Option A: Using keytool (Command Line)

```bash
keytool -genkey -v -keystore cashtab-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cashtab-key
```

You'll be prompted for:

-   **Keystore password**: Choose a strong password (save it!)
-   **Key password**: Can be same as keystore password
-   **Your name**: Your name or organization
-   **Organizational Unit**: e.g., "Development"
-   **Organization**: e.g., "Bitcoin ABC"
-   **City**: Your city
-   **State**: Your state/province
-   **Country code**: e.g., "US"

### Option B: Using Android Studio

1. Open Android Studio
2. Go to **Build** → **Generate Signed Bundle / APK**
3. Select **Android App Bundle** or **APK**
4. Click **Create new...** to create a new keystore
5. Fill in the form and save the keystore

## Step 2: Configure Keystore Properties

Create a file `android/keystore.properties` in the cashtab/android directory:

```properties
RELEASE_STORE_FILE=../cashtab-release-key.jks
RELEASE_STORE_PASSWORD=your_store_password_here
RELEASE_KEY_ALIAS=cashtab-key
RELEASE_KEY_PASSWORD=your_key_password_here
```

**Important**:

-   Use a relative path from the `android/` directory to your keystore file
-   If your keystore is in the cashtab directory, use `../cashtab-release-key.jks`
-   If your keystore is in the android directory, use `cashtab-release-key.jks`
-   **DO NOT commit this file to git!** It contains sensitive passwords.
-   The `.gitignore` already excludes `keystore.properties`

## Step 3: Update Version Information

Before building, make sure the version in `package.json` matches what you want to publish. The build script will use:

-   `versionName` from `package.json` (e.g., "3.46.0")
-   `versionCode` is calculated as: `major * 10000 + minor * 100 + patch`

If you need to update the version:

1. Update `package.json` version
2. Update `android/app/build.gradle`:
    - `versionName` should match package.json
    - `versionCode` should be incremented for each release

## Step 4: Build the Release

Run the build script:

```bash
./build-android-release.sh
```

This will:

1. Build the web assets
2. Sync Capacitor
3. Build a signed release APK
4. Optionally build an AAB (Android App Bundle)

### Output Files

-   **APK**: `android/app/build/outputs/apk/release/app-release.apk`
-   **AAB**: `android/app/build/outputs/bundle/release/app-release.aab` (if you chose to build it)

## Step 5: Upload to Play Store

### For Internal Testing:

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Testing** → **Internal testing**
4. Click **Create new release**
5. Upload the **AAB file** (preferred) or APK
6. Fill in release notes
7. Review and publish

### Which format to use?

-   **AAB (Android App Bundle)**: **Recommended** - Play Store generates optimized APKs for different devices
-   **APK**: Works but results in larger downloads for users

## Troubleshooting

### "keystore.properties not found"

-   Make sure you created `android/keystore.properties` with the correct properties

### "Keystore file not found"

-   Check the path in `keystore.properties` is correct (relative to `android/` directory)

### "Gradle build failed"

-   Make sure you have the Android SDK installed
-   Check that `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable is set
-   Try running `cd android && ./gradlew clean` first

### Version code conflicts

-   Each release must have a higher `versionCode` than the previous one
-   Update `versionCode` in `android/app/build.gradle` before building

## Security Notes

-   **Never commit** `keystore.properties` or your `.jks` keystore file to git
-   Store backups of your keystore in a secure location
-   If you lose your keystore, you cannot update your app on Play Store (you'd need to create a new app listing)
-   Consider using Play App Signing (Google manages your signing key)

## Next Steps

After your first release:

-   For future releases, increment the version in `package.json` and `build.gradle`
-   Update `versionCode` (must be higher than previous release)
-   Run `./build-android-release.sh` again
-   Upload the new AAB/APK to Play Store
