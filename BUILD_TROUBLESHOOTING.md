# Android Build Troubleshooting

## Issue: Build Hanging

If the build hangs after keystore generation, try these solutions:

### Solution 1: Run Build Without Piping

The `| head -30` might be causing issues. Run the full command:

```bash
eas build --platform android --profile preview
```

Let it run completely without interrupting.

### Solution 2: Check Network/Upload

The build might be uploading files. Check:
- Internet connection is stable
- No firewall blocking uploads
- Wait 2-3 minutes for upload to complete

### Solution 3: Use Non-Interactive Mode

If it's waiting for input:

```bash
eas build --platform android --profile preview --non-interactive
```

### Solution 4: Check Build Status in Browser

Visit: https://expo.dev/accounts/zeeshanunique/projects/agroguard/builds

This shows all builds and their status.

### Solution 5: Restart Build

If stuck, cancel and restart:

```bash
# Check for running builds
eas build:list

# If needed, cancel (replace BUILD_ID)
eas build:cancel [BUILD_ID]

# Restart
eas build --platform android --profile preview
```

## Expected Build Flow

1. **Keystore generation** (if first time) - ~30 seconds
2. **Uploading project files** - 1-3 minutes
3. **Queuing build** - ~30 seconds
4. **Building in cloud** - 10-20 minutes
5. **Download ready** - Shows link/QR code

## Common Hang Points

- **After keystore**: Usually uploading files (wait 2-3 min)
- **After upload**: Usually queuing (wait 1-2 min)
- **During build**: Normal, wait 10-20 minutes

## Next Steps

Try running the build again without piping:

```bash
eas build --platform android --profile preview
```

Let it run completely. The build process can take 15-25 minutes total.

