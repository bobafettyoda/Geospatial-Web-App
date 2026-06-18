import os
from typing import Optional

import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://habitat:habitat@localhost:5432/habitat")

app = FastAPI(title="Critical Habitat API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def rows(sql: str, params: tuple = ()):  # small helper for starter API
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(sql, params)
            return cur.fetchall()


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/species")
def species(q: Optional[str] = None, status: Optional[str] = None, group: Optional[str] = None, limit: int = 250):
    clauses = []
    params = []
    if q:
        clauses.append("(common_name ILIKE %s OR scientific_name ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%"])
    if status:
        clauses.append("status = %s")
        params.append(status)
    if group:
        clauses.append("species_group = %s")
        params.append(group)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    params.append(min(limit, 1000))
    return rows(
        f"""
        SELECT spcode, common_name, scientific_name, status, species_type, species_group,
               species_family, listing_date, ecos_url
        FROM species
        {where}
        ORDER BY common_name NULLS LAST
        LIMIT %s
        """,
        tuple(params),
    )


@app.get("/summary")
def summary():
    return {
        "species_by_group": rows("SELECT species_group, count(*)::int AS count FROM species GROUP BY 1 ORDER BY 1"),
        "habitat_by_agency": rows("SELECT source_agency, count(*)::int AS count FROM critical_habitat GROUP BY 1 ORDER BY 1"),
        "last_updated": rows("SELECT max(updated_at) AS last_updated FROM critical_habitat"),
    }
