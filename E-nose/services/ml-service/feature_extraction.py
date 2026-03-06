"""
E-NOSE Feature Extraction v2.0
Extrae 15 características de una sesión de respiración de 60 segundos.

Features por canal (×4 sensores = 12):
  - Valor pico, Pendiente de subida, AUC (Área bajo la curva)

Features derivadas (3):
  - Ratio VOC/MQ3, Ratio MQ135/VOC, Varianza NIR
"""
import numpy as np


# Orden de canales en el array de sesión
CHANNEL_NAMES = ["VOC", "MQ3", "MQ135", "NIR"]
FEATURE_NAMES = [
    "VOC_peak", "VOC_slope", "VOC_auc",
    "MQ3_peak", "MQ3_slope", "MQ3_auc",
    "MQ135_peak", "MQ135_slope", "MQ135_auc",
    "NIR_peak", "NIR_slope", "NIR_auc",
    "ratio_VOC_MQ3", "ratio_MQ135_VOC", "NIR_variance",
]


def extract_features(session: np.ndarray) -> np.ndarray:
    """
    Extrae 15 características de una sesión de respiración.

    Args:
        session: np.ndarray de forma (60, 4) o (60, 5)
                 Columnas: [VOC, MQ3, MQ135, NIR, (TEMP opcional)]
    Returns:
        np.ndarray de forma (15,) con las características extraídas.
    """
    # Solo usar los primeros 4 canales (ignorar TEMP para inferencia)
    data = session[:, :4] if session.shape[1] > 4 else session

    features = []

    for ch in range(4):
        signal = data[:, ch]
        baseline = np.mean(signal[:10])  # Primeros 10s = línea base

        # 1. Valor pico
        peak = float(np.max(signal))

        # 2. Pendiente de subida (peak - baseline) / tiempo al pico
        peak_idx = int(np.argmax(signal))
        rise_time = max(peak_idx, 1)
        rise_slope = float((peak - baseline) / rise_time)

        # 3. AUC — Integral trapezoidal
        auc = float(np.trapz(signal, dx=1.0))

        features.extend([peak, rise_slope, auc])

    # ── Features derivadas ──
    voc_peak = features[0]   # VOC peak
    mq3_peak = features[3]   # MQ3 peak
    mq135_peak = features[6] # MQ135 peak

    # Ratio VOC/MQ3 — separa diabetes (alto) de EPOC
    ratio_voc_mq3 = voc_peak / max(mq3_peak, 0.01)

    # Ratio MQ135/VOC — separa oral (alto) de metabólica
    ratio_mq135_voc = mq135_peak / max(voc_peak, 0.01)

    # Varianza NIR — cáncer = alta varianza, sano = baja
    nir_variance = float(np.var(data[:, 3]))

    features.extend([ratio_voc_mq3, ratio_mq135_voc, nir_variance])

    return np.array(features, dtype=np.float32)


def session_dicts_to_array(session_dicts: list) -> np.ndarray:
    """
    Convierte una lista de dicts [{VOC, MQ3, MQ135, NIR, TEMP}, ...] a un array numpy.

    Args:
        session_dicts: Lista de 60 dicts con lecturas de sensores.
    Returns:
        np.ndarray de forma (60, 5)
    """
    arr = np.zeros((len(session_dicts), 5), dtype=np.float32)
    keys = ["VOC", "MQ3", "MQ135", "NIR", "TEMP"]
    for i, reading in enumerate(session_dicts):
        for j, key in enumerate(keys):
            arr[i, j] = reading.get(key, 0.0)
    return arr
