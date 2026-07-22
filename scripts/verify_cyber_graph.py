from neo4j import GraphDatabase

neo = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "changeme"))

with neo.session() as s:
    # 1. Cyber indicators: which case has the most indicators?
    r = s.run("""
        MATCH (c:Case)-[:HAS_INDICATOR]->(ci:CyberIndicator)
        RETURN c.caseMasterId AS caseId, c.crimeNo AS crimeNo, count(ci) AS indicators
        ORDER BY indicators DESC LIMIT 5
    """)
    print("=== Cases with most cyber indicators ===")
    for row in r:
        print(f"  Case #{row['caseId']} ({row['crimeNo']}): {row['indicators']} indicators")

    # 2. Find IP addresses shared across multiple cases (cyber clusters)
    r = s.run("""
        MATCH (c1:Case)-[:HAS_INDICATOR]->(ci:CyberIndicator)
        WHERE ci.indicatorType = 'ip'
        WITH ci.indicatorValue AS ip, collect(c1.caseMasterId) AS cases, count(c1) AS cnt
        WHERE cnt > 1
        RETURN ip, cases, cnt
        ORDER BY cnt DESC LIMIT 10
    """)
    print("\n=== Shared IPs across cases (cyber clusters) ===")
    rows = list(r)
    if rows:
        for row in rows:
            print(f"  IP {row['ip']}: {row['cnt']} cases -> {row['cases']}")
    else:
        print("  (no shared IPs — sample data uses unique IPs per case)")

    # 3. Domain-IP co-occurrence: cases that share both a domain AND IP pattern
    r = s.run("""
        MATCH (c:Case)-[:HAS_INDICATOR]->(ci:CyberIndicator)
        WITH c, collect(ci.indicatorType) AS types, collect(ci.indicatorValue) AS values
        WHERE 'domain' IN types AND 'ip' IN types
        RETURN c.caseMasterId AS caseId, c.crimeNo AS crimeNo, values
        LIMIT 10
    """)
    print("\n=== Cases with both domain + IP indicators ===")
    for row in r:
        print(f"  Case #{row['caseId']} ({row['crimeNo']}): indicators = {row['values']}")

    # 4. Platform distribution among cyber cases
    r = s.run("""
        MATCH (ci:CyberIndicator)
        WHERE ci.platform IS NOT NULL
        RETURN ci.platform AS platform, count(ci) AS count
        ORDER BY count DESC
    """)
    print("\n=== Platform distribution ===")
    for row in r:
        print(f"  {row['platform']}: {row['count']}")

    # 5. Walk the full path: Case → Station → District
    r = s.run("""
        MATCH path = (c:Case)-[:REGISTERED_AT]->(ps:PoliceStation)-[:BELONGS_TO]->(d:District)
        WHERE (c)-[:HAS_INDICATOR]->(:CyberIndicator)
        RETURN d.districtName AS district, count(DISTINCT c) AS cyberCases
        ORDER BY cyberCases DESC
    """)
    print("\n=== Cyber cases by district ===")
    for row in r:
        print(f"  {row['district']}: {row['cyberCases']}")

neo.close()
