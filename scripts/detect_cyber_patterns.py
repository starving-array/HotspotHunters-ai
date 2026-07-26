#!/usr/bin/env python3
"""
KSP Intelligence Portal — Cyber Pattern Detector
File: scripts/detect_cyber_patterns.py

Reads `cyber_indicators` and writes the patterns it finds back to
`cyber_trend_alerts`, materialising the six pattern types defined in the
CHECK constraint:

    ip_cluster, domain_cluster, phone_cluster, wallet_cluster,
    platform_spike, financial_fraud_ring

The detectors are intentionally SQL-driven so they run inside PG and can be
re-executed any time (idempotent: TRUNCATE then INSERT).

Run order:
    1. python scripts/seed_cyber_indicators.py   (writes cyber_indicators)
    2. python scripts/detect_cyber_patterns.py    (writes cyber_trend_alerts)
    3. python scripts/seed_neo4j.py               (pushes HAS_INDICATOR to Neo4j)

Usage:
    python scripts/detect_cyber_patterns.py
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from typing import Dict, List, Tuple

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger(__name__)


# =============================================================================
# Detectors
# =============================================================================
CLUSTER_DETECTORS: List[Tuple[str, str]] = [
    # (alert pattern_type, indicator_type)
    ("ip_cluster",     "ip"),
    ("domain_cluster", "domain"),
    ("phone_cluster",  "phone"),
    ("wallet_cluster", "wallet"),
]


def _threat_level_from_count(case_count: int) -> str:
    """Map case-count to threat level per the popup semantics on the Cybercrime page."""
    if case_count >= 10:
        return "critical"
    if case_count >= 5:
        return "high"
    if case_count >= 3:
        return "medium"
    return "low"


CLUSTER_SQL_TEMPLATE = """
-- cluster detector: detect values of a given indicator_type
--                  appearing in >=2 distinct cases.
--                  (pattern_type + indicator_type are bound as parameters.)
WITH cluster AS (
    SELECT
        indicator_value,
        MIN(casemasterid)     AS first_case_id,
        MAX(casemasterid)     AS last_case_id,
        MIN(first_seen)         AS first_seen,
        MAX(last_seen)          AS last_seen,
        COUNT(DISTINCT casemasterid) AS case_count
    FROM cyber_indicators
    WHERE indicator_type = %s
    GROUP BY indicator_value
    HAVING COUNT(DISTINCT casemasterid) >= 2
)
INSERT INTO cyber_trend_alerts
    (pattern_type, entity_type, entity_value, case_count,
     first_case_id, last_case_id, first_seen, last_seen, threat_level, details)
SELECT
    %s, %s, indicator_value, case_count,
    first_case_id, last_case_id, first_seen, last_seen,
    CASE
        WHEN case_count >= 10 THEN 'critical'
        WHEN case_count >= 5  THEN 'high'
        WHEN case_count >= 3  THEN 'medium'
        ELSE 'low'
    END,
    jsonb_build_object(
        'cluster_size', case_count,
        'indicator_type', %s
    )
FROM cluster
"""

PLATFORM_SPIKE_SQL = """
-- platform_spike: any platform whose count of cybercrime-flagged cases over
-- the last 30 days crosses the threshold (>=5 cases). We treat a single
-- platform-backed value as one alert per platform spike.
WITH platform_counts AS (
    SELECT
        ci.platform,
        COUNT(DISTINCT ci.casemasterid) AS case_count,
        MIN(ci.casemasterid) AS first_case_id,
        MAX(ci.casemasterid) AS last_case_id,
        MIN(ci.first_seen)   AS first_seen,
        MAX(ci.last_seen)    AS last_seen
    FROM cyber_indicators ci
    JOIN casemaster cm ON cm.casemasterid = ci.casemasterid
    WHERE ci.platform IS NOT NULL
      AND ci.last_seen >= NOW() - INTERVAL '30 days'
    GROUP BY ci.platform
    HAVING COUNT(DISTINCT ci.casemasterid) >= 5
)
INSERT INTO cyber_trend_alerts
    (pattern_type, entity_type, entity_value, case_count,
     first_case_id, last_case_id, first_seen, last_seen, threat_level, details)
SELECT
    'platform_spike', 'platform', platform, case_count,
    first_case_id, last_case_id, first_seen, last_seen,
    CASE
        WHEN case_count >= 10 THEN 'critical'
        WHEN case_count >= 5  THEN 'high'
        ELSE 'medium'
    END,
    jsonb_build_object('platform', platform, 'window_days', 30)
FROM platform_counts
"""

FRAUD_RING_SQL = """
-- financial_fraud_ring: a set of >=3 cases linked by >=2 distinct indicator
-- types sharing a common value set — eg the same wallet_id appears together
-- with the same upi_id or phone across multiple cases.
WITH shared_values AS (
    SELECT
        ci1.casemasterid,
        ci1.indicator_value AS anchor_value,
        ci1.indicator_type  AS anchor_type,
        ci2.indicator_value AS linked_value,
        ci2.indicator_type  AS linked_type
    FROM cyber_indicators ci1
    JOIN cyber_indicators ci2
      ON ci1.casemasterid = ci2.casemasterid
     AND ci1.indicator_id <> ci2.indicator_id
     AND ci1.indicator_type <> ci2.indicator_type
    WHERE ci1.indicator_type IN ('wallet', 'upi_id', 'bank_account')
      AND ci2.indicator_type IN ('phone', 'email', 'social_handle', 'ip')
),
ring_anchors AS (
    SELECT
        anchor_value,
        anchor_type,
        linked_value,
        linked_type,
        COUNT(DISTINCT casemasterid) AS case_count,
        MIN(casemasterid) AS first_case_id,
        MAX(casemasterid) AS last_case_id
    FROM shared_values
    GROUP BY anchor_value, anchor_type, linked_value, linked_type
    HAVING COUNT(DISTINCT casemasterid) >= 3
)
INSERT INTO cyber_trend_alerts
    (pattern_type, entity_type, entity_value, case_count,
     first_case_id, last_case_id, first_seen, last_seen, threat_level, details)
SELECT
    'financial_fraud_ring',
    anchor_type,
    anchor_value || ' / ' || linked_value,
    case_count, first_case_id, last_case_id,
    NULL, NULL,
    CASE
        WHEN case_count >= 10 THEN 'critical'
        WHEN case_count >= 5  THEN 'high'
        ELSE 'medium'
    END,
    jsonb_build_object(
        'anchor_type', anchor_type,
        'anchor_value', anchor_value,
        'linked_type', linked_type,
        'linked_value', linked_value
    )
FROM ring_anchors
"""


def detect_patterns(pg_dsn: str) -> Dict[str, int]:
    """
    Idempotently rebuild cyber_trend_alerts by running all six detectors.

    Returns a stats dict mapping each pattern_type to its inserted row count,
    plus a 'total' aggregate.
    """
    stats: Dict[str, int] = {
        "ip_cluster": 0,
        "domain_cluster": 0,
        "phone_cluster": 0,
        "wallet_cluster": 0,
        "platform_spike": 0,
        "financial_fraud_ring": 0,
        "total": 0,
    }

    conn = psycopg2.connect(pg_dsn)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1. Idempotent reset
        logger.info("Truncating cyber_trend_alerts (idempotent rebuild)…")
        cur.execute("TRUNCATE TABLE cyber_trend_alerts RESTART IDENTITY;")
        conn.commit()

        inserted_total = 0

        # 2. Cluster detectors (ip / domain / phone / wallet)
        for pattern_type, indicator_type in CLUSTER_DETECTORS:
            # All values bound via %s placeholders (no string interpolation in SQL).
            cur.execute(CLUSTER_SQL_TEMPLATE, (
                indicator_type,           # WHERE indicator_type = %s
                pattern_type,             # INSERT pattern_type
                indicator_type,           # INSERT entity_type
                indicator_type,           # details json indicator_type
            ))
            n = cur.rowcount if cur.rowcount is not None and cur.rowcount > 0 else 0
            stats[pattern_type] = int(n)
            inserted_total += int(n)
            conn.commit()
            logger.info("  %s: %d alerts", pattern_type, n)

        # 3. Platform spike
        cur.execute(PLATFORM_SPIKE_SQL)
        n = cur.rowcount if cur.rowcount is not None and cur.rowcount > 0 else 0
        stats["platform_spike"] = int(n)
        inserted_total += int(n)
        conn.commit()
        logger.info("  platform_spike: %d alerts", n)

        # 4. Financial fraud ring
        cur.execute(FRAUD_RING_SQL)
        n = cur.rowcount if cur.rowcount is not None and cur.rowcount > 0 else 0
        stats["financial_fraud_ring"] = int(n)
        inserted_total += int(n)
        conn.commit()
        logger.info("  financial_fraud_ring: %d alerts", n)

        stats["total"] = inserted_total
        logger.info("Detection complete: %d total alerts.", inserted_total)
        return stats

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


# =============================================================================
# CLI
# =============================================================================
def _build_pg_dsn(args: argparse.Namespace) -> str:
    return f"postgresql://{args.user}:{args.password}@{args.pg_host}:{args.pg_port}/{args.db}"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Detect cyber patterns and populate cyber_trend_alerts.")
    p.add_argument("--pg-host", default=os.environ.get("POSTGRES_HOST", "localhost"))
    p.add_argument("--pg-port", type=int, default=int(os.environ.get("POSTGRES_PORT", "5432")))
    p.add_argument("--user", default=os.environ.get("POSTGRES_USER", "ksp_app"))
    p.add_argument("--password", default=os.environ.get("POSTGRES_PASSWORD", "changeme"))
    p.add_argument("--db", default=os.environ.get("POSTGRES_DB", "ksp_intelligence"))
    p.add_argument("--log-level", default="INFO")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    logging.basicConfig(level=args.log_level,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    dsn = _build_pg_dsn(args)
    logger.info("PG DSN: %s", dsn.replace(args.password, ""))
    stats = detect_patterns(dsn)
    print(f"\nCyber pattern alerts: {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
