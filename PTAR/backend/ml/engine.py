import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.metrics import mean_squared_error, accuracy_score, r2_score

# Paths to save the models
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

CLASSIFIER_PATH = os.path.join(MODELS_DIR, 'classifier.pkl')
REGRESSOR_PATH = os.path.join(MODELS_DIR, 'regressor.pkl')
ANOMALY_PATH = os.path.join(MODELS_DIR, 'anomaly.pkl')

def train_models(df: pd.DataFrame):
    """
    Entrena los modelos de ML.
    Requisitos del dataframe df: 'ph', 'dqo', 'turbidez', 'dbo', 'clasificacion'
    """
    # 1. Limpieza de Datos
    df = df.dropna()
    if df.empty:
        raise ValueError("No hay datos suficientes despues de eliminar nulos.")
    
    # Preparamos X (features)
    X = df[['ph', 'dqo', 'turbidez']]
    
    # 2. Detección de Anomalías (Isolation Forest)
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    iso_forest.fit(X)
    
    # Filtrar anomalías para entrenar los otros modelos (opcional, pero buena práctica)
    # -1 son anomalias, 1 son valores normales
    anomalies_pred = iso_forest.predict(X)
    df_clean = df[anomalies_pred == 1]
    
    if len(df_clean) < 10:
        # Fallback a los datos originales si todos parecen anomalias
        df_clean = df
        
    X_clean = df_clean[['ph', 'dqo', 'turbidez']]
    
    # 3. Regresión: Random Forest Regressor para estimar DBO
    y_reg = df_clean['dbo']
    regressor = RandomForestRegressor(n_estimators=100, random_state=42)
    regressor.fit(X_clean, y_reg)
    
    # Calcular y testear MSE
    y_reg_pred = regressor.predict(X_clean)
    mse = mean_squared_error(y_reg, y_reg_pred)
    r2 = r2_score(y_reg, y_reg_pred)
    
    # 4. Clasificación: Random Forest Classifier para determinar calidad
    y_clf = df_clean['clasificacion']
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X_clean, y_clf)
    
    y_clf_pred = classifier.predict(X_clean)
    accuracy = accuracy_score(y_clf, y_clf_pred)
    
    # 5. Persistencia
    joblib.dump(classifier, CLASSIFIER_PATH)
    joblib.dump(regressor, REGRESSOR_PATH)
    joblib.dump(iso_forest, ANOMALY_PATH)
    
    return {
        "mse_dbo": mse,
        "r2_dbo": r2,
        "accuracy_calidad": accuracy,
        "anomalias_detectadas": int((anomalies_pred == -1).sum()),
        "total_entrenados": len(X_clean)
    }

def predict_sample(ph: float, dqo: float, turbidez: float):
    """
    Realiza la predicción en tiempo real.
    """
    try:
        classifier = joblib.load(CLASSIFIER_PATH)
        regressor = joblib.load(REGRESSOR_PATH)
        iso_forest = joblib.load(ANOMALY_PATH)
    except FileNotFoundError:
        raise RuntimeError("Los modelos no estan entrenados. Ejecute /ml/train primero.")
        
    X_new = pd.DataFrame([{'ph': ph, 'dqo': dqo, 'turbidez': turbidez}])
    
    # Detección de Anomalía
    is_anomaly = iso_forest.predict(X_new)[0]
    es_anomalia_bool = True if is_anomaly == -1 else False
    
    # Predicciones
    dbo_estimado = regressor.predict(X_new)[0]
    clasificacion_estimada = classifier.predict(X_new)[0]
    
    return {
        "dbo_predicho": float(dbo_estimado),
        "clasificacion": str(clasificacion_estimada),
        "es_anomalia": es_anomalia_bool
    }
