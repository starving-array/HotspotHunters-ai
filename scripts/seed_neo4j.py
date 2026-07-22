import psycopg2
from neo4j import GraphDatabase
from datetime import datetime

PG_DSN = "host=localhost port=5432 dbname=ksp_intelligence user=ksp_app password=changeme"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j", "changeme")
BATCH = 5000

pg = psycopg2.connect(PG_DSN)
pg.set_client_encoding('UTF8')
neo = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)


def clear():
    with neo.session() as s:
        s.run("MATCH (n) DETACH DELETE n")
        print("Cleared Neo4j")


def apply_schema():
    with open("infra/neo4j/schema.cypher") as f:
        cypher = f.read()
    with neo.session() as s:
        for stmt in cypher.split(";"):
            stmt = stmt.strip()
            if stmt:
                s.run(stmt + ";")
    print("Schema applied")


def run(tx, cypher, params=None):
    tx.run(cypher, params or {})


def stream(query, args=None):
    with pg.cursor(name="neo4j_seed") as cur:
        cur.itersize = 5000
        cur.execute(query, args)
        for row in cur:
            yield row


def seed_crime_categories():
    rows = list(stream("SELECT crimeheadid, crimegroupname, active FROM crimehead"))
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (c:CrimeCategory {crimeHeadId: r.id})
            SET c.crimeGroupName = r.name, c.active = r.active
        """, parameters={"rows": [{"id": r[0], "name": r[1], "active": r[2]} for r in rows]})
    print(f"CrimeCategories: {len(rows)}")


def seed_crime_sub_categories():
    rows = list(stream("SELECT crimesubheadid, crimeheadid, crimeheadname, seqid FROM crimesubhead"))
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (sc:CrimeSubCategory {crimeSubHeadId: r.id})
            SET sc.crimeHeadId = r.headId, sc.crimeHeadName = r.name, sc.seqId = r.seq
        """, parameters={"rows": [{"id": r[0], "headId": r[1], "name": r[2], "seq": r[3]} for r in rows]})
    print(f"CrimeSubCategories: {len(rows)}")


def seed_districts():
    rows = list(stream("SELECT districtid, districtcode, districtname, stateid, active FROM district"))
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (d:District {districtId: r.id})
            SET d.districtCode = r.code, d.districtName = r.name, d.stateId = r.stateId, d.active = r.active
        """, parameters={"rows": [{"id": r[0], "code": r[1], "name": r[2], "stateId": r[3], "active": r[4]} for r in rows]})
    print(f"Districts: {len(rows)}")


def seed_police_stations():
    rows = list(stream("SELECT unitid, stationcode, stationname, districtid FROM unit WHERE active = true"))
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (ps:PoliceStation {unitId: r.id})
            SET ps.stationCode = r.code, ps.stationName = r.name, ps.districtId = r.districtId
        """, parameters={"rows": [{"id": r[0], "code": r[1], "name": r[2], "districtId": r[3]} for r in rows]})
    print(f"PoliceStations: {len(rows)}")


def seed_officers():
    rows = list(stream("SELECT employeeid, firstname, genderid, unitid FROM employee"))
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (o:PoliceOfficer {employeeId: r.id})
            SET o.firstName = r.name, o.genderId = r.gender, o.unitId = r.unitId
        """, parameters={"rows": [{"id": r[0], "name": r[1], "gender": r[2], "unitId": r[3]} for r in rows]})
    print(f"Officers: {len(rows)}")


def seed_persons():
    table_map = [
        ("accused", "accusedmasterid", "name", "ageyear", "genderid", "ACC"),
        ("victim", "victimmasterid", "victimname", "ageyear", "genderid", "VIC"),
        ("complainantdetails", "complainantid", "complainantname", "ageyear", "genderid", "CMP"),
    ]
    total = 0
    for tbl, pk, name_col, age_col, gender_col, prefix in table_map:
        rows = list(stream(f"SELECT {pk}, {name_col}, {age_col}, {gender_col} FROM {tbl}"))
        with neo.session() as s:
            s.run("""
                UNWIND $rows AS r
                MERGE (p:Person {globalId: r.globalId})
                SET p.sourceTable = r.sourceTable, p.sourceId = r.sourceId,
                    p.name = r.name, p.ageYear = r.age, p.genderId = r.gender
            """, parameters={"rows": [
                {"globalId": f"{prefix}_{r[0]}", "sourceTable": tbl, "sourceId": r[0],
                 "name": r[1] or "", "age": r[2], "gender": r[3] or 0}
                for r in rows
            ]})
        total += len(rows)
        print(f"  {tbl}: {len(rows)}")
    print(f"Persons total: {total}")


def seed_cases():
    offset = 0
    while True:
        rows = list(stream(
            "SELECT casemasterid, crimeno, crimeregistereddate, policestationid, "
            "policepersonid, crimemajorheadid, crimeminorheadid, "
            "incidentfromdate, incidenttodate, latitude, longitude, brieffacts "
            "FROM casemaster ORDER BY casemasterid LIMIT %s OFFSET %s",
            (BATCH, offset)
        ))
        if not rows:
            break
        with neo.session() as s:
            s.run("""
                UNWIND $rows AS r
                MERGE (c:Case {caseMasterId: r.id})
                SET c.crimeNo = r.crimeNo, c.crimeRegisteredDate = r.regDate,
                    c.policeStationId = r.stationId, c.policePersonId = r.officerId,
                    c.crimeMajorHeadId = r.majorHeadId, c.crimeMinorHeadId = r.minorHeadId,
                    c.incidentFromDate = r.fromDate, c.incidentToDate = r.toDate,
                    c.latitude = r.lat, c.longitude = r.lon, c.briefFacts = r.facts
            """, parameters={"rows": [
                {
                    "id": r[0], "crimeNo": r[1],
                    "regDate": r[2].isoformat() if r[2] else None,
                    "stationId": r[3], "officerId": r[4],
                    "majorHeadId": r[5], "minorHeadId": r[6],
                    "fromDate": r[7].isoformat() if r[7] else None,
                    "toDate": r[8].isoformat() if r[8] else None,
                    "lat": float(r[9]) if r[9] else None,
                    "lon": float(r[10]) if r[10] else None,
                    "facts": r[11]
                }
                for r in rows
            ]})
        offset += BATCH
        print(f"  Cases: {offset}")
    print(f"Cases total: {offset}")


def rel_cases_to_stations():
    with neo.session() as s:
        s.run("""
            MATCH (c:Case), (ps:PoliceStation)
            WHERE c.policeStationId = ps.unitId
            MERGE (c)-[:REGISTERED_AT]->(ps)
        """)
    # Count
    with neo.session() as s:
        r = s.run("MATCH ()-[r:REGISTERED_AT]->() RETURN count(r) AS n").single()
        print(f"REGISTERED_AT: {r['n']}")


def rel_cases_to_officers():
    with neo.session() as s:
        s.run("""
            MATCH (c:Case), (o:PoliceOfficer)
            WHERE c.policePersonId = o.employeeId
            MERGE (c)-[:INVESTIGATED_BY]->(o)
        """)
    with neo.session() as s:
        r = s.run("MATCH ()-[r:INVESTIGATED_BY]->() RETURN count(r) AS n").single()
        print(f"INVESTIGATED_BY: {r['n']}")


def rel_cases_to_crime_categories():
    with neo.session() as s:
        s.run("""
            MATCH (c:Case), (cc:CrimeCategory)
            WHERE c.crimeMajorHeadId = cc.crimeHeadId
            MERGE (c)-[:CLASSIFIED_AS]->(cc)
        """)
    with neo.session() as s:
        s.run("""
            MATCH (c:Case), (sc:CrimeSubCategory)
            WHERE c.crimeMinorHeadId = sc.crimeSubHeadId
            MERGE (c)-[:SUBCLASSIFIED_AS]->(sc)
        """)
    with neo.session() as s:
        r = s.run("MATCH ()-[r:CLASSIFIED_AS]->() RETURN count(r) AS n").single()
        r2 = s.run("MATCH ()-[r:SUBCLASSIFIED_AS]->() RETURN count(r) AS n").single()
        print(f"CLASSIFIED_AS: {r['n']}, SUBCLASSIFIED_AS: {r2['n']}")


def rel_stations_to_districts():
    with neo.session() as s:
        s.run("""
            MATCH (ps:PoliceStation), (d:District)
            WHERE ps.districtId = d.districtId
            MERGE (ps)-[:BELONGS_TO]->(d)
        """)
    with neo.session() as s:
        r = s.run("MATCH ()-[r:BELONGS_TO]->() RETURN count(r) AS n").single()
        print(f"BELONGS_TO: {r['n']}")


def rel_officers_to_stations():
    with neo.session() as s:
        s.run("""
            MATCH (o:PoliceOfficer), (ps:PoliceStation)
            WHERE o.unitId = ps.unitId
            MERGE (o)-[:ASSIGNED_TO]->(ps)
        """)
    with neo.session() as s:
        r = s.run("MATCH ()-[r:ASSIGNED_TO]->() RETURN count(r) AS n").single()
        print(f"ASSIGNED_TO: {r['n']}")


def rel_cases_to_persons():
    table_map = [
        ("accused", "accusedmasterid", "casemasterid", "ACC", "INVOLVES_ACCUSED"),
        ("victim", "victimmasterid", "casemasterid", "VIC", "INVOLVES_VICTIM"),
        ("complainantdetails", "complainantid", "casemasterid", "CMP", "INVOLVES_COMPLAINANT"),
    ]
    for tbl, pk, fk, prefix, rel_type in table_map:
        offset = 0
        while True:
            rows = list(stream(
                f"SELECT {pk}, {fk} FROM {tbl} ORDER BY {pk} LIMIT %s OFFSET %s",
                (BATCH, offset)
            ))
            if not rows:
                break
            with neo.session() as s:
                s.run(f"""
                    UNWIND $rows AS r
                    MATCH (c:Case {{caseMasterId: r.caseId}})
                    MATCH (p:Person {{globalId: r.globalId}})
                    MERGE (c)-[:{rel_type}]->(p)
                """, parameters={"rows": [
                    {"caseId": r[1], "globalId": f"{prefix}_{r[0]}"}
                    for r in rows
                ]})
            offset += BATCH
            print(f"  {rel_type}: {offset}")
    with neo.session() as s:
        for rel in ["INVOLVES_ACCUSED", "INVOLVES_VICTIM", "INVOLVES_COMPLAINANT"]:
            r = s.run(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS n").single()
            print(f"  {rel}: {r['n']}")


def seed_cyber_indicators():
    rows = list(stream(
        "SELECT ci.indicator_id, ci.casemasterid, ci.indicator_type, ci.indicator_value, "
        "ci.platform, ci.extracted_from, ci.first_seen, ci.last_seen "
        "FROM cyber_indicators ci ORDER BY ci.indicator_id"
    ))
    if not rows:
        print("CyberIndicators: 0 (table empty)")
        return
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MERGE (ci:CyberIndicator {indicatorId: r.id})
            SET ci.indicatorType = r.type, ci.indicatorValue = r.value,
                ci.platform = r.platform, ci.extractedFrom = r.extracted,
                ci.firstSeen = r.firstSeen, ci.lastSeen = r.lastSeen
        """, parameters={"rows": [
            {"id": r[0], "caseId": r[1], "type": r[2], "value": r[3],
             "platform": r[4], "extracted": r[5],
             "firstSeen": r[6].isoformat() if r[6] else None,
             "lastSeen": r[7].isoformat() if r[7] else None}
            for r in rows
        ]})
    with neo.session() as s:
        s.run("""
            UNWIND $rows AS r
            MATCH (c:Case {caseMasterId: r.caseId})
            MATCH (ci:CyberIndicator {indicatorId: r.id})
            MERGE (c)-[:HAS_INDICATOR]->(ci)
        """, parameters={"rows": [
            {"id": r[0], "caseId": r[1]}
            for r in rows
        ]})
    print(f"CyberIndicators: {len(rows)}")


def verify():
    print("\n=== VERIFICATION ===")
    queries = [
        ("Cases", "MATCH (c:Case) RETURN count(c) AS n"),
        ("Persons", "MATCH (p:Person) RETURN count(p) AS n"),
        ("Officers", "MATCH (o:PoliceOfficer) RETURN count(o) AS n"),
        ("Stations", "MATCH (s:PoliceStation) RETURN count(s) AS n"),
        ("CrimeCategories", "MATCH (c:CrimeCategory) RETURN count(c) AS n"),
        ("CrimeSubCategories", "MATCH (s:CrimeSubCategory) RETURN count(s) AS n"),
        ("Districts", "MATCH (d:District) RETURN count(d) AS n"),
        ("CyberIndicators", "MATCH (ci:CyberIndicator) RETURN count(ci) AS n"),
    ]
    with neo.session() as s:
        for label, q in queries:
            r = s.run(q).single()
            print(f"  {label}: {r['n']}")

    rel_queries = [
        ("REGISTERED_AT", "MATCH ()-[r:REGISTERED_AT]->() RETURN count(r) AS n"),
        ("INVESTIGATED_BY", "MATCH ()-[r:INVESTIGATED_BY]->() RETURN count(r) AS n"),
        ("CLASSIFIED_AS", "MATCH ()-[r:CLASSIFIED_AS]->() RETURN count(r) AS n"),
        ("SUBCLASSIFIED_AS", "MATCH ()-[r:SUBCLASSIFIED_AS]->() RETURN count(r) AS n"),
        ("BELONGS_TO", "MATCH ()-[r:BELONGS_TO]->() RETURN count(r) AS n"),
        ("ASSIGNED_TO", "MATCH ()-[r:ASSIGNED_TO]->() RETURN count(r) AS n"),
        ("INVOLVES_ACCUSED", "MATCH ()-[r:INVOLVES_ACCUSED]->() RETURN count(r) AS n"),
        ("INVOLVES_VICTIM", "MATCH ()-[r:INVOLVES_VICTIM]->() RETURN count(r) AS n"),
        ("INVOLVES_COMPLAINANT", "MATCH ()-[r:INVOLVES_COMPLAINANT]->() RETURN count(r) AS n"),
        ("HAS_INDICATOR", "MATCH ()-[r:HAS_INDICATOR]->() RETURN count(r) AS n"),
    ]
    with neo.session() as s:
        for label, q in rel_queries:
            r = s.run(q).single()
            print(f"  {label}: {r['n']}")


if __name__ == "__main__":
    clear()
    apply_schema()
    seed_crime_categories()
    seed_crime_sub_categories()
    seed_districts()
    seed_police_stations()
    seed_officers()
    seed_persons()
    seed_cases()
    # Relationships
    rel_cases_to_stations()
    rel_cases_to_officers()
    rel_cases_to_crime_categories()
    rel_stations_to_districts()
    rel_officers_to_stations()
    rel_cases_to_persons()
    seed_cyber_indicators()
    verify()
    pg.close()
    neo.close()
