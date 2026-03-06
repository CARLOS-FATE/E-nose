    # Documentación de Lógica y Fórmulas del Sistema E-NOSE

Este documento detalla la lógica interna, los flujos de datos y las fórmulas matemáticas utilizadas en el sistema E-NOSE para la detección de enfermedades periodontales mediante el análisis del aliento.

## 1. Lógica de Simulación (Device Simulator)
El simulador (`simulator/device_simulator.py`) genera datos sintéticos que imitan el comportamiento de sensores MOS (Metal Oxide Semiconductor) al ser expuestos a una muestra de aliento.

### Curva de Respuesta del Sensor
Se simula una curva de "ataque y decaimiento" (Attack and Decay) típica de la interacción gas-química.

**Fórmula de Generación de Curva:**

Sea $t$ el tiempo en segundos y $V_{peak}$ el valor máximo alcanzado (concentración del gas). La señal $S(t)$ se define por tramos:

1.  **Línea Base** ($t < 10s$):
    $$S(t) = 0.1$$
    *Representa el valor del sensor en aire limpio.*

2.  **Fase de Subida/Exposición** ($10s \le t < 20s$):
    $$S(t) = 0.1 + (V_{peak} - 0.1) \times \left(\frac{t-10}{10}\right)$$
    *Simula la reacción química inicial al entrar en contacto con el gas.*

3.  **Meseta** ($20s \le t < 30s$):
    $$S(t) = V_{peak}$$
    *Representa la saturación del sensor mientras el paciente sopla continuamente.*

4.  **Fase de Recuperación** ($t \ge 30s$):
    $$S(t) = 0.1 + (V_{peak} - 0.1) \times e^{-\frac{t-30}{5}}$$
    *Simula la desorción del gas y el retorno a la línea base.*

**Variables Simuladas:**
- **VOC (Volatile Organic Compounds):** Simulado con picos altos ($0.85$) para representar marcadores de enfermedad (ej. Acetona en diabetes).
- **MQ3 (Alcohol):** Simulado con valores moderados ($0.3$).
- **MQ135 (Calidad del Aire):** Mantenido estable ($0.3 - 0.35$).
- **TEMP:** Simula temperatura corporal ($36.5 - 37.0^\circ C$).
- **Ruido:** Se añade un ruido aleatorio uniforme de $\pm 0.02$ para realismo.

---

## 2. Flujo de Datos y Preprocesamiento

### Ingesta (Ingest API)
Los datos crudos llegan al endpoint `/ingest` y se validan con el esquema `SensorData`.
- **Validación:** Se extraen los valores esperados (`VOC`, `MQ3`, `MQ135`, `TEMP`). Si falta alguno, se asigna 0 por defecto.
- **Persistencia:** Los datos se escriben inmediatamente en **InfluxDB** en el bucket `sensor_data` bajo la medición `breath_sample`.

---

## 3. Lógica de Predicción (ML Service)

### Modelo Actual (Dummy / Prototipo)
El servicio de ML (`services/ml-service/predict.py`) actualmente utiliza una lógica determinista simple para validar el flujo de trabajo antes de integrar modelos entrenados complejos.

**Regla de Decisión:**

$$
Estado = 
\begin{cases} 
\text{"Alerta: Posible Marcador Detectado"} & \text{si } VOC > 0.7 \\
\text{"Normal"} & \text{en otro caso}
\end{cases}
$$

### Plan Futuro (Integración de Modelos)
Aquí se agregarán las fórmulas de los modelos de Machine Learning una vez entrenados (ej. Regresión Logística, Random Forest o Redes Neuronales).

**Feature Engineering Planeada:**
1.  **Cálculo de Área Bajo la Curva (AUC):** Para determinar la exposición total.
    $$AUC = \int_{t_{start}}^{t_{end}} S(t) \, dt$$
2.  **Pendiente de Subida:** Velocidad de reacción del sensor.
    $$m = \frac{\Delta S}{\Delta t}$$

---

## 4. Estándares y Referencias - Biomarcadores
Se han integrado perfiles específicos para la detección de patologías:

### 1. Diabetes (Cetoacidosis)
- **Biomarcador Principal:** Acetona en el aliento.
- **Señal en Sensor:** Picos altos en sensores VOC/MOS.
- **Olor Característico:** Fruta podrida / Manzana dulce.

### 2. Cáncer de Pulmón
- **Biomarcador Principal:** Patrones complejos de Compuestos Orgánicos Volátiles.
- **Señal en Sensor:** Combinación específica de VOCs y firmas espectrales en **NIR (Near Infrared)**.
- **Lógica:** El sensor NIR detecta absorción molecular específica no visible para sensores electroquímicos simples.

## 5. Arquitectura de Inteligencia Artificial (Planeada)
Para procesar estas señales temporales y multidimensionales, se implementará una Red Neuronal Recurrente (RNN):

### Modelo: LSTM (Long Short-Term Memory)
- **Entrada:** Secuencia temporal ($t=0$ a $t=60$) de 4 variables: `[VOC, MQ3, MQ135, NIR]`.
- **Capas Ocultas:**
    1.  Capa LSTM (64 unidades) - Para aprender dependencias temporales.
    2.  Dropout (0.2) - Para evitar sobreajuste.
    3.  Capa Densa (Relu).
- **Salida:** Capa Softmax con 3 neuronas (Probabilidad):
    - `[0]`: Sano
    - `[1]`: Diabetes
    - `[2]`: Cáncer

### Entrenamiento
El sistema se re-entrenará periódicamente con los datos recolectados en `InfluxDB`, permitiendo que la "Nariz Electrónica" mejore su precisión con el uso.
