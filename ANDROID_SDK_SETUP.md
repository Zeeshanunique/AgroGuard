# Android SDK Setup Guide

## Current Issue
Android SDK is not installed or `ANDROID_HOME` is not set.

## Option 1: Use iOS Instead (Recommended for macOS)

Since you're on macOS, iOS development is easier:

```bash
# Install Xcode Command Line Tools (if not already installed)
xcode-select --install

# Then build for iOS
npx expo run:ios
```

## Option 2: Install Android SDK

### Step 1: Install Android Studio
1. Download Android Studio from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio and go through the setup wizard
4. Install Android SDK Platform and Build Tools

### Step 2: Set Environment Variables

Add to your `~/.zshrc` (since you're using zsh):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

### Step 3: Verify Installation

```bash
echo $ANDROID_HOME
adb version
```

### Step 4: Build for Android

```bash
npx expo run:android
```

## Option 3: Use EAS Build (Cloud Build)

If you don't want to install Android SDK locally:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android in the cloud
eas build --profile development --platform android
```

## Recommendation

For macOS development, **use iOS** (`npx expo run:ios`) as it's simpler and doesn't require Android SDK installation.

