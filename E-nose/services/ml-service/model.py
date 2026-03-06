import numpy as np
from sklearn.ensemble import RandomForestClassifier

# modelo dummy MVP
model = RandomForestClassifier()
X = np.random.rand(100, 4)
y = np.random.choice(["OK", "ALERTA"], 100)
model.fit(X, y)

def predict(features):
    return model.predict([features])[0]

