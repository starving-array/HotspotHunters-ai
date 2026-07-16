"""
KSP Intelligence Portal — Synthetic Data Generator
File: data-generator/generate.py

Generates realistic synthetic crime records across Karnataka:
  - 100,000 FIR records (last 5 years, GPS-clustered around district centroids)
  - ~15,000 offenders (SHA-256 name_hash, modus_operandi tags, risk_score)
  - ~80,000 victims (age_group + gender only — PII minimized)
  - ~5,000 offender_network edges (co-crime pairs)

Design goals:
  - Deterministic: same seed -> identical dataset (reproducible demos)
  - Validated: GPS coords within Karnataka bbox, all FK references satisfied
  - Idempotent: re-running with same parameters overwrites cleanly (PG upsert,
                ES doc ID = fir_id so re-index is safe)

Usage:
  python -m data_generator.generate                       # default 100K FIRs
  python -m data_generator.generate --fir-count 200000     # custom count
  python -m data_generator.generate --seed 99             # different seed
  python -m data_generator.generate --json output/       # also dump JSON files

Note: this module only GENERATES in-memory. Loading to PG/ES is done by bulk_load.py.
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import math
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import numpy as np

# Local import — support both package invocation (`python -m data_generator.generate`)
# and direct script invocation (`python generate.py` from inside the directory).
try:
    from . import config as cfg          # packaged import
except ImportError:                       # direct-script invocation
    import config as cfg

logger = logging.getLogger(__name__)


# =============================================================================
# Data classes for typed records
# =============================================================================
@dataclass
class Offender:
    offender_id: str
    name_hash: str            # 64-char hex SHA-256
    age_group: str
    prior_offenses: int
    modus_tags: List[str]
    last_offense_ts: Optional[datetime]
    risk_score: float         # 0.0–100.0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class Victim:
    victim_id: str
    age_group: str
    gender: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class FIRRecord:
    fir_id: str
    station_code: str
    district_code: str
    taluk_code: str
    crime_type: str
    crime_subtype: str
    latitude: float
    longitude: float
    incident_ts: datetime
    registered_ts: datetime
    offender_id: Optional[str]
    victim_id: Optional[str]
    modus_operandi: str
    status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class NetworkEdge:
    offender_a: str
    offender_b: str
    shared_fir_id: str
    co_crime_count: int = 1


@dataclass
class GeneratedDataset:
    fir_records: List[FIRRecord]
    offenders: List[Offender]
    victims: List[Victim]
    network_edges: List[NetworkEdge]


# =============================================================================
# Helpers — deterministic weighted sampling
# =============================================================================
def _weighted_choice(rng: random.Random, items: List, weights: List[float]):
    return rng.choices(items, weights=weights, k=1)[0]


def _generate_id(prefix: str, index: int, width: int = 8) -> str:
    """Format IDs like FIR00000001, OFF00000015."""
    return f"{prefix}{index:0{width}d}"


def _hash_fake_name(rng: random.Random, faker) -> str:
    """Generate a SHA-256 hash of a fake name — never store plaintext."""
    name = faker.name()
    return hashlib.sha256(name.encode("utf-8")).hexdigest()


def _random_gps_around_centroid(
    rng: random.Random,
    lat_center: float,
    lng_center: float,
    sigma: float = cfg.GPS_CLUSTER_SIGMA_DEG,
) -> Tuple[float, float]:
    """Sample GPS coords clustered around a district centroid (Gaussian)."""
    lat = rng.gauss(lat_center, sigma)
    lng = rng.gauss(lng_center, sigma)
    # Clamp to Karnataka bbox (in case Gauss tail escapes)
    lat = max(min(lat, cfg.KARNATAKA_LAT_MAX), cfg.KARNATAKA_LAT_MIN)
    lng = max(min(lng, cfg.KARNATAKA_LNG_MAX), cfg.KARNATAKA_LNG_MIN)
    # Round to 4 decimal places (±11m precision, per privacy spec)
    lat = round(lat, cfg.GPS_PRECISION_DECIMALS)
    lng = round(lng, cfg.GPS_PRECISION_DECIMALS)
    return (lat, lng)


def _weighted_incident_ts(
    rng: random.Random,
    start: datetime,
    end: datetime,
) -> datetime:
    """
    Sample an incident timestamp within [start, end).
    Uses a skew to weight recent dates more heavily — realistic for FIRs.
    """
    span_seconds = (end - start).total_seconds()
    # Bias: u^2 -> more density near 1.0 (recent end)
    u = rng.random()
    biased = 1.0 - (u * u)
    offset = biased * span_seconds
    return start + timedelta(seconds=offset)


# =============================================================================
# Main generator
# =============================================================================
class SyntheticDataGenerator:
    """Deterministic synthetic crime data generator for the KSP platform."""

    def __init__(
        self,
        fir_count: int = cfg.DEFAULT_FIR_COUNT,
        offender_count: int = cfg.DEFAULT_OFFENDER_COUNT,
        victim_count: int = cfg.DEFAULT_VICTIM_COUNT,
        network_edge_count: int = cfg.DEFAULT_NETWORK_EDGE_COUNT,
        seed: int = cfg.RANDOM_SEED,
        history_years: int = 5,
        faker_locale: str = "en_IN",
    ) -> None:
        self.fir_count = fir_count
        self.offender_count = offender_count
        self.victim_count = victim_count
        self.network_edge_count = network_edge_count
        self.history_years = history_years
        self.seed = seed  # used for log messages (do not log self.rng.getstate() — it's a tuple)

        # Seeded RNGs (stdlib + numpy + Faker share same seed)
        self.rng = random.Random(seed)
        self.np_rng = np.random.default_rng(seed)
        try:
            from faker import Faker
            self.faker = Faker(faker_locale)
            Faker.seed(seed)
        except ImportError:  # pragma: no cover — Faker is in requirements.txt
            raise RuntimeError("Faker not installed. Run: pip install -r requirements.txt")

        # Pre-slice the timeline
        now = datetime.now(timezone.utc)
        self.timeline_start = datetime(now.year - self.history_years, 1, 1, tzinfo=timezone.utc)
        self.timeline_end = now

    # ----- Public entrypoint -----
    def generate(self) -> GeneratedDataset:
        logger.info(
            "Generating dataset: %d FIRs, %d offenders, %d victims, %d edges (seed=%d)",
            self.fir_count, self.offender_count, self.victim_count, self.network_edge_count, self.seed,
        )
        offenders = self._generate_offenders()
        victims = self._generate_victims()
        fir_records, fir_offender_map = self._generate_fir_records(offenders)
        network_edges = self._generate_network_edges(fir_offender_map)
        logger.info(
            "Generated: %d FIRs, %d offenders, %d victims, %d network edges",
            len(fir_records), len(offenders), len(victims), len(network_edges),
        )
        return GeneratedDataset(
            fir_records=fir_records,
            offenders=offenders,
            victims=victims,
            network_edges=network_edges,
        )

    # ----- Sub-generators -----
    def _generate_offenders(self) -> List[Offender]:
        offenders: List[Offender] = []
        for i in range(1, self.offender_count + 1):
            oid = _generate_id(cfg.OFFENDER_ID_PREFIX, i)
            name_hash = _hash_fake_name(self.rng, self.faker)
            age_group = _weighted_choice(self.rng, cfg.AGE_GROUPS, cfg.AGE_GROUP_WEIGHTS)

            # prior_offenses: Poisson distribution, λ=2.5
            prior = int(self.np_rng.poisson(2.5))
            # 0-4 modus tags, weighted toward fewer
            n_tags = min(self.rng.randint(1, 4), len(cfg.MODUS_OPERANDI_TAGS))
            modus_tags = self.rng.sample(cfg.MODUS_OPERANDI_TAGS, k=n_tags)

            # risk_score: weighted by prior offenses + youth factor
            youth_factor = {"13-17": 10, "18-25": 8, "26-35": 5, "36-50": 2, "51-65": 0, "65+": -5}
            risk = min(95.0, max(0.0, prior * 10.0 + 20.0 + youth_factor.get(age_group, 0)
                                 + self.rng.uniform(-5, 5)))
            risk = round(risk, 2)

            # last_offense_ts: somewhere in last 3 years (60% chance None => never recorded)
            if prior > 0 and self.rng.random() < 0.85:
                last_ts = _weighted_incident_ts(self.rng,
                                               start=self.timeline_end - timedelta(days=3 * 365),
                                               end=self.timeline_end)
            else:
                last_ts = None

            offenders.append(Offender(
                offender_id=oid,
                name_hash=name_hash,
                age_group=age_group,
                prior_offenses=prior,
                modus_tags=modus_tags,
                last_offense_ts=last_ts,
                risk_score=risk,
            ))
        return offenders

    def _generate_victims(self) -> List[Victim]:
        victims: List[Victim] = []
        for i in range(1, self.victim_count + 1):
            vid = _generate_id(cfg.VICTIM_ID_PREFIX, i)
            age_group = _weighted_choice(self.rng, cfg.AGE_GROUPS, cfg.AGE_GROUP_WEIGHTS)
            gender = _weighted_choice(self.rng, cfg.GENDERS, cfg.GENDER_WEIGHTS)
            victims.append(Victim(victim_id=vid, age_group=age_group, gender=gender))
        return victims

    def _generate_fir_records(
        self,
        offenders: List[Offender],
    ) -> Tuple[List[FIRRecord], Dict[str, List[str]]]:
        """
        Generate FIRs and return also a map: fir_id -> [offender_ids] for network gen.
        """
        firs: List[FIRRecord] = []
        fir_offender_map: Dict[str, List[str]] = {}

        # Index stations by district for quick lookup
        stations_by_district: Dict[str, List[str]] = {}
        for station_code, district_code in cfg.STATIONS:
            stations_by_district.setdefault(district_code, []).append(station_code)
        taluks_by_district: Dict[str, List[str]] = {}
        for taluk_code, district_code in cfg.TALUKS:
            taluks_by_district.setdefault(district_code, []).append(taluk_code)

        # Weighted district selection — bigger urban districts get more crime (2x for urban)
        district_weights = [1.0 if not d.code.startswith("BLR_URB") else 2.0 for d in cfg.DISTRICTS]

        for i in range(1, self.fir_count + 1):
            fir_id = _generate_id(cfg.FIR_ID_PREFIX, i)

            # Choose district (weighted)
            district_info = _weighted_choice(self.rng, cfg.DISTRICTS, district_weights)
            district_code = district_info.code

            # Station + taluk within that district
            station_code = self.rng.choice(stations_by_district[district_code])
            taluk_code = self.rng.choice(taluks_by_district[district_code])

            # Crime type + subtype (weighted)
            crime = _weighted_choice(self.rng, cfg.CRIME_TYPES, [c.weight for c in cfg.CRIME_TYPES])
            subtype = self.rng.choice(crime.subtypes)

            # GPS clustered around district centroid
            lat, lng = _random_gps_around_centroid(self.rng, district_info.centroid_lat,
                                                    district_info.centroid_lng)

            # Timestamps: incident within last 5 years (weighted recent),
            # registered within 24h of incident
            incident_ts = _weighted_incident_ts(self.rng, self.timeline_start, self.timeline_end)
            delay_hours = self.rng.uniform(0, 24)
            registered_ts = incident_ts + timedelta(hours=delay_hours)

            # Offender: 70% of FIRs have an assigned offender
            have_offender = self.rng.random() < 0.70
            offender_id: Optional[str] = None
            modus_text = ""
            if have_offender:
                offender = self.rng.choice(offenders)
                offender_id = offender.offender_id
                modus_text = ", ".join(offender.modus_tags)
            elif self.rng.random() < 0.3:
                # Sometimes fill a generic MO description even with no known offender
                modus_text = ", ".join(self.rng.sample(cfg.MODUS_OPERANDI_TAGS, k=2))

            # Victim: ~80% of FIRs have a victim record
            victim_id: Optional[str] = None
            if self.rng.random() < 0.80:
                # Generate victim if we need one — we'll use pre-generated pool.tags
                # For simplicity reuse victims from pool (deterministic via pool index)
                # Use (i % victim_count) for stable assignment
                vid_idx = ((i - 1) % self.victim_count) + 1
                victim_id = _generate_id(cfg.VICTIM_ID_PREFIX, vid_idx)

            status = _weighted_choice(self.rng, cfg.FIR_STATUSES, cfg.FIR_STATUS_WEIGHTS)

            # Record build
            firs.append(FIRRecord(
                fir_id=fir_id,
                station_code=station_code,
                district_code=district_code,
                taluk_code=taluk_code,
                crime_type=crime.crime_type,
                crime_subtype=subtype,
                latitude=lat,
                longitude=lng,
                incident_ts=incident_ts,
                registered_ts=registered_ts,
                offender_id=offender_id,
                victim_id=victim_id,
                modus_operandi=modus_text,
                status=status,
            ))

            # Multi-offender FIRs (15% of those with an offender) — capture for network gen
            if have_offender and self.rng.random() < cfg.MULTI_OFFENDER_FIR_FRACTION:
                # Add 1-2 additional offenders (different from primary)
                n_extra = self.rng.choice([1, 2])
                extras = []
                for _ in range(n_extra):
                    extra = self.rng.choice(offenders)
                    if extra.offender_id != offender_id:
                        extras.append(extra.offender_id)
                involved = [offender_id] + extras
                fir_offender_map[fir_id] = list(set(involved))
            elif have_offender:
                fir_offender_map[fir_id] = [offender_id]

        return firs, fir_offender_map

    def _generate_network_edges(
        self,
        fir_offender_map: Dict[str, List[str]],
    ) -> List[NetworkEdge]:
        """Build offender-offender co-crime edges from multi-offender FIRs."""
        edges: List[NetworkEdge] = []
        seen: set = set()

        for fir_id, offenders in fir_offender_map.items():
            if len(offenders) < 2:
                continue
            # Every pair of co-offenders gets an edge
            for i in range(len(offenders)):
                for j in range(i + 1, len(offenders)):
                    a, b = offenders[i], offenders[j]
                    key = (a, b, fir_id) if a < b else (b, a, fir_id)
                    if key in seen:
                        continue
                    seen.add(key)
                    edges.append(NetworkEdge(
                        offender_a=key[0],
                        offender_b=key[1],
                        shared_fir_id=fir_id,
                        co_crime_count=self.rng.randint(1, 5),
                    ))

        # If we have fewer edges than target (network_edge_count), supplement
        # by randomly linking high-risk offenders (active criminal network).
        if len(edges) < self.network_edge_count:
            # Compile list of (offender_id) for sampling
            all_oids = [off.offender_id for off in self._iter_offenders_from_map(fir_offender_map)]
            need = self.network_edge_count - len(edges)
            attempts = 0
            while need > 0 and attempts < need * 5:
                a, b = self.rng.sample(sorted(all_oids), 2) if len(all_oids) >= 2 else (None, None)
                if a is None:
                    break
                fir_id = _generate_id(cfg.FIR_ID_PREFIX, self.rng.randint(1, self.fir_count))
                key = (a, b, fir_id) if a < b else (b, a, fir_id)
                if key in seen:
                    attempts += 1
                    continue
                seen.add(key)
                edges.append(NetworkEdge(offender_a=key[0], offender_b=key[1],
                                          shared_fir_id=fir_id, co_crime_count=1))
                need -= 1
                attempts += 1

        return edges

    def _iter_offenders_from_map(self, m: Dict[str, List[str]]):
        """Yield offenders from pre-generated list by mapping lookup."""
        # Placeholder helper if needed; we'll replace with cached all_offenders in main flow
        # For now do simple iteration over unique offender ids in the map
        all_oids: set = set()
        for _, lst in m.items():
            all_oids.update(lst)
        # We don't have direct Offender objects here, only IDs — return lightweight stand-ins
        class _StubOffender:
            def __init__(self, oid): self.offender_id = oid
        return [_StubOffender(oid) for oid in all_oids]


# =============================================================================
# CLI
# =============================================================================
def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="KSP synthetic FIR data generator")
    p.add_argument("--fir-count", type=int, default=cfg.DEFAULT_FIR_COUNT,
                   help=f"Number of FIR records to generate (default: {cfg.DEFAULT_FIR_COUNT})")
    p.add_argument("--seed", type=int, default=cfg.RANDOM_SEED,
                   help=f"Random seed for reproducibility (default: {cfg.RANDOM_SEED})")
    p.add_argument("--json", type=str, default=None,
                   help="Optional directory path to dump JSON files (for inspection only).")
    p.add_argument("--log-level", default="INFO", help="Logging level (DEBUG/INFO/WARNING)")
    return p.parse_args()


def main() -> None:
    args = _parse_args()
    logging.basicConfig(level=args.log_level,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    gen = SyntheticDataGenerator(
        fir_count=args.fir_count,
        seed=args.seed,
    )
    dataset = gen.generate()

    print(
        f"\nGenerated {len(dataset.fir_records)} FIRs, "
        f"{len(dataset.offenders)} offenders, "
        f"{len(dataset.victims)} victims, "
        f"{len(dataset.network_edges)} network edges.\n"
        f"Inspect with --json <dir> to write JSON files, "
        f"then run bulk_load.py to load into PG + ES."
    )

    if args.json:
        import json, os
        os.makedirs(args.json, exist_ok=True)
        for name, data in [
            ("firs", dataset.fir_records),
            ("offenders", dataset.offenders),
            ("victims", dataset.victims),
            ("network", dataset.network_edges),
        ]:
            path = os.path.join(args.json, f"{name}.json")
            with open(path, "w", encoding="utf-8") as fh:
                # datetime -> isoformat via default= lambda
                def _default(o):
                    if isinstance(o, datetime):
                        return o.isoformat()
                    return asdict(o) if hasattr(o, "__dataclass_fields__") else str(o)
                json.dump([_default(r) if not isinstance(r, dict) else r for r in data],
                          fh, default=_default, indent=2)
            print(f"  Wrote {path}")


if __name__ == "__main__":
    main()
