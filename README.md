# Smart Agriculture — Crop Disease Detection

A runnable full-stack starter project with:
- React + Vite frontend
- FastAPI backend
- TensorFlow/Keras model integration (optional)
- Demo fallback predictions when no trained model is installed
- Disease information, symptoms, prevention and safety-focused treatment guidance
- Upload an image or use a device camera

> Important: The built-in demo mode is only a UI/API integration fallback and does not perform real image diagnosis. For real predictions, train or obtain a compatible model and place it at `backend/models/crop_disease_model.keras` with matching class names in `backend/models/class_names.json`. Predictions and confidence scores are not a substitute for an agricultural expert. Pesticide choices and use must follow local registration and product-label instructions.

## Requirements
- Node.js 18+
- Python 3.10–3.12 recommended

## Run backend (Windows PowerShell)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API docs: http://127.0.0.1:8000/docs

If TensorFlow installation fails on your Python version, use Python 3.11 in a new virtual environment or run the backend without TensorFlow installed; demo mode will still run.

## Run frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the URL Vite prints, usually http://localhost:5173.

## Add a trained model
1. Place the model at `backend/models/crop_disease_model.keras`.
2. Create `backend/models/class_names.json`, for example:
```json
[
  "Tomato___Early_blight",
  "Tomato___Late_blight",
  "Tomato___healthy"
]
```
3. Install TensorFlow using the supported version for your Python environment.
4. Restart the backend. The API uses the class names in order; they must match training exactly.

The model must accept RGB images resized to 224×224 and return one score per class. If it outputs logits rather than probabilities, adapt `predict_with_model()` in `backend/app/model_service.py`.

## API
- `GET /api/health` — backend status
- `GET /api/diseases` — sample disease guide
- `POST /api/predict` — multipart image upload, returns prediction and care suggestions

## Project structure
```text
Smart_Agriculture_Crop_Disease/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── model_service.py
│   │   └── disease_data.py
│   ├── models/
│   │   └── class_names.example.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```
