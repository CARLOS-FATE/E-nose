from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import requests
import os
from datetime import datetime

app = FastAPI(title="E-Nose Ingest API")

# ─── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── InfluxDB Config ──────────────────────────────────────────────
INFLUX_URL = os.getenv("INFLUX_URL", "http://influxdb:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG", "enose_org")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "sensor_data")
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001")

client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
write_api = client.write_api(write_options=SYNCHRONOUS)
query_api = client.query_api()

# ─── In-memory latest reading cache ──────────────────────────────
latest_reading = {
    "timestamp": None,
    "sensors": {"VOC": 0, "MQ3": 0, "MQ135": 0, "NIR": 0, "TEMP": 0},
    "device_id": "---",
    "prediction": {"class": "Esperando datos...", "model_version": "---"},
}


class SensorData(BaseModel):
    device_id: str
    timestamp: float
    sensors: dict


def process_prediction(data: dict):
    """Runs ML prediction in background and caches the result."""
    global latest_reading
    try:
        response = requests.post(f"{ML_SERVICE_URL}/predict", json=data)
        result = response.json()
        latest_reading["prediction"] = result
        print(f"Predicción para {data['device_id']}: {result}")
    except Exception as e:
        print(f"Error conectando con ML Service: {e}")


# ─── Ingest endpoint (existing, improved) ─────────────────────────
@app.post("/ingest")
def ingest(data: SensorData, background_tasks: BackgroundTasks):
    global latest_reading
    try:
        point = (
            Point("breath_sample")
            .tag("device_id", data.device_id)
            .field("VOC", float(data.sensors.get("VOC", 0)))
            .field("MQ3", float(data.sensors.get("MQ3", 0)))
            .field("MQ135", float(data.sensors.get("MQ135", 0)))
            .field("NIR", float(data.sensors.get("NIR", 0)))
            .field("TEMP", float(data.sensors.get("TEMP", 0)))
            .time(datetime.utcnow())
        )
        write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)

        # Cache latest reading for /api/latest
        latest_reading["timestamp"] = datetime.utcnow().isoformat()
        latest_reading["sensors"] = data.sensors
        latest_reading["device_id"] = data.device_id

        background_tasks.add_task(process_prediction, data.dict())

        return {"status": "accepted", "message": "Datos guardados y procesando"}
    except Exception as e:
        print(f"Error en ingesta: {e}")
        raise HTTPException(status_code=500, detail="Error procesando datos")


# ─── NEW: Latest reading endpoint ─────────────────────────────────
@app.get("/api/latest")
def get_latest():
    """Returns the most recent sensor reading and its ML prediction."""
    return latest_reading


# ─── NEW: History endpoint ─────────────────────────────────────────
@app.get("/api/history")
def get_history(minutes: int = Query(default=5, ge=1, le=60)):
    """Returns sensor history from InfluxDB for the last N minutes."""
    try:
        flux_query = f'''
        from(bucket: "{INFLUX_BUCKET}")
            |> range(start: -{minutes}m)
            |> filter(fn: (r) => r._measurement == "breath_sample")
            |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"])
            |> limit(n: 300)
        '''
        result = query_api.query(flux_query, org=INFLUX_ORG)
        records = []
        for table in result:
            for record in table.records:
                records.append({
                    "time": record.get_time().isoformat(),
                    "VOC": record.values.get("VOC", 0),
                    "MQ3": record.values.get("MQ3", 0),
                    "MQ135": record.values.get("MQ135", 0),
                    "NIR": record.values.get("NIR", 0),
                    "TEMP": record.values.get("TEMP", 0),
                    "device_id": record.values.get("device_id", ""),
                })
        return {"data": records, "count": len(records)}
    except Exception as e:
        print(f"Error querying history: {e}")
        return {"data": [], "count": 0, "error": str(e)}


# ─── Health check ──────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "ingest-api"}


@app.on_event("shutdown")
def shutdown_db_client():
    client.close()