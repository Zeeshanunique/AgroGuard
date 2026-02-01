import * as ImageManipulator from 'expo-image-manipulator';
import { ML_CONFIG } from '../constants/config';

export class ImageProcessor {
  private inputSize: number;
  private mean: number[];
  private std: number[];

  constructor() {
    this.inputSize = ML_CONFIG.INPUT_SIZE;
    this.mean = ML_CONFIG.MEAN;
    this.std = ML_CONFIG.STD;
  }

  async preprocessImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
    // Resize image to model input size (224x224)
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: this.inputSize, height: this.inputSize } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    return {
      uri: resized.uri,
      width: this.inputSize,
      height: this.inputSize,
    };
  }

  async getImageAsBase64(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: this.inputSize, height: this.inputSize } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9, base64: true }
    );

    return result.base64 || '';
  }

  // Convert pixel values to normalized Float32Array for model input
  // This is a placeholder - actual implementation depends on how react-native-fast-tflite handles inputs
  normalizePixelData(pixelData: Uint8Array): Float32Array {
    const numPixels = this.inputSize * this.inputSize;
    const float32Data = new Float32Array(numPixels * 3);

    for (let i = 0; i < numPixels; i++) {
      // Assuming RGBA format from image data
      const r = pixelData[i * 4] / 255.0;
      const g = pixelData[i * 4 + 1] / 255.0;
      const b = pixelData[i * 4 + 2] / 255.0;

      // Apply ImageNet normalization
      // Channel-first format (CHW)
      float32Data[i] = (r - this.mean[0]) / this.std[0];
      float32Data[numPixels + i] = (g - this.mean[1]) / this.std[1];
      float32Data[numPixels * 2 + i] = (b - this.mean[2]) / this.std[2];
    }

    return float32Data;
  }

  // Alternative: Channel-last format (HWC) which some models prefer
  normalizePixelDataHWC(pixelData: Uint8Array): Float32Array {
    const numPixels = this.inputSize * this.inputSize;
    const float32Data = new Float32Array(numPixels * 3);

    for (let i = 0; i < numPixels; i++) {
      const r = pixelData[i * 4] / 255.0;
      const g = pixelData[i * 4 + 1] / 255.0;
      const b = pixelData[i * 4 + 2] / 255.0;

      // HWC format
      float32Data[i * 3] = (r - this.mean[0]) / this.std[0];
      float32Data[i * 3 + 1] = (g - this.mean[1]) / this.std[1];
      float32Data[i * 3 + 2] = (b - this.mean[2]) / this.std[2];
    }

    return float32Data;
  }
}

export const imageProcessor = new ImageProcessor();
