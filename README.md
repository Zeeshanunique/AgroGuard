# AgroGuard

Plant disease detection mobile app powered by an on-device vision-language model. Identify crop diseases from leaf photos — fully offline after the initial model download.

## Features

- **On-Device AI** — Uses LFM2.5-VL-1.6B (react-native-executorch) running entirely on the device; no API key or internet required for analysis
- **Broad Coverage** — Identifies diseases across 15 crop species including Apple, Tomato, Corn, Grape, Potato, Pumpkin, and more
- **Camera & Gallery** — Capture a leaf photo or pick from gallery for instant analysis
- **Disease Details** — View confidence scores, severity, and crop identification
- **Scan History** — Track past scans with local storage
- **Treatment Info** — Organic and chemical treatment recommendations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 (file-based) |
| AI Model | LFM2.5-VL-1.6B via react-native-executorch 0.8.4 |
| Image Processing | expo-image-manipulator |
| Storage | AsyncStorage |
| Language | TypeScript 5.9 |

## Project Structure

```
AgroGuard/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Tab navigation
│   │   ├── index.tsx           # Home / scan screen
│   │   ├── browse.tsx          # Browse crops & diseases
│   │   ├── history.tsx         # Scan history
│   │   └── settings.tsx        # App settings
│   ├── scan/
│   │   ├── camera.tsx          # Camera capture + VLM integration
│   │   └── results.tsx         # Analysis results
│   └── details/
│       ├── crop/[id].tsx       # Crop detail page
│       └── disease/[id].tsx    # Disease detail page
├── src/
│   ├── ml/                     # AI integration
│   │   ├── vlmParser.ts        # Parse raw VLM text → AnalysisResult
│   │   ├── labels.ts           # Crop & disease label mappings
│   │   └── types.ts            # Type definitions
│   ├── components/ui/          # Reusable UI components
│   ├── constants/              # App config
│   ├── context/                # React providers
│   └── database/               # Local data & seed data
└── prd.md                      # Product requirements
```

## AI Pipeline

```
Camera/Gallery Image
       │
       ▼
Custom Crop Interface (user-defined)
       │
       ▼
expo-image-manipulator (JPEG, 0.8 quality)
       │
       ▼
LFM2.5-VL-1.6B on-device inference
(react-native-executorch, New Architecture)
       │
       ▼
Structured JSON response (vlmParser.ts)
       │
       ▼
Disease + Crop Identification
```

**Model**: LFM2.5-VL-1.6B-Quantized (~500 MB) via `react-native-executorch`. Downloads automatically on first launch from HuggingFace to device storage. No API key required. Requires Android New Architecture (`newArchEnabled=true`).

## Supported Crops

Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato, Pumpkin

## Setup

### Prerequisites

- **Node.js** >= 18
- **Android SDK** with accepted licenses (for local Android builds)
- **Xcode** (for iOS builds, macOS only)
- **~500 MB free device storage** (model downloads on first app launch)

### 1. Clone & Install

```bash
git clone <repo-url>
cd AgroGuard
npm install
```

No `.env` file or API key is needed.

### 2. Generate Native Projects

The `android/` and `ios/` folders are gitignored (generated code). Regenerate them with:

```bash
npx expo prebuild
```

### 3. Accept Android SDK Licenses

If building locally for Android, make sure all SDK licenses are accepted:

```bash
sdkmanager --licenses
```

Also set the `ANDROID_HOME` environment variable:

```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 4. Run

```bash
# Build & run on connected Android device
npx expo run:android

# Build & run on iOS simulator (macOS only)
npx expo run:ios
```

> **First launch**: The app will download the ~500 MB LFM2.5-VL model to device storage. Use a stable Wi-Fi connection. The screen stays awake during download. Subsequent launches load the model from cache instantly.

## Build APK

### Local Debug APK

```bash
npx expo run:android
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### EAS Cloud Build (no local SDK needed)

```bash
npx eas build --platform android --profile preview
```

## Android Build Notes

- `newArchEnabled=true` is required in `android/gradle.properties` (react-native-executorch requires New Architecture)
- If you see `libjsi.so` duplicate conflict errors, the `packagingOptions.pickFirsts` in `android/app/build.gradle` handles this — do not remove it
- If the build fails after a full clean with an ONNX AAR error, run `npx expo run:android` a second time (AAR extraction ordering quirk)

## License

Private project.
