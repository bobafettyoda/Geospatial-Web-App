import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const codespaceUrl = (port) => {
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `http://localhost:${port}`;
  return `${protocol}//${hostname.replace('-5173.', `-${port}.`)}`;
};

const absoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
};

const API_URL = absoluteUrl(import.meta.env.VITE_API_URL) || codespaceUrl(8000);
const MARTIN_URL = absoluteUrl(import.meta.env.VITE_MARTIN_URL) || codespaceUrl(3000);

function App() {
  const [species, setSpecies] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [error, setError] = useState('');
  const [selectedSpcode, setSelectedSpcode] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => setError('Could not load summary data from the API.'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);

    fetch(`${API_URL}/species?${params}`)
      .then(r => r.json())
      .then(setSpecies)
      .catch(() => {
        setSpecies([]);
        setError('Could not load species data from the API.');
      });
  }, [q, status]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          },
          habitat: {
            type: 'vector',
            tiles: [`${MARTIN_URL}/critical_habitat/{z}/{x}/{y}`],
            minzoom: 0,
            maxzoom: 14
          }
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
          {
            id: 'habitat-fill',
            type: 'fill',
            source: 'habitat',
            'source-layer': 'critical_habitat',
            paint: { 'fill-color': '#2b8cbe', 'fill-opacity': 0.28 }
          },
          {
            id: 'habitat-line',
            type: 'line',
            source: 'habitat',
            'source-layer': 'critical_habitat',
            paint: { 'line-color': '#045a8d', 'line-width': 1 }
          },
          {
            id: 'habitat-highlight-fill',
            type: 'fill',
            source: 'habitat',
            'source-layer': 'critical_habitat',
            filter: ['==', ['get', 'spcode'], ''],
            paint: { 'fill-color': '#ffcc00', 'fill-opacity': 0.55 }
          },
          {
            id: 'habitat-highlight-line',
            type: 'line',
            source: 'habitat',
            'source-layer': 'critical_habitat',
            filter: ['==', ['get', 'spcode'], ''],
            paint: { 'line-color': '#ff9900', 'line-width': 3 }
          }
        ]
      },
      center: [-98.5, 39.8],
      zoom: 3
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('mouseenter', 'habitat-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'habitat-fill', () => { map.getCanvas().style.cursor = ''; });


    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['habitat-fill']
      });

      if (features.length === 0) {
        if (map.getLayer('habitat-highlight-fill'))
          map.setFilter('habitat-highlight-fill', ['==', ['get', 'spcode'], '']);

        if (map.getLayer('habitat-highlight-line'))
          map.setFilter('habitat-highlight-line', ['==', ['get', 'spcode'], '']);

        const rows = document.querySelectorAll('.selected-row');
        rows.forEach(r => r.classList.remove('selected-row'));
      }
    });

    map.on('click', 'habitat-fill', (e) => {
      const p = e.features?.[0]?.properties || {};
      const html = `
        <div class="popup">
          <strong>${p.common_name || 'Critical habitat'}</strong>
          <div><em>${p.scientific_name || 'Scientific name unavailable'}</em></div>
          <div>Status: ${p.status || 'Unavailable'}</div>
          <div>Source: ${p.source_agency || 'USFWS'}</div>
          <div>Species code: ${p.spcode || 'Unavailable'}</div>
        </div>
      `;
      new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    window.__habitatMap = map;
    return () => {
      delete window.__habitatMap;
      map.remove();
    };
  }, []);

  const selectSpecies = (s) => {
    const map = window.__habitatMap;
    if (!map) return;

    if (selectedSpcode === s.spcode) {
      setSelectedSpcode('');

      if (map.getLayer('habitat-highlight-fill'))
        map.setFilter('habitat-highlight-fill', ['==', ['get', 'spcode'], '']);

      if (map.getLayer('habitat-highlight-line'))
        map.setFilter('habitat-highlight-line', ['==', ['get', 'spcode'], '']);

      return;
    }

    setSelectedSpcode(s.spcode);

    const filter = ['==', ['get', 'spcode'], s.spcode];
    if (map.getLayer('habitat-highlight-fill')) map.setFilter('habitat-highlight-fill', filter);
    if (map.getLayer('habitat-highlight-line')) map.setFilter('habitat-highlight-line', filter);

    fetch(`${API_URL}/species/${s.spcode}/bbox`)
      .then(r => r.json())
      .then(b => {
        if ([b.minx, b.miny, b.maxx, b.maxy].every(v => typeof v === 'number')) {
          map.fitBounds([[b.minx, b.miny], [b.maxx, b.maxy]], { padding: 80, maxZoom: 9 });
        }
      })
      .catch(() => {});
  };

  const updated = useMemo(() => summary?.last_updated?.[0]?.last_updated || 'not loaded yet', [summary]);
  const habitatCount = useMemo(() => summary?.habitat_by_agency?.reduce((sum, r) => sum + Number(r.count || 0), 0) || 0, [summary]);

  return <div className="app">
    <header>
      <div>
        <h1>National Critical Habitat Web Map</h1>
        <p className="subtitle">Open-source viewer for U.S. critical habitat data.</p>
      </div>
      <div className="header-actions">
        <span className="badge">Source: USFWS ECOS aggregate shapefile</span>
        <span className="badge">Records: {habitatCount}</span>
        <span className="badge">Last loaded: {String(updated)}</span>
        <button onClick={() => setShowAbout(true)}>About this map</button>
      </div>
    </header>

    {error && <div className="error">{error}</div>}

    <main>
      <section id="map" aria-label="Critical habitat map" />
      <aside>
        <h2>Species</h2>

        <label>
          Search
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Common or scientific name" />
        </label>

        <label>
          Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Final">Final</option>
            <option value="Proposed">Proposed</option>
          </select>
        </label>

        <div className="summary">
          {(summary?.habitat_by_agency || []).map(row => (
            <div key={row.source_agency}>{row.source_agency || 'Unknown'}: {row.count} habitat records</div>
          ))}
        </div>

        <table>
          <thead><tr><th>Common name</th><th>Status</th><th>Group</th></tr></thead>
          <tbody>
            {species.map(s => (
              <tr key={s.spcode} onClick={() => selectSpecies(s)} className={selectedSpcode === s.spcode ? 'selected-row' : ''}>
                <td>
                  <strong>{s.common_name}</strong>
                  <div className="scientific">{s.scientific_name}</div>
                </td>
                <td>{s.status}</td>
                <td>{s.species_group || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
    </main>

    {showAbout && <div className="modal-backdrop" onClick={() => setShowAbout(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={() => setShowAbout(false)}>×</button>
        <h2>About this map</h2>
        <p>
          This open-source web map displays critical habitat records loaded from the U.S. Fish and Wildlife Service
          ECOS aggregate critical habitat shapefile.
        </p>
        <p>
          Critical habitat generally means areas containing physical or biological features essential to conservation
          of a listed species. This viewer is intended for exploration and planning support, not legal advice.
        </p>
        <p>
          Note: USFWS critical habitat sources may not include species solely managed by NOAA/NMFS. A production
          deployment should add NOAA/NMFS data for complete national ESA coverage.
        </p>
      </div>
    </div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
