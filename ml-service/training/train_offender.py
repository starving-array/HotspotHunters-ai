"""Training script for offender recidivism prediction model.

Creates a dummy GradientBoostingRegressor on synthetic data and stores it as
ml-service/models/offender_gb_v1.pkl.
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
import joblib
import os

def main():
    X = np.random.rand(200, 6)
    y = np.random.rand(200)
    model = GradientBoostingRegressor(n_estimators=20, random_state=42)
    model.fit(X, y)
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "offender_gb_v1.pkl")
    joblib.dump(model, model_path)
    print(f"Offender model saved to {model_path}")

if __name__ == "__main__":
    main()
