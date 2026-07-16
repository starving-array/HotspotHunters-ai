"""
KSP Intelligence Portal — Bulk Loader
File: data-generator/bulk_load.py

Loads generated synthetic FIR/offender/victim/network data into:
  - PostgreSQL (via COPY FROM STDIN for speed)
  - ElasticSearch (via helpers.bulk, doc ID = fir_id for idempotent re-runs)

Idempotency:
  - PG: Existing tables are TRUNCATEd in FK-safe order before loading.
  - ES: index operations use fir_id as the _id, so re-runs overwrite.
  - ES index is auto-created from the mappings.json committed in Phase 0.

Usage (preferred — via Docker):
  docker compose run --rm data-generator python -m data_generator.bulk_load

Local (against host-exposed infra ports):
  python -m data_generator.bulk_load --pg-host localhost --es-host localhost:9200
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sys
from datetime import datetime
from typing import Iterable, Iterator

# Support both packaged invocation (`python -m data_generator.bulk_load`)
# and direct-script invocation (`python bulk_load.py` from inside the dir).
try:
    from . import config as cfg
    from .generate import GeneratedDataset, SyntheticDataGenerator
except ImportError:
    import config as cfg
    from generate import GeneratedDataset, SyntheticDataGenerator

logger = logging.getLogger(__name__)


# =============================================================================
# PostgreSQL loader — uses COPY FROM STDIN via psycopg2
# =============================================================================
def load_to_postgres(dataset: GeneratedDataset, pg_dsn: str) -> None:
    """Insert all records to PostgreSQL using fast COMPL COPY FROM STDIN."""
    import psycopg2  # local import — optional during unit tests
    logger.info("Connecting to PostgreSQL…")
    conn = psycopg2.connect(pg_dsn)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Idempotency: TRUNCATE in FK-safe order, restart identity
        logger.info("Truncating existing data (FK-safe order)…")
        cur.execute("TRUNCATE TABLE offender_network, fir_records, offenders, victims RESTART IDENTITY CASCADE;")
        conn.commit()

        # ---- Load offenders ----
        logger.info("Loading %d offenders via COPY…", len(dataset.offenders))
        _copy_offenders(cur, dataset.offenders)
        conn.commit()

        # ---- Load victims ----
        logger.info("Loading %d victims via COPY…", len(dataset.victims))
        _copy_victims(cur, dataset.victims)
        conn.commit()

        # ---- Load FIR records ----
        logger.info("Loading %d FIR records via COPY…", len(dataset.fir_records))
        _copy_fir_records(cur, dataset.fir_records)
        conn.commit()

        # ---- Load network edges ----
        logger.info("Loading %d offender_network edges via COPY…", len(dataset.network_edges))
        _copy_network_edges(cur, dataset.network_edges)
        conn.commit()

        # ---- Verify counts in transaction ----
        for table, expected in [
            ("offenders", len(dataset.offenders)),
            ("victims", len(dataset.victims)),
            ("fir_records", len(dataset.fir_records)),
            ("offender_network", len(dataset.network_edges)),
        ]:
            cur.execute(f"SELECT COUNT(*) FROM {table};")
            actual = cur.fetchone()[0]
            if actual != expected:
                raise RuntimeError(f"{table} count mismatch: expected {expected}, got {actual}")
            logger.info("  %s: %d rows OK", table, actual)

        conn.commit()
        logger.info("PostgreSQL load complete.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


# ----- COPY helpers (implementations of psycopg2.copy_expert) -----
def _rows_to_csv(rows: Iterable[list], fields: list) -> io.StringIO:
    """Serialize rows into tab-separated stream for COPY FROM STDIN WITH (FORMAT text).

    Postgres text-format COPY rules:
      - NULL is represented by '\\N' (backslash-N) by default.
      - The field separator is TAB ('\\t') and row terminator is newline ('\\n').
      - Literal backslashes and tabs in data must be escaped with a leading backslash.
      - '\\N' as a literal data value must be written '\\\\N' to disambiguate from NULL.
    """
    from datetime import datetime as _dt
    buf = io.StringIO()
    for row in rows:
        cols = []
        for v in row:
            if v is None:
                cols.append("\\N")     # Postgres NULL marker for COPY text format
            elif isinstance(v, bool):
                cols.append("true" if v else "false")
            elif isinstance(v, _dt):
                cols.append(v.isoformat())    # Postgres parses ISO 8601
            elif isinstance(v, list):
                # TEXT[] — wrap as {"a","b"} for Postgres array literal
                arr = ",".join(f'"{str(x).replace(chr(34), chr(34)*2)}"' for x in v)
                cols.append("{" + arr + "}")
            elif isinstance(v, str):
                if v == "":
                    cols.append("")   # empty string is valid for non-null text columns
                else:
                    # escape backslash first, then tab/newline so COPY text parser
                    # doesn't misinterpret them
                    safe = v.replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
                    cols.append(safe)
            else:
                cols.append(str(v))
        buf.write("\t".join(cols) + "\n")
    buf.seek(0)
    return buf


def _copy_offenders(cur, offenders) -> None:
    sql = ("COPY offenders (offender_id, name_hash, age_group, prior_offenses, "
           "modus_tags, last_offense_ts, risk_score, created_at) FROM STDIN WITH (FORMAT text)")
    rows = [
        [
            o.offender_id, o.name_hash, o.age_group, o.prior_offenses,
            o.modus_tags, o.last_offense_ts, o.risk_score, o.created_at,
        ] for o in offenders
    ]
    buf = _rows_to_csv(rows, [])
    cur.copy_expert(sql, buf)


def _copy_victims(cur, victims) -> None:
    rows = [
        [v.victim_id, v.age_group, v.gender, v.created_at] for v in victims
    ]
    buf = _rows_to_csv(rows, [])
    cur.copy_expert(
        "COPY victims (victim_id, age_group, gender, created_at) FROM STDIN WITH (FORMAT text)",
        buf,
    )


def _copy_fir_records(cur, fir_records) -> None:
    rows = [
        [
            f.fir_id, f.station_code, f.district_code, f.taluk_code,
            f.crime_type, f.crime_subtype, f.latitude, f.longitude,
            f.incident_ts, f.registered_ts, f.offender_id, f.victim_id,
            f.modus_operandi, f.status, f.created_at,
        ] for f in fir_records
    ]
    buf = _rows_to_csv(rows, [])
    cur.copy_expert(
        "COPY fir_records (fir_id, station_code, district_code, taluk_code, "
        "crime_type, crime_subtype, latitude, longitude, incident_ts, registered_ts, "
        "offender_id, victim_id, modus_operandi, status, created_at) "
        "FROM STDIN WITH (FORMAT text)",
        buf,
    )


def _copy_network_edges(cur, edges) -> None:
    rows = [
        [e.offender_a, e.offender_b, e.shared_fir_id, e.co_crime_count] for e in edges
    ]
    buf = _rows_to_csv(rows, [])
    cur.copy_expert(
        "COPY offender_network (offender_a, offender_b, shared_fir_id, co_crime_count) "
        "FROM STDIN WITH (FORMAT text)",
        buf,
    )


# =============================================================================
# ElasticSearch loader
# =============================================================================
def load_to_elasticsearch(dataset: GeneratedDataset, es_url: str, es_index: str,
                          mappings_path: str = None) -> None:
    """Bulk-index FIRs to ElasticSearch. Creates the index with mapping if absent."""
    from elasticsearch import Elasticsearch
    from elasticsearch.helpers import bulk

    logger.info("Connecting to ElasticSearch at %s…", es_url)
    # elasticsearch-py 8.x expects hosts=[url]; bump timeouts for slow demo hosts.
    client = Elasticsearch(
        es_url,
        request_timeout=60,
        retry_on_timeout=True,
        max_retries=5,
    )

    # Pre-flight ping check (fail fast with a clear message rather than timing out)
    try:
        if not client.ping():
            raise RuntimeError("ES client ping returned False — service may not be up.")
    except Exception as e:
        raise RuntimeError(f"Cannot reach ElasticSearch at {es_url}: {e}") from e

    if mappings_path and os.path.exists(mappings_path):
        with open(mappings_path, "r", encoding="utf-8") as fh:
            mapping = json.load(fh)
    else:
        # Use the mappings.json committed at infra/elasticsearch/mappings.json
        default_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "infra", "elasticsearch", "mappings.json"))
        if os.path.exists(default_path):
            with open(default_path, "r", encoding="utf-8") as fh:
                mapping = json.load(fh)
        else:
            mapping = None
            logger.warning("No mappings file found — relying on dynamic mapping.")

    if not client.indices.exists(index=es_index):
        logger.info("Creating ES index '%s' with mapping…", es_index)
        # elasticsearch-py 8.x prefers mappings/settings as kwargs, but body= is still accepted.
        body = mapping if mapping else {}
        client.indices.create(index=es_index, body=body or None)
    else:
        logger.info("ES index '%s' already exists (will upsert docs).", es_index)

    logger.info("Bulk-indexing %d FIR docs…", len(dataset.fir_records))
    actions = ({
        "_op_type": "index",
        "_index": es_index,
        "_id": f.fir_id,
        "_source": {
            "fir_id": f.fir_id,
            "district": f.district_code,
            "taluk": f.taluk_code,
            "station_code": f.station_code,
            "crime_type": f.crime_type,
            "crime_subtype": f.crime_subtype,
            "location": {"lat": f.latitude, "lon": f.longitude},
            "incident_ts": f.incident_ts.isoformat(),
            "registered_ts": f.registered_ts.isoformat(),
            "offender_id": f.offender_id,
            "victim_id": f.victim_id,
            "modus_operandi": f.modus_operandi,
            "status": f.status,
        },
    } for f in dataset.fir_records)

    success, errors = bulk(client, actions, chunk_size=2000, request_timeout=60)
    if errors:
        logger.warning("Some bulk-index errors occurred: %s", errors[:3])
    logger.info("ElasticSearch load complete — %d docs indexed.", success)


# =============================================================================
# Entrypoint
# =============================================================================
def _get_pg_dsn(args) -> str:
    user = os.environ.get("POSTGRES_USER", "ksp_app")
    password = os.environ.get("POSTGRES_PASSWORD", "changeme")
    db = os.environ.get("POSTGRES_DB", "ksp_intelligence")
    url = os.environ.get("POSTGRES_URL")
    if url:
        # Replace host if --pg-host given
        if args.pg_host and "postgresql://" in url:
            # url is jdbc:postgresql://postgres:5432/db — strip jdbc: and swap host
            stripped = url.replace("jdbc:", "").replace("postgresql://", "")
            # restore via args
            return f"postgresql://{user}:{password}@{args.pg_host}:{args.pg_port}/{db}"
        return url.replace("jdbc:", "").replace("postgres:5432", f"{args.pg_host or 'localhost'}:{args.pg_port}")
    return f"postgresql://{user}:{password}@{args.pg_host}:{args.pg_port}/{db}"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Bulk load synthetic KSP data into Postgres + ElasticSearch")
    p.add_argument("--fir-count", type=int, default=cfg.DEFAULT_FIR_COUNT)
    p.add_argument("--seed", type=int, default=cfg.RANDOM_SEED)
    p.add_argument("--pg-host", type=str, default=os.environ.get("POSTGRES_HOST", "localhost"))
    p.add_argument("--pg-port", type=int, default=int(os.environ.get("POSTGRES_PORT", "5432")))
    p.add_argument("--es-host", type=str, default=os.environ.get("ELASTICSEARCH_HOST", "localhost"))
    p.add_argument("--es-port", type=int, default=int(os.environ.get("ELASTICSEARCH_PORT", "9200")))
    p.add_argument("--es-index", type=str, default=os.environ.get("ELASTICSEARCH_INDEX", "crime-index"))
    p.add_argument("--skip-pg", action="store_true", help="Skip PostgreSQL load")
    p.add_argument("--skip-es", action="store_true", help="Skip ElasticSearch load")
    p.add_argument("--log-level", default="INFO")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    logging.basicConfig(level=args.log_level,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    logger.info("Phase 1 — Bulk load starting")
    generator = SyntheticDataGenerator(fir_count=args.fir_count, seed=args.seed)
    dataset = generator.generate()

    if not args.skip_pg:
        pg_dsn = _get_pg_dsn(args)
        logger.info("PG DSN: %s", pg_dsn.replace(os.environ.get("POSTGRES_PASSWORD", ""), ""))
        load_to_postgres(dataset, pg_dsn)
    else:
        logger.info("Skipping PostgreSQL load (--skip-pg)")

    if not args.skip_es:
        es_url = f"http://{args.es_host}:{args.es_port}"
        load_to_elasticsearch(dataset, es_url, args.es_index)

    logger.info("All loading complete. Run verify.py to confirm.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
