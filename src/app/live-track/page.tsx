'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth, getToken } from '@/hooks/useAuth';

const LiveTrackMap = dynamic(() => import('@/components/LiveTrackMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 4 }} />
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading map...</div>
    </div>
  ),
});

export default function LiveTrackPage() {
  useAuth();
  const router = useRouter();
  const [buses, setBuses]       = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [showMap, setShowMap]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    loadBuses();
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadBuses() {
    try {
      const res  = await fetch('/api/buses', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setBuses(data.buses || []);
    } catch {}
  }

  async function selectBus(bus: any) {
    setSelected(bus);
    setTimeline(null);
    setLoading(true);
    clearInterval(intervalRef.current);
    await fetchTimeline(bus.busNumber);
    // Refresh every 15s
    intervalRef.current = setInterval(() => fetchTimeline(bus.busNumber), 15000);
  }

  async function fetchTimeline(busNumber: string) {
    try {
      const res  = await fetch(`/api/buses/${busNumber}/ml-eta`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setTimeline(await res.json());
    } catch {}
    setLoading(false);
  }

  function timeSince(date: Date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  const activeBuses = buses.filter(b => b.status === 'Active');

  // ── Map view ──────────────────────────────────────────────────────────────
  if (showMap) {
    return (
      <div style={{ position: 'relative', height: '100vh' }}>
        <button onClick={() => setShowMap(false)} style={{
          position: 'fixed', top: 16, left: 16, zIndex: 1100,
          background: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 16px', fontWeight: 700, fontSize: 13,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
        }}>← Timeline</button>
        <LiveTrackMap />
      </div>
    );
  }

  // ── Timeline view ─────────────────────────────────────────────────────────
  return (
    <div className="page-shell" style={{ background: '#F1F5F9' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', color: '#fff', padding: '0 0 0 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {selected ? `${selected.busNumber} · ${timeline?.routeName || selected.route}` : 'Live Bus Tracker'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>
              {selected
                ? `${timeline?.currentStop || '—'} · Updated ${selected.lastUpdate ? timeSince(new Date(selected.lastUpdate)) : '—'}`
                : `${activeBuses.length} bus${activeBuses.length !== 1 ? 'es' : ''} active`}
            </div>
          </div>
          <button onClick={() => setShowMap(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>🗺️ Map</button>
        </div>

        {/* Bus selector tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', overflowX: 'auto' }}>
          {buses.map(bus => {
            const isActive = bus.status === 'Active';
            const isSel    = selected?.busNumber === bus.busNumber;
            return (
              <button key={bus.busNumber} onClick={() => selectBus(bus)} style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: isSel ? '#fff' : isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                color: isSel ? '#1e3a8a' : '#fff',
                boxShadow: isSel ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}>
                {isActive ? '🟢' : '🔴'} {bus.busNumber}
              </button>
            );
          })}
          {buses.length === 0 && <div style={{ fontSize: 12, opacity: 0.6, padding: '7px 0' }}>No buses registered</div>}
        </div>
      </div>

      {/* No bus selected */}
      {!selected && (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🚌</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Select a bus above</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Tap any bus to see its live stop-by-stop timeline</div>
        </div>
      )}

      {/* Loading */}
      {selected && loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, flexDirection: 'column', gap: 10 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'rgba(30,58,138,0.2)', borderTopColor: '#1e3a8a' }} />
          <div style={{ fontSize: 13, color: '#64748b' }}>Fetching timeline...</div>
        </div>
      )}

      {/* Timeline */}
      {selected && timeline && !loading && (
        <div style={{ padding: '0 0 40px' }}>

          {/* Bus status bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{timeline.routeName}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Currently at: <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{timeline.currentStop}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: selected.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                color: selected.status === 'Active' ? '#065F46' : '#991B1B',
              }}>{selected.status === 'Active' ? '● Live' : '● Offline'}</span>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{selected.speed || 0} km/h</div>
              {timeline.delayMinutes !== 0 && timeline.delayMinutes !== undefined && (
                <div style={{
                  marginTop: 4, fontSize: 11, fontWeight: 700,
                  color: timeline.delayMinutes > 0 ? '#b45309' : '#065f46',
                }}>
                  {timeline.delayMinutes > 0
                    ? `⚠ ${timeline.delayMinutes} min late`
                    : `✓ ${Math.abs(timeline.delayMinutes)} min early`}
                </div>
              )}
            </div>
          </div>

          {/* Stop timeline — WIMT style */}
          <div style={{ background: '#fff', margin: '12px 0 0' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 72px', padding: '8px 16px', background: '#1e3a8a', color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Arrival</span>
              <span style={{ textAlign: 'center' }}>Stop</span>
              <span style={{ textAlign: 'right' }}>ETA</span>
            </div>

            {(timeline.stops || []).map((stop: any, i: number) => {
              const isPassed  = stop.status === 'passed';
              const isCurrent = stop.status === 'current';
              const isUpcoming= stop.status === 'upcoming';

              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '72px 1fr 72px',
                  alignItems: 'center',
                  padding: '0 16px',
                  background: isCurrent ? '#EFF6FF' : '#fff',
                  borderBottom: '1px solid #f1f5f9',
                  minHeight: 72,
                  position: 'relative',
                }}>
                  {/* Left: arrival time */}
                  <div style={{ paddingRight: 8 }}>
                    {stop.arrivalTime && stop.arrivalTime !== '—' ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isPassed ? '#94a3b8' : '#1e293b' }}>{stop.arrivalTime}</div>
                        {stop.confidence && (
                          <div style={{ fontSize: 10, color: stop.confidence === 'scheduled' ? '#6366f1' : '#94a3b8', marginTop: 1 }}>
                            {stop.confidence === 'scheduled' ? 'scheduled' : stop.confidence}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: '#cbd5e1' }}>—</div>
                    )}
                  </div>

                  {/* Center: vertical line + dot + stop name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
                    {/* Line + dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, alignSelf: 'stretch', justifyContent: 'center', position: 'relative' }}>
                      {/* Top line */}
                      {i > 0 && <div style={{ width: 2, flex: 1, background: isPassed ? '#93C5FD' : '#e2e8f0', position: 'absolute', top: 0, bottom: '50%' }} />}
                      {/* Dot */}
                      <div style={{
                        width: isCurrent ? 18 : 12, height: isCurrent ? 18 : 12,
                        borderRadius: '50%', zIndex: 1, flexShrink: 0,
                        background: isCurrent ? '#1e3a8a' : isPassed ? '#93C5FD' : '#e2e8f0',
                        border: isCurrent ? '3px solid #fff' : isPassed ? '2px solid #93C5FD' : '2px solid #cbd5e1',
                        boxShadow: isCurrent ? '0 0 0 3px rgba(30,58,138,0.25)' : 'none',
                      }} />
                      {/* Bottom line */}
                      {i < (timeline.stops?.length - 1) && <div style={{ width: 2, flex: 1, background: isPassed ? '#93C5FD' : '#e2e8f0', position: 'absolute', top: '50%', bottom: 0 }} />}
                    </div>

                    {/* Stop info */}
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? '#1e3a8a' : isPassed ? '#94a3b8' : '#1e293b',
                      }}>{stop.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {stop.expectedTime === 0 ? 'Start' : `+${stop.expectedTime} min from start`}
                      </div>
                      {isCurrent && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: '#1e3a8a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                          🚌 Bus is here
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: ETA */}
                  <div style={{ textAlign: 'right' }}>
                    {isPassed ? (
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Passed</div>
                    ) : isCurrent ? (
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a' }}>Here</div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>{stop.etaFormatted}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Last updated footer */}
          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, color: '#94a3b8' }}>
            Updated {selected.lastUpdate ? timeSince(new Date(selected.lastUpdate)) : '—'} ·{' '}
            <span style={{ color: '#1e40af', cursor: 'pointer', fontWeight: 600 }} onClick={() => selectBus(selected)}>Refresh ↻</span>
          </div>
        </div>
      )}
    </div>
  );
}
