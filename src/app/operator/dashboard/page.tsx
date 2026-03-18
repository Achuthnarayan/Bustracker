'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getToken } from '@/hooks/useAuth';
import Toast from '@/components/Toast';

type TripState = 'idle' | 'active' | 'ended';
type TripType = 'morning' | 'evening';

function getISTMinutes(): number {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

function minutesUntil(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const earliest = h * 60 + m - 15;
  return Math.max(0, earliest - getISTMinutes());
}

function fmtCountdown(min: number): string {
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function TripCard({ label, subtitle, locked, wait, scheduledTime, earliestTime, loading, onStart, color, bgColor, borderColor }: {
  label: string; subtitle: string; locked: boolean; wait: number;
  scheduledTime: string; earliestTime: string; loading: boolean;
  onStart: () => void; color: string; bgColor: string; borderColor: string;
}) {
  return (
    <div style={{ background: bgColor, border: `1.5px solid ${locked ? '#FCA5A5' : borderColor}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{subtitle}</div>
      {locked && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#991B1B' }}>
          <div style={{ fontWeight: 700 }}>Scheduled: {scheduledTime}</div>
          <div>Earliest start: <strong>{earliestTime}</strong></div>
          <div style={{ marginTop: 4, fontWeight: 700 }}>Wait: {fmtCountdown(wait)}</div>
        </div>
      )}
      <button className="btn btn-primary" disabled={loading || locked} onClick={onStart}
        style={locked ? { opacity: 0.4, cursor: 'not-allowed', fontSize: 13 } : { fontSize: 13 }}>
        {loading ? <><span className="spinner" /> Starting...</> : locked ? `Opens at ${earliestTime}` : `Start ${label}`}
      </button>
    </div>
  );
}

export default function OperatorDashboard() {
  useAuth('operator');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [tripState, setTripState] = useState<TripState>('idle');
  const [activeTripType, setActiveTripType] = useState<TripType>('morning');
  const [location, setLocation] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [, forceUpdate] = useState(0);
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('bus_tracker_user');
    if (u) setUser(JSON.parse(u));
    loadAssignment();
    timerRef.current = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => { stopGPS(); clearInterval(timerRef.current); };
  }, []);

  async function loadAssignment() {
    try {
      const res = await fetch('/api/operator/my-assignment', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setAssignment(await res.json());
    } catch {}
  }

  function startGPS(busNumber: string) {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const kmh = speed ? +(speed * 3.6).toFixed(1) : 0;
        setLocation({ latitude, longitude, speed: kmh, heading: heading || 0, updatedAt: new Date() });
        fetch('/api/hardware/location', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ busId: busNumber, latitude, longitude, speed: kmh, heading: heading || 0 }),
        }).catch(() => {});
      },
      (err) => setToast({ msg: 'GPS error: ' + err.message, type: 'error' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function stopGPS() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
  }

  async function handleStartTrip(tripType: TripType) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/operator/start-trip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTripState('active'); setActiveTripType(tripType);
      setToast({ msg: `${tripType === 'evening' ? 'Evening' : 'Morning'} trip started - ${data.busNumber}`, type: 'success' });
      navigator.geolocation.getCurrentPosition(() => startGPS(data.busNumber),
        () => setToast({ msg: 'Location permission denied.', type: 'error' }), { enableHighAccuracy: true, timeout: 10000 });
    } catch (err: any) { setToast({ msg: err.message || 'Failed to start trip', type: 'error' }); }
    finally { setActionLoading(false); }
  }

  async function handleEndTrip() {
    setActionLoading(true); stopGPS();
    try {
      const res = await fetch('/api/operator/end-trip', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTripState('ended'); setLocation(null);
      setToast({ msg: 'Trip ended. Bus marked offline.', type: 'success' });
    } catch (err: any) { setToast({ msg: err.message || 'Failed to end trip', type: 'error' }); }
    finally { setActionLoading(false); }
  }

  function logout() {
    stopGPS();
    if (tripState === 'active') fetch('/api/operator/end-trip', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }).catch(() => {});
    localStorage.clear(); router.push('/operator/login');
  }

  const morningTime  = assignment?.startTime            || '08:05';
  const eveningTime  = assignment?.eveningStartTime     || '16:00';
  const morningEarly = assignment?.earliestStart        || '07:50';
  const eveningEarly = assignment?.eveningEarliestStart || '15:45';
  const morningWait  = mounted ? minutesUntil(morningTime) : 0;
  const eveningWait  = mounted ? minutesUntil(eveningTime) : 0;
  const morningLocked = mounted && morningWait > 0;
  const eveningLocked = mounted && eveningWait > 0;

  return (
    <div className="page-shell">
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', padding: '32px 24px 40px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>Driver Portal</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{user?.name || 'Driver'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>SSET - Karukutty</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {assignment?.busNumber || '-'}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {assignment?.routeName || '-'}
          </div>
          <div style={{ background: tripState === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {tripState === 'active' ? `Live (${activeTripType})` : tripState === 'ended' ? 'Ended' : 'Idle'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 40px', background: 'var(--bg)' }}>
        <p className="sec-label">This Week Assignment</p>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
          {assignment ? (
            [
              { label: 'Bus Number',     val: assignment.busNumber },
              { label: 'Route',          val: assignment.routeName },
              { label: 'Morning Depart', val: morningTime },
              { label: 'Evening Depart', val: eveningTime + ' (from SSET)' },
              { label: 'Next Rotation',  val: 'Mon, ' + assignment.nextRotation },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', fontSize: 14, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontWeight: 700, maxWidth: '60%', textAlign: 'right', fontSize: 13 }}>{row.val}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          )}
        </div>

        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#1e40af', display: 'flex', gap: 8 }}>
          <span>Assignments rotate every Monday. Next: <strong>{assignment?.nextRotation || '-'}</strong></span>
        </div>

        <p className="sec-label">Trip Control</p>

        {tripState === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <TripCard label="Morning Trip" subtitle={'Departs ' + morningTime + ' - arrives SSET by 8:40 AM'}
              locked={morningLocked} wait={morningWait} scheduledTime={morningTime} earliestTime={morningEarly}
              loading={actionLoading} onStart={() => handleStartTrip('morning')}
              color="#1e40af" bgColor="#EFF6FF" borderColor="#BFDBFE" />
            <TripCard label="Evening Trip" subtitle={'Departs SSET at ' + eveningTime + ' - return home'}
              locked={eveningLocked} wait={eveningWait} scheduledTime={eveningTime} earliestTime={eveningEarly}
              loading={actionLoading} onStart={() => handleStartTrip('evening')}
              color="#065F46" bgColor="#F0FDF4" borderColor="#A7F3D0" />
          </div>
        )}

        {tripState === 'active' && (
          <div>
            <div style={{ background: '#F0FDF4', border: '1.5px solid #10B981', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
                {activeTripType === 'evening' ? 'Evening' : 'Morning'} Trip in Progress
              </div>
              <div style={{ fontSize: 13, color: '#047857', marginBottom: 12 }}>
                Broadcasting live GPS for <strong>{assignment?.busNumber}</strong>
              </div>
              {location && (
                <div style={{ fontSize: 12, color: '#065F46', fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                  {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)} - {location.speed} km/h
                </div>
              )}
            </div>
            <button className="btn" style={{ background: 'var(--red)', color: '#fff', marginBottom: 20 }} disabled={actionLoading} onClick={handleEndTrip}>
              {actionLoading ? <><span className="spinner" /> Ending...</> : 'End Trip'}
            </button>
          </div>
        )}

        {tripState === 'ended' && (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>OK</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Trip Completed</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>Bus has been marked offline.</div>
            <button className="btn btn-primary" onClick={() => setTripState('idle')}>Start New Trip</button>
          </div>
        )}

        {tripState === 'active' && (
          <div>
            <p className="sec-label">Live GPS</p>
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              {[
                { label: 'Latitude',  val: location?.latitude?.toFixed(6)  || 'Waiting...' },
                { label: 'Longitude', val: location?.longitude?.toFixed(6) || 'Waiting...' },
                { label: 'Speed',     val: location ? location.speed + ' km/h' : 'Waiting...' },
                { label: 'Updated',   val: location?.updatedAt ? new Date(location.updatedAt).toLocaleTimeString() : '--' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-secondary" onClick={logout}>Logout</button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
