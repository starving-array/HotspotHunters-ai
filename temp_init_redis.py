import os
import psycopg2
import redis

# Use .env values or defaults
pg_host = os.getenv('POSTGRES_HOST', 'localhost')
pg_db = os.getenv('POSTGRES_DB', 'ksp_intelligence')
pg_user = os.getenv('POSTGRES_USER', 'ksp_app')
pg_pwd = os.getenv('POSTGRES_PASSWORD', 'changeme')

redis_host = os.getenv('REDIS_HOST', 'localhost')
redis_port = int(os.getenv('REDIS_PORT', '6379'))

# Connect to PostgreSQL
pg_conn = psycopg2.connect(host=pg_host, dbname=pg_db, user=pg_user, password=pg_pwd)
cur = pg_conn.cursor()

# Connect to Redis
r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

print('Seeding Redis hotspots:live Sorted Set...')
cur.execute('''
    SELECT district_code AS district_id, COUNT(*) AS cnt
    FROM fir_records
    WHERE incident_ts >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY district_code
    ORDER BY cnt DESC;
''')
for district_id, cnt in cur.fetchall():
    r.zadd('hotspots:live', {str(district_id): float(cnt)})
    print(f'  District {district_id}: {cnt} cases (last 30 days)')

print(f'\nLeaderboard size: {r.zcard("hotspots:live")} districts')
print('Redis initialization complete.')

cur.close()
pg_conn.close()
