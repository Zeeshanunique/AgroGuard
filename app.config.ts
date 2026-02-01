import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AgroGuard',
  slug: 'agroguard',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'agroguard',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#2E7D32',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.agroguard.app',
    infoPlist: {
      NSCameraUsageDescription: 'AgroGuard needs camera access to scan plant leaves for disease detection.',
      NSPhotoLibraryUsageDescription: 'AgroGuard needs photo library access to analyze plant leaf images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2E7D32',
    },
    package: 'com.agroguard.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'AgroGuard needs camera access to scan plant leaves for disease detection.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'AgroGuard needs photo library access to analyze plant leaf images.',
      },
    ],
    'onnxruntime-react-native',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '594bafa6-0f84-4c6c-bc52-032441d161cb',
    },
  },
});
