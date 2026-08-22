'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

type Incident = { id: string; place: string; priority: 'critical' | 'high' | 'watch'; coords: { lng: number; lat: number }; hotspot: boolean };
type Layers = { hotspot: boolean; peat: boolean; wind: boolean; exposure: boolean };

export function OperationsMap({ incidents, selectedId, onSelect, layers }: { incidents: Incident[]; selectedId: string; onSelect: (id: string) => void; layers: Layers }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [mapHealth, setMapHealth] = useState<'loading' | 'live' | 'fallback'>('fallback');
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [fallbackPan, setFallbackPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapContainer.current, style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap contributors' } },
      layers: [{ id: 'base', type: 'background', paint: { 'background-color': '#dce7d2' } }, { id: 'osm', type: 'raster', source: 'osm' }],
    }, center: [113.7, -2.15], zoom: 5.3, attributionControl: true, renderWorldCopies: false });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
    map.on('load', () => {
      map.addSource('demo-peat', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[112.0, -2.4], [113.4, -3.2], [114.9, -2.8], [114.4, -1.5], [112.7, -1.2], [112.0, -2.4]]] } } });
      map.addLayer({ id: 'peat-outline', type: 'fill', source: 'demo-peat', paint: { 'fill-color': '#2d7258', 'fill-opacity': 0.13, 'fill-outline-color': '#29674e' } });
      map.addSource('demo-wind', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[112.3, -0.7], [114.2, -2.25], [115.5, -3.35]] } }] } });
      map.addLayer({ id: 'wind-corridor', type: 'line', source: 'demo-wind', paint: { 'line-color': '#397f91', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.8 } });
      window.setTimeout(() => {
        if (map.isSourceLoaded('osm')) setMapHealth('live');
      }, 1600);
    });
    map.on('sourcedata', (event) => {
      if (event.sourceId === 'osm' && event.isSourceLoaded) setMapHealth('live');
    });
    map.on('error', () => setMapHealth('fallback'));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const renderMarkers = () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = incidents.map((incident) => {
        const element = document.createElement('button');
        element.className = `fire-marker ${incident.priority} ${incident.id === selectedId ? 'selected' : ''}`;
        element.setAttribute('aria-label', `Select ${incident.place}`);
        element.onclick = () => onSelect(incident.id);
        const marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat([incident.coords.lng, incident.coords.lat]).addTo(map);
        return marker;
      });
    };
    if (map.loaded()) renderMarkers(); else map.once('load', renderMarkers);
  }, [incidents, onSelect, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = incidents.find((incident) => incident.id === selectedId);
    if (!map || !selected) return;
    const flyToSelected = () => {
      map.stop();
      map.jumpTo({ center: [selected.coords.lng, selected.coords.lat], zoom: Math.max(map.getZoom(), 8) });
    };
    if (map.loaded()) flyToSelected(); else map.once('load', flyToSelected);
  }, [incidents, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('peat-outline')) map.setLayoutProperty('peat-outline', 'visibility', layers.peat ? 'visible' : 'none');
    if (map.getLayer('wind-corridor')) map.setLayoutProperty('wind-corridor', 'visibility', layers.wind ? 'visible' : 'none');
  }, [layers]);

  return <div className="real-map">
    <div className={`local-map-fallback ${mapHealth === 'live' ? 'fallback-hidden' : ''}`} aria-label="Local Kalimantan geographic fallback" onWheel={(event) => { event.preventDefault(); setFallbackZoom((zoom) => Math.min(2.4, Math.max(0.8, zoom + (event.deltaY < 0 ? 0.12 : -0.12)))); }} onPointerDown={(event) => { dragStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!dragStart.current) return; setFallbackPan((pan) => ({ x: pan.x + event.clientX - dragStart.current!.x, y: pan.y + event.clientY - dragStart.current!.y })); dragStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={() => { dragStart.current = null; }}>
      <div className="fallback-scene" style={{ transform: `translate(${fallbackPan.x}px, ${fallbackPan.y}px) scale(${fallbackZoom})` }}><div className="fallback-land"><span className="fallback-river river-a" /><span className="fallback-river river-b" /><span className="fallback-peat" /></div>
      <span className="fallback-label label-west">Kalimantan Barat</span><span className="fallback-label label-central">Kalimantan Tengah</span><span className="fallback-label label-south">Kalimantan Selatan</span>
      {incidents.map((incident) => <button key={incident.id} className={`fallback-marker ${incident.priority} ${selectedId === incident.id ? 'selected' : ''}`} style={{ left: `${((incident.coords.lng - 108) / 9) * 100}%`, top: `${((1 - (incident.coords.lat + 4) / 5) * 100)}%` }} onClick={() => onSelect(incident.id)} aria-label={`Select ${incident.place}`} />)}</div>
      <div className="fallback-controls"><button onClick={() => setFallbackZoom((zoom) => Math.min(2.4, zoom + 0.2))}>+</button><button onClick={() => setFallbackZoom((zoom) => Math.max(0.8, zoom - 0.2))}>-</button><button onClick={() => { setFallbackZoom(1); setFallbackPan({ x: 0, y: 0 }); }}>Reset</button></div>
      <span className="fallback-note">Local geographic fallback: Kalimantan extent and incident coordinates</span>
    </div>
    <div ref={mapContainer} className={`maplibre-container ${mapHealth === 'fallback' ? 'map-hidden' : ''}`} />
    <div className={`map-health ${mapHealth}`}>{mapHealth === 'live' ? 'Basemap connected' : mapHealth === 'loading' ? 'Loading basemap' : 'Fallback map active'}</div>
    <div className="map-disclaimer">OpenStreetMap basemap. Peat and wind overlays are prototype layers.</div>
  </div>;
}
