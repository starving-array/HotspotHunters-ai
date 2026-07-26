# ADR-003: Redis Sorted Set for Live Hotspot Leaderboard

**Status:** Accepted  
**Date:** 2026-07  

## Context

The dashboard displays a real-time ranked list of districts by FIR count. Needs sub-millisecond reads and live updates as FIR events stream in.

## Decision

Use a Redis Sorted Set (`hotspots:live`) with `ZINCRBY district_code 1` per FIR event and `ZREVRANGE 0 9 WITHSCORES` for reads.

## Consequences

- **Positive:** O(log N) writes, O(1) reads for top-N. No DB query needed on read path.
- **Positive:** Atomic increment handles concurrent FIR events correctly.
- **Positive:** No scheduled batch job — updates are event-driven.
- **Negative:** If Redis goes down, leaderboard state is lost (persistence to PG is done separately).
- **Negative:** Sorted set grows unbounded if old districts never removed (mitigated by key reaper).
