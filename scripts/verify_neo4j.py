from neo4j import GraphDatabase

neo = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "changeme"))

with neo.session() as s:
    r = s.run("""
        MATCH (c:Case)-[:REGISTERED_AT]->(ps:PoliceStation)
        RETURN ps.stationCode AS station, ps.stationName AS name, count(c) AS cases
        ORDER BY cases DESC LIMIT 10
    """)
    print("=== Top 10 Stations by Case Volume ===")
    for row in r:
        print(f"  {row['station']}: {row['cases']} cases")

    r = s.run("""
        MATCH (c:Case)-[:REGISTERED_AT]->(ps:PoliceStation)-[:BELONGS_TO]->(d:District)
        RETURN d.districtName AS district, count(c) AS cases
        ORDER BY cases DESC LIMIT 5
    """)
    print("\n=== District Case Distribution ===")
    for row in r:
        print(f"  {row['district']}: {row['cases']}")

    row = s.run("""
        MATCH (c:Case)-[:INVOLVES_VICTIM]->(v:Person)
        WHERE exists { (c)-[:INVOLVES_COMPLAINANT]->(:Person) }
        RETURN count(DISTINCT c) AS multiPartyCases
    """).single()
    print(f"\nMulti-party cases (victim+complainant): {row['multiPartyCases']}")

    r = s.run("""
        MATCH (c:Case)-[:INVESTIGATED_BY]->(o:PoliceOfficer)
        RETURN o.firstName AS officer, count(c) AS cases
        ORDER BY cases DESC LIMIT 5
    """)
    print("\n=== Officer Case Load ===")
    for row in r:
        print(f"  {row['officer']}: {row['cases']}")

    labels = [row["label"] for row in s.run("CALL db.labels()")]
    rels = [row["relationshipType"] for row in s.run("CALL db.relationshipTypes()")]
    print("\n=== Node Labels ===")
    for l in sorted(labels):
        cnt = s.run(f"MATCH (n:{l}) RETURN count(n) AS c").single()["c"]
        print(f"  {l}: {cnt}")
    print("\n=== Relationship Types ===")
    for r in sorted(rels):
        cnt = s.run(f"MATCH ()-[x:{r}]->() RETURN count(x) AS c").single()["c"]
        print(f"  {r}: {cnt}")

neo.close()
