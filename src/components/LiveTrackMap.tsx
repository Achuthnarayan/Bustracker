'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/hooks/useAuth';
import 'leaflet/dist/leaflet.css';

// Socket.IO IoT server — set NEXT_PUBLIC_IOT_SERVER in .env.local to enable real-time mode
const IOT_SERVER = process.env.NEXT_PUBLIC_IOT_SERVER || 'http://localhost:3001';

const ROUTE_COLORS: Record<string, string> = {
  ROUTE_1: '#4F46E5',
  ROUTE_2: '#0EA5E9',
  ROUTE_3: '#10B981',
  ROUTE_4: '#8B5CF6',
  ROUTE_5: '#F59E0B',
  ROUTE_6: '#EF4444',
  ROUTE_7: '#64748B',
};
const DEFAULT_COLOR = '#64748B';

export default function LiveTrackMap({ routeId }: { routeId?: string }) {
  const mapRef         = useRef<any>(null);
  const markersRef     = useRef<Record<string, any>>({});
  const polylinesRef   = useRef<any[]>([]);
  const stopMarkersRef = useRef<any[]>([]);
  const socketRef      = useRef<any>(null);
  const leafletRef     = useRef<any>(null);
  const [buses, setBuses]           = useState<any[]>([]);
  const [routes, setRoutes]         = useState<any[]>([]);
  const [selected, setSelected]     = useState<any>(null);
  const [timeline, setTimeline]     = useState<any>(null);
  const [stopPopup, setStopPopup]   = useState<{ stop: any; route: any; eta: string | null } | null>(null);
  const [showList, setShowList]     = useState(false);
  const [geofenceAlert, setGeofenceAlert] = useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import('leaflet').then(async (mod) => {
      const L = mod.default;
      leafletRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) {
        mapRef.current = L.map('map').setView([10.2167, 76.4167], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors', maxZoom: 19,
        }).addTo(mapRef.current);

        navigator.geolocation?.getCurrentPosition(
          (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true }),
          () => {}
        );
      }

      await loadRoutes(L);
      await loadBuses(L);

      // Try Socket.IO real-time connection to IoT server
      try {
        const { io } = await import('socket.io-client');
        const socket = io(IOT_SERVER, { transports: ['websocket', 'polling'], timeout: 3000 });

        socket.on('connect', () => {
          setRealtimeActive(true);
          console.log('[Socket.IO] Connected to IoT server — real-time mode');
        });
        socket.on('disconnect', () => setRealtimeActive(false));

        // Live bus location pushed from IoT server
        socket.on('busLocationUpdate', (payload: any) => {
          setBuses(prev => {
            const exists = prev.find((b: any) => b.busNumber === payload.busNumber);
            return exists
              ? prev.map((b: any) => b.busNumber === payload.busNumber ? { ...b, ...payload } : b)
              : [...prev, payload];
          });
          updateBusMarker(L, payload);
        });

        // Geofence alert — bus is near a stop
        socket.on('geofenceAlert', (alert: any) => {
          setGeofenceAlert(alert.message);
          setTimeout(() => setGeofenceAlert(null), 6000);
        });

        socketRef.current = socket;
        cleanup = () => socket.disconnect();
      } catch {
        // IoT server offline — fall back to 5s polling
        console.log('[Socket.IO] IoT server unavailable — polling fallback');
        const interval = setInterval(() => loadBuses(L), 5000);
        cleanup = () => clearInterval(interval);
      }
    });

    return () => { cleanup?.(); socketRef.current?.disconnect(); };
  }, []);

  // Update a single bus marker without re-rendering all markers
  function updateBusMarker(L: any, bus: any) {
    if (!mapRef.current) return;
    const color = bus.status === 'Active' ? (ROUTE_COLORS[bus.route] || '#F97316') : '#94A3B8';
    const icon = makeBusIcon(L, color);
    if (markersRef.current[bus.busNumber]) {
      markersRef.current[bus.busNumber].setLatLng([bus.latitude, bus.longitude]).setIcon(icon);
    } else {
      const marker = L.marker([bus.latitude, bus.longitude], { icon, zIndexOffset: 1000 }).addTo(mapRef.current);
      marker.on('click', () => selectBus(bus));
      markersRef.current[bus.busNumber] = marker;
    }
  }

  function makeBusIcon(L: any, color: string) {
    return L.divIcon({
      className: '',
      html: `<div style="background:${color};width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:18px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);">🚌</div>`,
      iconSize: [42, 42], iconAnchor: [21, 21],
    });
  }

  // Fetch road-following geometry from OSRM for a list of stops
  async function fetchRoadPolyline(stops: any[]): Promise<[number, number][]> {
    try {
      const coords = stops.map((s: any) => `${s.longitude},${s.latitude}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      }
    } catch {}
    // fallback: straight lines
    return stops.map((s: any) => [s.latitude, s.longitude]);
  }

  async function loadRoutes(L: any) {
    try {
      const res  = await fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      // Only show first 3 routes
      const routeList: any[] = (data.routes || []).filter((r: any) =>
        routeId ? r.routeId === routeId : ['ROUTE_1', 'ROUTE_2', 'ROUTE_3'].includes(r.routeId)
      );
      setRoutes(routeList);

      polylinesRef.current.forEach(p => p.remove());
      stopMarkersRef.current.forEach(m => m.remove());
      polylinesRef.current  = [];
      stopMarkersRef.current = [];

      for (const route of routeList) {
        const color = ROUTE_COLORS[route.routeId] || DEFAULT_COLOR;
        const stops: any[] = (route.stops || []).sort((a: any, b: any) => a.order - b.order);
        if (stops.length < 2) continue;

        // Get road-following polyline from OSRM
        const latlngs = await fetchRoadPolyline(stops);
        const line = L.polyline(latlngs, { color, weight: 5, opacity: 0.9 }).addTo(mapRef.current);
        polylinesRef.current.push(line);

        stops.forEach((stop: any, idx: number) => {
          const isTerminal = idx === 0 || idx === stops.length - 1;
          const stopIcon = L.divIcon({
            className: '',
            html: `<div style="width:${isTerminal ? 16 : 12}px;height:${isTerminal ? 16 : 12}px;background:${isTerminal ? color : '#fff'};border:3px solid ${color};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
            iconSize:   [isTerminal ? 16 : 12, isTerminal ? 16 : 12],
            iconAnchor: [isTerminal ? 8  : 6,  isTerminal ? 8  : 6],
          });
          const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(mapRef.current);
          marker.on('click', () => handleStopClick(stop, route));
          stopMarkersRef.current.push(marker);
        });
      }
    } catch {}
  }

  async function handleStopClick(stop: any, route: any) {
    setStopPopup({ stop, route, eta: null });
    setSelected(null); setTimeline(null);
    const activeBus = buses.find((b: any) => b.status === 'Active' && b.route === route.routeId);
    if (!activeBus) { setStopPopup({ stop, route, eta: 'No active bus on this route' }); return; }
    try {
      const res = await fetch(`/api/buses/${activeBus.busNumber}/ml-eta`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const match = (data.stops || []).find((s: any) => s.name === stop.name);
      setStopPopup({ stop, route, eta: match ? (match.status === 'passed' ? 'Bus already passed' : match.status === 'current' ? 'Bus is here now' : `ETA: ${match.etaFormatted}`) : 'ETA unavailable' });
    } catch { setStopPopup({ stop, route, eta: 'ETA unavailable' }); }
  }

  async function loadBuses(L: any) {
    try {
      const res  = await fetch('/api/buses', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const busList: any[] = (data.buses || []).filter((b: any) =>
        routeId ? b.route === routeId : true
      );
      setBuses(busList);
      busList.forEach(bus => updateBusMarker(L, bus));
    } catch {}
  }

  async function selectBus(bus: any) {
    setSelected(bus); setStopPopup(null);
    mapRef.current?.setView([bus.latitude, bus.longitude], 14, { animate: true });
    try {
      const res = await fetch(`/api/buses/${bus.busNumber}/ml-eta`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setTimeline(await res.json());
    } catch {}
  }

  function timeSince(date: Date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  const activeCnt = buses.filter((b: any) => b.status === 'Active').length;

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Back</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Live Tracking</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>
            {activeCnt} of {buses.length} buses active
            {realtimeActive && <span style={{ marginLeft: 6, color: '#86efac' }}>● Real-time</span>}
          </div>
        </div>
        <button onClick={() => setShowList(s => !s)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>List</button>
      </div>

      {/* Map */}
      <div id="map" style={{ width: '100%', height: '100vh' }} />

      {/* Geofence alert toast */}
      {geofenceAlert && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: '#1e3a8a', color: '#fff', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: 340, textAlign: 'center' }}>
          {geofenceAlert}
        </div>
      )}

      {/* Route legend */}
      <div style={{ position: 'fixed', top: 80, left: 16, zIndex: 998, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 15px rgba(0,0,0,0.12)', fontSize: 12 }}>
        {routes.map(r => (
          <div key={r.routeId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 24, height: 4, borderRadius: 2, background: ROUTE_COLORS[r.routeId] || DEFAULT_COLOR }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.routeId.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Bus list panel */}
      {showList && (
        <div style={{ position: 'fixed', top: 70, right: 0, width: 260, maxHeight: 'calc(100vh - 80px)', background: '#fff', borderRadius: '16px 0 0 16px', boxShadow: '-4px 0 20px rgba(0,0,0,0.12)', zIndex: 999, overflowY: 'auto' }}>
          <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>All Buses</span>
            <button onClick={() => setShowList(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>x</button>
          </div>
          {buses.map((bus: any) => (
            <div key={bus.busNumber} onClick={() => { selectBus(bus); setShowList(false); }} style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{bus.status === 'Active' ? 'ON' : 'OFF'} {bus.busNumber}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{bus.route}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stop popup */}
      {stopPopup && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.18)', zIndex: 999, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Stop: {stopPopup.stop.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{stopPopup.route.name}</div>
              <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4F46E5', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 700 }}>
                {stopPopup.eta === null ? 'Calculating...' : stopPopup.eta}
              </div>
            </div>
            <button onClick={() => setStopPopup(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>x</button>
          </div>
        </div>
      )}

      {/* Selected bus card */}
      {selected && !stopPopup && (
        <div style={{ position: 'fixed', bottom: timeline ? 320 : 20, left: 16, right: 16, maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.18)', zIndex: 999, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a' }}>{selected.busNumber}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: selected.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: selected.status === 'Active' ? '#065F46' : '#991B1B' }}>{selected.status}</span>
              <button onClick={() => { setSelected(null); setTimeline(null); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>x</button>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>{selected.route}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Speed</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{selected.speed || 0} km/h</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Updated</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{selected.lastUpdate ? timeSince(new Date(selected.lastUpdate)) : 'never'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ML Timeline */}
      {timeline && selected && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.18)', zIndex: 999, padding: 20, maxHeight: 300, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Route Timeline</div>
            <button onClick={() => setTimeline(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>x</button>
          </div>
          {timeline.stops?.map((stop: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: stop.status === 'passed' ? '#22C55E' : stop.status === 'current' ? '#4F46E5' : '#CBD5E1' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: stop.status === 'current' ? '#4F46E5' : stop.status === 'passed' ? '#94a3b8' : '#1e293b' }}>{stop.name}</div>
                  {stop.status === 'upcoming' && stop.confidence && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{stop.confidence}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>{stop.etaFormatted}</div>
                {stop.arrivalTime && stop.arrivalTime !== 'passed' && <div style={{ fontSize: 10, color: '#94a3b8' }}>{stop.arrivalTime}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
