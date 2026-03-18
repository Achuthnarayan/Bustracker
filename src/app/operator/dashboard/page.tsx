'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
      <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', padding: '32px 24px 40px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 6 }}>Driver Portal 🚍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{user?.name || 'Driver'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Bus: {user?.busNumber || '--'} · Route: {user?.route || '--'}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {tracking ? '🟢 Live' : '⚪ Offline'}
          </div>
          {location && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
              {location.speed} km/h
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 40px', background: 'var(--bg)' }}>

        {/* Status Card */}
        <p className="sec-label">Tracking Status</p>
        <div style={{
          background: tracking ? '#F0FDF4' : '#fff',
          border: `1.5px solid ${tracking ? '#10B981' : 'var(--border)'}`,
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Phone GPS</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            {tracking ? '🟢 Tracking Active' : '⚪ Not Started'}
          </div>
          {location && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginBottom: 24 }}>
          {!tracking ? (
            <button className="btn btn-primary" onClick={startTracking}>▶ Start Tracking</button>
          ) : (
            <button className="btn" style={{ background: 'var(--red)', color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }} onClick={stopTracking}>■ Stop Tracking</button>
          )}
        </div>

        {/* Live Data */}
        <p className="sec-label">Live GPS Data</p>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          {[
            { label: 'Latitude',  val: location?.latitude?.toFixed(6) || '--' },
            { label: 'Longitude', val: location?.longitude?.toFixed(6) || '--' },
            { label: 'Speed',     val: location ? `${location.speed} km/h` : '--' },
            { label: 'Updated',   val: location ? new Date().toLocaleTimeString() : '--' },
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

        <button className="btn btn-secondary" onClick={logout}>🚪 Logout</button>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
