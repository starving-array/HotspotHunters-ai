"""
Unit tests for data-generator/config.py — integrity of reference data.

Run with:
  cd data-generator && python -m pytest tests/test_config.py -v
or from repo root:
  python -m pytest data-generator/tests/test_config.py -v
"""

import pytest

# Allow running both as `python -m data_generator.tests.test_config` and standalone
try:
    from data_generator import config as cfg
except ImportError:
    import os, sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    import config as cfg


# ----- District integrity -----
def test_district_count_is_thirty():
    assert cfg.DISTRICT_COUNT == 30, f"Expected 30 active districts, got {cfg.DISTRICT_COUNT}"


def test_all_district_codes_unique():
    codes = [d.code for d in cfg.DISTRICTS]
    assert len(codes) == len(set(codes)), "Duplicate district codes detected"


def test_district_centroids_inside_karnataka():
    for d in cfg.DISTRICTS:
        assert cfg.KARNATAKA_LAT_MIN <= d.centroid_lat <= cfg.KARNATAKA_LAT_MAX, \
            f"{d.code} centroid lat {d.centroid_lat} outside KA bbox"
        assert cfg.KARNATAKA_LNG_MIN <= d.centroid_lng <= cfg.KARNATAKA_LNG_MAX, \
            f"{d.code} centroid lng {d.centroid_lng} outside KA bbox"


def test_each_district_has_at_least_one_taluk_and_station():
    for d in cfg.DISTRICTS:
        assert d.taluk_count >= 1, f"{d.code} has no taluks"
        assert d.station_count >= 1, f"{d.code} has no stations"


def test_total_station_count_meets_spec():
    total = sum(d.station_count for d in cfg.DISTRICTS)
    assert total >= 1100, f"Need >=1100 stations per spec, got {total}"


# ----- Taluks and stations -----
def test_taluks_match_district_counts():
    from collections import Counter
    c = Counter(t[1] for t in cfg.TALUKS)
    for d in cfg.DISTRICTS:
        assert c[d.code] == d.taluk_count, \
            f"{d.code}: expected {d.taluk_count} taluks, got {c[d.code]}"


def test_stations_match_district_counts():
    from collections import Counter
    c = Counter(s[1] for s in cfg.STATIONS)
    for d in cfg.DISTRICTS:
        assert c[d.code] == d.station_count, \
            f"{d.code}: expected {d.station_count} stations, got {c[d.code]}"


def test_station_codes_are_unique():
    codes = [s[0] for s in cfg.STATIONS]
    assert len(codes) == len(set(codes)), "Duplicate station codes detected"


def test_taluk_codes_are_unique():
    codes = [t[0] for t in cfg.TALUKS]
    assert len(codes) == len(set(codes)), "Duplicate taluk codes detected"


# ----- Crime type weights -----
def test_crime_type_weights_sum_to_one():
    total = sum(c.weight for c in cfg.CRIME_TYPES)
    assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, expected 1.0"


def test_each_crime_type_has_subtypes():
    for c in cfg.CRIME_TYPES:
        assert c.subtypes and len(c.subtypes) >= 1, f"{c.crime_type} has no subtypes"


# ----- FIR status / age / gender weights -----
def test_fir_status_weights_sum_to_one():
    assert abs(sum(cfg.FIR_STATUS_WEIGHTS) - 1.0) < 1e-9


def test_age_group_weights_sum_to_one():
    assert abs(sum(cfg.AGE_GROUP_WEIGHTS) - 1.0) < 1e-9


def test_gender_weights_sum_to_one():
    assert abs(sum(cfg.GENDER_WEIGHTS) - 1.0) < 1e-9


def test_status_list_matches_weights_len():
    assert len(cfg.FIR_STATUSES) == len(cfg.FIR_STATUS_WEIGHTS)


def test_age_list_matches_weights_len():
    assert len(cfg.AGE_GROUPS) == len(cfg.AGE_GROUP_WEIGHTS)


# ----- MO tags -----
def test_modus_operandi_tags_non_empty():
    assert cfg.MODUS_OPERANDI_TAGS, "MO tags list is empty"


def test_modus_operandi_tags_unique():
    assert len(cfg.MODUS_OPERANDI_TAGS) == len(set(cfg.MODUS_OPERANDI_TAGS))


# ----- Constants -----
def test_id_prefixes_are_short_strings():
    for prefix, expected_len in [(cfg.FIR_ID_PREFIX, 3),
                                  (cfg.OFFENDER_ID_PREFIX, 3),
                                  (cfg.VICTIM_ID_PREFIX, 3)]:
        assert isinstance(prefix, str) and len(prefix) == expected_len


def test_karnataka_bbox_is_sane():
    assert cfg.KARNATAKA_LAT_MIN < cfg.KARNATAKA_LAT_MAX
    assert cfg.KARNATAKA_LNG_MIN < cfg.KARNATAKA_LNG_MAX
