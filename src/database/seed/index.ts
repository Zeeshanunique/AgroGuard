import { database } from '../index';
import { SEED_DATA, CropData, DiseaseData, TreatmentData } from './treatmentData';

export async function seedDatabase(): Promise<void> {
  console.log('Starting database seed...');

  try {
    await database.write(async () => {
      const cropsCollection = database.get('crops');
      const diseasesCollection = database.get('diseases');
      const treatmentsCollection = database.get('treatments');

      for (let cropIndex = 0; cropIndex < SEED_DATA.length; cropIndex++) {
        const cropData = SEED_DATA[cropIndex];

        // Create crop record
        const crop = await cropsCollection.create((record: any) => {
          record.name = cropData.name;
          record.scientificName = cropData.scientificName;
          record.description = cropData.description;
          record.category = cropData.category;
          record.modelClassId = cropIndex;
          record.growingTips = cropData.growingTips || '';
        });

        // Create diseases for this crop
        for (let diseaseIndex = 0; diseaseIndex < cropData.diseases.length; diseaseIndex++) {
          const diseaseData = cropData.diseases[diseaseIndex];

          const disease = await diseasesCollection.create((record: any) => {
            record.cropId = crop.id;
            record.name = diseaseData.name;
            record.scientificName = diseaseData.scientificName || '';
            record.description = diseaseData.description;
            record.symptoms = JSON.stringify(diseaseData.symptoms);
            record.causes = diseaseData.causes || '';
            record.prevention = diseaseData.prevention || '';
            record.severity = diseaseData.severity;
            record.isHealthy = diseaseData.isHealthy;
            record.modelClassId = cropIndex * 10 + diseaseIndex;
          });

          // Create treatments for this disease
          for (const treatmentData of diseaseData.treatments) {
            await treatmentsCollection.create((record: any) => {
              record.diseaseId = disease.id;
              record.type = treatmentData.type;
              record.name = treatmentData.name;
              record.description = treatmentData.description;
              record.applicationMethod = treatmentData.applicationMethod;
              record.dosage = treatmentData.dosage;
              record.frequency = treatmentData.frequency || '';
              record.precautions = JSON.stringify(treatmentData.precautions);
              record.effectiveness = treatmentData.effectiveness;
              record.costLevel = treatmentData.costLevel || '';
            });
          }
        }
      }
    });

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Database seed failed:', error);
    throw error;
  }
}

export async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const cropsCount = await database.get('crops').query().fetchCount();
    return cropsCount > 0;
  } catch {
    return false;
  }
}

export async function clearDatabase(): Promise<void> {
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
}
