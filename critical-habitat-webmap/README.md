# National Critical Habitat Web Map

Open-source starter implementation for a national critical habitat web map inspired by the uploaded PDF capstone project.

The app uses:

- Frontend: Vite + React + MapLibre GL JS
- Database: PostgreSQL + PostGIS
- Tile/API service: Martin vector tile server + a small FastAPI service
- Data pipeline: GDAL/OGR + Python scripts
- Automation: GitHub Actions workflow for scheduled refreshes

## What this repo gives you

This is a deployable scaffold rather than a fully populated production database. It includes the frontend, local Docker setup, schema, import scripts, update workflow, and deployment notes. Run the data import after downloading official USFWS/NOAA datasets.

## Quick start locally

Requirements:

- Docker Desktop
- Node.js 20+
- Git

```bash
git clone <your-repo-url>
cd critical-habitat-webmap
cp .env.example .env
docker compose up -d db martin api
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## Data refresh workflow

The intended production refresh is:

1. Download official USFWS and NOAA/NMFS critical habitat spatial data.
2. Normalize fields into PostGIS.
3. Validate geometries and simplify them for web display.
4. Serve map layers as vector tiles.
5. Expose species/filter metadata through the API.
6. Redeploy the app.

A scheduled GitHub Action is included in `.github/workflows/refresh-data.yml`.

## Important data notes

USFWS and NOAA/NMFS publish overlapping but not identical critical habitat data. NOAA Fisheries states its mapper covers all available critical habitat spatial data proposed and designated by NOAA Fisheries, while the USFWS ECOS mapper notes it does not include species solely under NMFS jurisdiction. Use both sources when you want national coverage.

## License

Use MIT or Apache-2.0 for code. Data remains subject to the terms of the source agencies.
