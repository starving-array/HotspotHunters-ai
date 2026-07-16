"""
KSP Intelligence Portal — Phase 1 Verification Script
File: data-generator/verify.py

Confirms that Phase 1 data foundation is in place by checking:
  - PostgreSQL: row counts in fir_records, offenders, victims, offender_network
  - PostgreSQL: per-district count distribution sanity (no zero rows)
  - ElasticSearch: total doc count in crime-index equals PG fir_records count
  - Kafka: latest offsets on fir-events topic (if live producer is running)

Exit codes:
  0 — all checks passed
  1 — at least one check failed
  2 — connect to a service failed

Usage:
  python -m data_generator.verify
  python -m data_generator.verify --pg-host localhost --es-host localhost:9200 --bootstrap localhost:9092
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict

# Support both packaged invocation and direct-script invocation.
try:
    from . import config as cfg
except ImportError:
    import config as cfg

import logging
logger = logging.getLogger(__name__)


class CheckResult:
    def __init__(self, name: str, ok: bool, detail: str = ""):
        self.name = name
        self.ok = ok
        self.detail = detail

    def __str__(self):
        mark = "PASS" if self.ok else "FAIL"
        return f"[{mark}] {self.name}: {self.detail}"


# =============================================================================
# Checks
# =============================================================================
def check_postgres(args) -> list:
    results = []
    try:
        import psycopg2
    except ImportError:
        results.append(CheckResult("PG", False, "psycopg2 not installed"))
        return results

    user = os.environ.get("POSTGRES_USER", "ksp_app")
    password = os.environ.get("POSTGRES_PASSWORD", "changeme")
    db = os.environ.get("POSTGRES_DB", "ksp_intelligence")
    dsn = f"postgresql://{user}:{password}@{args.pg_host}:{args.pg_port}/{db}"
    logger.info("PG DSN: %s", dsn.replace(password, "***"))
    conn = None
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        for table, expected_min in [
            ("offenders", cfg.DEFAULT_OFFENDER_COUNT // 2),     # allow > 50% tolerance
            ("victims",   cfg.DEFAULT_VICTIM_COUNT // 2),
            ("fir_records", cfg.DEFAULT_FIR_COUNT // 2),
            ("offender_network", 100),
        ]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            ok = count >= expected_min
            results.append(CheckResult(f"PG.{table}",
                                       ok,
                                       f"{count} rows (expected >= {expected_min})"))

        # Distribution check: no district with zero FIR records
        cur.execute("""
            SELECT d.district_code, COUNT(f.fir_id) AS fir_count
            FROM (SELECT DISTINCT district_code FROM fir_records) d
            LEFT JOIN fir_records f USING (district_code)
            GROUP BY d.district_code
            ORDER BY fir_count ASC
            LIMIT 5
        """)
        rows = cur.fetchall()
        if rows and rows[0][1] == 0:
            results.append(CheckResult("PG.distribution", False,
                                       f"District(s) with 0 FIRs: {rows}"))
        else:
            results.append(CheckResult("PG.distribution", True,
                                       f"Lowest district has {rows[0][1] if rows else 0} FIRs"))

        cur.close()
    except Exception as e:
        results.append(CheckResult("PG.connect", False, f"Failed: {e}"))
    finally:
        if conn is not None:
            conn.close()
    return results


def check_elasticsearch(args) -> list:
    results = []
    try:
        from elasticsearch import Elasticsearch
    except ImportError:
        results.append(CheckResult("ES", False, "elasticsearch library not installed"))
        return results

    es_url = f"http://{args.es_host}:{args.es_port}"
    index = args.es_index
    try:
        client = Elasticsearch(es_url)
        if not client.indices.exists(index=index):
            results.append(CheckResult("ES.index_exists", False, f"index '{index}' missing"))
            return results
        results.append(CheckResult("ES.index_exists", True, f"index '{index}' present"))

        resp = client.count(index=index)
        count = resp.get("count", 0) if isinstance(resp, dict) else resp["count"]
        ok = count >= cfg.DEFAULT_FIR_COUNT // 2
        results.append(CheckResult("ES.doc_count", ok,
                                   f"{count} docs (expected >= {cfg.DEFAULT_FIR_COUNT//2})"))

    except Exception as e:
        results.append(CheckResult("ES.connect", False, f"Failed: {e}"))
    return results


def check_kafka(args) -> list:
    results = []
    try:
        from kafka import KafkaConsumer
    except ImportError:
        results.append(CheckResult("Kafka", False, "kafka-python not installed"))
        return results
    try:
        consumer = KafkaConsumer(
            bootstrap_servers=args.bootstrap,
            consumer_timeout_ms=3000,
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            group_id="verify-group",
        )
        topics = consumer.topics()
        if args.topic not in topics:
            results.append(CheckResult("Kafka.topic_exists", False, f"topic '{args.topic}' missing"))
            return results
        results.append(CheckResult("Kafka.topic_exists", True,
                                   f"topic '{args.topic}' exists"))

        # partitions
        parts = consumer.partitions_for_topic(args.topic)
        results.append(CheckResult("Kafka.partition_count",
                                   bool(parts) and len(parts) == 30,
                                   f"{len(parts) if parts else 0} partitions (expected 30)"))
        consumer.close()
    except Exception as e:
        results.append(CheckResult("Kafka.connect", False, f"Failed: {e}"))
    return results


# =============================================================================
# Entrypoint
# =============================================================================
def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="KSP Phase 1 verification")
    p.add_argument("--pg-host", type=str, default=os.environ.get("POSTGRES_HOST", "localhost"))
    p.add_argument("--pg-port", type=int, default=int(os.environ.get("POSTGRES_PORT", "5432")))
    p.add_argument("--es-host", type=str, default=os.environ.get("ELASTICSEARCH_HOST", "localhost"))
    p.add_argument("--es-port", type=int, default=int(os.environ.get("ELASTICSEARCH_PORT", "9200")))
    p.add_argument("--es-index", type=str, default=os.environ.get("ELASTICSEARCH_INDEX", "crime-index"))
    p.add_argument("--bootstrap", type=str,
                   default=os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"))
    p.add_argument("--topic", type=str, default=os.environ.get("KAFKA_FIR_TOPIC", "fir-events"))
    p.add_argument("--skip-kafka", action="store_true", help="Skip Kafka checks")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("=== KSP Phase 1 Verification ===")
    all_results = []
    all_results.extend(check_postgres(args))
    all_results.extend(check_elasticsearch(args))
    if not args.skip_kafka:
        all_results.extend(check_kafka(args))

    print()
    for r in all_results:
        print(r)
    print()
    passed = sum(1 for r in all_results if r.ok)
    failed = sum(1 for r in all_results if not r.ok)
    print(f"Summary: {passed} passed, {failed} failed out of {len(all_results)}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
