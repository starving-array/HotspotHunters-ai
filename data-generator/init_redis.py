import os
import psycopg2
import redis

# Connect to PostgreSQL (same env vars as other scripts)
pg_conn = psycopg2.connect(
    host=os.getenv('POSTGRES_HOST', 'postgres'),
    dbname=os.getenv('POSTGRES_DB', 'ksp_intelligence'),
    user=os.getenv('POSTGRES_USER', 'ksp_app'),
    password=os.getenv('POSTGRES_PASSWORD', 'changeme')
)

# Connect to Redis
r = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', '6379')),
    decode_responses=True
)

cur = pg_conn.cursor()
print("Seeding Redis hotspots:live Sorted Set...")
cur.execute("""
    SELECT d.DistrictID, d.DistrictName, COUNT(cm.CaseMasterID) as cnt
    FROM CaseMaster cm
    JOIN Unit u ON u.UnitID = cm.PoliceStationID
    JOIN District d ON d.DistrictID = u.DistrictID
    WHERE cm.CrimeRegisteredDate >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY d.DistrictID, d.DistrictName
    ORDER BY cnt DESC
""")
for district_id, district_name, count in cur.fetchall():
    r.zadd('hotspots:live', {str(district_id): float(count)})
    r.hset('district:names', str(district_id), district_name)
    print(f"  {district_name}: {count} cases (last 30 days)")

print(f"\nLeaderboard size: {r.zcard('hotspots:live')} districts")
print("Redis initialization complete.")
cur.close()
pg_conn.close()
