'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

type Incident = { id: string; place: string; priority: 'critical' | 'high' | 'watch'; coords: { lng: number; lat: number }; hotspot: boolean };
type Layers = { hotspot: boolean; peat: boolean; wind: boolean; exposure: boolean; landcover: boolean };

export function OperationsMap({ incidents, selectedId, onSelect, layers, peatFeature }: { incidents: Incident[]; selectedId: string; onSelect: (id: string) => void; layers: Layers; peatFeature?: GeoJSON.Feature | null }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
      map.addSource('worldcover', { type: 'raster', tiles: ['https://titiler.terrascope.be/wms?service=WMS&request=GetMap&version=1.3.0&layers=WORLDCOVER_2021_MAP&styles=&crs=EPSG%3A3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image%2Fpng&transparent=true'], tileSize: 256, attribution: 'ESA WorldCover 2021' });
      map.addLayer({ id: 'worldcover-overlay', type: 'raster', source: 'worldcover', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.48 } });
      map.addSource('incidents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 42, clusterMaxZoom: 12 });
      map.addLayer({ id: 'incident-clusters', type: 'circle', source: 'incidents', filter: ['has', 'point_count'], paint: { 'circle-color': '#c74b32', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 27], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'incident-cluster-count', type: 'symbol', source: 'incidents', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
      map.addLayer({ id: 'incident-point', type: 'circle', source: 'incidents', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'priority'], 'critical', '#cf4b31', 'high', '#e38d2c', '#d7b437'], 'circle-radius': 10, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
      map.on('click', 'incident-clusters', (event) => { const feature = event.features?.[0]; const clusterId = feature?.properties?.cluster_id; if (clusterId === undefined) return; (map.getSource('incidents') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId, (error, zoom) => { if (!error && zoom) map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom }); }); });
      map.on('click', 'incident-point', (event) => { const id = event.features?.[0]?.properties?.id; if (id) onSelect(id); });
      map.on('mouseenter', 'incident-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'incident-clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'incident-point', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'incident-point', () => { map.getCanvas().style.cursor = ''; });
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
    const updateSource = () => {
      const source = map?.getSource('incidents') as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: incidents.map((incident) => ({ type: 'Feature', properties: { id: incident.id, priority: incident.priority }, geometry: { type: 'Point', coordinates: [incident.coords.lng, incident.coords.lat] } })) });
    };
    if (map?.isStyleLoaded()) updateSource(); else map?.once('load', updateSource);
  }, [incidents]);

  useEffect(() => {
    const map = mapRef.current;
    const updatePeat = () => (map?.getSource('demo-peat') as maplibregl.GeoJSONSource | undefined)?.setData(peatFeature ? { type: 'FeatureCollection', features: [peatFeature] } : { type: 'FeatureCollection', features: [] });
    if (map?.isStyleLoaded()) updatePeat(); else map?.once('load', updatePeat);
  }, [peatFeature]);

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
    for (const id of ['incident-clusters', 'incident-cluster-count', 'incident-point']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', layers.hotspot ? 'visible' : 'none');
    if (map.getLayer('peat-outline')) map.setLayoutProperty('peat-outline', 'visibility', layers.peat ? 'visible' : 'none');
    if (map.getLayer('wind-corridor')) map.setLayoutProperty('wind-corridor', 'visibility', layers.wind ? 'visible' : 'none');
    if (map.getLayer('worldcover-overlay')) map.setLayoutProperty('worldcover-overlay', 'visibility', layers.landcover ? 'visible' : 'none');
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
    <div className="map-disclaimer"><b>PROTOTYPE LAYERS</b> OpenStreetMap basemap is live. Peat, wind, and WorldCover overlays are context only.</div>
  </div>;
}
