# AgroGuard

Plant disease detection mobile app powered by Google Gemini Flash AI. Identify crop diseases from leaf photos with high accuracy.

## Features

- **Gemini Flash AI** -- Uses Google Gemini 2.5 Flash for accurate plant disease analysis
- **Broad Coverage** -- Identifies diseases across 14+ crop species including Apple, Tomato, Corn, Grape, Potato, and more
- **Camera & Gallery** -- Capture a leaf photo or pick from gallery for instant analysis
- **Disease Details** -- View confidence scores, severity, and crop identification
- **Scan History** -- Track past scans with local storage
- **Treatment Info** -- Organic and chemical treatment recommendations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 (file-based) |
| AI Model | Google Gemini 2.5 Flash (@google/genai) |
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
│   │   ├── camera.tsx          # Camera capture
│   │   └── results.tsx         # Analysis results
│   └── details/
│       ├── crop/[id].tsx       # Crop detail page
│       └── disease/[id].tsx    # Disease detail page
├── src/
│   ├── ml/                     # AI integration
│   │   ├── ModelManager.ts     # Gemini Flash API client
│   │   ├── labels.ts           # Crop & disease label mappings
│   │   └── types.ts            # Type definitions
│   ├── components/ui/          # Reusable UI components
│   ├── constants/              # App & Gemini config
│   ├── context/                # React providers
│   └── database/               # Local data & seed data
├── .env                        # API key (EXPO_PUBLIC_API_KEY)
└── prd.md                      # Product requirements
```

## AI Pipeline

```
Camera/Gallery Image
       │
       ▼
Resize to 768x768 (JPEG)
       │
       ▼
Base64 encode
       │
       ▼
Gemini 2.5 Flash API (multimodal)
       │
       ▼
Structured JSON response
       │
       ▼
Disease + Crop Identification
```

**Model**: [Gemini 2.5 Flash](https://ai.google.dev/) via the `@google/genai` SDK. Requires an API key from [Google AI Studio](https://aistudio.google.com/).

## Supported Crops

Apple, Blueberry, Cherry, Corn, Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato

## Setup

### Prerequisites

- **Node.js** >= 18
- **Internet connection** (required for Gemini API)
- **Android SDK** with accepted licenses (for local Android builds)
- **Xcode** (for iOS builds, macOS only)

### 1. Clone & Install

```bash
git clone <repo-url>
cd AgroGuard
npm install
```

### 2. Configure Gemini API Key

Get a free API key from [Google AI Studio](https://aistudio.google.com/) and create a `.env` file in the project root:

```
EXPO_PUBLIC_API_KEY=your-gemini-api-key-here
```

### 3. Generate Native Projects

The `android/` and `ios/` folders are gitignored (generated code). Regenerate them with:

```bash
npx expo prebuild
```

### 4. Accept Android SDK Licenses

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

### 5. Run

```bash
# Start Metro bundler
npm start

# Build & run on connected Android device
npm run android

# Build & run on iOS simulator (macOS only)
npm run ios
```

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

## License

Private project.
