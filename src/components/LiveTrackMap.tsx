'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/hooks/useAuth';
import 'leaflet/dist/leaflet.css';

export default function LiveTrackMap() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [buses, setBuses] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [showList, setShowList] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let L: any;
    import('leaflet').then(mod => {
      L = mod.default;
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

      if (!mapRef.current) {
        mapRef.current = L.map('map').setView([12.9716, 77.5946], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(mapRef.current);
      }
      loadBuses(L);
      const interval = setInterval(() => loadBuses(L), 5000);
      return () => clearInterval(interval);
    });
  }, []);

  async function loadBuses(L: any) {
    try {
      const res = await fetch('/api/buses', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const busList: any[] = data.buses || [];
      setBuses(busList);

      busList.forEach(bus => {
        const isActive = bus.status === 'Active';
        const color = isActive ? '#F97316' : '#94A3B8';
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:11px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${bus.busNumber}</div>`,
          iconSize: [40, 40], iconAnchor: [20, 20],
        });
        if (markersRef.current[bus.busNumber]) {
          markersRef.current[bus.busNumber].setLatLng([bus.latitude, bus.longitude]).setIcon(icon);
        } else {
          const marker = L.marker([bus.latitude, bus.longitude], { icon }).addTo(mapRef.current);
          marker.on('click', () => selectBus(bus));
          markersRef.current[bus.busNumber] = marker;
        }
      });
    } catch {}
  }

  async function selectBus(bus: any) {
    setSelected(bus);
    mapRef.current?.setView([bus.latitude, bus.longitude], 16, { animate: true });
    try {
      const res = await fetch(`/api/buses/${bus.busNumber}/ml-eta`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setTimeline(await res.json());
    } catch {}
  }

  function timeSince(date: Date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 10) return 'just now'; if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`; return `${Math.floor(s / 3600)}h ago`;
  }

  const activeCnt = buses.filter(b => b.status === 'Active').length;

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'linear-gradient(135deg,#5b8fd6,#7c8fe6)', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>← Back</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>🚌 Live Tracking</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{activeCnt} of {buses.length} buses active</div>
        </div>
        <button onClick={() => loadBuses(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>🔄</button>
      </div>

      {/* Map */}
      <div id="map" style={{ width: '100%', height: '100vh' }} />

      {/* Bus list toggle */}
      <button onClick={() => setShowList(s => !s)} style={{ position: 'fixed', top: 160, right: 20, background: '#fff', border: 'none', padding: '12px 16px', borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 998, fontWeight: 600, color: '#5b8fd6', fontSize: 14 }}>
        📋 All Buses
      </button>

      {/* Bus list panel */}
      {showList && (
        <div style={{ position: 'fixed', top: 80, right: 20, width: 280, maxHeight: 'calc(100vh - 120px)', background: '#fff', borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 999, overflowY: 'auto' }}>
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#5b8fd6,#7c8fe6)', color: '#fff', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>All Buses</span>
            <button onClick={() => setShowList(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          {buses.map(bus => (
            <div key={bus.busNumber} onClick={() => { selectBus(bus); setShowList(false); }} style={{ padding: '14px 20px', borderBottom: '1px solid #e0e7ff', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 3 }}>{bus.status === 'Active' ? '🟢' : '🔴'} {bus.busNumber}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{bus.route}</div>
            </div>
          ))}
        </div>
      )}

      {/* Selected bus card */}
      {selected && (
        <div style={{ position: 'fixed', bottom: timeline ? 320 : 20, left: 20, right: 20, maxWidth: 400, background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 999, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>{selected.busNumber}</div>
            <span className={`badge ${selected.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{selected.status}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>{selected.route}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid #e0e7ff' }}>
            <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Speed</div><div style={{ fontSize: 16, fontWeight: 700 }}>{selected.speed || 0} km/h</div></div>
            <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Updated</div><div style={{ fontSize: 16, fontWeight: 700 }}>{selected.lastUpdate ? timeSince(new Date(selected.lastUpdate)) : '—'}</div></div>
          </div>
        </div>
      )}

      {/* ML Timeline */}
      {timeline && (
        <div style={{ position: 'fixed', bottom: 20, left: 20, right: 20, maxWidth: 400, background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 999, padding: 20, maxHeight: 300, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Route Timeline</div>
            <button onClick={() => setTimeline(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
          </div>
          {timeline.stops?.map((stop: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: stop.status === 'passed' ? '#22C55E' : stop.status === 'current' ? '#F97316' : '#CBD5E1', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: stop.status === 'current' ? '#F97316' : stop.status === 'passed' ? '#94a3b8' : '#1e293b' }}>{stop.name}</div>
                  {stop.status === 'upcoming' && stop.confidence && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>🤖 {stop.confidence} confidence</div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5b8fd6' }}>{stop.etaFormatted}</div>
                {stop.arrivalTime && stop.arrivalTime !== '—' && <div style={{ fontSize: 10, color: '#94a3b8' }}>~{stop.arrivalTime}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
