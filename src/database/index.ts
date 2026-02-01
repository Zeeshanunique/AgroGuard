// Simplified in-memory database for development
// Replace with WatermelonDB when using expo-dev-client for native builds

import { SEED_DATA, CropData, DiseaseData, TreatmentData } from './seed/treatmentData';

// In-memory storage
const crops: CropData[] = [...SEED_DATA];
let scanHistory: ScanHistoryItem[] = [];

export interface ScanHistoryItem {
  id: string;
  imageUri: string;
  cropName: string;
  diseaseName: string;
  cropConfidence: number;
  diseaseConfidence: number;
  isHealthy: boolean;
  scannedAt: Date;
}

// Database API
export const database = {
  // Crops
  getAllCrops(): CropData[] {
    return crops;
  },

  getCropByName(name: string): CropData | undefined {
    return crops.find(c => c.name.toLowerCase() === name.toLowerCase());
  },

  getCropByIndex(index: number): CropData | undefined {
    return crops[index];
  },

  // Diseases
  getDiseasesForCrop(cropName: string): DiseaseData[] {
    const crop = this.getCropByName(cropName);
    return crop?.diseases || [];
  },

  getDiseaseByName(cropName: string, diseaseName: string): DiseaseData | undefined {
    const diseases = this.getDiseasesForCrop(cropName);
    return diseases.find(d => d.name.toLowerCase() === diseaseName.toLowerCase());
  },

  // Treatments
  getTreatmentsForDisease(cropName: string, diseaseName: string): TreatmentData[] {
    const disease = this.getDiseaseByName(cropName, diseaseName);
    return disease?.treatments || [];
  },

  getOrganicTreatments(cropName: string, diseaseName: string): TreatmentData[] {
    return this.getTreatmentsForDisease(cropName, diseaseName)
      .filter(t => t.type === 'organic');
  },

  getChemicalTreatments(cropName: string, diseaseName: string): TreatmentData[] {
    return this.getTreatmentsForDisease(cropName, diseaseName)
      .filter(t => t.type === 'chemical');
  },

  // Scan History
  getScanHistory(): ScanHistoryItem[] {
    return [...scanHistory].sort((a, b) =>
      b.scannedAt.getTime() - a.scannedAt.getTime()
    );
  },

  addScanToHistory(scan: Omit<ScanHistoryItem, 'id'>): ScanHistoryItem {
    const newScan: ScanHistoryItem = {
      ...scan,
      id: Date.now().toString(),
    };
    scanHistory.push(newScan);
    return newScan;
  },

  clearScanHistory(): void {
    scanHistory = [];
  },

  // Search
  searchCrops(query: string): CropData[] {
    const lowerQuery = query.toLowerCase();
    return crops.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.scientificName.toLowerCase().includes(lowerQuery) ||
      c.category.toLowerCase().includes(lowerQuery)
    );
  },
};

export type { CropData, DiseaseData, TreatmentData };
