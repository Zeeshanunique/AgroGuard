import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ML_CONFIG } from '../constants/config';
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
import { imageProcessor } from './ImageProcessor';

class ModelManager {
  private static instance: ModelManager;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  
  // ONNX Runtime session
  private diseaseSession: InferenceSession | null = null;

  private diseaseModelInfo: ModelInfo = {
    name: 'plant_disease_mobilenetv2',
    version: '1.0.0',
    inputSize: 224,
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
    console.log('🔄 Initializing TensorFlow.js and ML models...');

    try {
      // Initialize TensorFlow.js
      if (!this.tfReady) {
        await tf.ready();
        this.tfReady = true;
        console.log('✅ TensorFlow.js is ready');
        console.log(`📊 Backend: ${tf.getBackend()}`);
      }
ONNX Runtime and loading model...');

    try {
      await this.loadONNXModel();

      this.isInitialized = true;
      console.log('✅ Plant disease model initialized successfully');
      console.log(`   Disease Model: ${this.diseaseModelInfo.loaded ? 'Loaded' : 'Not loaded'}`);
    } catch (error) {
      console.error('❌ Failed to initialize ML model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadONNXModel(): Promise<void> {
    console.log('🔄 Loading MobileNetV2 plant disease model...');
    
    try {
      // Load the ONNX model from assets
      const modelAsset = Asset.fromModule(require('../../assets/models/plant_disease.onnx'));
      await modelAsset.downloadAsync();
      
      if (!modelAsset.localUri) {
        throw new Error('Failed to download model asset');
      }

      console.log(`📦 Model path: ${modelAsset.localUri}`);
      
      // Create ONNX Runtime inference session
      this.diseaseSession = await InferenceSession.create(modelAsset.localUri);
      
      this.diseaseModelInfo.loaded = true;
      console.log('✅ ONNX model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load ONNX model:', error);
      throw error;
    }is.diseaseModelInfo,
    };
  }

  async classifyCrop(imageUri: string): Promise<CropPrediction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.cropModel) {
      throw new Error('Crop model not loaded');
    }

    try {
      console.log('🌱 Analyzing plant image...');
      const imageTensor = await this.loadImageTensor(imageUri);
      const predictions = this.cropModel.predict(imageTensor) as tf.Tensor;
      const probabilities = await predictions.data();
      
      imageTensor.dispose();
      predictions.dispose();

      // Get predictions and normalize to make sense
      const results: CropPrediction[] = [];
      let total = 0;
      for (let i = 0; i < Math.min(NUM_CROP_CLASSES, probabilities.length); i++) {
        total += probabilities[i];
      }
      
      // Normalize and select top predictions
      for (let i = 0; i < Math.min(NUM_CROP_CLASSES, probabilities.length); i++) {
        const normalized = probabilities[i] / (total || 1);
        if (normalized > 0.01) {  // 1% threshold
          results.push({
            classId: i,
            className: getCropLabel(i),
            confidence: normalized,
          });
        }
      }

      const sorted = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
        
      console.log(`✅ Top predictions: ${sorted.map(r => `${r.className}: ${(r.confidence * 100).toFixed(1)}%`).join(', ')}`);
      
      return sorted;
    } catch (error) {
      console.error('❌ Error classifying crop:', error);
      throw error;
    }
  }

  async detectDisease(imageUri: string, cropClassId?: number): Promise<DiseasePrediction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.diseaseModel) {
      throw new Error('Disease model not loaded');
    }

    try {
      console.log('🔬 Analyzing for plant diseases...');
      const imageTensor = await this.loadImageTensor(imageUri);
      const predictions = this.diseaseModel.predict(imageTensor) as tf.Tensor;
      const probabilities = await predictions.data();
      
      imageTensor.dispose();
      predictions.dispose();

      // Get predictions and normalize
      const results: DiseasePrediction[] = [];
      let total = 0;
      for (let i = 0; i < Math.min(NUM_DISEASE_CLASSES, probabilities.length); i++) {
        total += probabilities[i];
      }
      
      // Normalize and select top predictions
      for (let i = 0; i < Math.min(NUM_DISEASE_CLASSES, probabilities.length); i++) {
        const normalized = probabilities[i] / (total || 1);
        if (normalized > 0.01) {  // 1% threshold
          results.push({
            classId: i,
            className: getDiseaseLabel(i),
            confidence: normalized,
            severity: this.calculateSeverity(normalized),
          });
        }
      }

      const sorted = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
        
      console.log(`✅ Top diseases: ${sorted.map(r => `${r.className}: ${(r.confidence * 100).toFixed(1)}%`).join(', ')}`);
      
      return sorted;
    } catch (error) {
      console.error('❌ Error detecting disease:', error);
      throw error;
    }
  }

  private async loadImageTensor(uri: string): Promise<tf.Tensor4D> {
    try {
      // Use expo-image-manipulator to get base64 (already working in the app)
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: ML_CONFIG.INPUT_SIZE, height: ML_CONFIG.INPUT_SIZE } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9, base64: true }
      );
      
      if (!processed.base64) {
        throw new Error('Failed to get base64 from image');
      }
      
      // Convert base64 to Uint8Array
      const imageData = tf.util.encodeString(processed.base64, 'base64');
      const raw = new Uint8Array(imageData.buffer);
      
      // Decode JPEG to tensor
      let imageTensor = decodeJpeg(raw);
      
      // Ensure correct size (should already be from manipulateAsync, but double-check)
      const shape = imageTensor.shape;
      if (shape[0] !== ML_CONFIG.INPUT_SIZE || shape[1] !== ML_CONFIG.INPUT_SIZE) {
        imageTensor = tf.image.resizeBilinear(imageTensor, [
          ML_CONFIG.INPUT_SIZE,
          ML_CONFIG.INPUT_SIZE,
        ]);
      }
      
      // Normalize to [-1, 1] (MobileNet preprocessing)
      imageTensor = tf.div(
        tf.sub(tf.cast(imageTensor, 'float32'), 127.5),
        127.5
      );
      
      // Add batch dimension
      const batchedImage = tf.expandDims(imageTensor, 0) as tf.Tensor4D;
      
      return batchedImage;
    } catch (error) {
      console.error('❌ Error loading image tensor:', error);
      throw error;
    }
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Run crop classification
    const cropPredictions = await this.classifyCrop(imageUri);
    const topCrop = cropPredictions[0] || null;

    // Run disease detection (can use crop info to filter results)
    const diseasePredictions = await this.detectDisease(imageUri, topCrop?.classId);
    const topDisease = diseasePredictions[0] || null;

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

  // Generate realistic mock crop predictions for offline demo
  // Returns consistent predictions to demonstrate the app functionality
  private generateMockCropPredictions(): CropPrediction[] {
    // Most common crops in agriculture for demo purposes
    // In production, replace with trained model from:
    // https://www.kaggle.com/code/vad13irt/plant-disease-classification
    const demoScenarios = [
      { classId: 13, confidence: 0.87 }, // Tomato
      { classId: 8, confidence: 0.11 },  // Potato
      { classId: 0, confidence: 0.02 },  // Apple
    ];

    const predictions: CropPrediction[] = demoScenarios.map(({ classId, confidence }) => {
      const label = getCropLabel(classId);
      return {
        classId,
        className: label!.name,
        confidence,
        scientificName: label!.scientificName,
        category: label!.category,
      };
    });

    console.log('🌱 DEMO predictions:', predictions.map(p => `${p.className}: ${(p.confidence * 100).toFixed(1)}%`));
    return predictions;
  }

  // Generate realistic mock disease predictions for offline demo
  private generateMockDiseasePredictions(cropClassId?: number): DiseasePrediction[] {
    // Use Tomato as default demo crop (most common)
    const targetCropId = cropClassId !== undefined ? cropClassId : 13;

    // Find diseases for the target crop
    const cropDiseases = Object.entries(DISEASE_LABELS).filter(
      ([_, disease]) => disease.cropIndex === targetCropId
    );

    if (cropDiseases.length === 0) {
      // Fallback to tomato if no diseases found
      return this.generateMockDiseasePredictions(13);
    }

    // Demo scenario: Show a common disease with high confidence
    // Find the first non-healthy disease or use healthy if none found
    let primaryDisease = cropDiseases.find(([_, disease]) => !disease.isHealthy);
    if (!primaryDisease) {
      primaryDisease = cropDiseases[0];
    }

    const [primaryId, primaryDiseaseData] = primaryDisease;
    const predictions: DiseasePrediction[] = [
      {
        classId: parseInt(primaryId, 10),
        className: primaryDiseaseData.name,
        confidence: 0.82,
        isHealthy: primaryDiseaseData.isHealthy,
        severity: primaryDiseaseData.severity,
        cropId: CROP_LABELS[targetCropId]?.name,
      },
    ];

    // Add 1-2 more with lower confidence
    const remaining = cropDiseases.filter(([id]) => id !== primaryId).slice(0, 2);
    let conf = 0.13;
    remaining.forEach(([id, disease]) => {
      predictions.push({
        classId: parseInt(id, 10),
        className: disease.name,
        confidence: conf,
        isHealthy: disease.isHealthy,
        severity: disease.severity,
        cropId: CROP_LABELS[targetCropId]?.name,
      });
      conf -= 0.04;
    });

    console.log('🦠 DEMO predictions:', predictions.map(p => `${p.className}: ${(p.confidence * 100).toFixed(1)}%`));
    return predictions;
  }

  // Apply softmax to model output
  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const expScores = logits.map(l => Math.exp(l - maxLogit));
    const sumExpScores = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(s => s / sumExpScores);
  }

  // Get top-k predictions from probabilities
  private getTopK(probabilities: number[], k: number): { index: number; probability: number }[] {
    // For untrained models, use a lower threshold (0.01) to ensure we get predictions
    const threshold = this.cropModelInfo.loaded ? 0.01 : ML_CONFIG.CONFIDENCE_THRESHOLD;
    
    const sorted = probabilities
      .map((prob, index) => ({ index, probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, k);
    
    // Always return at least the top prediction, even if below threshold
    const filtered = sorted.filter(p => p.probability >= threshold);
    return filtered.length > 0 ? filtered : sorted.slice(0, 1);
  }
}

export const modelManager = ModelManager.getInstance();
