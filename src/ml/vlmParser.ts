import { CROP_LABELS, DISEASE_LABELS } from './labels';
import { AnalysisResult, CropPrediction, DiseasePrediction } from './types';


const CROP_NAME_TO_INDEX: Record<string, number> = Object.fromEntries(
  Object.entries(CROP_LABELS).map(([idx, c]) => [c.name.toLowerCase(), parseInt(idx, 10)])
);

interface VLMResponse {
  crop: string;
  disease: string;
  isHealthy: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

function extractJSON(raw: string): VLMResponse | null {
  // Try to find a JSON object in the response
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed.crop || parsed.isHealthy === undefined) return null;
    return {
      crop: parsed.crop,
      disease: parsed.disease ?? 'Healthy',
      isHealthy: Boolean(parsed.isHealthy),
      severity: parsed.severity ?? (parsed.isHealthy ? 'none' : 'medium'),
      confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.7)),
    };
  } catch {
    return null;
  }
}

function findClosestCrop(name: string): { index: number; crop: typeof CROP_LABELS[0] } | null {
  const lower = name.toLowerCase();
  // Exact match
  const exactIdx = CROP_NAME_TO_INDEX[lower];
  if (exactIdx !== undefined) return { index: exactIdx, crop: CROP_LABELS[exactIdx] };
  // Partial match
  for (const [idx, crop] of Object.entries(CROP_LABELS)) {
    if (lower.includes(crop.name.toLowerCase()) || crop.name.toLowerCase().includes(lower)) {
      return { index: parseInt(idx, 10), crop };
    }
  }
  return null;
}

function findDiseaseLabel(
  cropIndex: number,
  diseaseName: string,
  isHealthy: boolean
): { classId: number; label: typeof DISEASE_LABELS[0] } | null {
  const lowerDisease = diseaseName.toLowerCase();
  // Search DISEASE_LABELS for matching crop + disease
  for (const [id, label] of Object.entries(DISEASE_LABELS)) {
    if (label.cropIndex !== cropIndex) continue;
    if (isHealthy && label.isHealthy) return { classId: parseInt(id, 10), label };
    if (!isHealthy && !label.isHealthy) {
      if (
        lowerDisease.includes(label.name.split(' ').slice(1).join(' ').toLowerCase()) ||
        label.name.toLowerCase().includes(lowerDisease) ||
        lowerDisease.includes(label.name.toLowerCase())
      ) {
        return { classId: parseInt(id, 10), label };
      }
    }
  }
  // Fallback: any healthy/diseased label for this crop
  for (const [id, label] of Object.entries(DISEASE_LABELS)) {
    if (label.cropIndex === cropIndex && label.isHealthy === isHealthy) {
      return { classId: parseInt(id, 10), label };
    }
  }
  return null;
}

export function parseVLMResponse(raw: string, imageUri: string, inferenceTimeMs: number): AnalysisResult {
  const parsed = extractJSON(raw);

  if (!parsed || parsed.confidence < 0.3) {
    throw new Error(
      'Could not identify the plant. Please photograph a single diseased leaf up close, filling most of the frame.'
    );
  }

  if (parsed.crop.toLowerCase() === 'unknown' || parsed.confidence < 0.3) {
    throw new Error(
      'Could not identify the plant. Please photograph a single diseased leaf up close, filling most of the frame.'
    );
  }

  const cropMatch = findClosestCrop(parsed.crop);
  if (!cropMatch) {
    throw new Error(
      `Crop "${parsed.crop}" is not in the supported list. Please photograph a leaf from a supported crop.`
    );
  }

  const { index: cropIndex, crop } = cropMatch;
  const diseaseMatch = findDiseaseLabel(cropIndex, parsed.disease, parsed.isHealthy);

  const diseaseName = parsed.isHealthy
    ? `${crop.name} Healthy`
    : `${crop.name} ${parsed.disease}`;

  const diseaseClassId = diseaseMatch?.classId ?? -1;
  const severity = diseaseMatch?.label.severity ?? parsed.severity;

  const cropPrediction: CropPrediction = {
    classId: cropIndex,
    className: crop.name,
    confidence: parsed.confidence,
    scientificName: crop.scientificName,
    category: crop.category,
  };

  const diseasePrediction: DiseasePrediction = {
    classId: diseaseClassId,
    className: diseaseName,
    confidence: parsed.confidence,
    isHealthy: parsed.isHealthy,
    severity,
    cropId: crop.name,
  };

  return {
    cropPrediction,
    diseasePrediction,
    topCropPredictions: [cropPrediction],
    topDiseasePredictions: [diseasePrediction],
    inferenceTimeMs,
    timestamp: new Date(),
    imageUri,
  };
}
