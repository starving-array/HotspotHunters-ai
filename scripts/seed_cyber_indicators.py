#!/usr/bin/env python3
"""
KSP Intelligence Portal — Cybercrime Indicator Seeder
File: scripts/seed_cyber_indicators.py

Idempotently re-populates the `cyber_indicators` table for all cybercrime-flagged
CaseMaster rows, with deliberate indicator-value sharing across cases so that
the downstream `detect_cyber_patterns.py` script can surface real clusters,
rings, and platform spikes (mirroring `cyber_trend_alerts.pattern_type`).

Why a seeder instead of a generator change?
  - The cybercrime module (Phase 6a) lives on top of the existing data
    pipeline (which produces FIRs / offenders / network), so affecting the
    generator would risk destabilising the working e2e pipeline and tests.
  - The seeder reads the existing `casemaster` rows that are flagged
    `is_cybercrime = true` (currently 100 of 100k) and synthesises 1-5
    indicators per case drawn from a deliberately small pool of values so
    that the same IP / domain / wallet / phone / handle appears across many
    cases — exactly the kind of structure cyber pattern detection needs.

Usage:
  python scripts/seed_cyber_indicators.py
  python scripts/seed_cyber_indicators.py --pg-host localhost --pg-port 5432 \
                                       --user ksp_app --password changeme --db ksp_intelligence

Idempotency:
  - Truncates `cyber_indicators` and rebuilds.
  - Updates `casemaster` cyber fields in place (primary_platform, financial_loss,
    cyber_severity); sets `is_cybercrime = true` for cases that get indicators.
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import psycopg2
from psycopg2.extras import execute_values

# Allow `from scripts.xxx import ...` and direct execution.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger(__name__)


# =============================================================================
# Indicator pools — deliberately SMALL to force real clusters to emerge.
# (Real cybercrime analytics finds a handful of IPs / domains / wallets
#  linking many cases — small pool = many shared values.)
# =============================================================================

# ~15 shared IPs (so a single IP can hit 5-15 cases — a meaningful "cluster")
IP_POOL = [
    "103.21.244.10", "103.21.244.18", "103.21.244.32",
    "45.114.10.7",  "45.114.10.22",  "45.114.10.91",
    "182.75.21.4",  "182.75.21.88",  "182.75.21.122",
    "157.32.144.5", "157.32.144.99",
    "203.187.55.10", "203.187.55.71",
    "14.139.85.200",
]

# ~10 shared domains (Phishing / fake-store / scam-infra)
DOMAIN_POOL = [
    "quickreward.in", "kvk-mumbai.com", "flipkart-mega-sale.com",
    "income-taxrefund.in", "paytm-cashback.in", "amazon-luckydraw.com",
    "loan-sanction.in", "swiggy-voucher.in", "irctc-tatkal-now.in",
    "shadimubarak-hall.com",
]

# ~12 shared crypto / UPI wallets (financial fraud ring)
WALLET_POOL = [
    "wallet_7s2k", "wallet_a9d3", "wallet_b1n8",
    "upi:fraudster1@okaxis", "upi:cashteam@okhdfc",
    "upi:loanhelp@okicici", "upi:refunddesk@oksbi",
    "eth:0x91f3..a82b", "eth:0x44ad..11f9",
    "btc:bc1q..8h2k", "btc:bc1q..x7mn",
    "wallet_k5p2",
]

# ~10 shared phone numbers (smishing / OTP-fraud)
PHONE_POOL = [
    "+919811000111", "+919811000222", "+919811000333",
    "+919822240010", "+919822240011", "+919822240099",
    "+917334455010", "+917334455011",
    "+919012340010", "+919012340099",
]

# ~8 shared bank accounts (mule accounts for fraud ring)
BANK_ACCOUNT_POOL = [
    "SBN-33012345678", "SBN-33012349911", "SBN-33012345050",
    "HDFC-10099887766", "HDFC-10099881122",
    "ICICI-998877665544", "ICIC-998877665588",
    "BARB-887766554433",
]

# ~6 shared social handles (catfish / impersonation / stalking)
SOCIAL_HANDLE_POOL = [
    "@dating_avail_blr", "@army_officer_fake",
    "@refund_helper_in", "@carousel_highreturn",
    "@shadi_sure_match", "@insta_support_impostor",
]

# ~5 shared email accounts (phishing C2 / extortion)
EMAIL_POOL = [
    "support.quickrefund@fastmail.in",
    "kyc.update@secure-lead.in",
    "lottery.claim@winner-circle.in",
    "loan.sanction@financehelp.in",
    "igo.army.desk@fulfillers.in",
]

# ~6 shared UPI IDs (split out from wallet_pool for clarity)
UPI_ID_POOL = [
    "fraudster1@okaxis", "cashteam@okhdfc",
    "loanhelp@okicici", "refunddesk@oksbi",
    "vipcashback@okbaroda", "loansaction@apyfino",
]

# ~5 shared device fingerprints (synthetic-id format)
DEVICE_ID_POOL = [
    "DEV-AND-X86-0001-IND",  "DEV-AND-X86-0002-IND",
    "DEV-IOS-A12-0099-BLR",  "DEV-AND-M32-9871-MYS",
    "DEV-IOS-X93-3121-HYD",
]

# ~10 platforms — concentration ensures payload hits "platform_spike" detector
PLATFORM_POOL = [
    "WhatsApp", "WhatsApp", "WhatsApp",      # 3x — high concentration
    "Telegram", "Telegram",                  # 2x
    "Instagram", "Instagram",                 # 2x
    "Facebook",
    "PhonePe",
    "GooglePay",
]

# Cyber severity distribution (mapped from financial_loss magnitude)
SEVERITY_BY_LOSS = [
    (10_000.0,  "low"),
    (50_000.0,  "medium"),
    (2_00_000.0, "high"),
    (float("inf"), "critical"),
]


# =============================================================================
# Helpers
# =============================================================================
def _pick(rng: random.Random, pool: List[str], weights: Optional[List[float]] = None) -> str:
    return rng.choices(pool, weights=weights, k=1)[0] if weights else rng.choice(pool)


def _pick_subset(rng: random.Random, pool: List[str], k_min: int, k_max: int) -> List[str]:
    """Pick 1..k items from a pool WITHOUT replacement (each indicator unique per case)."""
    k = rng.randint(k_min, k_max)
    k = min(k, len(pool))
    return rng.sample(pool, k=k)


def _platform_for_indicator(indicator_type: str, rng: random.Random, case_platform: Optional[str]) -> Optional[str]:
    """Return the platform associated with a given indicator type within a case."""
    if indicator_type in ("social_handle", "email") and case_platform:
        return case_platform
    if indicator_type == "phone":
        return "WhatsApp"
    if indicator_type == "upi_id":
        return rng.choice(["PhonePe", "GooglePay"])
    return case_platform


def _derive_severity(loss: float) -> str:
    for threshold, sev in SEVERITY_BY_LOSS:
        if loss < threshold:
            return sev
    return "critical"  # unreachable per definition but defensive


# =============================================================================
# Main pipeline
# =============================================================================
def seed_cyber_indicators(pg_dsn: str, seed: int = 42, target_cyber_cases: Optional[int] = None) -> Dict[str, int]:
    """
    Truncate `cyber_indicators`, repopulate for cybercrime-flagged CaseMaster rows,
    and update casemaster cyber fields in place.

    Returns a stats dict for verification / pytest assertions.
    """
    rng = random.Random(seed)
    stats: Dict[str, int] = {
        "cases_flagged": 0,
        "indicators_inserted": 0,
        "cyber_trend_alerts_pattern_types_present": 0,
    }

    conn = psycopg2.connect(pg_dsn)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        # 1. Pull cybercrime-flagged casemaster ids (random order via RANDOM() so the
        #    --target-cyber-cases subset is unbiased even when N is larger).
        cur.execute(
            "SELECT casemasterid, crimeregistereddate, briefFacts "
            "FROM casemaster WHERE is_cybercrime = true "
            "ORDER BY RANDOM() "
            "LIMIT %s",
            (target_cyber_cases or 100_000,),  # cap defaults to no-op for small dataset
        )
        case_rows: List[Tuple[int, datetime, Optional[str]]] = cur.fetchall()
        stats["cases_flagged"] = len(case_rows)
        if not case_rows:
            logger.warning("No cybercrime-flagged cases in casemaster — nothing to seed.")
            return stats

        # If user asked for a smaller set, truncate here (LIMIT above already handles).
        # 2. Truncate existing cyber_indicators (idempotency)
        cur.execute("TRUNCATE TABLE cyber_indicators RESTART IDENTITY CASCADE;")
        conn.commit()

        # 3. Build per-case indicator rows
        indicator_rows: List[tuple] = []  # (casemasterid, type, value, platform, extracted_from, first_seen, last_seen)
        casemaster_updates: List[tuple] = []  # (primary_platform, financial_loss, cyber_severity, casemasterid, crimeregdate)

        first_seen_window_start = datetime.now(timezone.utc) - timedelta(days=540)
        first_seen_window_end = datetime.now(timezone.utc) - timedelta(days=30)

        for case_idx, (case_master_id, crime_registered_date, brief_facts) in enumerate(case_rows, start=1):
            # 1-3 platform pick per case (drawn from small pool → some cases share platform)
            primary_platform = _pick(rng, PLATFORM_POOL)
            # Always assign platform to make platform_spike meaningful.
            platform_for_case = primary_platform

            # Decide which indicator types apply to THIS case (2-5 different types).
            n_types = rng.randint(2, 5)
            picked_types = rng.sample(
                ["ip", "domain", "wallet", "phone", "bank_account",
                 "social_handle", "email", "upi_id", "device_id"],
                k=n_types,
            )

            # Insert one or more rows per picked type (multiple phones per case is realistic)
            for itype in picked_types:
                pool_map = {
                    "ip": IP_POOL,
                    "domain": DOMAIN_POOL,
                    "wallet": WALLET_POOL,
                    "phone": PHONE_POOL,
                    "bank_account": BANK_ACCOUNT_POOL,
                    "social_handle": SOCIAL_HANDLE_POOL,
                    "email": EMAIL_POOL,
                    "upi_id": UPI_ID_POOL,
                    "device_id": DEVICE_ID_POOL,
                }
                pool = pool_map[itype]
                # 30% of the time, also a second value of the same type (e.g. two phones)
                n_values = 2 if rng.random() < 0.30 else 1
                values = rng.choices(pool, k=n_values)
                for value in values:
                    first_seen = _weighted_datetime(rng, first_seen_window_start, first_seen_window_end)
                    last_seen = first_seen + timedelta(hours=rng.randint(1, 240))
                    platform = _platform_for_indicator(itype, rng, platform_for_case)
                    indicator_rows.append((
                        case_master_id,
                        itype, value, platform,
                        brief_facts or "",
                        first_seen, last_seen,
                    ))

            # Compute financial_loss (~70% have a loss; log-distributed realistic amounts)
            if rng.random() < 0.70:
                # 1k to 10L log-normal-ish via discrete buckets for determinism
                bucket = rng.choices(
                    [2_000, 15_000, 75_000, 4_00_000, 12_00_000],
                    weights=[0.40, 0.30, 0.20, 0.08, 0.02],
                )[0]
                loss = round(bucket + rng.uniform(-bucket * 0.15, bucket * 0.15), 2)
            else:
                loss = 0.0
            severity = _derive_severity(loss) if loss > 0 else "low"

            casemaster_updates.append((primary_platform, loss, severity, case_master_id, crime_registered_date))

        # 4. Bulk-insert indicators (batched)
        logger.info("Inserting %d indicator rows for %d cases…", len(indicator_rows), stats["cases_flagged"])
        execute_values(
            cur,
            """
            INSERT INTO cyber_indicators
                (casemasterid, indicator_type, indicator_value, platform,
                 extracted_from, first_seen, last_seen, is_active)
            VALUES %s
            """,
            indicator_rows,
            template="(%s, %s, %s, %s, %s, %s, %s, TRUE)",
        )
        stats["indicators_inserted"] = len(indicator_rows)
        conn.commit()

        # 5. Update casemaster cyber fields in place (primary_platform / loss / severity)
        logger.info("Updating casemaster cyber fields for %d cases…", len(casemaster_updates))
        execute_values(
            cur,
            """
            UPDATE casemaster SET
                primary_platform = data.platform,
                financial_loss = data.loss,
                cyber_severity = data.severity
            FROM (VALUES %s) AS data(platform, loss, severity, casemasterid, crimeregdate)
            WHERE casemaster.casemasterid = data.casemasterid
              AND casemaster.crimeregistereddate = data.crimeregdate
            """,
            casemaster_updates,
            template="(%s, %s, %s, %s, %s)",
        )
        conn.commit()

        # 6. Stats: how many distinct pattern-type candidates likely exist?
        #    We report the number of indicator_types present, which tells the
        #    caller how many of the four cluster-detector buckets can fire.
        cur.execute("""
            SELECT COUNT(DISTINCT indicator_type) FROM cyber_indicators
        """)
        stats["distinct_indicator_types"] = int(cur.fetchone()[0])

        # Cluster pre-count: types where at least one (value, >1 case) exists
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT indicator_value
                FROM cyber_indicators
                WHERE indicator_type IN ('ip', 'domain', 'wallet', 'phone')
                GROUP BY indicator_value
                HAVING COUNT(DISTINCT casemasterid) > 1
            ) AS clustered_values
        """)
        stats["clustered_indicator_values"] = int(cur.fetchone()[0])

        logger.info(
            "Seeded %d indicators across %d cases (%d distinct types, %d clustered values).",
            stats["indicators_inserted"], stats["cases_flagged"],
            stats["distinct_indicator_types"], stats["clustered_indicator_values"],
        )
        return stats

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _weighted_datetime(rng: random.Random, start: datetime, end: datetime) -> datetime:
    """Sample a datetime with light recent-bias within the window."""
    span = (end - start).total_seconds()
    u = rng.random()
    biased = 1.0 - (u * u)  # density near recent (end)
    return start + timedelta(seconds=biased * span)


# =============================================================================
# CLI
# =============================================================================
def _build_pg_dsn(args: argparse.Namespace) -> str:
    return f"postgresql://{args.user}:{args.password}@{args.pg_host}:{args.pg_port}/{args.db}"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed cyber_indicators from cybercrime-flagged CaseMaster rows.")
    p.add_argument("--pg-host", default=os.environ.get("POSTGRES_HOST", "localhost"))
    p.add_argument("--pg-port", type=int, default=int(os.environ.get("POSTGRES_PORT", "5432")))
    p.add_argument("--user", default=os.environ.get("POSTGRES_USER", "ksp_app"))
    p.add_argument("--password", default=os.environ.get("POSTGRES_PASSWORD", "changeme"))
    p.add_argument("--db", default=os.environ.get("POSTGRES_DB", "ksp_intelligence"))
    p.add_argument("--seed", type=int, default=42, help="Random seed (default 42)")
    p.add_argument("--target-cyber-cases", type=int, default=None,
                   help="Cap # of cybercrime-flagged cases processed (default: all).")
    p.add_argument("--log-level", default="INFO")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    logging.basicConfig(level=args.log_level,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    dsn = _build_pg_dsn(args)
    logger.info("PG DSN: %s", dsn.replace(args.password, ""))
    stats = seed_cyber_indicators(dsn, seed=args.seed, target_cyber_cases=args.target_cyber_cases)
    print(f"\nSeeded cyber indicators: {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
