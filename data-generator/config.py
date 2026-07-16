"""
KSP Intelligence Portal — Synthetic Data Generator Configuration
File: data-generator/config.py

Reference data for generating realistic synthetic crime records across
Karnataka. All constants here are the "source of truth" for the generator —
changing them changes the shape of the synthetic dataset.

Conventions:
- district_code: short uppercase code (e.g. BLR_URB, MYS)
- taluk_code: <DISTRICT_PREFIX>_<NNN>  (e.g. BLR_URB_001)
- station_code: ST<district_prefix_3><NNN>  (e.g. STBLR001)
- All GPS coordinates are within the Karnataka bounding box.
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple


# =============================================================================
# Dataset sizing (configurable via env vars at runtime, these are defaults)
# =============================================================================
DEFAULT_FIR_COUNT = 100_000
DEFAULT_OFFENDER_COUNT = 15_000
DEFAULT_VICTIM_COUNT = 80_000
DEFAULT_NETWORK_EDGE_COUNT = 5_000
RANDOM_SEED = 42                  # "the answer to everything"

# Live-stream producer default interval (seconds); overridable via env
DEFAULT_STREAM_INTERVAL_SECONDS = 3.0


# =============================================================================
# Karnataka GPS bounding box (per architecture doc Section 4.1)
# =============================================================================
KARNATAKA_LAT_MIN = 11.5
KARNATAKA_LAT_MAX = 18.5
KARNATAKA_LNG_MIN = 74.0
KARNATAKA_LNG_MAX = 78.5

# GPS clustering sigma (degrees) — ~0.05° ≈ 5.5 km spread around centroids,
# keeps incidents near populated district centers instead of uniform-random.
GPS_CLUSTER_SIGMA_DEG = 0.05
GPS_PRECISION_DECIMALS = 4          # stored to 4 decimal places (±11m) per doc §7.3


# =============================================================================
# Crime types and subtypes (Section 4.1 of architecture doc)
# =============================================================================
@dataclass(frozen=True)
class CrimeCategory:
    crime_type: str
    subtypes: List[str]
    weight: float          # relative frequency for realistic distribution

CRIME_TYPES: List[CrimeCategory] = [
    CrimeCategory("theft",         ["snatching", "shoplifting", "vehicle_theft", "burglary"], 0.30),
    CrimeCategory("robbery",        ["armed_robbery", "highway_robbery", "house_robbery"],       0.15),
    CrimeCategory("assault",        ["physical_assault", "domestic_violence", "group_clash"],    0.18),
    CrimeCategory("property_crime", ["trespass", "arson", "vandalism", "land_dispute"],         0.12),
    CrimeCategory("murder",         ["premeditated", "passion_crime", "contract_killing"],     0.04),
    CrimeCategory("cyber_crime",     ["online_fraud", "identity_theft", "phishing", "hacking"], 0.11),
    CrimeCategory("drug_offense",    ["possession", "peddling", "transportation"],             0.10),
]

assert abs(sum(c.weight for c in CRIME_TYPES) - 1.0) < 1e-9, "Crime type weights must sum to 1.0"


# =============================================================================
# Modus operandi (MO) tags — assigned to offenders (1-4 tags each)
# =============================================================================
MODUS_OPERANDI_TAGS: List[str] = [
    "forced_entry",
    "weapon_threat",
    "night_target",
    "duplication",
    "vehicle_used",
    "gang_activity",
    "known_to_victim",
    "repeat_offense_pattern",
    "planned_execution",
    "opportunistic",
    "financial_motive",
    "interstate_link",
    "minor_involvement",
    "mask_disguise",
]


# =============================================================================
# Karnataka districts — 30 districts with centroid GPS (lat, lng) and code.
# Centroids are approximate, derived from district HQ coordinates.
# taluk_count is roughly realistic per district.
# =============================================================================
@dataclass(frozen=True)
class DistrictInfo:
    code: str                     # district_code
    name: str                     # human-readable
    centroid_lat: float
    centroid_lng: float
    taluk_count: int              # number of taluks to synthesize
    station_count: int            # number of police stations to synthesize

# 30 districts — all real Karnataka districts as of 2023 reorganization.
# Codes are short uppercase identifiers used throughout the platform (filter
# values, Redis keys, Kafka partition keys).
DISTRICTS: List[DistrictInfo] = [
    # --- Bengaluru region ---
    DistrictInfo("BLR_URB", "Bengaluru Urban",  12.9716, 77.5946,  8, 110),
    DistrictInfo("BLR_RUR", "Bengaluru Rural", 12.9833, 77.5833,  6,  60),
    DistrictInfo("CHK",     "Chikkaballapura", 13.4333, 77.6500,  6,  32),
    DistrictInfo("KLR",     "Kolar",           13.1400, 78.1302,  6,  48),
    DistrictInfo("TUM",     "Tumakuru",        13.3379, 77.1173, 10,  50),
    DistrictInfo("RMR",     "Ramanagara",      12.5500, 77.4500,  4,  35),  # NEW — was missing
    # --- Mysuru region ---
    DistrictInfo("MYS",     "Mysuru",          12.2958, 76.6394,  7,  75),
    DistrictInfo("CHM",     "Chamarajanagar",  12.1667, 76.9500,  4,  30),
    DistrictInfo("MND",     "Mandya",          12.5222, 76.8958,  7,  45),
    # --- Hassan region ---
    DistrictInfo("HVN",     "Hassan",          13.0067, 76.1011,  8,  48),
    DistrictInfo("KMR",     "Kodagu",          12.3333, 75.8333,  3,  22),
    # --- Central Karnataka ---
    DistrictInfo("CHT",     "Chitradurga",     14.2250, 76.4000,  6,  40),
    DistrictInfo("DVG",     "Davanagere",      14.4667, 75.9167,  9,  55),
    DistrictInfo("SHM",     "Shivamogga",      13.9333, 75.5667,  8,  60),
    DistrictInfo("DVG2",    "Davanagere2",     14.4667, 75.9167,  0,   0),  # dup placeholder
    # --- Coastal Karnataka ---
    DistrictInfo("UCT",     "Uttara Kannada",  14.6167, 74.6667, 11,  60),
    DistrictInfo("DKN",     "Dakshina Kannada",12.8750, 74.8419,  5,  60),
    DistrictInfo("UDU",     "Udupi",           13.3400, 74.7480,  3,  45),
    # --- Haveri region ---
    DistrictInfo("HVR",     "Haveri",          14.8000, 75.1333,  7,  40),
    # --- Ballari/Kalyana ---
    DistrictInfo("BGP",     "Ballari",         15.1500, 76.9167,  8,  55),
    DistrictInfo("KJP",     "Koppal",          15.0833, 76.0833,  4,  30),
    DistrictInfo("GDK",     "Gadag",           15.4333, 75.6333,  5,  30),
    # --- Belagavi region (North-West) ---
    DistrictInfo("BLG",     "Belagavi",        15.8500, 74.5000, 10,  70),
    DistrictInfo("VJP",     "Vijayapura",      16.8333, 75.7000,  5,  35),
    DistrictInfo("BDR",     "Bagalkote",       16.1833, 75.7000,  6,  40),
    DistrictInfo("DLP",     "Dharwad",         15.4667, 75.0000,  5,  48),
    DistrictInfo("HBL",     "Hubballi",        15.3647, 75.1240,  5,  35),
    # --- Kalyana-Karnataka (Hyderabad-Karnataka) region ---
    DistrictInfo("KNR",     "Kalaburagi",      17.3333, 76.8333,  9,  55),
    DistrictInfo("YDG",     "Yadgir",          16.7667, 77.1333,  3,  25),
    DistrictInfo("RBR",     "Raichur",         16.2000, 77.3500,  6,  40),
    DistrictInfo("BJP",     "Bidar",           17.9167, 77.5333,  6,  35),
]

# Defensive: drop any "zero station" placeholders (kept for legacy edits if they
# sneak back in). Real spec is 30 active districts.
_original_count = len(DISTRICTS)
DISTRICTS = [d for d in DISTRICTS if d.station_count > 0 and d.taluk_count > 0]
DISTRICT_COUNT = len(DISTRICTS)

# Sanity-checks — assert exactly 30 unique districts with >=1100 stations.
assert DISTRICT_COUNT == 30, f"Expected 30 active districts, got {DISTRICT_COUNT}"
_unique_codes = {d.code for d in DISTRICTS}
assert len(_unique_codes) == DISTRICT_COUNT, "Duplicate district codes detected at config load"
assert sum(d.station_count for d in DISTRICTS) >= 1100, \
    f"Need >=1100 stations per spec, got {sum(d.station_count for d in DISTRICTS)}"


# =============================================================================
# Derived lookup tables for fast code reuse
# =============================================================================
DISTRICT_BY_CODE: Dict[str, DistrictInfo] = {d.code: d for d in DISTRICTS}
CRIME_TYPE_NAMES: List[str] = [c.crime_type for c in CRIME_TYPES]


def all_taluks() -> List[Tuple[str, str]]:
    """Return list of (taluk_code, district_code) pairs — synthesized deterministically."""
    result: List[Tuple[str, str]] = []
    for d in DISTRICTS:
        for i in range(1, d.taluk_count + 1):
            taluk_code = f"{d.code}_{i:03d}"
            result.append((taluk_code, d.code))
    return result


def all_stations() -> List[Tuple[str, str]]:
    """Return list of (station_code, district_code) pairs.

    Station code = "ST" + district_code (underscore removed) + zero-padded index.
    Because district codes are unique, the derived station codes are unique too.
    """
    result: List[Tuple[str, str]] = []
    for d in DISTRICTS:
        district_part = d.code.replace("_", "")
        for i in range(1, d.station_count + 1):
            station_code = f"ST{district_part}{i:03d}"
            result.append((station_code, d.code))
    return result


# Pre-compute at module load (cheap — fewer than 1,500 entries total)
TALUKS: List[Tuple[str, str]] = all_taluks()
STATIONS: List[Tuple[str, str]] = all_stations()

TALUK_COUNT = len(TALUKS)
STATION_COUNT = len(STATIONS)


# =============================================================================
# ID prefixes — used by generate.py to produce deterministic string IDs
# =============================================================================
FIR_ID_PREFIX = "FIR"
OFFENDER_ID_PREFIX = "OFF"
VICTIM_ID_PREFIX = "VIC"


# =============================================================================
# FIR status values
# =============================================================================
FIR_STATUSES = ["OPEN", "INVESTIGATING", "CHARGED", "CLOSED", "REOPENED"]
FIR_STATUS_WEIGHTS = [0.30, 0.25, 0.15, 0.25, 0.05]   # ~ likely to be open/closed
assert abs(sum(FIR_STATUS_WEIGHTS) - 1.0) < 1e-9, "Status weights must sum to 1.0"


# =============================================================================
# Age groups (used for offenders and victims — PII-free)
# =============================================================================
AGE_GROUPS = ["0-12", "13-17", "18-25", "26-35", "36-50", "51-65", "65+"]
AGE_GROUP_WEIGHTS = [0.02, 0.06, 0.30, 0.30, 0.20, 0.10, 0.02]
assert abs(sum(AGE_GROUP_WEIGHTS) - 1.0) < 1e-9

GENDERS = ["M", "F", "O"]
GENDER_WEIGHTS = [0.49, 0.49, 0.02]


# =============================================================================
# Cluster control — fraction of FIRs that involve multiple offenders (network link)
# =============================================================================
MULTI_OFFENDER_FIR_FRACTION = 0.15
