#!/usr/bin/env python3
"""
KSP Intelligence Portal — Neo4j Cyber Indicator Sync
File: scripts/sync_cyber_indicators_neo4j.py

Pushes cyber_indicators from PostgreSQL into Neo4j as :CyberIndicator nodes
with :HAS_INDICATOR edges to :Case nodes. Reads ONLY from cyber_indicators —
leaves every other Neo4j node/relationship untouched.

Re-uses the seed_cyber_indicators() implementation from scripts/seed_neo4j.py
but skips the destructive full-resync step (clear + reseed of all nodes).

Usage:
    python scripts/sync_cyber_indicators_neo4j.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import psycopg2
from neo4j import GraphDatabase

PG_DSN = "host=localhost port=5432 dbname=ksp_intelligence user=ksp_app password=changeme"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j", "changeme")


def main() -> int:
    pg = psycopg2.connect(PG_DSN)
    pg.set_client_encoding("UTF8")
    neo = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)

    try:
        with pg.cursor() as cur:
            cur.execute(
                "SELECT ci.indicator_id, ci.casemasterid, ci.indicator_type, "
                "ci.indicator_value, ci.platform, ci.extracted_from, "
                "ci.first_seen, ci.last_seen "
                "FROM cyber_indicators ci ORDER BY ci.indicator_id"
            )
            rows = cur.fetchall()

        if not rows:
            print("cyber_indicators table is empty — nothing to sync.")
            return 1

        print(f"Syncing {len(rows)} CyberIndicator nodes to Neo4j…")
        with neo.session() as s:
            s.run(
                """
                UNWIND $rows AS r
                MERGE (ci:CyberIndicator {indicatorId: r.id})
                SET ci.indicatorType = r.type, ci.indicatorValue = r.value,
                    ci.platform = r.platform, ci.extractedFrom = r.extracted,
                    ci.firstSeen = r.firstSeen, ci.lastSeen = r.lastSeen
                """,
                parameters={
                    "rows": [
                        {
                            "id": r[0],
                            "caseId": r[1],
                            "type": r[2],
                            "value": r[3],
                            "platform": r[4],
                            "extracted": r[5],
                            "firstSeen": r[6].isoformat() if r[6] else None,
                            "lastSeen": r[7].isoformat() if r[7] else None,
                        }
                        for r in rows
                    ]
                },
            )

        with neo.session() as s:
            s.run(
                """
                UNWIND $rows AS r
                MATCH (c:Case {caseMasterId: r.caseId})
                MATCH (ci:CyberIndicator {indicatorId: r.id})
                MERGE (c)-[:HAS_INDICATOR]->(ci)
                """,
                parameters={"rows": [{"id": r[0], "caseId": r[1]} for r in rows]},
            )

        with neo.session() as s:
            r = s.run("""
                // Shared-indicator clusters: same indicatorValue linking multiple cases
                MATCH (c1:Case)-[:HAS_INDICATOR]->(ci:CyberIndicator)<-[:HAS_INDICATOR]-(c2:Case)
                WHERE id(c1) < id(c2)
                RETURN ci.indicatorType AS indicatorType,
                       ci.indicatorValue AS indicatorValue,
                       count(DISTINCT c1) + count(DISTINCT c2) AS caseLinks,
                       collect(DISTINCT c1.caseMasterId) AS cases
                ORDER BY caseLinks DESC LIMIT 10
            """)
            print("\n=== Shared-indicator clusters (APPEARS_IN-style graph) ===")
            found = False
            for row in r:
                found = True
                print(f"  {row['indicatorType']:<10} {row['indicatorValue']:<25} -> "
                      f"{row['caseLinks']} links -> cases {row['cases']}")
            if not found:
                print("  (no shared clusters detected in Neo4j)")

        with neo.session() as s:
            r = s.run(
                "MATCH (:Case)-[r:HAS_INDICATOR]->(:CyberIndicator) RETURN count(r) AS n"
            ).single()
            print(f"\nHAS_INDICATOR relationships in Neo4j: {r['n']}")

        return 0
    finally:
        pg.close()
        neo.close()


if __name__ == "__main__":
    sys.exit(main())
