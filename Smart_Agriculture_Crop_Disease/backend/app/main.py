import os
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .disease_data import DISEASES, lookup_disease
from . import chat_service, weather_service
from .model_service import validate_and_open_image, predict_with_model, demo_prediction

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

app = FastAPI(
    title="Smart Agriculture Crop Disease API",
    description="Crop disease image prediction and starter care guidance API.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Smart Agriculture API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    from .model_service import MODEL_PATH, CLASS_NAMES_PATH, load_model_if_available
    model_ready = load_model_if_available()
    return {
        "status": "ok",
        "model_ready": model_ready,
        "model_path_exists": MODEL_PATH.exists(),
        "class_names_path_exists": CLASS_NAMES_PATH.exists(),
        "mode": "trained_model" if model_ready else "demo_no_model",
        "chat_ai": chat_service.claude_available()
    }

@app.get("/api/diseases")
def diseases():
    return {"items": list(DISEASES.values())}

@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Please upload an image file.")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Image too large. Maximum size is {MAX_UPLOAD_MB} MB.")
    try:
        image = validate_and_open_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    prediction = predict_with_model(image)
    if prediction is None:
        prediction = demo_prediction(image)
        disease = lookup_disease(prediction["class_name"])
        return JSONResponse({
            "mode": "demo",
            "warning": "DEMO MODE: No trained model is installed. This is a sample result, not a diagnosis. Add a compatible trained model before using this for real crops.",
            "crop": disease["crop"],
            "disease": disease["disease"],
            "confidence": None,
            "severity": "Not assessed",
            "symptoms": disease["symptoms"],
            "prevention": disease["prevention"],
            "care": disease["care"],
            "filename": file.filename
        })

    class_name = prediction["class_name"]
    confidence = max(0.0, min(1.0, prediction["confidence"]))
    disease = lookup_disease(class_name)
    if confidence < 0.60:
        note = "Low-confidence prediction. Do not treat based on this result alone; upload a clearer image or consult an agricultural expert."
    else:
        note = "Model prediction only. Verify symptoms on the whole plant before deciding on treatment."
    return {
        "mode": "model",
        "warning": note,
        "crop": disease["crop"],
        "disease": disease["disease"],
        "confidence": round(confidence * 100, 2),
        "severity": "Not assessed",
        "symptoms": disease["symptoms"],
        "prevention": disease["prevention"],
        "care": disease["care"],
        "filename": file.filename
    }


class ChatMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    scan_context: Optional[str] = Field(default="", max_length=600)

@app.post("/api/chat")
def chat(req: ChatRequest):
    msgs = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")][-10:]
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    if not msgs or msgs[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="Send at least one user message.")
    return chat_service.answer(msgs, req.scan_context or "")

@app.get("/api/weather")
def weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    try:
        return weather_service.get_weather(lat, lon)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach the weather service. Check your internet connection.")

@app.get("/api/geocode")
def geocode(q: str = Query(..., min_length=2, max_length=80)):
    try:
        return {"results": weather_service.search_places(q)}
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach the location search service.")