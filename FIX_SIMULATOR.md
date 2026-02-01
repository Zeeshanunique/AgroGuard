# Fix iOS Simulator Issue

## Problem
"No iOS devices available in Simulator.app" - This means iOS runtimes are not installed.

## Solution: Install iOS Runtime via Xcode

### Step 1: Open Xcode
```bash
open -a Xcode
```

### Step 2: Install iOS Runtime
1. In Xcode, go to **Xcode → Settings** (or **Preferences**)
2. Go to **Platforms** (or **Components** in older versions)
3. Click **+** to add a platform
4. Download **iOS** (latest version, e.g., iOS 17.x)
5. Wait for download and installation to complete

### Step 3: Verify Installation
```bash
xcrun simctl list runtimes
```

You should see iOS runtimes listed.

### Step 4: Create and Boot Simulator
```bash
# List available device types
xcrun simctl list devicetypes | grep iPhone

# Boot a simulator (replace with actual device type from above)
xcrun simctl boot "iPhone 15"

# Or let Expo handle it
npx expo run:ios
```

## Alternative: Use Physical Device

If you have an iPhone:

1. **Connect your iPhone via USB**
2. **Trust the computer** on your iPhone
3. **Enable Developer Mode** on iPhone:
   - Settings → Privacy & Security → Developer Mode → Enable
4. **Run:**
   ```bash
   npx expo run:ios --device
   ```

## Quick Fix: Use Expo Go (Limited)

For quick testing (note: ONNX won't work in Expo Go):

```bash
npx expo start
```

Then scan QR code with Expo Go app. But remember, **ONNX Runtime requires a development build**, so this is only for UI testing.

## Recommended Next Steps

1. **Install iOS runtime via Xcode** (see Step 2 above)
2. **Wait for installation** (can take 10-30 minutes)
3. **Run:** `npx expo run:ios`

This will give you a full development build with ONNX Runtime support.

