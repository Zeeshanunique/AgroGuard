# ONNX Runtime Setup Fix

## Issue
The error `Cannot read property 'install' of null` occurs because `onnxruntime-react-native` requires native modules that don't work in Expo Go.

## Solution Applied

### 1. Lazy Loading
- Changed from direct import to lazy loading in `ModelManager.ts`
- ONNX Runtime is now loaded only when needed, not at module import time
- This prevents the error during app startup

### 2. Added Expo Plugin
- Added `'onnxruntime-react-native'` to `app.config.ts` plugins array
- This ensures the native module is properly configured

### 3. Removed TensorFlow.js Dependencies
- Removed TensorFlow.js imports from `ModelProvider.tsx`
- Updated initialization to use ONNX Runtime only

## Important: Development Build Required

⚠️ **`onnxruntime-react-native` requires a custom development build (expo-dev-client), not Expo Go.**

### To use ONNX Runtime:

1. **Install expo-dev-client:**
```bash
npx expo install expo-dev-client
```

2. **Create a development build:**
```bash
# For iOS
npx expo run:ios

# For Android  
npx expo run:android
```

3. **Or use EAS Build:**
```bash
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

### Why Expo Go doesn't work:
- Expo Go only includes a limited set of pre-installed native modules
- `onnxruntime-react-native` requires custom native code compilation
- A development build includes your app's native dependencies

## Alternative: Use Expo Go Compatible Solution

If you need to test in Expo Go without a development build, you could:
1. Temporarily use TensorFlow.js (already installed)
2. Or use a web-based ONNX Runtime (onnxruntime-web) for web platform only

## Current Status

✅ Code updated with lazy loading
✅ Expo plugin added
✅ TensorFlow.js dependencies removed
⚠️ **Requires development build to run**

## Next Steps

1. Install expo-dev-client: `npx expo install expo-dev-client`
2. Create development build: `npx expo run:ios` or `npx expo run:android`
3. Test the ONNX model integration

