export const ML_CONFIG = {
  /** Model input height/width after center crop (PlantVillage MobileNetV2). */
  INPUT_SIZE: 224,
  /** HuggingFace preprocessor: resize so shortest edge = this, then center-crop to INPUT_SIZE. */
  RESIZE_SHORTEST_EDGE: 256,
  CONFIDENCE_THRESHOLD: 0.7,
  TOP_K_RESULTS: 3,
};

export const APP_CONFIG = {
  MAX_HISTORY_ITEMS: 100,
  IMAGE_QUALITY: 0.8,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png'],
};
