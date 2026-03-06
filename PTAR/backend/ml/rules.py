def get_intelligence(clasificacion: str, es_anomalia: bool, ph: float) -> dict:
    """
    Motor de sugerencias basado en la Matriz de Decisiones y salidas del modelo ML.
    Mapea las salidas a niveles de alerta e indicaciones.
    """
    nivel_alerta = 1
    sugerencia = ""
    consecuencia = ""
    
    # Evaluar por prioridad: Primero anomalías/errores de hardware o desastres absolutos.
    if es_anomalia:
        # Se asume una lectura peligrosa atípica (fuera de control estadístico)
        nivel_alerta = 4
        sugerencia = "Clausura inmediata. Retención y tratamiento de residuos peligrosos. Revisar integridad del hardware (Posible pico atípico)."
        consecuencia = "Mitigación de desastre ambiental y sanitario. Contaminación evitada de mantos acuíferos y bloqueo de crisis legal."
        return {"nivel_alerta": nivel_alerta, "sugerencia_ia": sugerencia, "consecuencias_texto": consecuencia}

    # Evaluar el pH (condiciones extremas, por encima de 10 o debajo de 4 es crítico casi siempre)
    if ph < 4.0 or ph > 10.0:
        nivel_alerta = 3
        sugerencia = "Tratamiento químico intensivo o neutralización inmediata de pH. Ajuste de dosificación requerida."
        consecuencia = "Recuperación de la muestra para usos secundarios. Prevención de corrosión severa o daño irreversible a ecosistemas locales y multas."
        
        # Si es un extremo total, lo subimos a Nivel 4 a pesar de la salida de clasificación
        if ph < 2.0 or ph > 12.0:
             nivel_alerta = 4
             sugerencia = "Clausura inmediata de válvula de descarga. Fluido altamente corrosivo/básico detectado."
             consecuencia = "Mitigación de desastre ambiental y destrucción de cañerías."
             
        return {"nivel_alerta": nivel_alerta, "sugerencia_ia": sugerencia, "consecuencias_texto": consecuencia}
        
    # Evaluar usando la predicción del Random Forest Classifier
    if clasificacion and "No Apta" in str(clasificacion):
        # Es "No apta", dependiendo de variables podría ser Nivel 2 o 3. Lo pondremos 2 por defecto si el pH estaba normal.
        nivel_alerta = 2
        sugerencia = "Aplicar filtración leve o aireación preventiva. Aumentar retención en tanque compensador."
        consecuencia = "Estabilización de parámetros y prevención de olores. Se evita degradación gradual de la fuente de agua receptora."
        return {"nivel_alerta": nivel_alerta, "sugerencia_ia": sugerencia, "consecuencias_texto": consecuencia}
        
    # Default (Apta o condiciones limpias)
    nivel_alerta = 1
    sugerencia = "Uso directo o descarga sin tratamiento adicional. Continuar monitoreo pasivo."
    consecuencia = "Ahorro de recursos químicos y cumplimiento normativo total. Ninguno inmediato."
    
    return {
        "nivel_alerta": nivel_alerta,
        "sugerencia_ia": sugerencia,
        "consecuencias_texto": consecuencia
    }
