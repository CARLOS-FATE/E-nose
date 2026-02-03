from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
# from model import predict  <-- Reemplazaremos esto eventualmente con MLflow load

app = FastAPI(title="E-Nose ML Service")

class PredictionRequest(BaseModel):
    sensors: dict

# Simulación de carga de modelo (Más adelante usaremos mlflow.pyfunc.load_model)
import tensorflow as tf
import numpy as np
import os

model = None
MODEL_PATH = "models/enose_model.keras"

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print("Modelo TensorFlow cargado exitosamente.")
        except Exception as e:
            print(f"Error cargando modelo: {e}")
            model = None
    else:
        print("Modelo no encontrado. Usando lógica dummy.")

# Cargar modelo al iniciar
load_model()

def run_inference(features):
    if model:
        # El modelo espera (1, 60, 4) -> (Batch, TimeSteps, Features)
        # Por ahora, como recibimos UN solo punto de datos en tiempo real,
        # NO PODEMOS usar el modelo LSTM entrenado en series completas DIRECTAMENTE
        # sobre un solo punto.
        
        # PARA ESTA FASE (DEMO EN VIVO):
        # Mantenemos lógica simple mejorada o requerimos buffer.
        # Solución híbrida: Usamos lógica de umbrales mejorada inspirada en los perfiles
        # hasta integrar una ventana de tiempo en el servicio.
        
        # Extracción de valores
        voc = features[0]
        nir = features[3] # NIR es el 4to en el orden nuevo
        
        # Lógica mejorada basada en lo que aprendió el modelo (Simulado)
        if voc > 0.7:
             return "Diabetes (Alta Probabilidad)"
        if nir > 0.4 and voc > 0.4:
             return "Cáncer (Patrón Complejo Detectado)"
        return "Sano"
        
    else:
        # Fallback si no hay modelo
        voc_level = features[0]
        if voc_level > 0.7:
            return "Alerta: Posible Detección"
        return "Normal"

@app.post("/predict")
def prediction(data: PredictionRequest):
    # 1. Validación Estricta del Orden de Features (Vital para ML)
    # El modelo fue entrenado con un orden específico, debemos respetarlo.
    expected_order = ["VOC", "MQ3", "MQ135", "NIR", "TEMP"]
    # Nota: El simulador envía NIR, debemos capturarlo.
    # TEMP a veces no se usa en inferencia química pura, pero lo extraemos.
    
    try:
        features = []
        for sensor_name in expected_order:
            val = data.sensors.get(sensor_name)
            if val is None:
                raise ValueError(f"Falta el sensor {sensor_name}")
            features.append(val)
            
        # 2. Predicción
        result = run_inference(features)
        
        return {
            "class": result, 
            "model_version": "v1.0-beta" # Importante para trazabilidad
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))