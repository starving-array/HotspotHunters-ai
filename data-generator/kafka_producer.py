"""
KSP Intelligence Portal — Live Kafka Producer
File: data-generator/kafka_producer.py

Continuously publishes synthetic FIR events to the `fir-events` Kafka topic
at a configurable interval (default: 1 event / 3 seconds per architecture doc §4.1).

Designed for the judge demo:
  - Stream shows up as offsets moving on the `fir-events` topic
  - Each event is a fully-formed FIR record (Spring Boot consumers will receive it
    in Phase 2)
  - Keyed by district_code (ensures partitioning by district -> ordered within
    district)
  - Graceful shutdown on SIGINT / SIGTERM

Usage (via Docker, recommended):
  docker compose run --rm data-generator python -m data_generator.kafka_producer

Local (against host port 9092):
  python -m data_generator.kafka_producer --bootstrap localhost:9092
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

# Support both packaged invocation and direct-script invocation.
try:
    from . import config as cfg
    from .generate import SyntheticDataGenerator
except ImportError:
    import config as cfg
    from generate import SyntheticDataGenerator

logger = logging.getLogger(__name__)


# Globals for signal handler
_running = True


def _signal_handler(signum, frame):
    global _running
    logger.info("Received signal %s — shutting down producer…", signum)
    _running = False


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="KSP live Kafka FIR producer")
    p.add_argument("--bootstrap", type=str,
                   default=os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
                   help="Kafka bootstrap servers (default: env KAFKA_BOOTSTRAP_SERVERS or localhost:9092)")
    p.add_argument("--topic", type=str,
                   default=os.environ.get("KAFKA_FIR_TOPIC", "fir-events"),
                   help="Target Kafka topic (default: env KAFKA_FIR_TOPIC or fir-events)")
    p.add_argument("--interval", type=float,
                   default=float(os.environ.get("STREAM_INTERVAL_SECONDS", str(cfg.DEFAULT_STREAM_INTERVAL_SECONDS))),
                   help="Seconds between events (default: 3.0; env STREAM_INTERVAL_SECONDS)")
    p.add_argument("--max-events", type=int, default=0,
                   help="Stop after N events (0 = run forever, default)")
    p.add_argument("--seed", type=int, default=cfg.RANDOM_SEED,
                   help=f"Random seed (default: {cfg.RANDOM_SEED})")
    p.add_argument("--log-level", default="INFO")
    return p.parse_args()


def _new_fir_event(template_dataset, fir_index: int, ts_override: datetime) -> dict:
    """Compose a single new FIR event from a pre-generated template dataset.

    Generating the template dataset on every event would re-run all 100K-record
    generation per event (~10s) — unacceptable for live streaming. Instead we
    generate ONCE then index into the pre-built FIR list, overriding fir_id and
    timestamps to make each event "live" and unique.
    """
    f = template_dataset.fir_records[fir_index % len(template_dataset.fir_records)]

    # Override fir_id to ensure it doesn't clash with bulk-loaded records
    fir_id = f"LIVE{fir_index:08d}"

    payload = {
        "fir_id": fir_id,
        "station_code": f.station_code,
        "district_code": f.district_code,
        "taluk_code": f.taluk_code,
        "crime_type": f.crime_type,
        "crime_subtype": f.crime_subtype,
        "latitude": f.latitude,
        "longitude": f.longitude,
        "incident_ts": ts_override.isoformat(),
        "registered_ts": ts_override.isoformat(),
        "offender_id": f.offender_id,
        "victim_id": f.victim_id,
        "modus_operandi": f.modus_operandi,
        "status": "OPEN",
    }
    return payload


def main() -> int:
    args = _parse_args()
    logging.basicConfig(level=args.log_level,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    try:
        from kafka import KafkaProducer
    except ImportError:
        logger.error("kafka-python not installed. Run: pip install -r requirements.txt")
        return 1

    logger.info("Connecting to Kafka cluster at %s (topic=%s, interval=%.2fs)",
                args.bootstrap, args.topic, args.interval)

    producer: Optional[KafkaProducer] = None
    try:
        producer = KafkaProducer(
            bootstrap_servers=args.bootstrap,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            acks="all",
            retries=5,
            linger_ms=0,
            request_timeout_ms=10000,
        )
    except Exception as e:
        logger.error("Failed to create KafkaProducer: %s", e)
        logger.error("Is Kafka reachable at %s?  Will retry once and then exit.", args.bootstrap)
        time.sleep(3)
        try:
            producer = KafkaProducer(
                bootstrap_servers=args.bootstrap,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all",
            )
        except Exception as e2:
            logger.error("Retry failed: %s", e2)
            return 2

    logger.info("Producer ready. Starting live stream (Ctrl-C to stop)…")

    # Use a generator instance for sourcing record templates
    generator = SyntheticDataGenerator(fir_count=10_000, seed=args.seed)
    logger.info("Pre-generating template dataset (%d FIRs, seed=%d)…",
                10_000, args.seed)
    template_dataset = generator.generate()
    logger.info("Template dataset ready — fetching live events from index 0…")
    fir_index = 0
    sent = 0
    last_log_ts = time.time()

    try:
        while _running:
            if args.max_events and sent >= args.max_events:
                logger.info("Reached max-events limit (%d) — stopping.", args.max_events)
                break

            payload = _new_fir_event(template_dataset, fir_index, datetime.now(timezone.utc))
            key = payload["district_code"]

            try:
                producer.send(args.topic, key=key, value=payload)
                sent += 1
                fir_index += 1
                if time.time() - last_log_ts > 5:
                    logger.info("Sent %d events (last district=%s, fir_id=%s)",
                                sent, key, payload["fir_id"])
                    last_log_ts = time.time()
            except Exception as e:
                logger.error("Failed to send event %d: %s (will retry)", sent, e)

            time.sleep(args.interval)

    finally:
        if producer is not None:
            logger.info("Flushing producer (timeout 30s)…")
            producer.flush(timeout=30)
            producer.close(timeout=10)
        logger.info("Producer stopped. Total sent: %d", sent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
