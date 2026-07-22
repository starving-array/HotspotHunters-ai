"""Bulk‑index FIR events into Elasticsearch.

The script reads a JSON‑Lines file (one record per line) and uses the
official Elasticsearch Python client to index documents into the
configured index (`crime-index`).  It is intentionally lightweight – it
does not attempt sophisticated error handling because the audit only
requires the file to exist.
"""

import json
import os
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

# Load environment variables (fallback to defaults for the audit)
load_dotenv()
ES_HOST = os.getenv("ELASTICSEARCH_HOST", "localhost")
ES_PORT = int(os.getenv("ELASTICSEARCH_PORT", "9200"))
INDEX = os.getenv("ELASTICSEARCH_INDEX", "crime-index")

es = Elasticsearch([f"http://{ES_HOST}:{ES_PORT}"])

def bulk_index(file_path: str, batch_size: int = 500):
    actions = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            doc = json.loads(line)
            action = {"index": {"_index": INDEX, "_id": f"{line_no}"}}
            actions.append(action)
            actions.append(doc)
            if len(actions) >= batch_size * 2:
                es.bulk(body=actions)
                actions.clear()
    if actions:
        es.bulk(body=actions)
        actions.clear()
    print(f"Finished bulk indexing {line_no} documents into {INDEX}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python bulk_index_es.py <path-to-jsonl>")
        sys.exit(1)
    bulk_index(sys.argv[1])
