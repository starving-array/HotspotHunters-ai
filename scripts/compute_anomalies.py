import json
import logging
import os
import random
from datetime import datetime, timedelta, timezone

import numpy as np
import psycopg2
import redis
from sklearn.ensemble import IsolationForest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

PG_HOST = os.environ.get("POSTGRES_HOST", "postgres")
PG_DB = os.environ.get("POSTGRES_DB", "ksp_intelligence")
PG_USER = os.environ.get("POSTGRES_USER", "ksp_app")
PG_PASS = os.environ.get("POSTGRES_PASSWORD", "changeme")
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))


def main():
    conn = psycopg2.connect(host=PG_HOST, dbname=PG_DB, user=PG_USER, password=PG_PASS)
    cur = conn.cursor()

    logger.info("Loading daily crime counts by district…")
    cur.execute("""
        SELECT u.districtid, d.districtname,
               DATE(c.crimeregistereddate) AS crime_date,
               COUNT(*) AS cnt
        FROM casemaster c
        JOIN unit u ON u.unitid = c.policestationid
        JOIN district d ON d.districtid = u.districtid
        WHERE c.crimeregistereddate >= CURRENT_DATE - INTERVAL '180 days'
        GROUP BY u.districtid, d.districtname, DATE(c.crimeregistereddate)
        ORDER BY u.districtid, crime_date
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    logger.info("Loaded %d district-day records", len(rows))

    if not rows:
        logger.warning("No data for anomaly detection")
        return

    district_ids = sorted(set(r[0] for r in rows))

    anomalies = []
    for dist_id in district_ids:
        dist_rows = [r for r in rows if r[0] == dist_id]
        district_name = dist_rows[0][1]
        counts = np.array([r[3] for r in dist_rows]).reshape(-1, 1)
        dates = [r[2] for r in dist_rows]

        if len(counts) < 10:
            continue

        model = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
        preds = model.fit_predict(counts)
        scores = model.score_samples(counts)

        for i, (pred, score) in enumerate(zip(preds, scores)):
            if pred == -1:
                z = abs((counts[i][0] - np.mean(counts)) / max(np.std(counts), 0.01))
                anomalies.append({
                    "district_id": dist_id,
                    "district": district_name,
                    "date": str(dates[i]),
                    "actual": int(counts[i][0]),
                    "expected": int(np.mean(counts)),
                    "z_score": round(float(z), 2),
                    "crime_type": "all",
                })

    logger.info("Detected %d anomalies across %d districts", len(anomalies), len(district_ids))

    if not anomalies:
        logger.info("No anomalies to write")
        return

    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    stream_key = "alerts:stream"

    for a in anomalies:
        entry = {
            "fir_id": f"ANOM-{a['district_id']}-{a['date']}",
            "severity": "HIGH",
            "district": a["district"],
            "crimeType": a["crime_type"],
            "zScore": str(a["z_score"]),
            "expected": str(a["expected"]),
            "actual": str(a["actual"]),
            "incident_ts": f"{a['date']}T12:00:00Z",
        }
        r.xadd(stream_key, entry, maxlen=200)

    logger.info("Wrote %d anomaly events to Redis stream %s", len(anomalies), stream_key)
    logger.info("Example anomaly: district=%s, actual=%d, expected=%d, z=%.2f",
                anomalies[0]["district"], anomalies[0]["actual"],
                anomalies[0]["expected"], anomalies[0]["z_score"])


if __name__ == "__main__":
    main()
