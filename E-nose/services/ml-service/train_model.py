"""
E-NOSE Training Pipeline v2.0
Genera datos sintéticos y entrena un modelo híbrido (Random Forest + LSTM)
para clasificar 12 condiciones médicas a partir de sensores de aliento.

Uso:
    python train_model.py [--samples 500] [--epochs 30]
"""
import numpy as np
import os
import sys
import argparse
import json
import joblib
import tensorflow as tf
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from feature_extraction import extract_features

# ═══════════════════════════════════════════════════════════════════════
# IMPORTAR PERFILES DEL SIMULADOR
# ═══════════════════════════════════════════════════════════════════════

# Añadir path del simulador para importar perfiles
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "simulator"))
try:
    from device_simulator import DISEASE_PROFILES, CLASS_NAMES, generate_session
except ImportError:
    # Fallback si no puede importar (ej. en Docker sin montar simulator)
    print("⚠️  No se pudo importar device_simulator. Usando perfiles embebidos.")
    # Perfiles mínimos embebidos como fallback
    import math
    import random

    DISEASE_PROFILES = {
        "Sano":              {"voc_peak": 0.20, "mq3_peak": 0.15, "mq135_peak": 0.30, "nir_pattern": "flat_low", "temp": (36.5, 37.0)},
        "Periodontitis":     {"voc_peak": 0.45, "mq3_peak": 0.18, "mq135_peak": 0.65, "nir_pattern": "flat_low", "temp": (36.5, 37.2)},
        "Gingivitis":        {"voc_peak": 0.35, "mq3_peak": 0.16, "mq135_peak": 0.50, "nir_pattern": "flat_low", "temp": (36.8, 37.5)},
        "Halitosis":         {"voc_peak": 0.50, "mq3_peak": 0.17, "mq135_peak": 0.80, "nir_pattern": "flat_low", "temp": (36.5, 37.0)},
        "Diabetes":          {"voc_peak": 0.85, "mq3_peak": 0.20, "mq135_peak": 0.32, "nir_pattern": "flat_mid", "temp": (36.5, 37.0)},
        "EPOC":              {"voc_peak": 0.50, "mq3_peak": 0.30, "mq135_peak": 0.55, "nir_pattern": "slight_osc", "temp": (36.5, 37.0)},
        "Asma":              {"voc_peak": 0.35, "mq3_peak": 0.18, "mq135_peak": 0.45, "nir_pattern": "flat_mid", "temp": (36.5, 37.0)},
        "H. pylori":         {"voc_peak": 0.40, "mq3_peak": 0.15, "mq135_peak": 0.60, "nir_pattern": "flat_low", "temp": (36.5, 37.0)},
        "Cancer Pulmon":     {"voc_peak": 0.55, "mq3_peak": 0.25, "mq135_peak": 0.45, "nir_pattern": "complex_osc", "temp": (36.5, 37.0)},
        "Cancer Gastrico":   {"voc_peak": 0.45, "mq3_peak": 0.18, "mq135_peak": 0.58, "nir_pattern": "medium_osc", "temp": (36.5, 37.0)},
        "Cancer Colorrectal":{"voc_peak": 0.42, "mq3_peak": 0.17, "mq135_peak": 0.48, "nir_pattern": "medium_osc", "temp": (36.5, 37.0)},
        "Cancer Prostata":   {"voc_peak": 0.30, "mq3_peak": 0.16, "mq135_peak": 0.38, "nir_pattern": "complex_osc", "temp": (36.5, 37.0)},
    }
    CLASS_NAMES = list(DISEASE_PROFILES.keys())

    def generate_breath_curve(t, peak_value):
        if t < 10: return 0.1
        if t < 20: return 0.1 + (peak_value - 0.1) * ((t - 10) / 10)
        if t < 30: return peak_value + random.uniform(-0.01, 0.01)
        return 0.1 + (peak_value - 0.1) * math.exp(-(t - 30) / 5)

    def generate_nir_signal(t, pattern):
        patterns = {
            "flat_low": 0.10 + 0.05 * random.random(),
            "flat_mid": 0.40 + 0.05 * math.sin(t / 10),
            "slight_osc": 0.35 + 0.10 * math.sin(t / 7),
            "medium_osc": 0.45 + 0.15 * math.sin(t / 5) + 0.05 * math.cos(t / 3),
            "complex_osc": 0.50 + 0.30 * math.sin(t / 5) + 0.10 * math.cos(t / 2),
        }
        return patterns.get(pattern, 0.10)

    def generate_session(profile, noise_level=0.02):
        session = []
        for t in range(60):
            noise = random.uniform(-noise_level, noise_level)
            session.append({
                "VOC": max(0, generate_breath_curve(t, profile["voc_peak"]) + noise),
                "MQ3": max(0, generate_breath_curve(t, profile["mq3_peak"]) + noise),
                "MQ135": max(0, generate_breath_curve(t, profile["mq135_peak"]) + noise * 0.5),
                "NIR": max(0, generate_nir_signal(t, profile["nir_pattern"]) + noise * 0.3),
                "TEMP": random.uniform(*profile["temp"]),
            })
        return session


NUM_CLASSES = len(CLASS_NAMES)


# ═══════════════════════════════════════════════════════════════════════
# GENERACIÓN DE DATASET
# ═══════════════════════════════════════════════════════════════════════

def generate_dataset(samples_per_class=500):
    """Genera dataset sintético para entrenamiento."""
    X_raw = []   # Series crudas para LSTM (N, 60, 4)
    X_feat = []  # Features extraídas para RF (N, 15)
    y = []       # Etiquetas (N,)

    print(f"\n📊 Generando {samples_per_class} muestras × {NUM_CLASSES} clases = {samples_per_class * NUM_CLASSES} total")

    for class_idx, (condition, profile) in enumerate(DISEASE_PROFILES.items()):
        for i in range(samples_per_class):
            # Variar el ruido para diversidad
            noise = 0.015 + 0.02 * np.random.random()
            session_dicts = generate_session(profile, noise_level=noise)

            # Convertir a array numpy
            session_arr = np.zeros((60, 5), dtype=np.float32)
            for t, reading in enumerate(session_dicts):
                session_arr[t] = [reading["VOC"], reading["MQ3"], reading["MQ135"], reading["NIR"], reading["TEMP"]]

            # Extraer features
            features = extract_features(session_arr)

            X_raw.append(session_arr[:, :4])  # Solo 4 canales para LSTM
            X_feat.append(features)
            y.append(class_idx)

        print(f"  ✅ [{class_idx:2d}] {condition}: {samples_per_class} muestras")

    return np.array(X_raw), np.array(X_feat), np.array(y)


# ═══════════════════════════════════════════════════════════════════════
# ENTRENAMIENTO
# ═══════════════════════════════════════════════════════════════════════

def create_lstm_model(input_shape=(60, 4), num_classes=12):
    """Crea modelo LSTM para clasificación de series temporales."""
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=input_shape),
        tf.keras.layers.LSTM(64, return_sequences=True),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.LSTM(32, return_sequences=False),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def train_pipeline(samples_per_class=500, epochs=30):
    """Pipeline completo de entrenamiento."""

    # 1. Generar datos
    X_raw, X_feat, y = generate_dataset(samples_per_class)

    # 2. Split: 70% train, 15% val, 15% test
    X_raw_train, X_raw_temp, X_feat_train, X_feat_temp, y_train, y_temp = train_test_split(
        X_raw, X_feat, y, test_size=0.3, stratify=y, random_state=42
    )
    X_raw_val, X_raw_test, X_feat_val, X_feat_test, y_val, y_test = train_test_split(
        X_raw_temp, X_feat_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42
    )

    print(f"\n📦 Dataset: train={len(y_train)} val={len(y_val)} test={len(y_test)}")

    # ──── Random Forest ──────────────────────────────────────────
    print("\n🌲 Entrenando Random Forest sobre 15 features...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_feat_train, y_train)
    rf_acc = rf.score(X_feat_test, y_test)
    print(f"  RF Accuracy (test): {rf_acc:.4f}")

    # ──── LSTM ───────────────────────────────────────────────────
    print(f"\n🧠 Entrenando LSTM ({epochs} epochs)...")
    lstm_model = create_lstm_model(num_classes=NUM_CLASSES)
    lstm_model.summary()

    lstm_model.fit(
        X_raw_train, y_train,
        epochs=epochs,
        batch_size=32,
        validation_data=(X_raw_val, y_val),
        verbose=1,
    )
    lstm_loss, lstm_acc = lstm_model.evaluate(X_raw_test, y_test, verbose=0)
    print(f"  LSTM Accuracy (test): {lstm_acc:.4f}")

    # ──── Ensemble Evaluation ────────────────────────────────────
    print("\n🔗 Evaluando Ensemble (0.4×RF + 0.6×LSTM)...")
    rf_probs = rf.predict_proba(X_feat_test)
    lstm_probs = lstm_model.predict(X_raw_test, verbose=0)
    ensemble_probs = 0.4 * rf_probs + 0.6 * lstm_probs
    ensemble_preds = np.argmax(ensemble_probs, axis=1)
    ensemble_acc = np.mean(ensemble_preds == y_test)
    print(f"  Ensemble Accuracy (test): {ensemble_acc:.4f}")

    print("\n📋 Classification Report (Ensemble):")
    print(classification_report(y_test, ensemble_preds, target_names=CLASS_NAMES))

    # ──── Guardar modelos ────────────────────────────────────────
    os.makedirs("models", exist_ok=True)

    lstm_path = "models/enose_model.keras"
    lstm_model.save(lstm_path)
    print(f"  💾 LSTM guardado en {lstm_path}")

    rf_path = "models/enose_rf.joblib"
    joblib.dump(rf, rf_path)
    print(f"  💾 RF guardado en {rf_path}")

    # Guardar metadata
    metadata = {
        "classes": CLASS_NAMES,
        "num_classes": NUM_CLASSES,
        "rf_accuracy": float(rf_acc),
        "lstm_accuracy": float(lstm_acc),
        "ensemble_accuracy": float(ensemble_acc),
        "samples_per_class": samples_per_class,
        "epochs": epochs,
        "ensemble_weights": {"rf": 0.4, "lstm": 0.6},
        "features": [
            "VOC_peak", "VOC_slope", "VOC_auc",
            "MQ3_peak", "MQ3_slope", "MQ3_auc",
            "MQ135_peak", "MQ135_slope", "MQ135_auc",
            "NIR_peak", "NIR_slope", "NIR_auc",
            "ratio_VOC_MQ3", "ratio_MQ135_VOC", "NIR_variance",
        ],
    }
    meta_path = "models/model_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  💾 Metadata guardada en {meta_path}")

    print("\n🎉 Entrenamiento completado exitosamente!")
    return rf, lstm_model, metadata


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="E-NOSE Model Training")
    parser.add_argument("--samples", type=int, default=500, help="Muestras por clase")
    parser.add_argument("--epochs", type=int, default=30, help="Epochs para LSTM")
    args = parser.parse_args()

    train_pipeline(samples_per_class=args.samples, epochs=args.epochs)
