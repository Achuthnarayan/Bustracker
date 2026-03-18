'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getToken } from '@/hooks/useAuth';
import Toast from '@/components/Toast';

type TripState = 'idle' | 'active' | 'ended';

const ROUTE_NAMES: Record<string, string> = {
  ROUTE_A: 'Route A – Kaloor → SCMS Karukutty',
  ROUTE_B: 'Route B – Thrissur → SCMS Karukutty',
};

export default function OperatorDashboard() {
  useAuth('operator');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tripState, setTripState] = useState<TripState>('idle');
  const [location, setLocation] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('bus_tracker_user');
    if (u) setUser(JSON.parse(u));
    return () => stopGPS();
  }, []);

  // ── GPS helpers ────────────────────────────────────────────────────────────
  function startGPS(busNumber: string) {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const kmh = speed ? +(speed * 3.6).toFixed(1) : 0;
        setLocation({ latitude, longitude, speed: kmh, heading: heading || 0, updatedAt: new Date() });
        fetch('/api/hardware/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ busId: busNumber, latitude, longitude, speed: kmh, heading: heading || 0 }),
        }).catch(() => {});
      },
      (err) => setToast({ msg: 'GPS error: ' + err.message, type: 'error' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function stopGPS() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }

  // ── Trip actions ───────────────────────────────────────────────────────────
  async function handleStartTrip() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/operator/start-trip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTripState('active');
      setToast({ msg: `Trip started — ${data.busNumber} on ${ROUTE_NAMES[data.route] || data.route}`, type: 'success' });
      // Request GPS permission then start watching
      navigator.geolocation.getCurrentPosition(
        () => startGPS(data.busNumber),
        () => setToast({ msg: 'Location permission denied. Enable GPS.', type: 'error' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to start trip', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEndTrip() {
    setActionLoading(true);
    stopGPS();
    try {
      const res = await fetch('/api/operator/end-trip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTripState('ended');
      setLocation(null);
      setToast({ msg: 'Trip ended. Bus marked offline.', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to end trip', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  function logout() {
    stopGPS();
    if (tripState === 'active') {
      fetch('/api/operator/end-trip', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => {});
    }
    localStorage.clear();
    router.push('/operator/login');
  }

  const routeLabel = ROUTE_NAMES[user?.route] || user?.route || '--';

  return (
    <div className="page-shell">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', padding: '32px 24px 40px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>Driver Portal 🚍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{user?.name || 'Driver'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>SCMS School of Engineering and Technology</div>

        {/* Bus + Route chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            🚌 {user?.busNumber || '--'}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            🗺️ {user?.route || '--'}
          </div>
          <div style={{
            background: tripState === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600,
          }}>
            {tripState === 'active' ? '🟢 Live' : tripState === 'ended' ? '🔴 Ended' : '⚪ Idle'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 40px', background: 'var(--bg)' }}>

        {/* Assigned Bus Info */}
        <p className="sec-label">Assigned Bus & Route</p>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { label: 'Bus Number', val: user?.busNumber || '--' },
            { label: 'Route',      val: user?.route || '--' },
            { label: 'Route Name', val: routeLabel },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', fontSize: 14,
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right', fontSize: 13 }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Trip Control */}
        <p className="sec-label">Trip Control</p>
        {tripState === 'idle' && (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Ready to start?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
              Pressing Start Trip will mark <strong>{user?.busNumber}</strong> as Active on <strong>{user?.route}</strong> and begin sharing your GPS location with students.
            </div>
            <button className="btn btn-primary" disabled={actionLoading} onClick={handleStartTrip}>
              {actionLoading ? <><span className="spinner" /> Starting...</> : '▶ Start Trip'}
            </button>
          </div>
        )}

        {tripState === 'active' && (
          <>
            <div style={{ background: '#F0FDF4', border: '1.5px solid #10B981', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>🟢 Trip in Progress</div>
              <div style={{ fontSize: 13, color: '#047857', marginBottom: 12 }}>
                Broadcasting live GPS for <strong>{user?.busNumber}</strong>
              </div>
              {location && (
                <div style={{ fontSize: 12, color: '#065F46', fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                  {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)} · {location.speed} km/h
                </div>
              )}
            </div>
            <button className="btn" style={{ background: 'var(--red)', color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.2)', marginBottom: 20 }}
              disabled={actionLoading} onClick={handleEndTrip}>
              {actionLoading ? <><span className="spinner" /> Ending...</> : '■ End Trip'}
            </button>
          </>
        )}

        {tripState === 'ended' && (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Trip Completed</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>Bus has been marked offline.</div>
            <button className="btn btn-primary" onClick={() => setTripState('idle')}>Start New Trip</button>
          </div>
        )}

        {/* Live GPS Data — only when active */}
        {tripState === 'active' && (
          <>
            <p className="sec-label">Live GPS Data</p>
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              {[
                { label: 'Latitude',  val: location?.latitude?.toFixed(6)  || 'Waiting...' },
                { label: 'Longitude', val: location?.longitude?.toFixed(6) || 'Waiting...' },
                { label: 'Speed',     val: location ? `${location.speed} km/h` : 'Waiting...' },
                { label: 'Updated',   val: location?.updatedAt ? new Date(location.updatedAt).toLocaleTimeString() : '--' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '14px 18px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14,
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn btn-secondary" onClick={logout}>🚪 Logout</button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
