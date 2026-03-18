import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG } from '../constants/config';
import {
  CropPrediction,
  DiseasePrediction,
  AnalysisResult,
  ModelInfo,
} from './types';
import { CROP_LABELS, DISEASE_LABELS } from './labels';

const SYSTEM_PROMPT = `You are an expert plant pathologist. Analyze the provided leaf/plant image and identify:
1. The crop species
2. Any diseases present (or confirm it's healthy)

Respond ONLY with valid JSON in this exact format:
{
  "crop": {
    "name": "string (common name, e.g. Tomato, Apple, Corn)",
    "scientificName": "string (e.g. Solanum lycopersicum)",
    "category": "string (Fruit, Vegetable, Grain, Legume, etc.)",
    "confidence": number (0.0 to 1.0)
  },
  "disease": {
    "name": "string (disease name, or 'Healthy' if no disease)",
    "isHealthy": boolean,
    "severity": "string (none, low, medium, high, critical)",
    "confidence": number (0.0 to 1.0)
  },
  "alternativeDiseases": [
    {
      "name": "string",
      "isHealthy": boolean,
      "severity": "string",
      "confidence": number
    }
  ]
}

Known crops: Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato, Wheat, Rice, Cotton, Sugarcane, Coffee, Tea, Banana, Mango, and others.

Known diseases include: Apple Scab, Apple Black Rot, Apple Cedar Rust, Cherry Powdery Mildew, Corn Cercospora Leaf Spot, Corn Common Rust, Corn Northern Leaf Blight, Grape Black Rot, Grape Esca, Grape Leaf Blight, Orange Citrus Greening, Peach Bacterial Spot, Bell Pepper Bacterial Spot, Potato Early Blight, Potato Late Blight, Squash Powdery Mildew, Strawberry Leaf Scorch, Tomato Bacterial Spot, Tomato Early Blight, Tomato Late Blight, Tomato Leaf Mold, Tomato Septoria Leaf Spot, Tomato Spider Mites, Tomato Target Spot, Tomato Yellow Leaf Curl Virus, Tomato Mosaic Virus, and others.

If the image is not a plant/leaf, set crop name to "Unknown" with low confidence and disease to "Not a plant image".
Always provide confidence scores between 0.0 and 1.0.
Include 1-3 alternative disease possibilities in alternativeDiseases.`;

interface GeminiResponse {
  crop: {
    name: string;
    scientificName: string;
    category: string;
    confidence: number;
  };
  disease: {
    name: string;
    isHealthy: boolean;
    severity: string;
    confidence: number;
  };
  alternativeDiseases: Array<{
    name: string;
    isHealthy: boolean;
    severity: string;
    confidence: number;
  }>;
}

class ModelManager {
  private static instance: ModelManager;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private ai: GoogleGenAI | null = null;

  private modelInfo: ModelInfo = {
    name: 'gemini-2.5-flash',
    version: '2.5',
    inputSize: 0,
    numClasses: 0,
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
    console.log('Initializing Gemini Flash...');

    try {
      const apiKey = GEMINI_CONFIG.API_KEY;
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        throw new Error(
          'Gemini API key not configured. Set your API key in src/constants/config.ts'
        );
      }

      this.ai = new GoogleGenAI({ apiKey });
      this.modelInfo.loaded = true;
      this.isInitialized = true;
      console.log('Gemini Flash initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  get isReady(): boolean {
    return this.isInitialized;
  }

  getModelInfo(): { crop: ModelInfo; disease: ModelInfo } {
    return {
      crop: { ...this.modelInfo, name: 'Gemini Flash (Crop)' },
      disease: { ...this.modelInfo, name: 'Gemini Flash (Disease)' },
    };
  }

  private async imageToBase64(uri: string): Promise<string> {
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 768, height: 768 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.85, base64: true }
    );

    if (!processed.base64) {
      throw new Error('Failed to get base64 from image');
    }

    return processed.base64;
  }

  private findCropId(cropName: string): number {
    const normalized = cropName.toLowerCase();
    for (const [id, label] of Object.entries(CROP_LABELS)) {
      if (label.name.toLowerCase() === normalized) {
        return parseInt(id);
      }
    }
    for (const [id, label] of Object.entries(CROP_LABELS)) {
      if (
        label.name.toLowerCase().includes(normalized) ||
        normalized.includes(label.name.toLowerCase())
      ) {
        return parseInt(id);
      }
    }
    return -1;
  }

  private findDiseaseId(diseaseName: string): number {
    const normalized = diseaseName.toLowerCase();
    for (const [id, label] of Object.entries(DISEASE_LABELS)) {
      if (label.name.toLowerCase() === normalized) {
        return parseInt(id);
      }
    }
    for (const [id, label] of Object.entries(DISEASE_LABELS)) {
      if (
        label.name.toLowerCase().includes(normalized) ||
        normalized.includes(label.name.toLowerCase())
      ) {
        return parseInt(id);
      }
    }
    return -1;
  }

  private parseGeminiResponse(text: string): GeminiResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }
    return JSON.parse(jsonMatch[0]);
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    if (!this.isInitialized || !this.ai) {
      await this.initialize();
    }

    if (!this.ai) {
      throw new Error('Gemini not initialized');
    }

    const startTime = Date.now();

    try {
      console.log('Sending image to Gemini Flash for analysis...');

      const base64Image = await this.imageToBase64(imageUri);

      const response = await this.ai.models.generateContent({
        model: GEMINI_CONFIG.MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
              { text: 'Analyze this plant/leaf image for diseases.' },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      });

      const responseText = response.text || '';
      console.log('Gemini response received');

      const parsed = this.parseGeminiResponse(responseText);
      const inferenceTime = Date.now() - startTime;

      const cropId = this.findCropId(parsed.crop.name);
      const cropLabel = cropId >= 0 ? CROP_LABELS[cropId] : null;

      const topCrop: CropPrediction = {
        classId: cropId >= 0 ? cropId : 999,
        className: parsed.crop.name,
        confidence: parsed.crop.confidence,
        scientificName: cropLabel?.scientificName || parsed.crop.scientificName,
        category: cropLabel?.category || parsed.crop.category,
      };

      const diseaseId = this.findDiseaseId(parsed.disease.name);
      const diseaseLabel = diseaseId >= 0 ? DISEASE_LABELS[diseaseId] : null;

      const topDisease: DiseasePrediction = {
        classId: diseaseId >= 0 ? diseaseId : 999,
        className: parsed.disease.name,
        confidence: parsed.disease.confidence,
        isHealthy: parsed.disease.isHealthy,
        severity: diseaseLabel?.severity || parsed.disease.severity,
        cropId: parsed.crop.name,
      };

      const topDiseasePredictions: DiseasePrediction[] = [topDisease];
      if (parsed.alternativeDiseases) {
        for (const alt of parsed.alternativeDiseases) {
          const altId = this.findDiseaseId(alt.name);
          const altLabel = altId >= 0 ? DISEASE_LABELS[altId] : null;
          topDiseasePredictions.push({
            classId: altId >= 0 ? altId : 999,
            className: alt.name,
            confidence: alt.confidence,
            isHealthy: alt.isHealthy,
            severity: altLabel?.severity || alt.severity,
            cropId: parsed.crop.name,
          });
        }
      }

      console.log(`Analysis completed in ${inferenceTime}ms`);
      console.log(`  Crop: ${topCrop.className} (${(topCrop.confidence * 100).toFixed(1)}%)`);
      console.log(`  Disease: ${topDisease.className} (${(topDisease.confidence * 100).toFixed(1)}%)`);

      return {
        cropPrediction: topCrop,
        diseasePrediction: topDisease,
        topCropPredictions: [topCrop],
        topDiseasePredictions,
        inferenceTimeMs: inferenceTime,
        timestamp: new Date(),
        imageUri,
      };
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      throw error;
    }
  }
}

export const modelManager = ModelManager.getInstance();
