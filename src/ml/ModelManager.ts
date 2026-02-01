import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import * as jpeg from 'jpeg-js';
import { ML_CONFIG } from '../constants/config';

// Lazy import ONNX Runtime to avoid loading issues in Expo Go
let InferenceSession: any;
let Tensor: any;

const loadONNXRuntime = async () => {
  if (!InferenceSession) {
    try {
      const onnxRuntime = require('onnxruntime-react-native');
      InferenceSession = onnxRuntime.InferenceSession;
      Tensor = onnxRuntime.Tensor;
    } catch (error) {
      console.error('Failed to load onnxruntime-react-native:', error);
      throw new Error('ONNX Runtime is not available. Please use a development build (expo-dev-client) or build the app.');
    }
  }
  return { InferenceSession, Tensor };
};
import {
  CropPrediction,
  DiseasePrediction,
  AnalysisResult,
  ModelInfo
} from './types';
import {
  CROP_LABELS,
  DISEASE_LABELS,
  getCropLabel,
  getDiseaseLabel,
  NUM_CROP_CLASSES,
  NUM_DISEASE_CLASSES,
} from './labels';

class ModelManager {
  private static instance: ModelManager;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  
  // ONNX Runtime session for disease detection
  private diseaseSession: InferenceSession | null = null;

  private cropModelInfo: ModelInfo = {
    name: 'crop_classifier',
    version: '1.0.0',
    inputSize: ML_CONFIG.INPUT_SIZE,
    numClasses: NUM_CROP_CLASSES,
    loaded: false,
  };

  private diseaseModelInfo: ModelInfo = {
    name: 'plant_disease_mobilenetv2',
    version: '1.0.0',
    inputSize: ML_CONFIG.INPUT_SIZE,
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
    console.log('🔄 Initializing ONNX Runtime and ML models...');

    try {
      await this.loadONNXModel();

      this.isInitialized = true;
      console.log('✅ ML models initialized successfully');
      console.log(`   Disease Model: ${this.diseaseModelInfo.loaded ? 'Loaded' : 'Not loaded'}`);
    } catch (error) {
      console.error('❌ Failed to initialize ML models:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadONNXModel(): Promise<void> {
    console.log('🔄 Loading MobileNetV2 plant disease model...');
    
    try {
      // Load ONNX Runtime module
      const { InferenceSession: ONNXInferenceSession } = await loadONNXRuntime();
      
      // Load the ONNX model from assets
      const modelAsset = Asset.fromModule(require('../../assets/models/plant_disease.onnx'));
      await modelAsset.downloadAsync();
      
      if (!modelAsset.localUri) {
        throw new Error('Failed to download model asset');
      }

      console.log(`📦 Model path: ${modelAsset.localUri}`);
      
      // Create ONNX Runtime inference session
      this.diseaseSession = await ONNXInferenceSession.create(modelAsset.localUri, {
        executionProviders: ['cpu'], // Use CPU execution provider
      });
      
      this.diseaseModelInfo.loaded = true;
      this.cropModelInfo.loaded = true; // Crop info extracted from disease predictions
      
      console.log('✅ ONNX model loaded successfully');
      console.log(`   Input: ${this.diseaseSession.inputNames[0]}`);
      console.log(`   Output: ${this.diseaseSession.outputNames[0]}`);
    } catch (error) {
      console.error('❌ Failed to load ONNX model:', error);
      if (error instanceof Error && error.message.includes('ONNX Runtime is not available')) {
        throw error;
      }
      throw new Error(`Failed to load ONNX model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  get isReady(): boolean {
    return this.isInitialized;
  }

  getModelInfo(): { crop: ModelInfo; disease: ModelInfo } {
    return {
      crop: this.cropModelInfo,
      disease: this.diseaseModelInfo,
    };
  }

  async classifyCrop(imageUri: string): Promise<CropPrediction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract crop from disease prediction (model combines crop+disease)
    const diseasePredictions = await this.detectDisease(imageUri);
    
    // Get unique crops from disease predictions
    const cropMap = new Map<number, number>();
    
    diseasePredictions.forEach(disease => {
      const diseaseLabel = getDiseaseLabel(disease.classId);
      if (diseaseLabel) {
        const cropId = diseaseLabel.cropIndex;
        const currentConf = cropMap.get(cropId) || 0;
        cropMap.set(cropId, Math.max(currentConf, disease.confidence));
      }
    });

    // Convert to CropPrediction array
    const cropPredictions: CropPrediction[] = Array.from(cropMap.entries())
      .map(([cropId, confidence]) => {
        const cropLabel = getCropLabel(cropId);
        return {
          classId: cropId,
          className: cropLabel?.name || `Crop ${cropId}`,
          confidence,
          scientificName: cropLabel?.scientificName,
          category: cropLabel?.category,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, ML_CONFIG.TOP_K_RESULTS);

    console.log(`✅ Top crops: ${cropPredictions.map(r => `${r.className}: ${(r.confidence * 100).toFixed(1)}%`).join(', ')}`);
    
    return cropPredictions;
  }

  async detectDisease(imageUri: string, cropClassId?: number): Promise<DiseasePrediction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.diseaseSession) {
      throw new Error('Disease model not loaded');
    }

    try {
      console.log('🔬 Analyzing for plant diseases...');
      
      // Load ONNX Runtime if not already loaded
      const { Tensor: ONNXTensor } = await loadONNXRuntime();
      
      // Preprocess image for ONNX model
      const preprocessedImage = await this.preprocessImageForONNX(imageUri);
      
      // Create input tensor: [1, 3, 224, 224] in NCHW format
      const inputTensor = new ONNXTensor('float32', preprocessedImage, [1, 3, 224, 224]);
      
      // Run inference
      const feeds = { pixel_values: inputTensor };
      const results = await this.diseaseSession.run(feeds);
      
      // Get logits output
      const logits = results.logits.data as Float32Array;
      
      // Apply softmax to get probabilities
      const probabilities = this.softmax(Array.from(logits));
      
      // Map to disease predictions
      const results_list: DiseasePrediction[] = [];
      
      for (let i = 0; i < Math.min(NUM_DISEASE_CLASSES, probabilities.length); i++) {
        const confidence = probabilities[i];
        
        // Filter by crop if specified
        if (cropClassId !== undefined) {
          const diseaseLabel = getDiseaseLabel(i);
          if (diseaseLabel && diseaseLabel.cropIndex !== cropClassId) {
            continue;
          }
        }
        
        if (confidence > 0.01) { // 1% threshold
          const diseaseLabel = getDiseaseLabel(i);
          if (diseaseLabel) {
            results_list.push({
              classId: i,
              className: diseaseLabel.name,
              confidence,
              isHealthy: diseaseLabel.isHealthy,
              severity: diseaseLabel.severity,
              cropId: CROP_LABELS[diseaseLabel.cropIndex]?.name,
            });
          }
        }
      }

      const sorted = results_list
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, ML_CONFIG.TOP_K_RESULTS);
        
      console.log(`✅ Top diseases: ${sorted.map(r => `${r.className}: ${(r.confidence * 100).toFixed(1)}%`).join(', ')}`);
      
      return sorted;
    } catch (error) {
      console.error('❌ Error detecting disease:', error);
      throw error;
    }
  }

  /**
   * Preprocess image for ONNX model input
   * Converts image to [1, 3, 224, 224] Float32Array in NCHW format
   * Normalization: (pixel - 127.5) / 127.5
   */
  private async preprocessImageForONNX(uri: string): Promise<Float32Array> {
    try {
      // Step 1: Resize image to 224x224 and get as JPEG base64
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: ML_CONFIG.INPUT_SIZE, height: ML_CONFIG.INPUT_SIZE } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 1.0, base64: true }
      );
      
      if (!processed.base64) {
        throw new Error('Failed to get base64 from image');
      }

      // Step 2: Decode base64 JPEG to pixel data using jpeg-js
      const base64Data = processed.base64.replace(/^data:image\/\w+;base64,/, '');
      
      // Convert base64 string to Uint8Array for jpeg-js (React Native compatible)
      // Use global atob if available (polyfilled in Expo), otherwise manual decode
      let binaryString: string;
      if (typeof atob !== 'undefined') {
        binaryString = atob(base64Data);
      } else {
        // Manual base64 decoding for React Native
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        binaryString = '';
        for (let i = 0; i < base64Data.length; i += 4) {
          const enc1 = base64Chars.indexOf(base64Data.charAt(i));
          const enc2 = base64Chars.indexOf(base64Data.charAt(i + 1));
          const enc3 = base64Chars.indexOf(base64Data.charAt(i + 2));
          const enc4 = base64Chars.indexOf(base64Data.charAt(i + 3));
          const chr1 = (enc1 << 2) | (enc2 >> 4);
          const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          const chr3 = ((enc3 & 3) << 6) | enc4;
          binaryString += String.fromCharCode(chr1);
          if (enc3 !== 64) binaryString += String.fromCharCode(chr2);
          if (enc4 !== 64) binaryString += String.fromCharCode(chr3);
        }
      }
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const decoded = jpeg.decode(bytes, { useTArray: true });
      
      const width = decoded.width;
      const height = decoded.height;
      const data = decoded.data; // RGBA format
      
      if (width !== ML_CONFIG.INPUT_SIZE || height !== ML_CONFIG.INPUT_SIZE) {
        throw new Error(`Image size mismatch: expected ${ML_CONFIG.INPUT_SIZE}x${ML_CONFIG.INPUT_SIZE}, got ${width}x${height}`);
      }

      // Step 3: Convert to NCHW format: [1, 3, 224, 224]
      // Normalize: (pixel - 127.5) / 127.5
      const inputSize = ML_CONFIG.INPUT_SIZE;
      const inputArray = new Float32Array(1 * 3 * inputSize * inputSize);
      
      for (let h = 0; h < inputSize; h++) {
        for (let w = 0; w < inputSize; w++) {
          const idx = h * inputSize + w;
          const r = data[idx * 4];     // Red channel
          const g = data[idx * 4 + 1]; // Green channel
          const b = data[idx * 4 + 2]; // Blue channel
          
          // Normalize: (pixel - 127.5) / 127.5
          // Channel-first (NCHW): [batch, channel, height, width]
          // Index calculation: batch*C*H*W + channel*H*W + height*W + width
          const c0Idx = 0 * (3 * inputSize * inputSize) + 0 * (inputSize * inputSize) + h * inputSize + w;
          const c1Idx = 0 * (3 * inputSize * inputSize) + 1 * (inputSize * inputSize) + h * inputSize + w;
          const c2Idx = 0 * (3 * inputSize * inputSize) + 2 * (inputSize * inputSize) + h * inputSize + w;
          
          inputArray[c0Idx] = (r - 127.5) / 127.5;
          inputArray[c1Idx] = (g - 127.5) / 127.5;
          inputArray[c2Idx] = (b - 127.5) / 127.5;
        }
      }
      
      return inputArray;
    } catch (error) {
      console.error('❌ Error preprocessing image:', error);
      throw error;
    }
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Run disease detection (which includes crop info)
    const diseasePredictions = await this.detectDisease(imageUri);
    const topDisease = diseasePredictions[0] || null;

    // Extract crop from disease prediction
    const cropPredictions = await this.classifyCrop(imageUri);
    const topCrop = cropPredictions[0] || null;

    const inferenceTime = Date.now() - startTime;
    
    console.log(`⏱️  Inference completed in ${inferenceTime}ms`);
    console.log(`   Top crop: ${topCrop?.className} (${((topCrop?.confidence || 0) * 100).toFixed(1)}%)`);
    console.log(`   Top disease: ${topDisease?.className} (${((topDisease?.confidence || 0) * 100).toFixed(1)}%)`);

    return {
      cropPrediction: topCrop!,
      diseasePrediction: topDisease!,
      topCropPredictions: cropPredictions,
      topDiseasePredictions: diseasePredictions,
      inferenceTimeMs: inferenceTime,
      timestamp: new Date(),
      imageUri,
    };
  }

  // Apply softmax to model output logits
  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const expScores = logits.map(l => Math.exp(l - maxLogit));
    const sumExpScores = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(s => s / sumExpScores);
  }

  // Calculate severity based on confidence
  private calculateSeverity(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }
}

export const modelManager = ModelManager.getInstance();
