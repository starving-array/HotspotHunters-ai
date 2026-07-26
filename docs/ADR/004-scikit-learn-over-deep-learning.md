# ADR-004: scikit-learn Over Deep Learning

**Status:** Accepted  
**Date:** 2026-07  

## Context

ML service needs hotspot prediction (which districts will spike) and offender recidivism risk scoring. Training data is structured tabular data (crime counts, offender history, socio-economic features).

## Decision

Use scikit-learn (Random Forest for hotspot, Gradient Boosting for recidivism) instead of deep learning frameworks (PyTorch/TensorFlow).

## Consequences

- **Positive:** scikit-learn models train in seconds vs hours for deep learning. No GPU needed.
- **Positive:** SHAP explainability works out-of-the-box for both tree-based models.
- **Positive:** Model artifacts are small (< 1 MB) — easy to version and deploy.
- **Negative:** Deep learning might marginally improve accuracy on complex feature interactions.
- **Negative:** Not suitable for unstructured data (images, text) — but all features are tabular.
