'use client';

import { useState } from 'react';
import { OperationsMap } from './components/operations-map';

type Priority = 'critical' | 'high' | 'watch';
type Confidence = 'high' | 'medium' | 'low';
type Incident = { id: string; place: string; region: string; priority: Priority; risk: number; confidence: number; confidenceBand: Confidence; action: string; deadline: string; coords: { lng: number; lat: number }; hotspot: boolean; pm25: string; evidence: string[]; limitation: string; status: string };

const incidents: Incident[] = [
  { id: 'pulang-pisau', place: 'Pulang Pisau', region: 'Kalimantan Tengah', priority: 'critical', risk: 82, confidence: 78, confidenceBand: 'high', action: 'Verify within 2 hours', deadline: 'Before 14:00 WIB', coords: { lng: 114.25, lat: -2.73 }, hotspot: true, pm25: '115.6 ug/m3 nearby', evidence: ['High peatfr vulnerability forecast', 'Recent high-confidence FIRMS detection', 'Dry fire-weather conditions', 'Village 7 km downwind'], limitation: 'Water-table observation unavailable; soil-moisture proxy used.', status: 'Needs verification' },
  { id: 'kubu-raya', place: 'Kubu Raya', region: 'Kalimantan Barat', priority: 'high', risk: 74, confidence: 64, confidenceBand: 'medium', action: 'Conduct preventive patrol today', deadline: 'Before 18:00 WIB', coords: { lng: 109.41, lat: -0.28 }, hotspot: true, pm25: '186.5 ug/m3 at Kubu Raya', evidence: ['Elevated peatfr vulnerability forecast', 'Cluster of two recent satellite detections', 'PM2.5 is very unhealthy', 'Road access within 4 km'], limitation: 'Wind field is a 6-hour forecast, not an observation.', status: 'Needs verification' },
  { id: 'banjar', place: 'Banjar', region: 'Kalimantan Selatan', priority: 'watch', risk: 58, confidence: 55, confidenceBand: 'medium', action: 'Prepare downwind health advisory', deadline: 'Review at 16:00 WIB', coords: { lng: 114.72, lat: -3.44 }, hotspot: false, pm25: '25.1 ug/m3 at Banjarbaru', evidence: ['Moderate peatfr vulnerability forecast', 'Wind corridor points toward settlements', 'Historical burn pattern present'], limitation: 'No nearby water-table or PM2.5 observation.', status: 'Monitoring' },
  { id: 'palangkaraya', place: 'Palangka Raya', region: 'Kalimantan Tengah', priority: 'high', risk: 69, confidence: 48, confidenceBand: 'low', action: 'Acquire observations before deployment', deadline: 'Next satellite pass', coords: { lng: 113.92, lat: -2.21 }, hotspot: true, pm25: '115.6 ug/m3 at Palangka Raya', evidence: ['High soil dryness proxy', 'Low-confidence satellite detection', 'Peat hydrological unit overlap', 'PM2.5 has risen in the last 6 hours'], limitation: 'Cloud-affected imagery and missing water-table data reduce confidence.', status: 'Monitoring' },
];
const priorityLabel: Record<Priority, string> = { critical: 'Critical', high: 'High', watch: 'Watch' };
const evidenceDetails: Record<string, string> = {
  'High peatfr vulnerability forecast': 'PFVI: 0.82 (high). Model: peatfr demo ensemble, 72-hour horizon. Water-table depth was not observed.',
  'Recent high-confidence FIRMS detection': 'VIIRS confidence: high. Acquisition age: 3 hours. Live FIRMS key is not configured, so this is representative MVP data.',
  'Dry fire-weather conditions': 'Rainfall: 1.8 mm in prior 24 hours. Temperature: 32.1 C. Wind: 13 km/h from SE.',
  'Village 7 km downwind': 'Nearest mapped settlement: 7.0 km. Estimated downwind population exposure: 2,340 people.',
  'Elevated peatfr vulnerability forecast': 'PFVI: 0.74 (high). Soil moisture proxy: 0.18 m3/m3.',
  'Cluster of two recent satellite detections': '2 detections within 4.3 km over 6 hours. Confidence: high and nominal.',
  'PM2.5 is very unhealthy': 'PM2.5: 186.5 ug/m3. Category: very unhealthy. Station: Kubu Raya.',
  'Road access within 4 km': 'Nearest mapped road: 3.8 km. Nearest waterway: 1.2 km.',
  'Moderate peatfr vulnerability forecast': 'PFVI: 0.58 (watch). Model uncertainty is wider than the critical incident.',
  'Wind corridor points toward settlements': 'Forecast wind: 11 km/h from SE. Settlement intersection estimated in 6-12 hours.',
  'Historical burn pattern present': 'Historical burn indicator: 3 events within 10 km during 2019-2025 reference period.',
  'High soil dryness proxy': 'ERA5-Land soil moisture proxy: 0.16 m3/m3, 6th percentile for the seasonal baseline.',
  'Low-confidence satellite detection': 'VIIRS confidence: nominal. Acquisition age: 5 hours. Requires verification.',
  'Peat hydrological unit overlap': 'Incident point falls inside prototype peat hydrological-unit overlay.',
  'PM2.5 has risen in the last 6 hours': 'PM2.5 change: +38.4 ug/m3 over 6 hours at Palangka Raya station.',
};
const parameterRows = [
  ['Peat fire vulnerability (PFVI)', '0.82', 'peatfr demo ensemble', 'Modelled'],
  ['Active-fire evidence', 'VIIRS high, 3 h old', 'NASA FIRMS', 'Representative'],
  ['Rainfall, prior 24 h', '1.8 mm', 'Weather fallback', 'Representative'],
  ['Air temperature', '32.1 C', 'Weather fallback', 'Representative'],
  ['Wind', '13 km/h from SE', 'Weather fallback', 'Representative'],
  ['Soil moisture', '0.18 m3/m3', 'ERA5-Land proxy', 'Representative'],
  ['Water-table depth', 'Unavailable', 'No local sensor', 'Missing'],
  ['PM2.5', '115.6 ug/m3', 'BMKG station context', 'Representative'],
  ['Nearest housing', '7.0 km', 'OpenStreetMap context', 'Representative'],
  ['Estimated exposed population', '2,340', 'Prototype exposure model', 'Representative'],
  ['Nearest road / waterway', '3.8 km / 1.2 km', 'OpenStreetMap context', 'Representative'],
];

export default function Home() {
  const [selectedId, setSelectedId] = useState('pulang-pisau');
  const [filter, setFilter] = useState<'all' | Priority>('all');
  const [horizon, setHorizon] = useState('72h');
  const [layers, setLayers] = useState({ risk: true, hotspot: true, peat: true, wind: true, exposure: true });
  const [status, setStatus] = useState<Record<string, string>>({});
  const [evidenceDetail, setEvidenceDetail] = useState('Select a reason to inspect its underlying value and source.');
  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0];
  const visibleIncidents = incidents.filter((incident) => filter === 'all' || incident.priority === filter);
  const updateStatus = (value: string) => setStatus((previous) => ({ ...previous, [selected.id]: value }));
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">JR</span><span>JagaRawa</span><small>Operations MVP</small></div><div className="center-status"><span className="pulse" /> Central Kalimantan pilot <span className="divider">|</span> Updated 12:00 WIB</div><button className="health-button" onClick={() => alert('Demo data health: FIRMS current; peatfr sample forecast; water-table observations unavailable in 3 of 4 incidents.')}>Data health</button></header>
    <section className="controlbar" aria-label="Map controls"><div className="horizon-tabs">{['Now', '24h', '72h'].map((item) => <button key={item} className={horizon === item ? 'active' : ''} onClick={() => setHorizon(item)}>{item}</button>)}</div><span className="control-caption">Forecast horizon: {horizon}</span><div className="filter-group"><span>Priority</span>{(['all', 'critical', 'high', 'watch'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : priorityLabel[item]}</button>)}</div></section>
    <section className="workspace">
      <aside className="queue-panel"><div className="panel-heading"><div><p className="eyebrow">Priority queue</p><h1>What needs attention</h1></div><span>{visibleIncidents.length} items</span></div><p className="queue-note">Ranked by risk, confidence, exposure, and action deadline.</p><div className="incident-list">{visibleIncidents.map((incident) => <button key={incident.id} className={`incident-card ${selected.id === incident.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(incident.id)}><span className={`priority-dot ${incident.priority}`} /><span className="incident-card-copy"><strong>{priorityLabel[incident.priority]} <em>{incident.risk}%</em></strong><b>{incident.place}</b><small>{status[incident.id] ?? incident.action}</small></span><span className={`confidence-pill ${incident.confidenceBand}`}>{incident.confidenceBand}</span></button>)}</div><div className="legend"><span><i className="priority-dot critical" />Critical</span><span><i className="priority-dot high" />High</span><span><i className="priority-dot watch" />Watch</span></div></aside>
      <section className="map-panel" aria-label="Central Kalimantan risk map"><div className="map-toolbar"><strong>Central Kalimantan / Kalimantan context</strong><span>Zoom and pan enabled</span></div><OperationsMap incidents={incidents} selectedId={selected.id} onSelect={setSelectedId} layers={layers} /><div className="layer-bar">{Object.entries(layers).map(([key, enabled]) => <button key={key} className={enabled ? 'layer-on' : ''} onClick={() => setLayers((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))}>{enabled ? 'Hide' : 'Show'} {key}</button>)}</div></section>
      <aside className="detail-panel"><div className="panel-heading"><div><p className="eyebrow">Selected incident</p><h2>{selected.place}</h2><span>{selected.region}</span></div><span className={`priority-badge ${selected.priority}`}>{priorityLabel[selected.priority]}</span></div><div className="score-row"><div><span>Risk</span><strong>{selected.risk}%</strong><small>next {horizon}</small></div><div><span>Confidence</span><strong>{selected.confidence}%</strong><small className={selected.confidenceBand}>{selected.confidenceBand}</small></div></div><div className="action-box"><p>Recommended action</p><strong>{selected.action}</strong><span>{selected.deadline}</span></div><section className="evidence"><h3>Why this is ranked</h3>{selected.evidence.map((item) => <button key={item} className="evidence-button" onClick={() => setEvidenceDetail(evidenceDetails[item] ?? 'Underlying value not yet mapped.')}><i />{item}<b>Inspect</b></button>)}<div className="evidence-detail">{evidenceDetail}</div></section><details className="parameter-panel"><summary>All inputs, sources, and data quality</summary><div className="parameter-table">{parameterRows.map(([name, value, source, quality]) => <div key={name}><span>{name}</span><b>{value}</b><small>{source} · {quality}</small></div>)}</div></details><div className="limit-box"><strong>Confidence limitation</strong><span>{selected.limitation}</span></div><div className="air-readout"><span>Air quality context</span><b>{selected.pm25}</b></div><div className="field-actions"><p>Field feedback</p><div><button onClick={() => updateStatus('Verified fire')}>Verified fire</button><button onClick={() => updateStatus('False alarm')}>False alarm</button><button onClick={() => updateStatus('Monitoring')}>Monitor</button></div></div></aside>
    </section><footer><span><b>DEMO MODE</b> Inputs are representative, not a live operational feed.</span><span>Every recommendation requires human verification.</span></footer>
  </main>;
}
