"""
E-NOSE Device Simulator v2.0
Genera datos sintéticos de 12 perfiles de enfermedades para entrenamiento y demo.
Cada sesión simula 60 segundos de respiración con curvas de ataque/decaimiento realistas.
"""
import time
import requests
import random
import math
import os
import json

URL = os.getenv("INGEST_URL", "http://localhost:8000/ingest")

# ═══════════════════════════════════════════════════════════════════════
# PERFILES DE ENFERMEDADES
# Basado en literatura de biomarcadores VOC en aliento
# ═══════════════════════════════════════════════════════════════════════

DISEASE_PROFILES = {
    # ── Sano (Control) ──────────────────────────────────────────────
    "Sano": {
        "voc_peak": 0.20, "mq3_peak": 0.15, "mq135_peak": 0.30,
        "nir_pattern": "flat_low", "temp": (36.5, 37.0),
    },

    # ── Enfermedades Orales ─────────────────────────────────────────
    "Periodontitis": {
        "voc_peak": 0.45, "mq3_peak": 0.18, "mq135_peak": 0.65,
        "nir_pattern": "flat_low", "temp": (36.5, 37.2),
    },
    "Gingivitis": {
        "voc_peak": 0.35, "mq3_peak": 0.16, "mq135_peak": 0.50,
        "nir_pattern": "flat_low", "temp": (36.8, 37.5),
    },
    "Halitosis": {
        "voc_peak": 0.50, "mq3_peak": 0.17, "mq135_peak": 0.80,
        "nir_pattern": "flat_low", "temp": (36.5, 37.0),
    },

    # ── Metabólica ──────────────────────────────────────────────────
    "Diabetes": {
        "voc_peak": 0.85, "mq3_peak": 0.20, "mq135_peak": 0.32,
        "nir_pattern": "flat_mid", "temp": (36.5, 37.0),
    },

    # ── Respiratorias ───────────────────────────────────────────────
    "EPOC": {
        "voc_peak": 0.50, "mq3_peak": 0.30, "mq135_peak": 0.55,
        "nir_pattern": "slight_osc", "temp": (36.5, 37.0),
    },
    "Asma": {
        "voc_peak": 0.35, "mq3_peak": 0.18, "mq135_peak": 0.45,
        "nir_pattern": "flat_mid", "temp": (36.5, 37.0),
    },

    # ── Gastrointestinal ────────────────────────────────────────────
    "H. pylori": {
        "voc_peak": 0.40, "mq3_peak": 0.15, "mq135_peak": 0.60,
        "nir_pattern": "flat_low", "temp": (36.5, 37.0),
    },

    # ── Cáncer (Screening Experimental) ─────────────────────────────
    "Cancer Pulmon": {
        "voc_peak": 0.55, "mq3_peak": 0.25, "mq135_peak": 0.45,
        "nir_pattern": "complex_osc", "temp": (36.5, 37.0),
    },
    "Cancer Gastrico": {
        "voc_peak": 0.45, "mq3_peak": 0.18, "mq135_peak": 0.58,
        "nir_pattern": "medium_osc", "temp": (36.5, 37.0),
    },
    "Cancer Colorrectal": {
        "voc_peak": 0.42, "mq3_peak": 0.17, "mq135_peak": 0.48,
        "nir_pattern": "medium_osc", "temp": (36.5, 37.0),
    },
    "Cancer Prostata": {
        "voc_peak": 0.30, "mq3_peak": 0.16, "mq135_peak": 0.38,
        "nir_pattern": "complex_osc", "temp": (36.5, 37.0),
    },
}

# Nombres de clases en orden fijo (corresponde a los índices del modelo)
CLASS_NAMES = list(DISEASE_PROFILES.keys())


# ═══════════════════════════════════════════════════════════════════════
# GENERADORES DE SEÑAL
# ═══════════════════════════════════════════════════════════════════════

def generate_breath_curve(t, peak_value):
    """Simula curva de respuesta de un sensor MOS (ataque y decaimiento)."""
    if t < 10:
        return 0.1  # Línea base
    if t < 20:
        return 0.1 + (peak_value - 0.1) * ((t - 10) / 10)  # Subida
    if t < 30:
        return peak_value + random.uniform(-0.01, 0.01)  # Meseta con micro-ruido
    return 0.1 + (peak_value - 0.1) * math.exp(-(t - 30) / 5)  # Recuperación


def generate_nir_signal(t, pattern):
    """Genera señal NIR según el patrón de la enfermedad."""
    if pattern == "flat_low":
        return 0.10 + 0.05 * random.random()
    elif pattern == "flat_mid":
        return 0.40 + 0.05 * math.sin(t / 10)
    elif pattern == "slight_osc":
        return 0.35 + 0.10 * math.sin(t / 7)
    elif pattern == "medium_osc":
        return 0.45 + 0.15 * math.sin(t / 5) + 0.05 * math.cos(t / 3)
    elif pattern == "complex_osc":
        return 0.50 + 0.30 * math.sin(t / 5) + 0.10 * math.cos(t / 2)
    return 0.10


def generate_session(profile, noise_level=0.02):
    """Genera una sesión completa de 60 segundos para un perfil dado."""
    session = []
    for t in range(60):
        noise = random.uniform(-noise_level, noise_level)
        voc = max(0, generate_breath_curve(t, profile["voc_peak"]) + noise)
        mq3 = max(0, generate_breath_curve(t, profile["mq3_peak"]) + noise)
        mq135 = max(0, generate_breath_curve(t, profile["mq135_peak"]) + noise * 0.5)
        nir = max(0, generate_nir_signal(t, profile["nir_pattern"]) + noise * 0.3)
        temp = random.uniform(*profile["temp"])
        session.append({"VOC": voc, "MQ3": mq3, "MQ135": mq135, "NIR": nir, "TEMP": temp})
    return session


# ═══════════════════════════════════════════════════════════════════════
# EJECUCIÓN PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Seleccionar un perfil al azar
    condition = random.choice(CLASS_NAMES)
    profile = DISEASE_PROFILES[condition]

    print(f"╔══════════════════════════════════════════════╗")
    print(f"║  E-NOSE Simulador v2.0                      ║")
    print(f"║  Condición: {condition:<33}║")
    print(f"║  VOC peak={profile['voc_peak']:.2f}  MQ3={profile['mq3_peak']:.2f}  "
          f"MQ135={profile['mq135_peak']:.2f}   ║")
    print(f"╚══════════════════════════════════════════════╝")

    session = generate_session(profile)

    for i, reading in enumerate(session):
        payload = {
            "device_id": f"EN-001-{condition.upper().replace(' ', '_')}",
            "timestamp": time.time(),
            "sensors": reading,
        }

        try:
            r = requests.post(URL, json=payload, timeout=5)
            status_emoji = "✅" if r.status_code == 200 else "❌"
            print(f"T={i:02d}s {status_emoji} | VOC={reading['VOC']:.3f} MQ3={reading['MQ3']:.3f} "
                  f"MQ135={reading['MQ135']:.3f} NIR={reading['NIR']:.3f}")
        except Exception as e:
            print(f"T={i:02d}s ❌ | Error: {e}")

        time.sleep(1)

    print(f"\n✅ Sesión completada: {condition}")