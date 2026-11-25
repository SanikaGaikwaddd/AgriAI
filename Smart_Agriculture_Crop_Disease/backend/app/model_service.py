import json
import os
from pathlib import Path
from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(BASE_DIR / "models" / "crop_disease_model.keras")))
CLASS_NAMES_PATH = Path(os.getenv("CLASS_NAMES_PATH", str(BASE_DIR / "models" / "class_names.json")))

_model = None
_class_names = None
_model_error = None

def load_model_if_available():
    global _model, _class_names, _model_error
    if _model is not None:
        return True
    if not MODEL_PATH.exists() or not CLASS_NAMES_PATH.exists():
        return False
    try:
        import tensorflow as tf
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            _class_names = json.load(f)
        _model = tf.keras.models.load_model(MODEL_PATH)
        return True
    except Exception as exc:
        _model_error = str(exc)
        return False

def validate_and_open_image(raw: bytes):
    try:
        image = Image.open(BytesIO(raw))
        image.verify()
        image = Image.open(BytesIO(raw)).convert("RGB")
        if image.width < 64 or image.height < 64:
            raise ValueError("Image is too small. Please upload an image at least 64 × 64 pixels.")
        return image
    except (UnidentifiedImageError, OSError):
        raise ValueError("This file is not a valid image. Please upload a JPG, PNG, or WEBP image.")

def predict_with_model(image: Image.Image):
    if not load_model_if_available():
        return None
    resized = image.resize((224, 224))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    batch = np.expand_dims(array, axis=0)
    scores = np.asarray(_model.predict(batch, verbose=0))[0]
    # Assumes model returns probabilities (e.g. softmax output).
    idx = int(np.argmax(scores))
    return {
        "class_name": str(_class_names[idx]),
        "confidence": float(scores[idx]),
        "mode": "model"
    }

def demo_prediction(image: Image.Image):
    # Deterministic, clearly labeled fallback; not image analysis.
    # It avoids pretending to diagnose a real uploaded leaf without a trained model.
    return {
        "class_name": "Tomato___Early_blight",
        "confidence": 0.0,
        "mode": "demo"
    }
