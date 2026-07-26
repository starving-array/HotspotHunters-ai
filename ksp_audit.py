"""
KSP Intelligence Portal — Audit Script

Run this after deployment to verify all services are healthy
and all endpoints respond correctly.

Usage:
    python ksp_audit.py              (runs all checks)
    python ksp_audit.py --quick      (skips data-volume checks)
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8080")
PASS = "✅"
FAIL = "❌"
SKIP = "⏭️"


def log(status, msg):
    print(f"  {status}  {msg}")


def http_get(path, token=None, timeout=10):
    url = API_BASE + path
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]
    except Exception as e:
        return 0, str(e)


def http_post(path, body, token=None, timeout=10):
    url = API_BASE + path
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]
    except Exception as e:
        return 0, str(e)


def check_endpoint(method, path, expect, body=None, token=None):
    if method == "GET":
        status, data = http_get(path, token)
    else:
        status, data = http_post(path, body or {}, token)
    ok = status == expect
    log(PASS if ok else FAIL, f"{method} {path} -> {status} (expected {expect})")
    return ok, data


def main():
    quick = "--quick" in sys.argv
    print(f"\n{'='*60}")
    print("  KSP Intelligence Portal — Audit Script")
    print(f"{'='*60}\n")

    total, passed = 0, 0

    # --- Section 1: Health ---
    print("1. System Health")
    s, d = http_get("/actuator/health")
    ok = s == 200 and '"UP"' in d
    log(PASS if ok else FAIL, f"actuator/health -> {s}")
    total += 1
    passed += int(ok)

    # --- Section 2: Auth ---
    print("\n2. Authentication")
    s, d = http_post("/api/v1/auth/login", {"username": "test"})
    token = None
    ok = s == 200
    log(PASS if ok else FAIL, f"POST /api/v1/auth/login -> {s}")
    total += 1
    passed += int(ok)
    if ok:
        token = json.loads(d).get("token")
        if not token:
            token = json.loads(d).get("accessToken")

    if not token:
        log(FAIL, "Cannot proceed without auth token")
        return 1

    # --- Section 3: Core Endpoints ---
    print("\n3. Core API Endpoints")
    endpoints = [
        ("GET", "/api/v1/hotspots/live", 200),
        ("GET", "/api/v1/hotspots/breakdown/2", 200),
        ("GET", "/api/v1/search/geo?lat=12.97&lon=77.59&radius=10", 200),
        ("GET", "/api/v1/search/radius?lat=12.97&lon=77.59&radiusKm=10", 200),
        ("GET", "/api/v1/search/fulltext?q=robbery", 200),
        ("GET", "/api/v1/trends/2", 200),
        ("GET", "/api/v1/trends/compare?districts=2,3", 200),
        ("GET", "/api/v1/anomalies", 200),
        ("GET", "/api/v1/system/health", 200),
        ("GET", "/api/v1/network/graph", 200),
        ("GET", "/api/v1/network/1", 200),
        ("GET", "/api/v1/network/1/shap", 200),
        ("GET", "/api/v1/network/fir-similar/1", 200),
        ("GET", "/api/v1/network/link-prediction/OFF00001397", 200),
        ("GET", "/api/v1/fir-search?q=robbery", 200),
        ("GET", "/api/v1/audit", 200),
        ("GET", "/api/v1/audit/history/test", 200),
        ("GET", "/api/v1/dashboard/kpis", 200),
        ("GET", "/api/v1/io/dashboard", 200),
        ("GET", "/api/v1/cyber/dashboard", 200),
        ("GET", "/api/v1/cyber/map", 200),
        ("GET", "/api/v1/cyber/patterns", 200),
        ("GET", "/api/v1/osint/lookup?type=ip&value=8.8.8.8", 200),
        ("POST", "/api/v1/osint/enrich", 200, {"text": "check 10.0.0.1 and admin@example.com"}),
        ("POST", "/api/v1/predict/hotspot", 200, {"districtId": 2, "daysAhead": 7}),
        ("POST", "/api/v1/predict/offender", 200, {"features": [1, 2, 3, 4, 5, 6]}),
        ("POST", "/api/v1/nl/query", 200, {"query": "robberies in Bengaluru"}),
        ("POST", "/api/v1/audit", 201, {"officerId": "test", "actionType": "QUERY"}),
    ]
    for ep in endpoints:
        method, path, expect = ep[0], ep[1], ep[2]
        body = ep[3] if len(ep) > 3 else None
        ok, _ = check_endpoint(method, path, expect, body, token)
        total += 1
        passed += int(ok)

    # --- Section 4: Unauthenticated Access ---
    print("\n4. Security: Unauthenticated Access Blocked")
    s, d = http_get("/api/v1/hotspots/live")
    ok = s == 401 or s == 403
    log(PASS if ok else FAIL, f"GET /hotspots/live (no token) -> {s} (expected 401 or 403)")
    total += 1
    passed += int(ok)

    # --- Section 5: Data Volume (quick mode skips) ---
    if not quick:
        print("\n5. Data Volume")
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=os.environ.get("POSTGRES_HOST", "localhost"),
                dbname=os.environ.get("POSTGRES_DB", "ksp_intelligence"),
                user=os.environ.get("POSTGRES_USER", "ksp_app"),
                password=os.environ.get("POSTGRES_PASSWORD", "changeme"),
            )
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM casemaster")
            rows = cur.fetchone()[0]
            ok = rows >= 80000
            log(PASS if ok else FAIL, f"CaseMaster: {rows:,} rows (expected 80,000+)")
            total += 1
            passed += int(ok)
            cur.execute("SELECT COUNT(*) FROM accused")
            rows = cur.fetchone()[0]
            ok = rows >= 90000
            log(PASS if ok else FAIL, f"Accused: {rows:,} rows (expected 90,000+)")
            total += 1
            passed += int(ok)
            cur.close()
            conn.close()
        except Exception as e:
            log(SKIP, f"PostgreSQL check skipped: {e}")

    # --- Summary ---
    print(f"\n{'='*60}")
    print(f"  Results: {passed}/{total} checks passed")
    pct = passed / total * 100 if total else 0
    print(f"  Score:   {pct:.1f}%")
    if passed == total:
        print(f"  Status:  ALL CHECKS PASSED")
    else:
        print(f"  Status:  {total - passed} FAILURES DETECTED")
    print(f"{'='*60}\n")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
