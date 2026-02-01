# Model Compatibility Analysis

## Current Situation

### Downloaded Model
- **Source**: Hugging Face `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
- **Format**: PyTorch (`pytorch_model.bin`)
- **Architecture**: MobileNetV2 (fine-tuned from `google/mobilenet_v2_1.0_224`)
- **Classes**: 38 plant disease classes
- **Input Size**: 224x224x3
- **Accuracy**: 95.41%

### Model Configuration
```json
{
  "image_size": 224,
  "num_channels": 3,
  "image_mean": [0.5, 0.5, 0.5],
  "image_std": [0.5, 0.5, 0.5],
  "rescale_factor": 0.00392156862745098  // 1/255
}
```

### Current App Setup
- ✅ `onnxruntime-react-native` v1.23.2 installed
- ✅ Metro config supports `.onnx` files
- ✅ Config already has correct normalization values
- ⚠️ Currently using TensorFlow.js (not ONNX)

---

## Compatibility Options

### Option 1: Convert PyTorch → ONNX (RECOMMENDED)

**Why ONNX?**
- ✅ Already have `onnxruntime-react-native` installed
- ✅ Better performance on mobile devices
- ✅ Smaller model size
- ✅ Cross-platform compatibility
- ✅ You already have ONNX example code (`ModelManager_old.ts`)

**Conversion Steps:**

1. **Install conversion tools** (Python environment):
```bash
pip install torch transformers onnx onnxruntime
```

2. **Convert the model** (Python script):
```python
from transformers import MobileNetV2ForImageClassification
import torch

# Load the PyTorch model
model = MobileNetV2ForImageClassification.from_pretrained(
    "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
)
model.eval()

# Create dummy input (batch_size=1, channels=3, height=224, width=224)
dummy_input = torch.randn(1, 3, 224, 224)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "plant_disease_mobilenetv2.onnx",
    input_names=["pixel_values"],
    output_names=["logits"],
    dynamic_axes={
        "pixel_values": {0: "batch_size"},
        "logits": {0: "batch_size"}
    },
    opset_version=11  # Compatible with onnxruntime-react-native
)
```

3. **Copy ONNX model to assets**:
```bash
cp plant_disease_mobilenetv2.onnx assets/models/plant_disease.onnx
```

**Preprocessing Requirements:**
- Resize to 224x224
- Normalize: `(pixel / 255.0 - 0.5) / 0.5` = `(pixel - 127.5) / 127.5`
- Input shape: `[1, 3, 224, 224]` (NCHW format)

---

### Option 2: Use TensorFlow.js Format

**Conversion**: PyTorch → TensorFlow → TensorFlow.js

**Pros:**
- Can use existing TensorFlow.js setup
- No need to change code much

**Cons:**
- More conversion steps
- Larger model size
- Slower inference on mobile

**Not recommended** since you already have ONNX runtime set up.

---

### Option 3: Use Hugging Face Transformers.js

**Pros:**
- Direct use of Hugging Face models
- No conversion needed

**Cons:**
- ⚠️ **Limited React Native support** (mainly web)
- Larger bundle size
- May not work well on mobile

**Not recommended** for React Native.

---

## Implementation with ONNX Runtime

### Required Changes

1. **Update ModelManager.ts** to use ONNX Runtime (similar to `ModelManager_old.ts`)

2. **Preprocessing** - Match Hugging Face MobileNetV2 preprocessing:
```typescript
// Current preprocessing (TensorFlow.js style)
imageTensor = tf.div(
  tf.sub(tf.cast(imageTensor, 'float32'), 127.5),
  127.5
);

// ONNX needs NCHW format: [1, 3, 224, 224]
// And same normalization: (pixel - 127.5) / 127.5
```

3. **Model Input/Output**:
   - Input: `Float32Array` of shape `[1, 3, 224, 224]`
   - Output: `Float32Array` of shape `[1, 38]` (logits)
   - Apply softmax to get probabilities

### Code Structure

```typescript
import { InferenceSession, Tensor } from 'onnxruntime-react-native';

// Load model
const session = await InferenceSession.create(modelPath);

// Preprocess image
const preprocessed = preprocessImage(imageUri); // [1, 3, 224, 224]

// Run inference
const feeds = { pixel_values: new Tensor('float32', preprocessed, [1, 3, 224, 224]) };
const results = await session.run(feeds);
const logits = results.logits.data as Float32Array;

// Apply softmax and get top predictions
const probabilities = softmax(Array.from(logits));
```

---

## Model Labels Mapping

✅ **GOOD NEWS**: Your `DISEASE_LABELS` already match the model's 38 classes perfectly!

The model outputs map directly to your `DISEASE_LABELS`:
- Class 0 → "Apple Scab" → `DISEASE_LABELS[0]`
- Class 1 → "Apple with Black Rot" → `DISEASE_LABELS[1]`
- Class 37 → "Healthy Tomato Plant" → `DISEASE_LABELS[37]`

**Model Output Structure:**
- The model combines crop + disease (e.g., "Tomato with Early Blight")
- Your `DISEASE_LABELS` already has `cropIndex` field to extract the crop
- You can use `DISEASE_LABELS[classId].cropIndex` to get the crop

**Example Usage:**
```typescript
const modelOutput = 28; // "Tomato with Early Blight"
const disease = DISEASE_LABELS[modelOutput];
// disease.name = "Tomato Early Blight"
// disease.cropIndex = 13 (Tomato)
// disease.isHealthy = false
// disease.severity = "medium"
```

---

## Next Steps

1. ✅ **Convert PyTorch model to ONNX** (use Python script above)
2. ✅ **Copy ONNX model to `assets/models/`**
3. ✅ **Update `ModelManager.ts`** to use ONNX Runtime
4. ✅ **Update preprocessing** to match Hugging Face format
5. ✅ **Map model outputs** to your label system
6. ✅ **Test inference** with real images

---

## Performance Expectations

- **Model Size**: ~14-20 MB (ONNX)
- **Inference Time**: 50-200ms on modern phones
- **Memory**: ~50-100 MB during inference
- **Accuracy**: 95.41% (from model card)

---

## Resources

- ONNX Runtime React Native: https://www.npmjs.com/package/onnxruntime-react-native
- Model Card: https://huggingface.co/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
- Base Model: https://huggingface.co/google/mobilenet_v2_1.0_224

