import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MARTIN_URL = import.meta.env.VITE_MARTIN_URL || 'http://localhost:3000';

function App() {
  const [species, setSpecies] = useState([]);
  const [q, setQ] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/summary`).then(r => r.json()).then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    fetch(`${API_URL}/species?${params}`).then(r => r.json()).then(setSpecies).catch(() => setSpecies([]));
  }, [q]);

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
          }
        ]
      },
      center: [-98.5, 39.8],
      zoom: 3
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.on('click', 'habitat-fill', (e) => {
      const p = e.features?.[0]?.properties || {};
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${p.common_name || 'Critical habitat'}</strong><br>${p.scientific_name || ''}<br>${p.status || ''}`)
        .addTo(map);
    });
    return () => map.remove();
  }, []);

  const updated = useMemo(() => summary?.last_updated?.[0]?.last_updated || 'not loaded yet', [summary]);

  return <div className="app">
    <header>
      <h1>National Critical Habitat Web Map</h1>
      <span>Last data update: {String(updated)}</span>
    </header>
    <main>
      <section id="map" aria-label="Critical habitat map" />
      <aside>
        <h2>Species</h2>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search common or scientific name" />
        <div className="summary">
          {(summary?.habitat_by_agency || []).map(row => <div key={row.source_agency}>{row.source_agency || 'Unknown'}: {row.count}</div>)}
        </div>
        <table>
          <thead><tr><th>Common name</th><th>Status</th><th>Group</th></tr></thead>
          <tbody>{species.map(s => <tr key={s.spcode}><td>{s.common_name}</td><td>{s.status}</td><td>{s.species_group}</td></tr>)}</tbody>
        </table>
      </aside>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
