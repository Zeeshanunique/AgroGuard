export const GEMINI_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || 'YOUR_GEMINI_API_KEY',
  MODEL: 'gemini-2.5-flash',
};

export const ML_CONFIG = {
  INPUT_SIZE: 768,
  CONFIDENCE_THRESHOLD: 0.7,
  TOP_K_RESULTS: 3,
};

export const APP_CONFIG = {
  MAX_HISTORY_ITEMS: 100,
  IMAGE_QUALITY: 0.8,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png'],
};
