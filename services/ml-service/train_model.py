import tensorflow as tf
import numpy as np
import os

# Definir la estructura del modelo
def create_model(input_shape=(60, 4)):
    """
    Crea un modelo LSTM para análisis de series de tiempo de aliento.
    Input Shape: (60 pasos de tiempo, 4 sensores [VOC, MQ3, MQ135, NIR])
    Output: 3 clases (Sano, Diabetes, Cáncer)
    """
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=input_shape),
        tf.keras.layers.LSTM(64, return_sequences=False),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(3, activation='softmax') # 3 Clases de salida
    ])
    
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

if __name__ == "__main__":
    print("Iniciando script de entrenamiento...")
    
    # DATOS DUMMY PARA PROBAR LA ESTRUCTURA (REEMPLAZAR CON DATOS REALES DE INFLUXDB)
    # 100 muestras, 60 segundos, 4 sensores
    X_train = np.random.random((100, 60, 4)) 
    # Etiquetas aleatorias (0, 1, 2)
    y_train = np.random.randint(0, 3, 100)
    
    model = create_model()
    model.summary()
    
    print("Entrenando modelo de prueba...")
    model.fit(X_train, y_train, epochs=2, batch_size=10)
    
    # Guardar el modelo
    save_path = "models/enose_model.keras"
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    model.save(save_path)
    print(f"Modelo guardado en {save_path}")
