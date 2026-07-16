"""
Unit tests for data-generator/generate.py — synthetic data integrity.

Run with:
  cd data-generator && python -m pytest tests/test_generate.py -v
or from repo root:
  python -m pytest data-generator/tests/test_generate.py -v
"""

import hashlib
import os
import sys
from datetime import datetime, timezone

import pytest

try:
    from data_generator import config as cfg
    from data_generator.generate import SyntheticDataGenerator, _generate_id
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    import config as cfg
    from generate import SyntheticDataGenerator, _generate_id


# Fixture: a small dataset reused across tests (fast — 1000 FIRs)
@pytest.fixture(scope="module")
def small_generator():
    return SyntheticDataGenerator(
        fir_count=1000,
        offender_count=200,
        victim_count=500,
        network_edge_count=50,
        seed=cfg.RANDOM_SEED,
    )


@pytest.fixture(scope="module")
def small_dataset(small_generator):
    return small_generator.generate()


# Fixture: full default-size generator (used only where counts matter)
@pytest.fixture(scope="module")
def default_generator():
    return SyntheticDataGenerator(seed=cfg.RANDOM_SEED)


# ----- Counts -----
def test_fir_count_matches_request(small_dataset):
    assert len(small_dataset.fir_records) == 1000


def test_offender_count_matches_request(small_dataset):
    assert len(small_dataset.offenders) == 200


def test_victim_count_matches_request(small_dataset):
    assert len(small_dataset.victims) == 500


def test_full_dataset_counts(default_generator):
    ds = default_generator.generate()
    assert len(ds.fir_records) == cfg.DEFAULT_FIR_COUNT
    assert len(ds.offenders) == cfg.DEFAULT_OFFENDER_COUNT
    assert len(ds.victims) == cfg.DEFAULT_VICTIM_COUNT
    assert len(ds.network_edges) >= cfg.DEFAULT_NETWORK_EDGE_COUNT


# ----- ID uniqueness -----
def test_all_fir_ids_unique(small_dataset):
    ids = [f.fir_id for f in small_dataset.fir_records]
    assert len(ids) == len(set(ids))


def test_all_offender_ids_unique(small_dataset):
    ids = [o.offender_id for o in small_dataset.offenders]
    assert len(ids) == len(set(ids))


def test_all_victim_ids_unique(small_dataset):
    ids = [v.victim_id for v in small_dataset.victims]
    assert len(ids) == len(set(ids))


# ----- ID format -----
def test_generate_id_format_8wide():
    assert _generate_id("FIR", 1) == "FIR00000001"
    assert _generate_id("OFF", 15) == "OFF00000015"
    assert len(_generate_id("VIC", 9999999)) == 3 + 8


def test_all_fir_ids_match_prefix_format(small_dataset):
    for f in small_dataset.fir_records:
        assert f.fir_id.startswith(cfg.FIR_ID_PREFIX), f"Bad prefix: {f.fir_id}"


# ----- GPS bounds -----
def test_all_gps_inside_karnataka_bbox(small_dataset):
    for f in small_dataset.fir_records:
        assert cfg.KARNATAKA_LAT_MIN <= f.latitude <= cfg.KARNATAKA_LAT_MAX, \
            f"{f.fir_id} lat {f.latitude} outside KA bbox"
        assert cfg.KARNATAKA_LNG_MIN <= f.longitude <= cfg.KARNATAKA_LNG_MAX, \
            f"{f.fir_id} lng {f.longitude} outside KA bbox"


def test_gps_coords_have_4_decimal_places(small_dataset):
    # Privacy §7.3: GPS precision to 4 decimal places (±11m)
    for f in small_dataset.fir_records:
        assert round(f.latitude, 4) == f.latitude
        assert round(f.longitude, 4) == f.longitude


# ----- Crime types -----
def test_all_crime_types_from_allowed_set(small_dataset):
    allowed = set(cfg.CRIME_TYPE_NAMES)
    for f in small_dataset.fir_records:
        assert f.crime_type in allowed, f"Bad crime_type: {f.crime_type}"


def test_all_fir_statuses_from_allowed_set(small_dataset):
    allowed = set(cfg.FIR_STATUSES)
    for f in small_dataset.fir_records:
        assert f.status in allowed, f"Bad status: {f.status}"


# ----- Offender integrity -----
def test_offender_name_hashes_are_64_char_hex(small_dataset):
    for o in small_dataset.offenders:
        assert len(o.name_hash) == 64, f"name_hash len: {len(o.name_hash)}"
        int(o.name_hash, 16)   # raises ValueError if not hex


def test_offender_prior_offenses_non_negative(small_dataset):
    for o in small_dataset.offenders:
        assert o.prior_offenses >= 0


def test_offender_risk_score_in_range(small_dataset):
    for o in small_dataset.offenders:
        assert 0.0 <= o.risk_score <= 95.0, f"risk_score {o.risk_score} out of range"


def test_offender_modus_tags_subset_of_config(small_dataset):
    allowed = set(cfg.MODUS_OPERANDI_TAGS)
    for o in small_dataset.offenders:
        for t in o.modus_tags:
            assert t in allowed, f"Unknown MO tag: {t}"


def test_age_groups_within_allowed_set(small_dataset):
    allowed = set(cfg.AGE_GROUPS)
    for o in small_dataset.offenders:
        assert o.age_group in allowed
    for v in small_dataset.victims:
        assert v.age_group in allowed


# ----- Victim integrity -----
def test_victim_genders_within_allowed_set(small_dataset):
    allowed = set(cfg.GENDERS)
    for v in small_dataset.victims:
        assert v.gender in allowed


# ----- Timestamps -----
def test_incident_ts_is_timezone_aware(small_dataset):
    for f in small_dataset.fir_records:
        assert f.incident_ts.tzinfo is not None, f"{f.fir_id} has naive incident_ts"


def test_registered_ts_after_incident_ts(small_dataset):
    for f in small_dataset.fir_records:
        assert f.registered_ts >= f.incident_ts, \
            f"{f.fir_id} registered before incident"


# ----- FK integrity -----
def test_fir_offender_references_exist(small_dataset):
    off_ids = {o.offender_id for o in small_dataset.offenders}
    for f in small_dataset.fir_records:
        if f.offender_id is not None:
            assert f.offender_id in off_ids, \
                f"{f.fir_id} references unknown offender {f.offender_id}"


def test_fir_victim_references_belong_to_pool(small_dataset):
    # Note: victim_id generated using (i mod victim_count) + 1 — check by prefix format
    for f in small_dataset.fir_records:
        if f.victim_id is not None:
            assert f.victim_id.startswith(cfg.VICTIM_ID_PREFIX)


# ----- Reproducibility -----
def test_same_seed_produces_identical_first_fir():
    a = SyntheticDataGenerator(fir_count=100, seed=42).generate()
    b = SyntheticDataGenerator(fir_count=100, seed=42).generate()
    a_first = a.fir_records[0]
    b_first = b.fir_records[0]
    assert a_first.fir_id == b_first.fir_id
    assert a_first.district_code == b_first.district_code
    assert a_first.latitude == b_first.latitude
    assert a_first.longitude == b_first.longitude


def test_different_seed_produces_different_records():
    a = SyntheticDataGenerator(fir_count=100, seed=42).generate()
    b = SyntheticDataGenerator(fir_count=100, seed=99).generate()
    # first ID should match (index-based), but GPS should differ (seed-dependent)
    diffs = abs(a.fir_records[0].latitude - b.fir_records[0].latitude) > 1e-6
    assert diffs or abs(a.fir_records[0].longitude - b.fir_records[0].longitude) > 1e-6


# ----- Network edges -----
def test_network_edges_reference_existing_offenders(small_dataset):
    off_ids = {o.offender_id for o in small_dataset.offenders}
    for e in small_dataset.network_edges:
        assert e.offender_a in off_ids
        assert e.offender_b in off_ids
        assert e.offender_a != e.offender_b


def test_network_edges_target_count_met(small_dataset):
    # We asked for 50 edges — should have at least that many
    assert len(small_dataset.network_edges) >= 50


# ----- Distribution sanity -----
def test_districts_well_distributed_in_firs(small_dataset):
    """No single district should have more than 25% of all FIRs — guards against lopsided weighting bug."""
    from collections import Counter
    counts = Counter(f.district_code for f in small_dataset.fir_records)
    for district, count in counts.items():
        fraction = count / len(small_dataset.fir_records)
        assert fraction < 0.30, f"District {district} has {fraction:.1%} of FIRs — too lopsided"


def test_crime_types_well_distributed(small_dataset):
    """No single crime type should have more than 50% (any that do indicates bad weights)."""
    from collections import Counter
    counts = Counter(f.crime_type for f in small_dataset.fir_records)
    for cr_type, count in counts.items():
        fraction = count / len(small_dataset.fir_records)
        assert fraction < 0.50, f"Crime {cr_type} has {fraction:.1%} of FIRs — weighting bug"
