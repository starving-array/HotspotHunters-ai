"""Populate the accused table with synthetic data from offenders + casemaster."""
import psycopg2
import random
import os

DSN = os.environ.get(
    "PG_DSN",
    "host=localhost port=5432 dbname=ksp_intelligence user=ksp_app password=changeme",
)

AGE_MAP = {
    "0-17": 15, "18-25": 22, "26-35": 30,
    "36-50": 42, "51-65": 58, "65+": 70,
}


def main():
    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor()

    # Get cybercrime cases
    cur.execute(
        "SELECT casemasterid, policestationid FROM casemaster WHERE is_cybercrime = true"
    )
    cases = cur.fetchall()
    print(f"Found {len(cases)} cybercrime cases")

    if not cases:
        print("No cybercrime cases found — cannot populate accused")
        return

    # Get all offenders
    cur.execute(
        "SELECT offender_id, name_hash, age_group FROM offenders ORDER BY offender_id"
    )
    offenders = cur.fetchall()
    print(f"Found {len(offenders)} offenders")

    random.seed(42)

    inserted = 0
    skipped = 0

    for i, (case_id, ps_id) in enumerate(cases):
        # Assign up to 15 offenders per case
        batch = random.sample(offenders, min(15, len(offenders)))
        for off_id, name_hash, age_group in batch:
            numeric = int(off_id[3:])
            age = AGE_MAP.get(age_group, 30)
            try:
                cur.execute(
                    """INSERT INTO accused
                       (accusedmasterid, name, policestationid, casemasterid, ageyear, genderid)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (accusedmasterid) DO NOTHING""",
                    (numeric, name_hash, ps_id, case_id, age, 0),
                )
                if cur.rowcount > 0:
                    inserted += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"  SKIP accusedmasterid={numeric}: {e}")
                skipped += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nDone: {inserted} inserted, {skipped} skipped (conflicts)")


if __name__ == "__main__":
    main()
