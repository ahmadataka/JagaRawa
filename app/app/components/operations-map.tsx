'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

type Incident = { id: string; place: string; priority: 'critical' | 'high' | 'watch'; coords: { lng: number; lat: number }; hotspot: boolean };
type Layers = { hotspot: boolean; peat: boolean; wind: boolean; exposure: boolean };

export function OperationsMap({ incidents, selectedId, onSelect, layers }: { incidents: Incident[]; selectedId: string; onSelect: (id: string) => void; layers: Layers }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapContainer.current, style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap contributors' } },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    }, center: [113.7, -2.15], zoom: 5.3, attributionControl: true, renderWorldCopies: false });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
    map.on('load', () => {
      map.addSource('demo-peat', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[112.0, -2.4], [113.4, -3.2], [114.9, -2.8], [114.4, -1.5], [112.7, -1.2], [112.0, -2.4]]] } } });
      map.addLayer({ id: 'peat-outline', type: 'fill', source: 'demo-peat', paint: { 'fill-color': '#2d7258', 'fill-opacity': 0.13, 'fill-outline-color': '#29674e' } });
      map.addSource('demo-wind', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[112.3, -0.7], [114.2, -2.25], [115.5, -3.35]] } }] } });
      map.addLayer({ id: 'wind-corridor', type: 'line', source: 'demo-wind', paint: { 'line-color': '#397f91', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.8 } });
    });
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
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('peat-outline')) map.setLayoutProperty('peat-outline', 'visibility', layers.peat ? 'visible' : 'none');
    if (map.getLayer('wind-corridor')) map.setLayoutProperty('wind-corridor', 'visibility', layers.wind ? 'visible' : 'none');
  }, [layers]);

  return <div className="real-map"><div ref={mapContainer} className="maplibre-container" /><div className="map-disclaimer">OpenStreetMap basemap. Peat and wind overlays are prototype layers.</div></div>;
}
