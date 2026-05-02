import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { decode as decodeJpeg } from 'jpeg-js';
import { ML_CONFIG } from '../constants/config';
import {
  CropPrediction,
  DiseasePrediction,
  AnalysisResult,
  ModelInfo,
} from './types';
import { CROP_LABELS, DISEASE_LABELS, NUM_DISEASE_CLASSES } from './labels';

const MODEL_MODULE = require('../../assets/models/plant_disease.onnx');

const INPUT_NAME = 'pixel_values';
const OUTPUT_NAME = 'logits';
const SIZE = ML_CONFIG.INPUT_SIZE;
const SHORTEST = ML_CONFIG.RESIZE_SHORTEST_EDGE;

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]);
  let sum = 0;
  const out = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < logits.length; i++) out[i] /= sum;
  return out;
}

function topK(probs: Float32Array, k: number): { index: number; prob: number }[] {
  const idx: { i: number; p: number }[] = [];
  for (let i = 0; i < probs.length; i++) idx.push({ i, p: probs[i] });
  idx.sort((a, b) => b.p - a.p);
  return idx.slice(0, k).map(({ i, p }) => ({ index: i, prob: p }));
}

class ModelManager {
  private static instance: ModelManager;
  private session: InferenceSession | null = null;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;

  private modelInfo: ModelInfo = {
    name: 'MobileNetV2 PlantVillage',
    version: '1.0',
    inputSize: SIZE,
    numClasses: NUM_DISEASE_CLASSES,
    loaded: false,
  };

  private constructor() {}

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isLoading) return;

    this.isLoading = true;
    try {
      const asset = Asset.fromModule(MODEL_MODULE);
      await asset.downloadAsync();
      const uri = asset.localUri;
      if (!uri) {
        throw new Error('Could not resolve ONNX model asset path');
      }
      this.session = await InferenceSession.create(uri);
      this.modelInfo.loaded = true;
      this.isInitialized = true;
    } finally {
      this.isLoading = false;
    }
  }

  get isReady(): boolean {
    return this.isInitialized;
  }

  getModelInfo(): { crop: ModelInfo; disease: ModelInfo } {
    return {
      crop: {
        ...this.modelInfo,
        name: `${this.modelInfo.name} (crop from disease)`,
      },
      disease: {
        ...this.modelInfo,
        name: `${this.modelInfo.name} (38-class head)`,
      },
    };
  }

  /**
   * Match HuggingFace MobileNetV2FeatureExtractor: shortest_edge resize, center crop 224,
   * then normalize (pixel/255 - 0.5) / 0.5 == (pixel - 127.5) / 127.5.
   */
  private async imageToTensor(imageUri: string): Promise<Float32Array> {
    const { width: W, height: H } = await getImageDimensions(imageUri);

    const resizeActions: ImageManipulator.Action[] =
      W <= H
        ? [{ resize: { width: SHORTEST } }]
        : [{ resize: { height: SHORTEST } }];

    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      resizeActions,
      { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
    );

    const rw = resized.width;
    const rh = resized.height;
    if (rw < SIZE || rh < SIZE) {
      const cover = await ImageManipulator.manipulateAsync(resized.uri, [{ resize: { width: SIZE, height: SIZE } }], {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 1,
        base64: true,
      });
      return this.rgbImageToNchw(cover, SIZE, SIZE);
    }

    const originX = Math.floor((rw - SIZE) / 2);
    const originY = Math.floor((rh - SIZE) / 2);

    const cropped = await ImageManipulator.manipulateAsync(
      resized.uri,
      [{ crop: { originX, originY, width: SIZE, height: SIZE } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 1, base64: true }
    );

    if (!cropped.base64) {
      throw new Error('Image preprocessing failed (no base64 after crop)');
    }

    return this.rgbImageToNchw(cropped, SIZE, SIZE);
  }

  /**
   * Decode JPEG RGBA from expo-image-manipulator and build float32 NCHW tensor.
   */
  private rgbImageToNchw(
    result: ImageManipulator.ImageResult,
    width: number,
    height: number
  ): Float32Array {
    if (!result.base64) {
      throw new Error('Image preprocessing failed (no base64)');
    }

    const raw = decodeJpeg(base64ToUint8Array(result.base64), { useTArray: true });
    if (raw.width !== width || raw.height !== height) {
      throw new Error(`Expected ${width}x${height} decode, got ${raw.width}x${raw.height}`);
    }

    const { data } = raw;
    const plane = width * height;
    const tensor = new Float32Array(3 * plane);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const j = (y * width + x) << 2;
        const r = data[j];
        const g = data[j + 1];
        const b = data[j + 2];
        tensor[y * width + x] = (r - 127.5) / 127.5;
        tensor[plane + y * width + x] = (g - 127.5) / 127.5;
        tensor[2 * plane + y * width + x] = (b - 127.5) / 127.5;
      }
    }
    return tensor;
  }

  private diseaseToCropPrediction(classId: number, confidence: number): CropPrediction {
    const diseaseMeta = DISEASE_LABELS[classId];
    const cropIdx = diseaseMeta.cropIndex;
    const crop = CROP_LABELS[cropIdx];
    return {
      classId: cropIdx,
      className: crop.name,
      confidence,
      scientificName: crop.scientificName,
      category: crop.category,
    };
  }

  private buildDiseasePrediction(classId: number, confidence: number): DiseasePrediction {
    const d = DISEASE_LABELS[classId];
    const crop = CROP_LABELS[d.cropIndex];
    return {
      classId,
      className: d.name,
      confidence,
      isHealthy: d.isHealthy,
      severity: d.severity,
      cropId: crop.name,
    };
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    if (!this.session) {
      await this.initialize();
    }
    if (!this.session) {
      throw new Error('ONNX session not available');
    }

    const start = Date.now();
    const inputData = await this.imageToTensor(imageUri);
    const inputTensor = new Tensor('float32', inputData, [1, 3, SIZE, SIZE]);
    const feeds: Record<string, Tensor> = { [INPUT_NAME]: inputTensor };
    const results = await this.session.run(feeds);
    const outTensor = results[OUTPUT_NAME];
    if (!outTensor?.data) {
      throw new Error('Model output missing');
    }

    const logits = outTensor.data as Float32Array;
    if (logits.length !== NUM_DISEASE_CLASSES) {
      throw new Error(`Unexpected logits length ${logits.length}, expected ${NUM_DISEASE_CLASSES}`);
    }
    const probs = softmax(logits);
    const top = topK(probs, ML_CONFIG.TOP_K_RESULTS);

    const diseasePrediction = this.buildDiseasePrediction(top[0].index, top[0].prob);
    const cropPrediction = this.diseaseToCropPrediction(top[0].index, top[0].prob);

    const topDiseasePredictions = top.map((t) => this.buildDiseasePrediction(t.index, t.prob));

    const cropById = new Map<number, CropPrediction>();
    for (const t of top) {
      const cp = this.diseaseToCropPrediction(t.index, t.prob);
      const prev = cropById.get(cp.classId);
      if (!prev || cp.confidence > prev.confidence) {
        cropById.set(cp.classId, cp);
      }
    }
    const topCropPredictions = Array.from(cropById.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    const inferenceTimeMs = Date.now() - start;

    return {
      cropPrediction,
      diseasePrediction,
      topCropPredictions,
      topDiseasePredictions,
      inferenceTimeMs,
      timestamp: new Date(),
      imageUri,
    };
  }
}

export const modelManager = ModelManager.getInstance();
