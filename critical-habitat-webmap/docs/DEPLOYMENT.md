# Deployment guide

Recommended low-maintenance deployment:

1. Put this repository on GitHub as public.
2. Create a PostGIS database using Supabase, Neon, Crunchy Bridge, or a small VPS.
3. Deploy the FastAPI API and Martin tile server on Fly.io, Render, Railway, or a VPS.
4. Deploy the frontend on Cloudflare Pages, Netlify, or GitHub Pages.
5. Add `DATABASE_URL`, `VITE_API_URL`, and `VITE_MARTIN_URL` secrets/variables.
6. Enable the monthly GitHub Action after you have confirmed official data download URLs.

For production, restrict CORS to your frontend domain and use a read-only database role for Martin/API.
