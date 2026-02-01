# iOS Build Instructions

## Quick Start

The iOS build process has started. Here's what to do:

### Option 1: Let Expo Handle It (Easiest)

Just run:
```bash
npx expo run:ios
```

Expo will automatically:
1. Create the iOS native directory
2. Install CocoaPods dependencies
3. Open Xcode or Simulator
4. Build and run the app

### Option 2: Manual Simulator Setup

1. **Open Simulator manually:**
   ```bash
   open -a Simulator
   ```

2. **Wait for Simulator to fully load** (may take 30-60 seconds)

3. **Then run:**
   ```bash
   npx expo run:ios
   ```

### Option 3: Use Expo Go (For Quick Testing)

If you just want to test quickly without building:

```bash
# Start Expo dev server
npx expo start

# Then scan QR code with Expo Go app on your iPhone
# Note: ONNX Runtime won't work in Expo Go, only in development build
```

## Current Status

✅ Native iOS directory created
✅ CocoaPods installed
✅ Prebuild completed
⏳ Waiting for iOS Simulator

## Next Steps

1. **Open Simulator** (if not already open):
   ```bash
   open -a Simulator
   ```

2. **Wait for Simulator to boot** (check the Simulator window)

3. **Run the build command again:**
   ```bash
   npx expo run:ios
   ```

## Troubleshooting

### If Simulator doesn't open:
- Check Xcode is properly installed: `xcode-select -p`
- Try opening Simulator manually: `open -a Simulator`
- Wait 30-60 seconds for Simulator to fully boot

### If build fails:
- Make sure Simulator is fully booted (not just opening)
- Check Xcode Command Line Tools: `xcode-select --install`
- Try cleaning: `cd ios && pod deintegrate && pod install && cd ..`

## Note About ONNX Runtime

⚠️ **Important**: ONNX Runtime requires a development build. The app will work in the Simulator once built, but won't work in Expo Go.

