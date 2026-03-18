'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getToken } from '@/hooks/useAuth';
import Toast from '@/components/Toast';

export default function OperatorDashboard() {
  useAuth('operator');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('bus_tracker_user');
    if (u) setUser(JSON.parse(u));
    // Auto-request location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => startTracking(),
        () => setToast({ msg: 'Location permission denied. Enable GPS to track.', type: 'error' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  function startTracking() {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        setLocation({ latitude, longitude, speed: speed ? (speed * 3.6).toFixed(1) : 0, heading: heading || 0 });
        setTracking(true);
        try {
          await fetch('/api/hardware/location', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ busId: user?.busNumber || 'UNKNOWN', latitude, longitude, speed: speed ? speed * 3.6 : 0, heading: heading || 0 }),
          });
        } catch {}
      },
      (err) => setToast({ msg: 'GPS error: ' + err.message, type: 'error' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function stopTracking() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTracking(false);
  }

  function logout() {
    stopTracking();
    localStorage.clear();
    router.push('/operator/login');
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div style={{ background: 'linear-gradient(150deg, #FED7AA 0%, #FB923C 60%, #F97316 100%)', padding: '40px 24px 48px' }}>
        <div style={{ fontSize: 13, color: '#9A3412', fontWeight: 600, marginBottom: 4 }}>Driver Portal 🚍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#7C2D12' }}>{user?.name || 'Driver'}</div>
        <div style={{ fontSize: 13, color: '#9A3412', marginTop: 2 }}>Bus: {user?.busNumber || '--'} · Route: {user?.route || '--'}</div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px 32px', background: '#fff', borderRadius: '24px 24px 0 0', marginTop: -18, position: 'relative', zIndex: 2 }}>

        {/* Status Card */}
        <p className="sec-label">Tracking Status</p>
        <div style={{ background: tracking ? '#F0FDF4' : 'var(--orange-bg)', border: `2px solid ${tracking ? '#22C55E' : 'var(--orange)'}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Phone GPS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '6px 0' }}>
            {tracking ? '🟢 Tracking Active' : '⚪ Not Started'}
          </div>
          {location && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)} · {location.speed} km/h
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {!tracking ? (
            <button className="btn btn-primary btn-full" onClick={startTracking}>▶ Start Tracking</button>
          ) : (
            <button className="btn btn-full" style={{ background: 'var(--red)', color: '#fff' }} onClick={stopTracking}>■ Stop Tracking</button>
          )}
        </div>

        {/* Live Data */}
        <p className="sec-label">Live GPS Data</p>
        <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          {[
            { label: 'Latitude',  val: location?.latitude?.toFixed(6) || '--' },
            { label: 'Longitude', val: location?.longitude?.toFixed(6) || '--' },
            { label: 'Speed',     val: location ? `${location.speed} km/h` : '--' },
            { label: 'Updated',   val: location ? new Date().toLocaleTimeString() : '--' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontWeight: 700 }}>{row.val}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary btn-full" onClick={logout}>🚪 Logout</button>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
