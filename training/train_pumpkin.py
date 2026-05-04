"""
Pumpkin disease fine-tuning pipeline.

Strategy: frozen-backbone linear probe + ONNX graph surgery.
- Downloads the dataset automatically via kagglehub.
- Runs the existing plant_disease.onnx backbone as a frozen feature extractor.
- Extracts 1280-dim features for every pumpkin image.
- Trains a LogisticRegression (or optional PyTorch linear layer) on those features.
- Stitches result: appends 5 new pumpkin rows to the original 38-class head.
- Patches the ONNX Gemm node in-place → outputs plant_disease_v2.onnx (43 classes).

Usage:
  pip install kagglehub onnxruntime scikit-learn Pillow onnx numpy tqdm
  python train_pumpkin.py --model ../assets/models/plant_disease.onnx

Optional stronger training (replaces sklearn with PyTorch):
  pip install torch
  python train_pumpkin.py --model ../assets/models/plant_disease.onnx --use-torch
"""

import argparse
import os
import sys
from pathlib import Path

import kagglehub
import numpy as np
from PIL import Image
import onnx
from onnx import numpy_helper, TensorProto
import onnxruntime as ort
from tqdm import tqdm


# ---------------------------------------------------------------------------
# Dataset download
# ---------------------------------------------------------------------------

def download_dataset() -> tuple[str, str]:
    """Returns (train_root, test_root) — prefers augmented splits, falls back to original."""
    print("Downloading dataset from Kaggle (rifat963/pumpkin)...")
    path = kagglehub.dataset_download("rifat963/pumpkin")
    print(f"Path to dataset files: {path}")
    train_root = os.path.join(path, "Augmented", "Augmented", "train")
    test_root  = os.path.join(path, "Augmented", "Augmented", "test")
    if os.path.isdir(train_root):
        print("Using augmented train/test splits.")
        return train_root, test_root
    orig = os.path.join(path, "Original", "Original")
    print("Augmented split not found, falling back to Original.")
    return orig, orig


def download_plantvillage_negatives(samples_per_class: int = 100) -> list[str]:
    """
    Download PlantVillage (abdallahalidev/plantvillage-dataset) and return
    up to samples_per_class image paths per disease class as negative examples.
    These are real backbone-feature negatives — proxy vectors don't work.
    """
    import random
    print(f"Downloading PlantVillage negatives ({samples_per_class}/class)...")
    path = kagglehub.dataset_download("abdallahalidev/plantvillage-dataset")
    print(f"PlantVillage path: {path}")

    # Prefer segmented/ (54,306 images, all 38 classes) over color/ (1,500 images, mostly Corn+Tomato)
    segmented_root = None
    color_root = None
    for root, dirs, _ in os.walk(path):
        name = os.path.basename(root).lower()
        if name == "segmented":
            segmented_root = root
        elif name in ("color", "colour") and color_root is None:
            color_root = root
    best_root = segmented_root or color_root or path

    # Classes that produced false positives get 3× samples for stronger negative signal
    HIGH_FP_CLASSES = {
        "tomato___late_blight", "squash___powdery_mildew",
        "grape___black_rot", "grape___esca_(black_measles)",
        "grape___leaf_blight_(isariopsis_leaf_spot)", "grape___healthy",
        "potato___early_blight", "apple___cedar_apple_rust",
        "strawberry___leaf_scorch",
    }

    neg_paths: list[str] = []
    for cls_dir in sorted(Path(best_root).iterdir()):
        if not cls_dir.is_dir():
            continue
        imgs = list(cls_dir.glob("*.jpg")) + list(cls_dir.glob("*.JPG")) + list(cls_dir.glob("*.png"))
        if not imgs:
            continue
        random.shuffle(imgs)
        quota = samples_per_class * 3 if cls_dir.name.lower() in HIGH_FP_CLASSES else samples_per_class
        neg_paths.extend(str(p) for p in imgs[:quota])

    print(f"  Loaded {len(neg_paths)} PlantVillage negative images from {best_root}")
    return neg_paths

# ---------------------------------------------------------------------------
# Constants — must match app labels.ts
# ---------------------------------------------------------------------------
PUMPKIN_CROP_INDEX = 37

# Class name → new disease label index (appended after existing 38)
# "Healthy Leaf" is the actual folder name in the rifat963/pumpkin dataset
PUMPKIN_CLASS_MAP: dict[str, int] = {
    "Healthy Leaf": 38,
    "Downy Mildew": 39,
    "Powdery Mildew": 40,
    "Mosaic Disease": 41,
    "Bacterial Leaf Spot": 42,
}

INPUT_SIZE = 224
RESIZE_SHORTEST = 256

# ---------------------------------------------------------------------------
# Preprocessing — mirrors app/src/ml/ModelManager.ts logic
# ---------------------------------------------------------------------------

def preprocess(img_path: str) -> np.ndarray:
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    # Resize shortest edge to 256
    if w < h:
        new_w, new_h = RESIZE_SHORTEST, int(h * RESIZE_SHORTEST / w)
    else:
        new_w, new_h = int(w * RESIZE_SHORTEST / h), RESIZE_SHORTEST
    img = img.resize((new_w, new_h), Image.BILINEAR)
    # Center crop to 224x224
    left = (new_w - INPUT_SIZE) // 2
    top = (new_h - INPUT_SIZE) // 2
    img = img.crop((left, top, left + INPUT_SIZE, top + INPUT_SIZE))
    arr = np.array(img).astype(np.float32)
    # Match app normalization exactly: (pixel - 127.5) / 127.5
    arr = (arr - 127.5) / 127.5
    # HWC → NCHW
    return arr.transpose(2, 0, 1)[np.newaxis]


# ---------------------------------------------------------------------------
# Feature extraction via ONNX backbone (tap the 'view' tensor before Gemm)
# ---------------------------------------------------------------------------

def build_feature_extractor(model_path: str) -> ort.InferenceSession:
    model = onnx.load(model_path)
    # Add 'view' as an explicit output so we can extract 1280-dim features
    view_output = onnx.helper.make_tensor_value_info("view", TensorProto.FLOAT, [None, 1280])
    model.graph.output.append(view_output)
    modified = model.SerializeToString()
    return ort.InferenceSession(modified, providers=["CPUExecutionProvider"])


def extract_features(session: ort.InferenceSession, image_paths: list[str]) -> np.ndarray:
    feats = []
    for path in tqdm(image_paths, desc="Extracting features", unit="img"):
        x = preprocess(path)
        outputs = session.run(["view"], {"pixel_values": x})
        feats.append(outputs[0].squeeze())  # (1280,)
    return np.stack(feats)  # (N, 1280)


# ---------------------------------------------------------------------------
# Collect dataset paths
# ---------------------------------------------------------------------------

def _normalize(name: str) -> str:
    return name.lower().replace("_", " ").strip()


def collect_dataset(dataset_root: str) -> tuple[list[str], list[int]]:
    root = Path(dataset_root)
    print(f"  Using class folder root: {root}")
    paths, labels = [], []
    found_classes = []
    candidates = [d for d in root.iterdir() if d.is_dir()]
    for class_name, label_idx in PUMPKIN_CLASS_MAP.items():
        match = next(
            (d for d in candidates if _normalize(d.name) == _normalize(class_name)), None
        )
        if match is None:
            print(f"  WARNING: folder '{class_name}' not found in {root}. Skipping.")
            continue
        found_classes.append(class_name)
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"):
            for f in match.glob(ext):
                paths.append(str(f))
                labels.append(label_idx)
    print(f"Found classes: {found_classes}")
    print(f"Total images: {len(paths)}")
    return paths, labels


# ---------------------------------------------------------------------------
# Train classifier
# ---------------------------------------------------------------------------

def train_competitive(
    pos_features: np.ndarray,
    pos_labels: np.ndarray,
    neg_features: np.ndarray,
    old_w: np.ndarray,
    old_b: np.ndarray,
    epochs: int = 80,
    lr: float = 5e-3,
    neg_weight: float = 3.0,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Competitive 43-class training with real PlantVillage negative features.

    pos_loss — 43-class CE on pumpkin images: pumpkin class must beat all
               38 frozen PlantVillage logits.
    neg_loss — On real PlantVillage images: all pumpkin logits must stay below
               the PlantVillage winner. This is what previous attempts (proxy
               vectors, scale normalisation) failed to enforce with real data.
    """
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import TensorDataset, DataLoader

    old_w_t = torch.tensor(old_w, dtype=torch.float32)
    old_b_t = torch.tensor(old_b, dtype=torch.float32)

    head = nn.Linear(1280, 5)
    nn.init.normal_(head.weight, 0.0, 0.01)
    nn.init.zeros_(head.bias)

    X_pos = torch.tensor(pos_features, dtype=torch.float32)
    y_pos = torch.tensor(pos_labels, dtype=torch.long)
    X_neg = torch.tensor(neg_features, dtype=torch.float32)

    pos_loader = DataLoader(TensorDataset(X_pos, y_pos), batch_size=128, shuffle=True)
    neg_loader = DataLoader(TensorDataset(X_neg), batch_size=128, shuffle=True)

    optimizer = torch.optim.Adam(head.parameters(), lr=lr, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    print(f"\nCompetitive training: {len(pos_features)} pumpkin + {len(neg_features)} PlantVillage negatives")
    print(f"Epochs={epochs}  neg_weight={neg_weight}")

    for epoch in range(epochs):
        total_loss, correct = 0.0, 0
        neg_iter = iter(neg_loader)

        for xb, yb in pos_loader:
            optimizer.zero_grad()

            # positive: correct pumpkin class wins in full 43-class space
            with torch.no_grad():
                orig_logits = xb @ old_w_t.T + old_b_t
            pump_logits = head(xb)
            full_logits = torch.cat([orig_logits, pump_logits], dim=1)
            pos_loss = F.cross_entropy(full_logits, yb)

            # negative: all pumpkin logits must lose to PlantVillage winner
            try:
                (xn,) = next(neg_iter)
            except StopIteration:
                neg_iter = iter(neg_loader)
                (xn,) = next(neg_iter)
            with torch.no_grad():
                neg_orig_max = (xn @ old_w_t.T + old_b_t).max(dim=1).values
            neg_pump_max = head(xn).max(dim=1).values
            neg_loss = F.relu(neg_pump_max - neg_orig_max + 1.5).mean()

            loss = pos_loss + neg_weight * neg_loss
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(xb)
            correct += (full_logits.argmax(1) == yb).sum().item()

        scheduler.step()
        if (epoch + 1) % 10 == 0:
            print(f"  Epoch {epoch+1}/{epochs}  loss={total_loss/len(y_pos):.4f}  acc={correct/len(y_pos):.3f}")

    return head.weight.detach().numpy(), head.bias.detach().numpy()


# ---------------------------------------------------------------------------
# Patch ONNX: replace Gemm weight/bias with extended 43-class tensors
# ---------------------------------------------------------------------------

def patch_onnx(model_path: str, new_weights: np.ndarray, new_biases: np.ndarray, output_path: str) -> None:
    model = onnx.load(model_path)
    weights_dict = {init.name: init for init in model.graph.initializer}

    old_w = numpy_helper.to_array(weights_dict["classifier.weight"])  # (38, 1280)
    old_b = numpy_helper.to_array(weights_dict["classifier.bias"])    # (38,)

    # Append new pumpkin rows
    combined_w = np.concatenate([old_w, new_weights], axis=0).astype(np.float32)  # (43, 1280)
    combined_b = np.concatenate([old_b, new_biases], axis=0).astype(np.float32)   # (43,)

    print(f"\nExtending classifier: {old_w.shape[0]} → {combined_w.shape[0]} classes")

    # Replace initializers
    for init in model.graph.initializer:
        if init.name == "classifier.weight":
            new_init = numpy_helper.from_array(combined_w, name="classifier.weight")
            init.CopyFrom(new_init)
        elif init.name == "classifier.bias":
            new_init = numpy_helper.from_array(combined_b, name="classifier.bias")
            init.CopyFrom(new_init)

    # Update output shape from [batch, 38] → [batch, 43]
    for output in model.graph.output:
        if output.name == "logits":
            dim = output.type.tensor_type.shape.dim[1]
            dim.dim_value = combined_w.shape[0]

    onnx.checker.check_model(model)
    onnx.save(model, output_path)
    print(f"Saved patched model → {output_path}")


# ---------------------------------------------------------------------------
# Validate patched model on a sample
# ---------------------------------------------------------------------------

def validate(model_path: str, sample_paths: list[str], sample_labels: list[int]) -> None:
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    correct = 0
    for path, label in zip(sample_paths[:50], sample_labels[:50]):
        x = preprocess(path)
        logits = session.run(["logits"], {"pixel_values": x})[0][0]
        pred = int(np.argmax(logits))
        if pred == label:
            correct += 1
    print(f"\nQuick validation on {min(50, len(sample_paths))} samples: {correct}/{min(50, len(sample_paths))} correct")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Add pumpkin disease classes to plant_disease.onnx")
    parser.add_argument("--dataset", default=None, help="Path to pumpkin dataset root (auto-downloaded if omitted)")
    parser.add_argument("--model", default="assets/models/plant_disease_base.onnx",
                        help="Base 38-class ONNX model (never overwritten). Default: plant_disease_base.onnx")
    parser.add_argument("--output", default="assets/models/plant_disease_v2.onnx", help="Output ONNX path")
    parser.add_argument("--epochs", type=int, default=80, help="Training epochs")
    args = parser.parse_args()

    model_path = str(Path(args.model).resolve())
    output_path = str(Path(args.output).resolve())

    if not os.path.exists(model_path):
        sys.exit(f"Model not found: {model_path}")

    # Guard: refuse to patch a model that already has pumpkin classes
    import onnxruntime as _ort_check
    _s = _ort_check.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    _n = _s.get_outputs()[0].shape[1]
    if _n != 38:
        sys.exit(
            f"ERROR: '{args.model}' has {_n} output classes — expected the original 38-class base model.\n"
            f"Use --model assets/models/plant_disease_base.onnx (the unmodified original)."
        )

    # 1. Collect pumpkin images (download if no --dataset given)
    print("=" * 60)
    print("Step 1: Collecting pumpkin dataset")
    print("=" * 60)
    if args.dataset:
        train_root, test_root = args.dataset, args.dataset
    else:
        train_root, test_root = download_dataset()

    image_paths, labels = collect_dataset(train_root)
    if len(image_paths) == 0:
        sys.exit("No images found. Check --dataset path and folder names.")

    class_indices = sorted(set(labels))

    # 2. Extract backbone features + load original classifier weights
    print("\n" + "=" * 60)
    print("Step 2: Extracting backbone features")
    print("=" * 60)
    session = build_feature_extractor(model_path)

    print("  Pumpkin (positive) images...")
    pos_features = extract_features(session, image_paths)
    pos_labels = np.array(labels)

    neg_paths = download_plantvillage_negatives(samples_per_class=50)
    print("  PlantVillage (negative) images...")
    neg_features = extract_features(session, neg_paths)

    base_model = onnx.load(model_path)
    base_weights = {i.name: numpy_helper.to_array(i) for i in base_model.graph.initializer}
    old_w = base_weights["classifier.weight"]  # (38, 1280)
    old_b = base_weights["classifier.bias"]    # (38,)

    # 3. Competitive training with real negatives
    print("\n" + "=" * 60)
    print("Step 3: Competitive training (pumpkin vs real PlantVillage negatives)")
    print("=" * 60)
    new_weights, new_biases = train_competitive(
        pos_features, pos_labels, neg_features, old_w, old_b, epochs=args.epochs
    )

    # 4. Patch ONNX graph
    print("\n" + "=" * 60)
    print("Step 4: Patching ONNX model (38 → 43 classes)")
    print("=" * 60)
    patch_onnx(model_path, new_weights, new_biases, output_path)

    # 5. Validate on held-out test split (different from training data)
    print("\n" + "=" * 60)
    print("Step 5: Validation on test split")
    print("=" * 60)
    test_paths, test_labels = collect_dataset(test_root)
    validate(output_path, test_paths if test_paths else image_paths,
             test_labels if test_labels else labels)

    print("\n" + "=" * 60)
    print("DONE")
    print(f"New model: {output_path}")
    print("Next steps:")
    print("  1. cp assets/models/plant_disease_v2.onnx assets/models/plant_disease.onnx")
    print("  2. npx expo run:ios  (or run:android)")
    print("=" * 60)


if __name__ == "__main__":
    main()
