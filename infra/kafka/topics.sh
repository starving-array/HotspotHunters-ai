#!/usr/bin/env bash
# =============================================================================
# KSP Intelligence Portal — Kafka Topic Creation Script
# File: infra/kafka/topics.sh
#
# Creates all required Kafka topics with correct partition counts and retention.
# Run inside the kafka-init container (see docker-compose.yml) AFTER Kafka is healthy.
# =============================================================================

set -euo pipefail

BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-kafka:9092}"

echo "================================================"
echo "  KSP Kafka Topic Initialization"
echo "  Bootstrap: ${BOOTSTRAP_SERVERS}"
echo "================================================"

# Wait until Kafka broker is reachable
echo "Waiting for Kafka to be ready..."
until kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" --list >/dev/null 2>&1; do
  echo "  Kafka not ready yet, retrying in 3s..."
  sleep 3
done
echo "Kafka is ready."

# -----------------------------------------------------------------------------
# Topic: fir-events
#   30 partitions (one per Karnataka district) for parallel consumer groups
#   Retention: 7 days (enough for replay during demo, not infinite)
# -----------------------------------------------------------------------------
echo "Creating topic: fir-events (30 partitions)..."
kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" \
  --create \
  --if-not-exists \
  --topic fir-events \
  --partitions 30 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete

# -----------------------------------------------------------------------------
# Topic: alert-events
#   6 partitions (severity-based routing, modest volume)
#   Retention: 3 days
# -----------------------------------------------------------------------------
echo "Creating topic: alert-events (6 partitions)..."
kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" \
  --create \
  --if-not-exists \
  --topic alert-events \
  --partitions 6 \
  --replication-factor 1 \
  --config retention.ms=259200000 \
  --config cleanup.policy=delete

# -----------------------------------------------------------------------------
# Topic: audit-events
#   6 partitions (officer-hash based routing)
#   Retention: 30 days (audit needs longer retention)
# -----------------------------------------------------------------------------
echo "Creating topic: audit-events (6 partitions)..."
kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" \
  --create \
  --if-not-exists \
  --topic audit-events \
  --partitions 6 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --config cleanup.policy=delete

# -----------------------------------------------------------------------------
# Verify
# -----------------------------------------------------------------------------
echo "================================================"
echo "  Created topics:"
echo "================================================"
kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" --list

echo ""
echo "Topic details:"
for topic in fir-events alert-events audit-events; do
  echo "--- ${topic} ---"
  kafka-topics --bootstrap-server "${BOOTSTRAP_SERVERS}" --describe --topic "${topic}"
done

echo ""
echo "All topics created successfully."
