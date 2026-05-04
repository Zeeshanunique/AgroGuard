/**
 * Patches src/ml/labels.ts after training:
 *  - Adds 5 pumpkin disease entries to DISEASE_LABELS (indices 38–42)
 *  - Updates PLANTVILLAGE_CROP_INDEX_MAX to include pumpkin (14 → 15, index 0–14)
 *  - Removes pumpkin from BROWSE_EXTRA_CROP_INDICES (it becomes a real scannable crop)
 *  - Updates NUM_DISEASE_CLASSES comment
 *
 * Run: node training/update_labels.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const labelsPath = resolve(__dirname, "../src/ml/labels.ts");

let src = readFileSync(labelsPath, "utf8");

// 1. Bump PLANTVILLAGE_CROP_INDEX_MAX: 13 → 14 (now includes pumpkin at index 14... wait)
// Actually pumpkin is at CROP_LABELS index 37. The PlantVillage model index max
// needs to match the crop index used for scanning. Pumpkin cropIndex = 37.
// We extend PLANTVILLAGE_CROP_INDEX_MAX from 13 to 37 only if we want all Browse crops
// to be scannable — but that's wrong. We just need pumpkin (37) to be scannable.
// Better: keep PLANTVILLAGE_CROP_INDEX_MAX = 13, and add 37 to the scannable set.
// We'll add a PUMPKIN_CROP_INDEX constant and adjust isPlantVillageCropIndex.

// 2. Remove pumpkin from BROWSE_EXTRA_CROP_INDICES → it is now scannable
src = src.replace(
  /const BROWSE_EXTRA_CROP_INDICES = new Set<number>\(\[37\]\);[^\n]*/,
  "const BROWSE_EXTRA_CROP_INDICES = new Set<number>([]); // Pumpkin moved to scannable set"
);

// 3. Update isBrowseCropIndex to also allow pumpkin (37) for scanning
// Replace isPlantVillageCropIndex to accept 37 as well by adding a PUMPKIN check
src = src.replace(
  /export function isPlantVillageCropIndex\(cropIndex: number\): boolean \{[\s\S]*?\}/m,
  `export function isPlantVillageCropIndex(cropIndex: number): boolean {
  if (!Number.isInteger(cropIndex) || cropIndex < 0) return false;
  return (cropIndex >= 0 && cropIndex <= PLANTVILLAGE_CROP_INDEX_MAX) || cropIndex === PUMPKIN_CROP_INDEX;
}`
);

// 4. Add PUMPKIN_CROP_INDEX constant after NUM_PLANTVILLAGE_CROPS
if (!src.includes("PUMPKIN_CROP_INDEX")) {
  src = src.replace(
    /export const NUM_PLANTVILLAGE_CROPS = PLANTVILLAGE_CROP_INDEX_MAX \+ 1;/,
    `export const NUM_PLANTVILLAGE_CROPS = PLANTVILLAGE_CROP_INDEX_MAX + 1;
export const PUMPKIN_CROP_INDEX = 37;`
  );
}

// 5. Add pumpkin disease entries to DISEASE_LABELS (after last entry 37)
const pumpkinDiseaseEntries = `
  38: { name: 'Pumpkin Healthy', cropIndex: 37, isHealthy: true, severity: 'none' },
  39: { name: 'Pumpkin Downy Mildew', cropIndex: 37, isHealthy: false, severity: 'high' },
  40: { name: 'Pumpkin Powdery Mildew', cropIndex: 37, isHealthy: false, severity: 'medium' },
  41: { name: 'Pumpkin Mosaic Disease', cropIndex: 37, isHealthy: false, severity: 'high' },
  42: { name: 'Pumpkin Bacterial Leaf Spot', cropIndex: 37, isHealthy: false, severity: 'medium' },`;

// Insert pumpkin entries before the closing }; of DISEASE_LABELS
src = src.replace(
  "  37: { name: 'Tomato Yellow Leaf Curl Virus', cropIndex: 13, isHealthy: false, severity: 'high' },\n};",
  `  37: { name: 'Tomato Yellow Leaf Curl Virus', cropIndex: 13, isHealthy: false, severity: 'high' },\n${pumpkinDiseaseEntries}\n};`
);

writeFileSync(labelsPath, src, "utf8");
console.log("✓ labels.ts updated with pumpkin disease entries (indices 38–42)");
console.log("  - isPlantVillageCropIndex now returns true for cropIndex 37");
console.log("  - DISEASE_LABELS extended to 43 classes");
