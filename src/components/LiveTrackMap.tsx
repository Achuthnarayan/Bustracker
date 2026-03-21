'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/hooks/useAuth';
import 'leaflet/dist/leaflet.css';

const IOT_SERVER = process.env.NEXT_PUBLIC_IOT_SERVER || 'http://localhost:3001';

const ROUTE_COLORS: Record<string, string> = {
  ROUTE_1: '#4F46E5', ROUTE_2: '#0EA5E9', ROUTE_3: '#10B981',
  ROUTE_4: '#8B5CF6', ROUTE_5: '#F59E0B', ROUTE_6: '#EF4444', ROUTE_7: '#64748B',
};
const DEFAULT_COLOR = '#64748B';

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveTrackMap({ routeId }: { routeId?: string }) {
  const mapRef          = useRef<any>(null);
  const markersRef      = useRef<Record<string, any>>({});
  const polylinesRef    = useRef<any[]>([]);
  const stopMarkersRef  = useRef<any[]>([]);
  const userMarkerRef   = useRef<any>(null);
  const userCircleRef   = useRef<any>(null);
  const socketRef       = useRef<any>(null);
  const leafletRef      = useRef<any>(null);
  const pollRef         = useRef<any>(null);
  const geoWatchRef     = useRef<any>(null);

  const [buses, setBuses]         = useState<any[]>([]);
  const [routes, setRoutes]       = useState<any[]>([]);
  const [selected, setSelected]   = useState<any>(null);
  const [timeline, setTimeline]   = useState<any>(null);
  const [stopPopup, setStopPopup] = useState<{ stop: any; route: any; eta: string | null } | null>(null);
  const [userPos, setUserPos]     = useState<{ lat: number; lng: number } | null>(null);
  const [busDistKm, setBusDistKm] = useState<number | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [geofenceAlert, setGeofenceAlert]   = useState<string | null>(null);
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
        mapRef.current = L.map('map').setView([10.2167, 76.4167], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors', maxZoom: 19,
        }).addTo(mapRef.current);
      }

      await loadRoutes(L);
      await loadBuses(L);

      // Poll bus location every 5s (ESP32 updates via /api/hardware/location)
      pollRef.current = setInterval(() => loadBuses(L), 5000);

      // Watch user's GPS location
      if (navigator.geolocation) {
        geoWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setUserPos({ lat: latitude, lng: longitude });
            updateUserMarker(L, latitude, longitude, accuracy);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      }

      // Try Socket.IO for real-time push from IoT server
      try {
        const { io } = await import('socket.io-client');
        const socket = io(IOT_SERVER, { transports: ['websocket', 'polling'], timeout: 3000 });
        socket.on('connect', () => { setRealtimeActive(true); clearInterval(pollRef.current); });
        socket.on('disconnect', () => {
          setRealtimeActive(false);
          pollRef.current = setInterval(() => loadBuses(L), 5000);
        });
        socket.on('busLocationUpdate', (payload: any) => {
          setBuses(prev => {
            const updated = prev.find((b: any) => b.busNumber === payload.busNumber)
              ? prev.map((b: any) => b.busNumber === payload.busNumber ? { ...b, ...payload } : b)
              : [...prev, payload];
            return updated;
          });
          updateBusMarker(L, payload);
        });
        socket.on('geofenceAlert', (alert: any) => {
          setGeofenceAlert(alert.message);
          setTimeout(() => setGeofenceAlert(null), 6000);
        });
        socketRef.current = socket;
        cleanup = () => socket.disconnect();
      } catch {
        cleanup = () => {};
      }
    });

    return () => {
      cleanup?.();
      clearInterval(pollRef.current);
      if (geoWatchRef.current) navigator.geolocation?.clearWatch(geoWatchRef.current);
    };
  }, []);

  // Recalculate distance when user position or selected bus changes
  useEffect(() => {
    if (userPos && selected?.latitude && selected?.longitude) {
      setBusDistKm(haversineDist(userPos.lat, userPos.lng, selected.latitude, selected.longitude));
    } else {
      setBusDistKm(null);
    }
  }, [userPos, selected]);

  function updateUserMarker(L: any, lat: number, lng: number, accuracy: number) {
    if (!mapRef.current) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;background:#2563EB;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.3);"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9],
    });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userCircleRef.current?.setLatLng([lat, lng]).setRadius(accuracy);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 2000 })
        .bindTooltip('You are here', { permanent: false, direction: 'top' })
        .addTo(mapRef.current);
      userCircleRef.current = L.circle([lat, lng], {
        radius: accuracy, color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.08, weight: 1,
      }).addTo(mapRef.current);
    }
  }

  function updateBusMarker(L: any, bus: any) {
    if (!mapRef.current) return;
    const color = bus.status === 'Active' ? (ROUTE_COLORS[bus.route] || '#F97316') : '#94A3B8';
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);">🚌</div>`,
      iconSize: [44, 44], iconAnchor: [22, 22],
    });
    if (markersRef.current[bus.busNumber]) {
      markersRef.current[bus.busNumber].setLatLng([bus.latitude, bus.longitude]).setIcon(icon);
    } else {
      const marker = L.marker([bus.latitude, bus.longitude], { icon, zIndexOffset: 1000 }).addTo(mapRef.current);
      marker.on('click', () => selectBus(bus));
      markersRef.current[bus.busNumber] = marker;
    }
    // Update selected bus state so distance recalculates
    setSelected((prev: any) => prev?.busNumber === bus.busNumber ? { ...prev, ...bus } : prev);
  }

  async function fetchRoadPolyline(stops: any[]): Promise<[number, number][]> {
    try {
      const coords = stops.map((s: any) => `${s.longitude},${s.latitude}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      }
    } catch {}
    return stops.map((s: any) => [s.latitude, s.longitude]);
  }

  async function loadRoutes(L: any) {
    try {
      const res = await fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const routeList: any[] = (data.routes || []).filter((r: any) =>
        routeId ? r.routeId === routeId : ['ROUTE_1', 'ROUTE_2', 'ROUTE_3'].includes(r.routeId)
      );
      setRoutes(routeList);

      polylinesRef.current.forEach(p => p.remove());
      stopMarkersRef.current.forEach(m => m.remove());
      polylinesRef.current = [];
      stopMarkersRef.current = [];

      for (const route of routeList) {
        const color = ROUTE_COLORS[route.routeId] || DEFAULT_COLOR;
        const stops: any[] = (route.stops || []).sort((a: any, b: any) => a.order - b.order);
        if (stops.length < 2) continue;

        const latlngs = await fetchRoadPolyline(stops);
        const line = L.polyline(latlngs, { color, weight: 5, opacity: 0.9 }).addTo(mapRef.current);
        polylinesRef.current.push(line);

        // Fit map to this route if routeId is specified
        if (routeId) mapRef.current.fitBounds(line.getBounds(), { padding: [60, 60] });

        stops.forEach((stop: any, idx: number) => {
          const isTerminal = idx === 0 || idx === stops.length - 1;
          const stopIcon = L.divIcon({
            className: '',
            html: `<div style="width:${isTerminal ? 16 : 11}px;height:${isTerminal ? 16 : 11}px;background:${isTerminal ? color : '#fff'};border:3px solid ${color};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
            iconSize:   [isTerminal ? 16 : 11, isTerminal ? 16 : 11],
            iconAnchor: [isTerminal ? 8  : 5,  isTerminal ? 8  : 5],
          });
          const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(mapRef.current);
          marker.bindTooltip(stop.name, { permanent: false, direction: 'top', offset: [0, -8] });
          marker.on('click', () => handleStopClick(stop, route));
          stopMarkersRef.current.push(marker);
        });
      }
    } catch {}
  }

  async function loadBuses(L: any) {
    try {
      const res = await fetch('/api/buses', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const busList: any[] = (data.buses || []).filter((b: any) =>
        routeId ? b.route === routeId : true
      );
      setBuses(busList);
      busList.forEach(bus => updateBusMarker(L, bus));
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
      const d = await res.json();
      const match = (d.stops || []).find((s: any) => s.name === stop.name);
      setStopPopup({ stop, route, eta: match ? (match.status === 'passed' ? 'Bus already passed' : match.status === 'current' ? 'Bus is here now' : `ETA: ${match.etaFormatted}`) : 'ETA unavailable' });
    } catch { setStopPopup({ stop, route, eta: 'ETA unavailable' }); }
  }

  async function selectBus(bus: any) {
    setSelected(bus); setStopPopup(null);
    mapRef.current?.setView([bus.latitude, bus.longitude], 14, { animate: true });
    try {
      const res = await fetch(`/api/buses/${bus.busNumber}/ml-eta`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setTimeline(await res.json());
    } catch {}
  }

  function centerOnUser() {
    if (userPos) mapRef.current?.setView([userPos.lat, userPos.lng], 15, { animate: true });
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>← Back</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Live Tracking</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            {activeCnt > 0 ? `${activeCnt} bus active` : 'No active buses'}
            {realtimeActive && <span style={{ marginLeft: 6, color: '#86efac' }}>● Live</span>}
            {!realtimeActive && <span style={{ marginLeft: 6, color: '#fde68a' }}>● Polling 5s</span>}
          </div>
        </div>
        {/* Center on user button */}
        <button onClick={centerOnUser} style={{ background: userPos ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          📍 Me
        </button>
      </div>

      {/* Map */}
      <div id="map" style={{ width: '100%', height: '100vh' }} />

      {/* Geofence alert */}
      {geofenceAlert && (
        <div style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: '#1e3a8a', color: '#fff', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: 320, textAlign: 'center' }}>
          {geofenceAlert}
        </div>
      )}

      {/* Route legend (only when showing multiple routes) */}
      {!routeId && (
        <div style={{ position: 'fixed', top: 72, left: 12, zIndex: 998, background: '#fff', borderRadius: 10, padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontSize: 12 }}>
          {routes.map(r => (
            <div key={r.routeId} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{ width: 20, height: 4, borderRadius: 2, background: ROUTE_COLORS[r.routeId] || DEFAULT_COLOR }} />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.name?.split('–')[0]?.trim()}</span>
            </div>
          ))}
        </div>
      )}

      {/* User location status */}
      <div style={{ position: 'fixed', bottom: selected || stopPopup ? 180 : 24, right: 12, zIndex: 998, background: '#fff', borderRadius: 10, padding: '8px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: userPos ? '#2563EB' : '#94a3b8', boxShadow: userPos ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none' }} />
        <span style={{ color: '#1e293b', fontWeight: 600 }}>{userPos ? 'Location active' : 'Location off'}</span>
      </div>

      {/* Stop popup */}
      {stopPopup && (
        <div style={{ position: 'fixed', bottom: 20, left: 12, right: 12, maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.18)', zIndex: 999, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{stopPopup.stop.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{stopPopup.route.name}</div>
              <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4F46E5', borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 700 }}>
                {stopPopup.eta === null ? 'Calculating...' : stopPopup.eta}
              </div>
            </div>
            <button onClick={() => setStopPopup(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>
        </div>
      )}

      {/* Selected bus card */}
      {selected && !stopPopup && (
        <div style={{ position: 'fixed', bottom: 20, left: 12, right: 12, maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.18)', zIndex: 999, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a' }}>{selected.busNumber}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: selected.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: selected.status === 'Active' ? '#065F46' : '#991B1B' }}>{selected.status}</span>
              <button onClick={() => { setSelected(null); setTimeline(null); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Speed</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{selected.speed || 0} km/h</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Updated</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{selected.lastUpdate ? timeSince(new Date(selected.lastUpdate)) : '—'}</div>
            </div>
            <div style={{ background: busDistKm !== null ? '#EEF2FF' : '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>From you</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: busDistKm !== null ? '#4F46E5' : '#94a3b8' }}>
                {busDistKm !== null ? (busDistKm < 1 ? `${Math.round(busDistKm * 1000)}m` : `${busDistKm.toFixed(1)}km`) : '—'}
              </div>
            </div>
          </div>
          {timeline && (
            <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
              {timeline.stops?.map((stop: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: stop.status === 'passed' ? '#22C55E' : stop.status === 'current' ? '#4F46E5' : '#CBD5E1' }} />
                    <span style={{ color: stop.status === 'passed' ? '#94a3b8' : '#1e293b', fontWeight: stop.status === 'current' ? 700 : 500 }}>{stop.name}</span>
                  </div>
                  <span style={{ color: '#4F46E5', fontWeight: 700 }}>{stop.status === 'passed' ? 'Passed' : stop.etaFormatted}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
