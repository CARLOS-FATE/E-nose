import time
import requests
import random
import math

import os

# Configuración de URL flexible para Docker y local
URL = os.getenv("INGEST_URL", "http://localhost:8000/ingest")

def generate_breath_curve(t, peak_value):
    """Simula la curva de respuesta de un sensor MOS (Metal Oxide)"""
    # Función simple de ataque y decaimiento
    if t < 10: return 0.1 # Línea base
    if t < 20: return 0.1 + (peak_value - 0.1) * ((t-10)/10) # Subida
    if t < 30: return peak_value + random.uniform(-0.01, 0.01) # Meseta con ruido
    return 0.1 + (peak_value - 0.1) * math.exp(-(t-30)/5) # Recuperación

def generate_nir_signal(t, condition):
    """Simula señal de espectroscopía NIR (Near Infrared)"""
    # El cáncer genera patrones de absorción específicos en NIR debido a compuestos complejos
    if condition == "CANCER":
        # Patrón oscilatorio complejo específico
        return 0.5 + 0.3 * math.sin(t/5) + 0.1 * math.cos(t/2)
    elif condition == "DIABETES":
        # Patrón plano pero elevado diferente al basal
        return 0.4 + 0.05 * math.sin(t/10)
    else:
        # Sano: Ruido de fondo bajo
        return 0.1 + 0.05 * random.random()

# Definición de perfiles de pacientes
PROFILES = [
    {"condition": "DIABETES", "voc_peak": 0.85, "mq3_peak": 0.3},
    {"condition": "CANCER", "voc_peak": 0.6, "mq3_peak": 0.2}, # Cancer puede no tener tanto acetona
    {"condition": "HEALTHY", "voc_peak": 0.2, "mq3_peak": 0.15}
]

# Seleccionar un perfil al azar para esta sesión de simulación
current_profile = random.choice(PROFILES)
print(f"Iniciando simulación: Paciente con {current_profile['condition']}")
start_time = time.time()

# Simulación de un ciclo de respiración (60 segundos)
for i in range(60):
    # Simulamos valores basados en el perfil
    voc_val = generate_breath_curve(i, peak_value=current_profile["voc_peak"]) 
    mq3_val = generate_breath_curve(i, peak_value=current_profile["mq3_peak"])
    nir_val = generate_nir_signal(i, current_profile["condition"]) 
    # Simulamos otros gases normales
    
    # Añadimos un poco de ruido eléctrico aleatorio (Realismo)
    noise = random.uniform(-0.02, 0.02)
    
    payload = {
        "device_id": f"EN-001-{current_profile['condition']}",
        "timestamp": time.time(),
        "sensors": {
            "VOC": max(0, voc_val + noise),
            "MQ3": max(0, mq3_val + noise),
            "MQ135": random.uniform(0.3, 0.35), # Estable
            "NIR": max(0, nir_val + noise), # Nuevo sensor NIR
            "TEMP": random.uniform(36.5, 37.0) # Temp corporal
        }
    }
    
    try:
        r = requests.post(URL, json=payload)
        print(f"T={i}s | Estado: {r.status_code} | {r.json().get('message')}")
    except Exception as e:
        print(f"Error de conexión: {e}")
        
    time.sleep(1) # 1 dato por segundo