# Android native development

## Toolchain verified on Windows

- Android Studio 2026.1.3.7
- Eclipse Temurin JDK 17 LTS
- Android SDK Platform 36 / Build Tools 36.0.0
- NDK 27.1.12297006 / CMake 3.22.1
- ARCore SDK 1.54.0

Android Studio includes a newer JDK for the IDE, but native Expo/React Native
builds must use JDK 17 until their Gradle/CMake chain certifies newer Java
releases.

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:NODE_ENV='development'
npx expo prebuild --platform android --clean
.\android\gradlew.bat -p android assembleDebug --no-daemon
```

The generated `android/` directory is intentionally ignored. Native source lives
in `modules/kitchen-spatial` and is autolinked during Continuous Native Generation.

## Device testing

Enable Developer Options and USB debugging on an ARCore-compatible Android phone,
connect it by USB, accept the computer authorization prompt, then run:

```powershell
adb devices
npx expo run:android --device
```

Kitchen AI declares ARCore as optional so unsupported phones retain the guided
camera fallback. The app must disclose that Google Play Services for AR is
provided by Google and governed by Google's Privacy Policy.
