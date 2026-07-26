import logging
import os
from pathlib import Path

import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/app/models"))
VECTORIZER_PATH = MODEL_DIR / "fir_tfidf_vectorizer.pkl"
MATRIX_PATH = MODEL_DIR / "fir_tfidf_matrix.npz"
IDS_PATH = MODEL_DIR / "fir_tfidf_ids.npy"

_vectorizer = None
_matrix = None
_ids = None

router = APIRouter()


def _load():
    global _vectorizer, _matrix, _ids
    if _vectorizer is not None:
        return
    if not VECTORIZER_PATH.exists():
        logger.warning("TF-IDF model not found at %s", VECTORIZER_PATH)
        return
    _vectorizer = joblib.load(VECTORIZER_PATH)
    _matrix = joblib.load(MATRIX_PATH)
    _ids = np.load(IDS_PATH)
    logger.info(
        "Loaded TF-IDF model: %d FIRs, %d features",
        len(_ids), _vectorizer.max_features,
    )


@router.get("/similarity/{fir_id}")
def get_similarity(fir_id: str, top_k: int = 10):
    _load()
    if _vectorizer is None:
        raise HTTPException(503, "TF-IDF model not loaded. Run train_fir_similarity.py first.")
    try:
        idx = _ids.tolist().index(int(fir_id.replace("LIVE", "").replace("FIR", "")))
    except (ValueError, AttributeError):
        raise HTTPException(404, f"FIR {fir_id} not found in similarity index")
    row = _matrix[idx].toarray().flatten()
    scores = cosine_similarity(_matrix, row.reshape(1, -1)).flatten()
    top_indices = np.argsort(scores)[::-1][1 : top_k + 1]
    similar = [
        {"firId": f"FIR{_ids[i]:08d}", "score": float(scores[i])}
        for i in top_indices
        if scores[i] > 0.0
    ]
    return {"firId": fir_id, "similar": similar}
