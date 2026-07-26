# ADR-001: Kafka Partitioning by District Code

**Status:** Accepted  
**Date:** 2026-07  

## Context

The `fir-events` topic needs to support ordered processing per district and parallel consumption across 3 consumer groups (indexing, aggregation, anomaly). Each consumer group independently processes every FIR event.

## Decision

Partition the `fir-events` topic by `district_code` using 30 partitions (matching Karnataka's 31 districts, with 1 extra for overflow).

```bash
kafka-topics --create --topic fir-events \
  --partitions 30 --replication-factor 1
```

Each consumer group runs with `concurrency: 3` (3 threads), distributing the 30 partitions evenly.

## Consequences

- **Positive:** All FIRs for the same district land in the same partition, preserving order for rollup calculations. Consumers can scale independently per group.
- **Positive:** Adding more districts only requires repartitioning.
- **Negative:** A hot district (e.g., Bengaluru Urban) creates an uneven load on a single partition. Mitigation: partition count > districts spreads load.
