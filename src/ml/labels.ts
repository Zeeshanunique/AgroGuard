// PlantVillage dataset labels - 38 classes covering 14 crop species
// This includes both healthy and diseased states

export const CROP_LABELS: { [key: number]: { name: string; scientificName: string; category: string } } = {
  0: { name: 'Apple', scientificName: 'Malus domestica', category: 'Fruit' },
  1: { name: 'Blueberry', scientificName: 'Vaccinium corymbosum', category: 'Fruit' },
  2: { name: 'Cherry', scientificName: 'Prunus avium', category: 'Fruit' },
  3: { name: 'Corn (Maize)', scientificName: 'Zea mays', category: 'Grain' },
  4: { name: 'Grape', scientificName: 'Vitis vinifera', category: 'Fruit' },
  5: { name: 'Orange', scientificName: 'Citrus sinensis', category: 'Fruit' },
  6: { name: 'Peach', scientificName: 'Prunus persica', category: 'Fruit' },
  7: { name: 'Bell Pepper', scientificName: 'Capsicum annuum', category: 'Vegetable' },
  8: { name: 'Potato', scientificName: 'Solanum tuberosum', category: 'Vegetable' },
  9: { name: 'Raspberry', scientificName: 'Rubus idaeus', category: 'Fruit' },
  10: { name: 'Soybean', scientificName: 'Glycine max', category: 'Legume' },
  11: { name: 'Squash', scientificName: 'Cucurbita', category: 'Vegetable' },
  12: { name: 'Strawberry', scientificName: 'Fragaria × ananassa', category: 'Fruit' },
  13: { name: 'Tomato', scientificName: 'Solanum lycopersicum', category: 'Vegetable' },
  // Extended crops for full 50 coverage (to be populated with actual model)
  14: { name: 'Wheat', scientificName: 'Triticum aestivum', category: 'Grain' },
  15: { name: 'Rice', scientificName: 'Oryza sativa', category: 'Grain' },
  16: { name: 'Cotton', scientificName: 'Gossypium', category: 'Fiber' },
  17: { name: 'Sugarcane', scientificName: 'Saccharum officinarum', category: 'Sugar' },
  18: { name: 'Coffee', scientificName: 'Coffea', category: 'Beverage' },
  19: { name: 'Tea', scientificName: 'Camellia sinensis', category: 'Beverage' },
  20: { name: 'Banana', scientificName: 'Musa', category: 'Fruit' },
  21: { name: 'Mango', scientificName: 'Mangifera indica', category: 'Fruit' },
  22: { name: 'Papaya', scientificName: 'Carica papaya', category: 'Fruit' },
  23: { name: 'Coconut', scientificName: 'Cocos nucifera', category: 'Palm' },
  24: { name: 'Peanut', scientificName: 'Arachis hypogaea', category: 'Legume' },
  25: { name: 'Sunflower', scientificName: 'Helianthus annuus', category: 'Oilseed' },
  26: { name: 'Mustard', scientificName: 'Brassica', category: 'Oilseed' },
  27: { name: 'Onion', scientificName: 'Allium cepa', category: 'Vegetable' },
  28: { name: 'Garlic', scientificName: 'Allium sativum', category: 'Vegetable' },
  29: { name: 'Ginger', scientificName: 'Zingiber officinale', category: 'Spice' },
  30: { name: 'Turmeric', scientificName: 'Curcuma longa', category: 'Spice' },
  31: { name: 'Chili', scientificName: 'Capsicum frutescens', category: 'Spice' },
  32: { name: 'Cabbage', scientificName: 'Brassica oleracea', category: 'Vegetable' },
  33: { name: 'Cauliflower', scientificName: 'Brassica oleracea var. botrytis', category: 'Vegetable' },
  34: { name: 'Broccoli', scientificName: 'Brassica oleracea var. italica', category: 'Vegetable' },
  35: { name: 'Carrot', scientificName: 'Daucus carota', category: 'Vegetable' },
  36: { name: 'Cucumber', scientificName: 'Cucumis sativus', category: 'Vegetable' },
  37: { name: 'Pumpkin', scientificName: 'Cucurbita maxima', category: 'Vegetable' },
  38: { name: 'Watermelon', scientificName: 'Citrullus lanatus', category: 'Fruit' },
  39: { name: 'Lettuce', scientificName: 'Lactuca sativa', category: 'Vegetable' },
  40: { name: 'Spinach', scientificName: 'Spinacia oleracea', category: 'Vegetable' },
  41: { name: 'Eggplant', scientificName: 'Solanum melongena', category: 'Vegetable' },
  42: { name: 'Okra', scientificName: 'Abelmoschus esculentus', category: 'Vegetable' },
  43: { name: 'Lemon', scientificName: 'Citrus limon', category: 'Fruit' },
  44: { name: 'Lime', scientificName: 'Citrus aurantiifolia', category: 'Fruit' },
  45: { name: 'Pomegranate', scientificName: 'Punica granatum', category: 'Fruit' },
  46: { name: 'Guava', scientificName: 'Psidium guajava', category: 'Fruit' },
  47: { name: 'Fig', scientificName: 'Ficus carica', category: 'Fruit' },
  48: { name: 'Olive', scientificName: 'Olea europaea', category: 'Fruit' },
  49: { name: 'Avocado', scientificName: 'Persea americana', category: 'Fruit' },
};

// PlantVillage disease labels - maps to model output classes
export const DISEASE_LABELS: { [key: number]: { name: string; cropIndex: number; isHealthy: boolean; severity: string } } = {
  0: { name: 'Apple Scab', cropIndex: 0, isHealthy: false, severity: 'medium' },
  1: { name: 'Apple Black Rot', cropIndex: 0, isHealthy: false, severity: 'high' },
  2: { name: 'Apple Cedar Rust', cropIndex: 0, isHealthy: false, severity: 'medium' },
  3: { name: 'Apple Healthy', cropIndex: 0, isHealthy: true, severity: 'none' },
  4: { name: 'Blueberry Healthy', cropIndex: 1, isHealthy: true, severity: 'none' },
  5: { name: 'Cherry Powdery Mildew', cropIndex: 2, isHealthy: false, severity: 'medium' },
  6: { name: 'Cherry Healthy', cropIndex: 2, isHealthy: true, severity: 'none' },
  7: { name: 'Corn Cercospora Leaf Spot', cropIndex: 3, isHealthy: false, severity: 'medium' },
  8: { name: 'Corn Common Rust', cropIndex: 3, isHealthy: false, severity: 'medium' },
  9: { name: 'Corn Northern Leaf Blight', cropIndex: 3, isHealthy: false, severity: 'high' },
  10: { name: 'Corn Healthy', cropIndex: 3, isHealthy: true, severity: 'none' },
  11: { name: 'Grape Black Rot', cropIndex: 4, isHealthy: false, severity: 'high' },
  12: { name: 'Grape Esca (Black Measles)', cropIndex: 4, isHealthy: false, severity: 'high' },
  13: { name: 'Grape Leaf Blight', cropIndex: 4, isHealthy: false, severity: 'medium' },
  14: { name: 'Grape Healthy', cropIndex: 4, isHealthy: true, severity: 'none' },
  15: { name: 'Orange Citrus Greening', cropIndex: 5, isHealthy: false, severity: 'critical' },
  16: { name: 'Peach Bacterial Spot', cropIndex: 6, isHealthy: false, severity: 'medium' },
  17: { name: 'Peach Healthy', cropIndex: 6, isHealthy: true, severity: 'none' },
  18: { name: 'Bell Pepper Bacterial Spot', cropIndex: 7, isHealthy: false, severity: 'medium' },
  19: { name: 'Bell Pepper Healthy', cropIndex: 7, isHealthy: true, severity: 'none' },
  20: { name: 'Potato Early Blight', cropIndex: 8, isHealthy: false, severity: 'medium' },
  21: { name: 'Potato Late Blight', cropIndex: 8, isHealthy: false, severity: 'critical' },
  22: { name: 'Potato Healthy', cropIndex: 8, isHealthy: true, severity: 'none' },
  23: { name: 'Raspberry Healthy', cropIndex: 9, isHealthy: true, severity: 'none' },
  24: { name: 'Soybean Healthy', cropIndex: 10, isHealthy: true, severity: 'none' },
  25: { name: 'Squash Powdery Mildew', cropIndex: 11, isHealthy: false, severity: 'medium' },
  26: { name: 'Strawberry Leaf Scorch', cropIndex: 12, isHealthy: false, severity: 'medium' },
  27: { name: 'Strawberry Healthy', cropIndex: 12, isHealthy: true, severity: 'none' },
  28: { name: 'Tomato Bacterial Spot', cropIndex: 13, isHealthy: false, severity: 'medium' },
  29: { name: 'Tomato Early Blight', cropIndex: 13, isHealthy: false, severity: 'medium' },
  30: { name: 'Tomato Late Blight', cropIndex: 13, isHealthy: false, severity: 'critical' },
  31: { name: 'Tomato Leaf Mold', cropIndex: 13, isHealthy: false, severity: 'medium' },
  32: { name: 'Tomato Septoria Leaf Spot', cropIndex: 13, isHealthy: false, severity: 'medium' },
  33: { name: 'Tomato Spider Mites', cropIndex: 13, isHealthy: false, severity: 'medium' },
  34: { name: 'Tomato Target Spot', cropIndex: 13, isHealthy: false, severity: 'medium' },
  35: { name: 'Tomato Yellow Leaf Curl Virus', cropIndex: 13, isHealthy: false, severity: 'high' },
  36: { name: 'Tomato Mosaic Virus', cropIndex: 13, isHealthy: false, severity: 'high' },
  37: { name: 'Tomato Healthy', cropIndex: 13, isHealthy: true, severity: 'none' },
};

export function getCropLabel(classId: number): { name: string; scientificName: string; category: string } | undefined {
  return CROP_LABELS[classId];
}

export function getDiseaseLabel(classId: number): { name: string; cropIndex: number; isHealthy: boolean; severity: string } | undefined {
  return DISEASE_LABELS[classId];
}

export const NUM_CROP_CLASSES = Object.keys(CROP_LABELS).length;
export const NUM_DISEASE_CLASSES = Object.keys(DISEASE_LABELS).length;
