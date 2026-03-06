import os
from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://enose_user:enose_password@localhost:5432/enose_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(JSON, nullable=False) # Stores {"ph": x, "dqo": y, "turbidez": z}
    
    # ML outputs
    dbo_predicho = Column(Float, nullable=True)
    es_anomalia = Column(Boolean, nullable=True)
    
    # New AI Rules Base outputs
    nivel_alerta = Column(Integer, nullable=True) # 1, 2, 3, 4
    sugerencia_ia = Column(String, nullable=True)
    consecuencias_texto = Column(String, nullable=True)
    
    # Used for re-training later
    dbo_real = Column(Float, nullable=True) 
    clasificacion_real = Column(String, nullable=True)

# Dependencia para obtener la DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
