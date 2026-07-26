import logging
import os
from pathlib import Path

import joblib
import numpy as np
import psycopg2
from sklearn.feature_extraction.text import TfidfVectorizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

PG_HOST = os.environ.get("POSTGRES_HOST", "postgres")
PG_DB = os.environ.get("POSTGRES_DB", "ksp_intelligence")
PG_USER = os.environ.get("POSTGRES_USER", "ksp_app")
PG_PASS = os.environ.get("POSTGRES_PASSWORD", "changeme")
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/app/models"))

OUT_VECTORIZER = MODEL_DIR / "fir_tfidf_vectorizer.pkl"
OUT_MATRIX = MODEL_DIR / "fir_tfidf_matrix.npz"
OUT_IDS = MODEL_DIR / "fir_tfidf_ids.npy"


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Connecting to PostgreSQL at %s…", PG_HOST)
    conn = psycopg2.connect(host=PG_HOST, dbname=PG_DB, user=PG_USER, password=PG_PASS)
    cur = conn.cursor()
    cur.execute("""
        SELECT casemasterid,
               COALESCE(brieffacts, '') || ' ' ||
               COALESCE(crimeno, '') AS text
        FROM casemaster
        WHERE brieffacts IS NOT NULL AND brieffacts != ''
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    logger.info("Loaded %d FIRs with text content", len(rows))
    if not rows:
        logger.error("No FIR text data found. Nothing to train.")
        return
    ids, texts = zip(*rows)
    ids = np.array(ids, dtype=np.int64)
    logger.info("Fitting TF-IDF vectorizer on %d documents…", len(texts))
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(texts)
    logger.info("Matrix shape: %s, features: %d", matrix.shape, vectorizer.max_features)
    joblib.dump(vectorizer, OUT_VECTORIZER)
    joblib.dump(matrix, OUT_MATRIX)
    np.save(OUT_IDS, ids)
    logger.info("Saved TF-IDF model to %s", MODEL_DIR)


if __name__ == "__main__":
    main()
