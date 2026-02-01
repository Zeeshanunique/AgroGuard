# Live Debugging Guide for Development Build

## Quick Start

### 1. Start the Development Server

In your terminal, run:
```bash
npx expo start --dev-client
```

Or simply:
```bash
npm start
```

This starts the Metro bundler with development client support.

### 2. Connect to Your App

- **If app is already running**: Shake your device/simulator or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- **If app is not running**: The dev server will show a QR code - scan it with your camera (iOS) or Expo Go won't work, but the dev server will show connection options

## Debugging Options

### Option 1: React Native Debugger (Recommended)

1. **Install React Native Debugger:**
   ```bash
   brew install --cask react-native-debugger
   ```
   Or download from: https://github.com/jhen0409/react-native-debugger/releases

2. **Open React Native Debugger:**
   ```bash
   open "rndebugger://set-debugger-loc?host=localhost&port=8081"
   ```

3. **Enable Debugging in App:**
   - Shake device/simulator
   - Select "Debug" or "Open Debugger"
   - Or press `Cmd+D` → "Debug"

### Option 2: Chrome DevTools

1. **Enable Debugging:**
   - Shake device/simulator
   - Select "Debug" or press `Cmd+D` → "Debug"
   - Chrome will open automatically at `http://localhost:8081/debugger-ui`

2. **Use Chrome DevTools:**
   - Open Chrome DevTools (`Cmd+Option+I`)
   - Set breakpoints in your code
   - View console logs
   - Inspect network requests

### Option 3: Flipper (Advanced)

1. **Install Flipper:**
   ```bash
   brew install --cask flipper
   ```

2. **Configure in your app:**
   - Flipper auto-detects React Native apps
   - View logs, network, layout inspector, etc.

### Option 4: Console Logs (Simplest)

Just use `console.log()` in your code:
```typescript
console.log('🔍 Debug info:', someVariable);
console.error('❌ Error:', error);
```

View logs in:
- **Terminal** (where you ran `expo start`)
- **Xcode Console** (if running on iOS Simulator)
- **Chrome DevTools Console** (if debugging enabled)

## Live Reloading

### Automatic Reload
- **Fast Refresh** is enabled by default
- Save any file → app reloads automatically
- State is preserved (mostly)

### Manual Reload
- Shake device → "Reload"
- Or press `Cmd+R` in simulator

## Debugging ONNX Runtime

### Check Model Loading
Add logs in `ModelManager.ts`:
```typescript
console.log('🔄 Loading ONNX model...');
console.log('📦 Model path:', modelAsset.localUri);
console.log('✅ Model loaded:', this.diseaseSession.inputNames);
```

### Check Inference
```typescript
console.log('🔬 Running inference...');
console.log('📊 Input shape:', preprocessedImage.length);
console.log('📊 Output logits:', logits);
console.log('📊 Probabilities:', probabilities);
```

### View Logs
- **Terminal**: Where `expo start` is running
- **Xcode**: Window → Devices and Simulators → Select device → Open Console
- **Chrome DevTools**: Console tab when debugging enabled

## Common Debugging Commands

```bash
# Start dev server
npx expo start --dev-client

# Clear cache and restart
npx expo start --dev-client --clear

# Run on specific device
npx expo run:ios --device "iPhone 15"

# View logs only
npx expo start --dev-client | grep "your-log-pattern"
```

## Debugging Tips

1. **Use descriptive console logs:**
   ```typescript
   console.log('🌱 Crop prediction:', cropPredictions);
   console.log('🦠 Disease prediction:', diseasePredictions);
   ```

2. **Add error boundaries:**
   ```typescript
   try {
     // your code
   } catch (error) {
     console.error('❌ Error details:', error);
     console.error('Stack:', error.stack);
   }
   ```

3. **Check network requests:**
   - Use Chrome DevTools Network tab
   - Or Flipper Network plugin

4. **Inspect state:**
   - Use React DevTools (install as Chrome extension)
   - Or use `console.log` for state values

## Troubleshooting

### App not connecting to dev server?
- Check both are on same network
- Try `npx expo start --dev-client --tunnel` (slower but works across networks)

### Debugger not opening?
- Make sure port 8081 is not blocked
- Try `lsof -ti:8081 | xargs kill` to kill process on port 8081

### Changes not reflecting?
- Clear cache: `npx expo start --dev-client --clear`
- Or reload manually: Shake device → Reload

## Quick Reference

| Action | iOS Simulator | iOS Device | Android |
|--------|---------------|------------|---------|
| Open Dev Menu | `Cmd+D` | Shake device | `Cmd+M` or Shake |
| Reload | `Cmd+R` | Shake → Reload | `R+R` or Shake → Reload |
| Debug | `Cmd+D` → Debug | Shake → Debug | `Cmd+M` → Debug |

## Next Steps

1. **Start dev server:** `npx expo start --dev-client`
2. **Open your app** (should already be running from `expo run:ios`)
3. **Enable debugging:** Shake device → Debug
4. **Start coding!** Changes will hot reload automatically

