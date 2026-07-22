import psycopg2, redis, os

pg = psycopg2.connect(host='localhost', dbname='ksp_intelligence', user='ksp_app', password='changeme')
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

cur = pg.cursor()
cur.execute("SELECT district_code, COUNT(*) as cnt FROM fir_records GROUP BY district_code ORDER BY cnt DESC")
rows = cur.fetchall()
print("Seeding {} districts into Redis hotspots:live".format(len(rows)))

names = {
    'BLR_URB':'Bengaluru Urban','BLR_RUR':'Bengaluru Rural','CHK':'Chikkaballapura',
    'KLR':'Kolar','TUM':'Tumakuru','RMR':'Ramanagara','MYS':'Mysuru',
    'CHM':'Chamarajanagar','MND':'Mandya','HVN':'Hassan','KMR':'Kodagu',
    'CHT':'Chitradurga','DVG':'Davanagere','SHM':'Shivamogga','UCT':'Uttara Kannada',
    'DKN':'Dakshina Kannada','UDU':'Udupi','HVR':'Haveri','BGP':'Ballari',
    'KJP':'Koppal','GDK':'Gadag','BLG':'Belagavi','VJP':'Vijayapura',
    'BDR':'Bagalkote','DLP':'Dharwad','HBL':'Hubballi','KNR':'Kalaburagi',
    'YDG':'Yadgir','RBR':'Raichur','BJP':'Bidar',
}

for district_code, cnt in rows:
    r.zadd('hotspots:live', {district_code: float(cnt)})
    name = names.get(district_code, district_code)
    r.hset('district:names', district_code, name)
    print("  {} ({}): {} cases".format(name, district_code, cnt))

print("Leaderboard size: {} districts".format(r.zcard('hotspots:live')))
cur.close()
pg.close()
