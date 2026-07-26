import json
import logging
import os
from collections import defaultdict
from typing import Dict, List, Tuple

import networkx as nx
import psycopg2
import redis as redis_lib

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

PG_HOST = os.environ.get("POSTGRES_HOST", "postgres")
PG_DB = os.environ.get("POSTGRES_DB", "ksp_intelligence")
PG_USER = os.environ.get("POSTGRES_USER", "ksp_app")
PG_PASS = os.environ.get("POSTGRES_PASSWORD", "changeme")
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
TOP_K = int(os.environ.get("PREDICT_TOP_K", "10"))


def main():
    conn = psycopg2.connect(host=PG_HOST, dbname=PG_DB, user=PG_USER, password=PG_PASS)
    cur = conn.cursor()

    logger.info("Loading co-offender graph from offender_network…")
    cur.execute("""
        SELECT DISTINCT offender_a, offender_b
        FROM offender_network
    """)
    edges = cur.fetchall()
    cur.close()
    conn.close()

    logger.info("Loaded %d co-offender edges", len(edges))

    G = nx.Graph()
    for a, b in edges:
        G.add_edge(a, b)

    logger.info("Graph: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())

    predictors: Dict[str, List[Tuple[str, float]]] = {}

    for node in G.nodes():
        common_neighbors: Dict[str, float] = defaultdict(float)

        neighbors = set(G.neighbors(node))
        if len(neighbors) < 2:
            continue

        for neighbor in neighbors:
            for neighbor_of_neighbor in G.neighbors(neighbor):
                if neighbor_of_neighbor == node or neighbor_of_neighbor in neighbors:
                    continue
                common_neighbors[neighbor_of_neighbor] += 1.0

        if not common_neighbors:
            continue

        ranked = sorted(
            [(n, s / max(len(neighbors), 1)) for n, s in common_neighbors.items()],
            key=lambda x: -x[1],
        )
        predictors[node] = ranked[:TOP_K]

    total_predicted = sum(len(v) for v in predictors.values())
    logger.info("Computed %d predicted links for %d offenders", total_predicted, len(predictors))

    r = redis_lib.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    for offender, predictions in predictors.items():
        key = f"link_prediction:{offender}"
        r.delete(key)
        for pred_offender, score in predictions:
            r.zadd(key, {pred_offender: score})

    if predictors:
        first = next(iter(predictors.items()))
        logger.info("Example: %s → %s", first[0], first[1][:3])

    r.set("link_prediction:last_updated", str(__import__("datetime").datetime.now()))
    logger.info("Link predictions stored in Redis")


if __name__ == "__main__":
    main()
