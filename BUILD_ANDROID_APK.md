# Building Android APK with Expo EAS Build

## Quick Start

### Step 1: Login to Expo (if not already)
```bash
eas login
```

### Step 2: Configure Project (if first time)
```bash
eas build:configure
```

### Step 3: Build Android APK

**For Preview/Testing (APK):**
```bash
eas build --platform android --profile preview
```

**For Production (APK):**
```bash
eas build --platform android --profile production
```

## Build Profiles Explained

### Preview Profile
- **Output**: APK file (easy to install)
- **Use case**: Testing, sharing with testers
- **Distribution**: Internal
- **Build type**: APK

### Production Profile  
- **Output**: APK file
- **Use case**: Production release
- **Distribution**: Can be uploaded to Play Store
- **Build type**: APK

### Development Profile
- **Output**: Development build with dev client
- **Use case**: Development and debugging
- **Distribution**: Internal
- **Build type**: Debug APK

## Build Process

1. **EAS Build** will:
   - Upload your code to Expo servers
   - Build the Android APK in the cloud
   - Provide download link when complete

2. **Build time**: Usually 10-20 minutes

3. **You'll get**:
   - Download link for APK
   - QR code to download
   - Email notification when ready

## Downloading the APK

After build completes:
1. Click the download link in terminal
2. Or scan QR code with your phone
3. Install APK on Android device

## Local Build (Alternative)

If you want to build locally (requires Android SDK):

```bash
npx expo run:android --variant release
```

This creates APK in: `android/app/build/outputs/apk/release/`

## Troubleshooting

### Build fails?
- Check `eas.json` configuration
- Verify `app.config.ts` has correct Android settings
- Check EAS build logs: `eas build:list`

### APK too large?
- The ONNX model is ~9MB, which is reasonable
- Consider optimizing images/assets
- Use `expo-optimize` for asset optimization

### Need AAB for Play Store?
Change build type in `eas.json`:
```json
"android": {
  "buildType": "app-bundle"
}
```

## Current Configuration

✅ `eas.json` created with:
- Preview profile (APK for testing)
- Production profile (APK for release)
- Development profile (for dev builds)

✅ `app.config.ts` configured with:
- Android package: `com.agroguard.app`
- Required permissions
- ONNX Runtime plugin

## Next Steps

1. **Login**: `eas login`
2. **Build**: `eas build --platform android --profile preview`
3. **Wait**: 10-20 minutes
4. **Download**: APK will be ready!

## Notes

- **First build** may take longer (20-30 min)
- **Subsequent builds** are faster (10-15 min)
- **APK size**: Expect ~30-50MB (includes ONNX model)
- **ONNX Runtime**: Will be included in the build

