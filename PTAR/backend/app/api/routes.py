import tempfile
import pandas as pd
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from fpdf import FPDF

from app.core.database import get_db, Sample
from ml.engine import predict_sample, train_models
from ml.rules import get_intelligence

router = APIRouter()

class SensorData(BaseModel):
    ph: float = Field(..., description="pH del agua (0-14)")
    dqo: float = Field(..., description="Demanda Química de Oxígeno")
    turbidez: float = Field(..., description="Turbidez del agua")

    @field_validator('ph')
    def ph_must_be_valid(cls, v):
        if v < 0 or v > 14:
            raise ValueError('pH ilógico detectado. Los valores válidos son de 0 a 14.')
        return v
        
    @field_validator('turbidez', 'dqo')
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Se detectaron lecturas negativas ilógicas en el sensor.')
        return v

class SampleCreate(BaseModel):
    raw_data: SensorData

class SampleResponse(BaseModel):
    id: int
    timestamp: Any
    raw_data: dict
    dbo_predicho: Optional[float]
    es_anomalia: Optional[bool]
    nivel_alerta: Optional[int]
    sugerencia_ia: Optional[str]
    consecuencias_texto: Optional[str]
    
    class Config:
        from_attributes = True

@router.post("/samples/", response_model=SampleResponse)
def create_sample(sample: SampleCreate, db: Session = Depends(get_db)):
    ph = sample.raw_data.ph
    dqo = sample.raw_data.dqo
    turbidez = sample.raw_data.turbidez
    
    # 1. Realizar predicción ML
    try:
        pred_result = predict_sample(ph, dqo, turbidez)
    except Exception as e:
        # Fallback si no hay modelo, guardamos sin prediccion
        pred_result = {"dbo_predicho": None, "clasificacion": None, "es_anomalia": None}
        
    # 2. Intelligence Module (Reglas sobre la predicción)
    intel_result = get_intelligence(
        clasificacion=pred_result.get("clasificacion"),
        es_anomalia=pred_result.get("es_anomalia"),
        ph=ph
    )

    # 3. Guardar en Base de Datos
    db_sample = Sample(
        raw_data={"ph": ph, "dqo": dqo, "turbidez": turbidez},
        dbo_predicho=pred_result.get("dbo_predicho"),
        es_anomalia=pred_result.get("es_anomalia"),
        nivel_alerta=intel_result.get("nivel_alerta"),
        sugerencia_ia=intel_result.get("sugerencia_ia"),
        consecuencias_texto=intel_result.get("consecuencias_texto")
    )
    db.add(db_sample)
    db.commit()
    db.refresh(db_sample)
    return db_sample

@router.get("/samples/", response_model=List[SampleResponse])
def read_samples(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    samples = db.query(Sample).order_by(Sample.id.desc()).offset(skip).limit(limit).all()
    return samples

@router.post("/ml/train")
def retrain_model(db: Session = Depends(get_db)):
    # Obtener datos de entrenamiento
    samples = db.query(Sample).filter(Sample.dbo_real.isnot(None), Sample.clasificacion_real.isnot(None)).all()
    
    if len(samples) < 10:
        raise HTTPException(status_code=400, detail="No hay suficientes datos etiquetados para entrenar (mínimo 10).")
        
    data = []
    for s in samples:
        # Extract variables from JSON raw_data safely
        r_data = s.raw_data if isinstance(s.raw_data, dict) else {}
        data.append({
            "ph": r_data.get("ph", 7.0),
            "dqo": r_data.get("dqo", 0.0),
            "turbidez": r_data.get("turbidez", 0.0),
            "dbo": s.dbo_real,
            "clasificacion": s.clasificacion_real
        })
        
    df = pd.DataFrame(data)
    
    try:
        metrics = train_models(df)
        return {"message": "Modelos reentrenados exitosamente", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante entrenamiento: {str(e)}")

@router.post("/ml/predict")
def predict_realtime(sample: SampleCreate):
    try:
        ph = sample.raw_data.ph
        dqo = sample.raw_data.dqo
        turbidez = sample.raw_data.turbidez
        
        result = predict_sample(ph, dqo, turbidez)
        intel = get_intelligence(result.get("clasificacion"), result.get("es_anomalia"), ph)
        
        return {**result, "intelligence": intel}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/pdf/{sample_id}")
def generate_report(sample_id: int, db: Session = Depends(get_db)):
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, f"Reporte de Inteligencia E-NOSE - Muestra #{sample.id}", new_x="LMARGIN", new_y="NEXT", align="C")
    
    pdf.set_font("helvetica", "", 12)
    pdf.ln(10) # line break
    
    r_data = sample.raw_data if isinstance(sample.raw_data, dict) else {}
    
    pdf.cell(0, 10, f"Fecha de registro: {sample.timestamp}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"pH: {r_data.get('ph')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"DQO: {r_data.get('dqo')} mg/L", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Turbidez: {r_data.get('turbidez')} NTU", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, f"Resultados del Modelo AI:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    
    anomalia_str = "Sí" if sample.es_anomalia else "No"
    
    pdf.cell(0, 10, f"Anomalía Detectada: {anomalia_str}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"DBO Estimado: {sample.dbo_predicho} mg/L", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, f"Módulo de Inteligencia (Nivel {sample.nivel_alerta}):", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "I", 12)
    pdf.multi_cell(0, 10, f"Sugerencia Causal: {sample.sugerencia_ia}", new_x="LMARGIN", new_y="NEXT")
    pdf.multi_cell(0, 10, f"Consecuencia Estimada: {sample.consecuencias_texto}", new_x="LMARGIN", new_y="NEXT")
    
    # Save to temp
    temp_path = tempfile.mktemp(suffix=".pdf")
    pdf.output(temp_path)
    
    return FileResponse(temp_path, media_type="application/pdf", filename=f"reporte_enose_{sample.id}.pdf")
