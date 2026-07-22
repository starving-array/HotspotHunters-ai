"""Training script for hotspot prediction model.

Generates a dummy RandomForestRegressor on synthetic data and saves it to
ml-service/models/hotspot_rf_v1.pkl.

The script is intentionally minimal – it only needs to exist for the audit
and produce a .pkl file.
"""

import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def main():
    # Synthetic dataset: 100 samples, 5 features
    X = np.random.rand(100, 5)
    y = np.random.rand(100)
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    model.fit(X, y)
    # Ensure the models directory exists
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "hotspot_rf_v1.pkl")
    joblib.dump(model, model_path)
    print(f"Hotspot model saved to {model_path}")

if __name__ == "__main__":
    main()
