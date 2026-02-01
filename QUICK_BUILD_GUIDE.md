# Quick Android APK Build Guide

## Step-by-Step Instructions

### Step 1: Initialize EAS Project (First Time Only)

Run this command and answer **"y"** when prompted:

```bash
eas init
```

This will:
- Create an EAS project for your app
- Generate a project ID
- Update your `app.config.ts`

### Step 2: Build Android APK

Once initialized, run:

```bash
eas build --platform android --profile preview
```

**Options:**
- `--profile preview` - Builds APK for testing (recommended)
- `--profile production` - Builds APK for production release
- `--profile development` - Builds development client APK

### Step 3: Wait for Build

- Build time: **10-20 minutes**
- You'll see progress in terminal
- You'll get email when complete
- Or check status: `eas build:list`

### Step 4: Download APK

When build completes:
1. **Click the download link** shown in terminal
2. **Or scan QR code** with your phone
3. **Install APK** on Android device

## Alternative: Build Locally

If you have Android SDK installed:

```bash
# Build locally (faster, but requires Android SDK)
npx expo run:android --variant release
```

APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## Current Setup

✅ `eas.json` configured with:
- Preview profile (APK)
- Production profile (APK)  
- Development profile (dev client)

✅ `app.config.ts` ready for EAS

## Commands Reference

```bash
# Initialize project (first time)
eas init

# Build Android APK
eas build --platform android --profile preview

# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]
```

## Troubleshooting

### "EAS project not configured"
→ Run `eas init` first

### Build fails
→ Check logs: `eas build:view [BUILD_ID]`
→ Verify `app.config.ts` has correct Android settings

### Need to update EAS CLI
```bash
npm install -g eas-cli@latest
```

## Next Steps

1. **Run**: `eas init` (answer "y" to create project)
2. **Run**: `eas build --platform android --profile preview`
3. **Wait**: 10-20 minutes
4. **Download**: Your APK will be ready!

