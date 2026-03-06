"""
E-NOSE ML Prediction Service v2.0
Ensemble prediction: Random Forest + LSTM con reglas clínicas de validación.
Clasifica 12 condiciones médicas a partir de lecturas de sensores VOC.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tensorflow as tf
import numpy as np
import joblib
import os
import json
from collections import deque

from feature_extraction import extract_features

app = FastAPI(title="E-Nose ML Service v2.0")

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════

LSTM_PATH = "models/enose_model.keras"
RF_PATH = "models/enose_rf.joblib"
META_PATH = "models/model_metadata.json"

# Clases por defecto (se sobreescriben si existe metadata)
CLASS_NAMES = [
    "Sano", "Periodontitis", "Gingivitis", "Halitosis",
    "Diabetes", "EPOC", "Asma", "H. pylori",
    "Cancer Pulmon", "Cancer Gastrico", "Cancer Colorrectal", "Cancer Prostata",
]

# Pesos del ensemble
RF_WEIGHT = 0.4
LSTM_WEIGHT = 0.6

# Buffer de lecturas para inferencia LSTM (necesita ventana de 60 puntos)
reading_buffer = deque(maxlen=60)

# ═══════════════════════════════════════════════════════════════════════
# CARGA DE MODELOS
# ═══════════════════════════════════════════════════════════════════════

lstm_model = None
rf_model = None
model_metadata = None


def load_models():
    """Carga ambos modelos y metadata."""
    global lstm_model, rf_model, model_metadata, CLASS_NAMES

    # Metadata
    if os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            model_metadata = json.load(f)
            CLASS_NAMES = model_metadata.get("classes", CLASS_NAMES)
        print(f"✅ Metadata cargada: {len(CLASS_NAMES)} clases")

    # LSTM
    if os.path.exists(LSTM_PATH):
        try:
            lstm_model = tf.keras.models.load_model(LSTM_PATH)
            print("✅ Modelo LSTM cargado")
        except Exception as e:
            print(f"⚠️  Error cargando LSTM: {e}")

    # Random Forest
    if os.path.exists(RF_PATH):
        try:
            rf_model = joblib.load(RF_PATH)
            print("✅ Modelo RF cargado")
        except Exception as e:
            print(f"⚠️  Error cargando RF: {e}")

    if not lstm_model and not rf_model:
        print("ℹ️  Ningún modelo entrenado encontrado. Usando lógica de umbrales.")


# Cargar al iniciar
load_models()


# ═══════════════════════════════════════════════════════════════════════
# REGLAS CLÍNICAS DE VALIDACIÓN
# ═══════════════════════════════════════════════════════════════════════

CLINICAL_RULES = {
    "Diabetes":     lambda s: s.get("VOC", 0) > 0.55,
    "Halitosis":    lambda s: s.get("MQ135", 0) > 0.60,
    "Periodontitis": lambda s: s.get("MQ135", 0) > 0.45,
    "EPOC":         lambda s: s.get("MQ135", 0) > 0.35 and s.get("MQ3", 0) > 0.20,
    "H. pylori":    lambda s: s.get("MQ135", 0) > 0.45,
}


def validate_prediction(prediction: str, sensors: dict) -> tuple:
    """Valida la predicción contra reglas clínicas. Retorna (predicción, validada)."""
    rule = CLINICAL_RULES.get(prediction)
    if rule and not rule(sensors):
        return prediction, False
    return prediction, True


# ═══════════════════════════════════════════════════════════════════════
# LÓGICA DE UMBRALES (Fallback sin modelo)
# ═══════════════════════════════════════════════════════════════════════

def threshold_inference(sensors: dict) -> tuple:
    """Inferencia basada en umbrales cuando no hay modelos entrenados."""
    voc = sensors.get("VOC", 0)
    mq3 = sensors.get("MQ3", 0)
    mq135 = sensors.get("MQ135", 0)
    nir = sensors.get("NIR", 0)

    # Diabetes: Acetona alta
    if voc > 0.70:
        return "Diabetes", min(95, 70 + voc * 30)

    # Halitosis: H₂S muy alto
    if mq135 > 0.70 and voc < 0.55:
        return "Halitosis", min(90, 60 + mq135 * 35)

    # Periodontitis: H₂S moderado-alto + VOC moderado
    if mq135 > 0.55 and voc > 0.35:
        return "Periodontitis", min(85, 55 + mq135 * 30)

    # Gingivitis: H₂S moderado
    if mq135 > 0.45 and voc > 0.25:
        return "Gingivitis", min(80, 50 + mq135 * 30)

    # EPOC: MQ3 + MQ135 elevados
    if mq3 > 0.25 and mq135 > 0.45:
        return "EPOC", min(80, 50 + mq3 * 50)

    # H. pylori: MQ135 elevado (NH₃) sin otros marcadores altos
    if mq135 > 0.50 and voc < 0.45:
        return "H. pylori", min(75, 45 + mq135 * 40)

    # Cáncer (NIR complejo)
    if nir > 0.50 and voc > 0.45:
        if mq3 > 0.20:
            return "Cancer Pulmon", min(70, 40 + nir * 40)
        if mq135 > 0.50:
            return "Cancer Gastrico", min(70, 40 + nir * 35)
        return "Cancer Colorrectal", min(65, 35 + nir * 35)

    if nir > 0.45 and voc < 0.35:
        return "Cancer Prostata", min(65, 35 + nir * 40)

    # Asma: MQ135 leve + VOC leve
    if mq135 > 0.38 and voc > 0.28:
        return "Asma", min(70, 40 + mq135 * 35)

    # Sano
    return "Sano", min(99, 85 + (1.0 - voc) * 15)


# ═══════════════════════════════════════════════════════════════════════
# INFERENCIA ENSEMBLE
# ═══════════════════════════════════════════════════════════════════════

def ensemble_predict(sensors: dict) -> dict:
    """Predicción usando ensemble RF + LSTM o fallback a umbrales."""

    # Agregar lectura al buffer
    reading = [
        sensors.get("VOC", 0),
        sensors.get("MQ3", 0),
        sensors.get("MQ135", 0),
        sensors.get("NIR", 0),
    ]
    reading_buffer.append(reading)

    # Si no hay modelos, usar umbrales
    if not lstm_model and not rf_model:
        pred_class, confidence = threshold_inference(sensors)
        pred_class, validated = validate_prediction(pred_class, sensors)
        return {
            "class": pred_class,
            "confidence": round(confidence, 1),
            "validated": validated,
            "method": "threshold",
            "model_version": "v2.0-threshold",
        }

    # Construir session array desde buffer
    if len(reading_buffer) < 60:
        # Buffer incompleto: pad con ceros y usar umbrales como principal
        pred_class, confidence = threshold_inference(sensors)
        return {
            "class": pred_class,
            "confidence": round(confidence, 1),
            "validated": True,
            "method": "threshold (buffer llenándose)",
            "model_version": "v2.0-buffering",
            "buffer_fill": f"{len(reading_buffer)}/60",
        }

    # Buffer completo: inferencia ensemble
    session_arr = np.array(list(reading_buffer), dtype=np.float32)  # (60, 4)

    probs = np.zeros(len(CLASS_NAMES))

    # RF: extraer features
    if rf_model:
        # Necesitamos (60, 5) para feature_extraction, añadir TEMP como 0
        session_with_temp = np.column_stack([session_arr, np.zeros(60)])
        features = extract_features(session_with_temp)
        rf_probs = rf_model.predict_proba(features.reshape(1, -1))[0]
        probs += RF_WEIGHT * rf_probs

    # LSTM
    if lstm_model:
        lstm_probs = lstm_model.predict(session_arr.reshape(1, 60, 4), verbose=0)[0]
        probs += LSTM_WEIGHT * lstm_probs

    pred_idx = int(np.argmax(probs))
    pred_class = CLASS_NAMES[pred_idx]
    confidence = float(np.max(probs)) * 100

    # Validar contra reglas clínicas
    pred_class, validated = validate_prediction(pred_class, sensors)

    return {
        "class": pred_class,
        "confidence": round(confidence, 1),
        "validated": validated,
        "method": "ensemble (RF+LSTM)",
        "model_version": "v2.0-ensemble",
        "probabilities": {CLASS_NAMES[i]: round(float(probs[i]) * 100, 1) for i in range(len(CLASS_NAMES))},
    }


# ═══════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

class PredictionRequest(BaseModel):
    sensors: dict


@app.post("/predict")
def prediction(data: PredictionRequest):
    try:
        result = ensemble_predict(data.sensors)
        print(f"🔬 Predicción: {result['class']} ({result['confidence']}%) [{result['method']}]")
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ml-service",
        "lstm_loaded": lstm_model is not None,
        "rf_loaded": rf_model is not None,
        "classes": CLASS_NAMES,
        "buffer_size": len(reading_buffer),
    }


@app.post("/reload")
def reload_models():
    """Recarga modelos sin reiniciar el servicio."""
    load_models()
    return {
        "status": "reloaded",
        "lstm_loaded": lstm_model is not None,
        "rf_loaded": rf_model is not None,
    }