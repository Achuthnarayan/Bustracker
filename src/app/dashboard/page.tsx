'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth, getToken } from '@/hooks/useAuth';

function timeSince(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function DashboardPage() {
  useAuth();
  const [user, setUser] = useState<any>(null);
  const [buses, setBuses] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [routes, setRoutes] = useState<any[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifBefore, setNotifBefore] = useState(10);
  const [notifRoute, setNotifRoute] = useState('');
  const [notifLoading, setNotifLoading] = useState(false);

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning ☀️' : hr < 17 ? 'Good afternoon 👋' : 'Good evening 🌙';

  useEffect(() => {
    const u = localStorage.getItem('bus_tracker_user');
    if (u) setUser(JSON.parse(u));
    loadAll();
    const interval = setInterval(loadBuses, 5000);
    const alertInterval = setInterval(loadAlerts, 10000);
    loadAlerts();
    loadRoutes();
    checkNotifStatus();
    return () => { clearInterval(interval); clearInterval(alertInterval); };
  }, []);

  async function loadAll() {
    await Promise.all([loadBuses(), loadTickets()]);
    setLoading(false);
  }

  async function loadBuses() {
    try {
      const res = await fetch('/api/buses', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setBuses(data.buses || []);
    } catch {}
  }

  async function loadTickets() {
    try {
      const res = await fetch('/api/tickets', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {}
  }

  async function loadAlerts() {
    try {
      const res = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {}
  }

  async function loadRoutes() {
    try {
      const res = await fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch {}
  }

  function checkNotifStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const saved = localStorage.getItem('push_notif_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      setNotifEnabled(prefs.enabled || false);
      setNotifBefore(prefs.notifyBefore || 10);
      setNotifRoute(prefs.routeId || '');
    }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function enableNotifications() {
    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings.');
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) { alert('Push notifications not supported in this browser.'); return; }

      const keyRes = await fetch('/api/push/subscribe');
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        alert('Push notifications are not configured on the server yet. Please contact the admin.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), routeId: notifRoute, notifyBefore: notifBefore }),
      });

      localStorage.setItem('push_notif_prefs', JSON.stringify({ enabled: true, notifyBefore: notifBefore, routeId: notifRoute }));
      setNotifEnabled(true);
    } catch (err: any) {
      alert('Failed to enable notifications: ' + err.message);
    } finally { setNotifLoading(false); }
  }

  async function disableNotifications() {
    setNotifLoading(true);
    try {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      localStorage.removeItem('push_notif_prefs');
      setNotifEnabled(false);
    } catch {} finally { setNotifLoading(false); }
  }

  async function updateNotifPrefs() {
    setNotifLoading(true);
    try {
      const reg = await registerServiceWorker();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { await enableNotifications(); return; }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), routeId: notifRoute, notifyBefore: notifBefore }),
      });
      localStorage.setItem('push_notif_prefs', JSON.stringify({ enabled: true, notifyBefore: notifBefore, routeId: notifRoute }));
    } catch {} finally { setNotifLoading(false); }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
  }

  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const activeTicket = tickets.find(t => ['active', 'Active'].includes(t.status));
  const pastTickets = tickets.filter(t => !['active', 'Active'].includes(t.status)).slice(0, 5);

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
        padding: '24px 20px 32px', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 90, opacity: 0.12, transform: 'rotate(-15deg)' }}>🚌</div>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>{greeting}</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>Hey, {user?.name || 'Student'}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>ID: {user?.collegeId || '—'}</div>

        {/* Animated top-view bus scene */}
        <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 110, background: '#4ade80' }}>
          <style>{`
            @keyframes busMove { 0% { transform: translateX(-120px); } 100% { transform: translateX(calc(100vw + 120px)); } }
            @keyframes dashMove { 0% { transform: translateX(0); } 100% { transform: translateX(-60px); } }
            @keyframes treeSway { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          `}</style>

          {/* Grass */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)' }} />

          {/* Road */}
          <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 54, background: '#374151' }} />

          {/* Road edge lines */}
          <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 3, background: '#f9fafb' }} />
          <div style={{ position: 'absolute', top: 79, left: 0, right: 0, height: 3, background: '#f9fafb' }} />

          {/* Animated center dashes */}
          <div style={{ position: 'absolute', top: 52, left: 0, right: 0, height: 4, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 0, animation: 'dashMove 0.6s linear infinite', width: '200%' }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ width: 30, height: 4, background: '#fbbf24', marginRight: 30, flexShrink: 0 }} />
              ))}
            </div>
          </div>

          {/* Trees top row */}
          {[5, 18, 32, 46, 60, 74, 88].map((left, i) => (
            <div key={i} style={{ position: 'absolute', top: 4, left: `${left}%`, animation: 'treeSway 3s ease-in-out infinite', animationDelay: `${i * 0.4}s` }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="8" fill="#15803d" />
                <circle cx="6" cy="7" r="4" fill="#16a34a" />
                <circle cx="12" cy="7" r="4" fill="#16a34a" />
                <circle cx="9" cy="5" r="4" fill="#22c55e" />
              </svg>
            </div>
          ))}

          {/* Trees bottom row */}
          {[10, 25, 40, 55, 70, 85].map((left, i) => (
            <div key={i} style={{ position: 'absolute', bottom: 4, left: `${left}%`, animation: 'treeSway 3s ease-in-out infinite', animationDelay: `${i * 0.5}s` }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="8" fill="#15803d" />
                <circle cx="6" cy="7" r="4" fill="#16a34a" />
                <circle cx="12" cy="7" r="4" fill="#16a34a" />
                <circle cx="9" cy="5" r="4" fill="#22c55e" />
              </svg>
            </div>
          ))}

          {/* Top-view bus SVG */}
          <div style={{ position: 'absolute', top: 30, animation: 'busMove 4s linear infinite' }}>
            <svg width="56" height="110" viewBox="0 0 56 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Main body */}
              <rect x="4" y="4" width="48" height="102" rx="8" fill="#F59E0B"/>
              {/* Roof panel */}
              <rect x="7" y="8" width="42" height="94" rx="6" fill="#FCD34D"/>
              {/* Front bumper */}
              <rect x="6" y="4" width="44" height="8" rx="4" fill="#D97706"/>
              {/* Rear bumper */}
              <rect x="6" y="98" width="44" height="8" rx="4" fill="#D97706"/>
              {/* Front windshield */}
              <rect x="10" y="10" width="36" height="16" rx="4" fill="#BAE6FD" opacity="0.95"/>
              {/* Windshield glare */}
              <rect x="12" y="12" width="10" height="6" rx="2" fill="#fff" opacity="0.4"/>
              {/* Rear window */}
              <rect x="10" y="84" width="36" height="12" rx="4" fill="#BAE6FD" opacity="0.8"/>
              {/* Left side windows row */}
              <rect x="4" y="32" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="4" y="46" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="4" y="60" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="4" y="74" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              {/* Right side windows row */}
              <rect x="45" y="32" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="45" y="46" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="45" y="60" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="45" y="74" width="7" height="10" rx="2" fill="#BAE6FD" opacity="0.9"/>
              {/* Center aisle stripe */}
              <rect x="25" y="28" width="6" height="56" rx="2" fill="#F59E0B" opacity="0.5"/>
              {/* Seat rows left */}
              <rect x="10" y="30" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="10" y="44" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="10" y="58" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="10" y="72" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              {/* Seat rows right */}
              <rect x="33" y="30" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="33" y="44" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="33" y="58" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              <rect x="33" y="72" width="13" height="8" rx="2" fill="#1e3a8a" opacity="0.25"/>
              {/* Headlights */}
              <ellipse cx="14" cy="7" rx="4" ry="3" fill="#FEF9C3"/>
              <ellipse cx="42" cy="7" rx="4" ry="3" fill="#FEF9C3"/>
              {/* Tail lights */}
              <ellipse cx="14" cy="103" rx="4" ry="3" fill="#FCA5A5"/>
              <ellipse cx="42" cy="103" rx="4" ry="3" fill="#FCA5A5"/>
              {/* Front wheels */}
              <rect x="0" y="14" width="6" height="14" rx="3" fill="#1F2937"/>
              <rect x="50" y="14" width="6" height="14" rx="3" fill="#1F2937"/>
              {/* Rear wheels */}
              <rect x="0" y="82" width="6" height="14" rx="3" fill="#1F2937"/>
              <rect x="50" y="82" width="6" height="14" rx="3" fill="#1F2937"/>
              {/* SCMS label */}
              <rect x="13" y="88" width="30" height="8" rx="2" fill="#1e3a8a" opacity="0.7"/>
              <text x="28" y="95" textAnchor="middle" fontSize="5" fill="#fff" fontWeight="bold">SCMS SSET</text>
            </svg>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg)', padding: '20px 16px 40px', flex: 1 }}>

        {/* Emergency Alerts */}
        {alerts.filter(a => !dismissedAlerts.has(a._id)).map((alert: any) => (
          <div key={alert._id} style={{
            background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 14,
            padding: '12px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 2 }}>
                Emergency Alert · Bus {alert.busNumber}
              </div>
              <div style={{ fontSize: 13, color: '#7F1D1D' }}>{alert.message}</div>
            </div>
            <button
              onClick={() => setDismissedAlerts(prev => new Set(Array.from(prev).concat(alert._id)))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >×</button>
          </div>
        ))}

        {/* Quick Actions */}
        <p className="sec-label">Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { href: '/live-track', icon: '🗺️', label: 'Live Track', primary: true },
            { href: '/routes',     icon: '🚌', label: 'Routes' },
            { href: '/tickets',    icon: '🎫', label: 'Book Ticket' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              background: '#fff', borderRadius: 14, padding: '14px 8px', textAlign: 'center',
              border: '1.5px solid var(--border)', textDecoration: 'none', color: 'var(--text)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              <div style={{
                fontSize: 22, width: 44, height: 44, borderRadius: 12,
                background: item.primary ? 'var(--accent)' : 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Bus Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: 18, padding: '18px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 80, opacity: 0.15, transform: 'scaleX(-1)' }}>🚌</div>
          <div style={{ position: 'absolute', right: 60, bottom: -14, fontSize: 50, opacity: 0.1 }}>🚌</div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>SSET Campus Bus</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Safe · On-time · Tracked live</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['7 Routes', 'Live GPS', 'Push Alerts'].map(tag => (
                <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 52, zIndex: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🚍</div>
        </div>

        {/* Active Ticket */}
        <p className="sec-label">Active Ticket</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#94A3B8', fontSize: 13 }}>Loading...</div>
        ) : activeTicket ? (
          <div style={{
            background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
            borderRadius: 18, padding: 18, marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(249,115,22,0.15)', borderRadius: '50%' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.2)', color: '#4ADE80', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 12, textTransform: 'uppercase' }}>
              ● Active
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{activeTicket.routeName || activeTicket.route || 'Route'}</div>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 14 }}>{activeTicket.from || 'Origin'} → {activeTicket.to || 'Destination'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Fare</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>KES {activeTicket.amount || '—'}</div>
              </div>
              <Link href="/live-track" className="btn btn-primary" style={{ padding: '9px 16px', fontSize: 12, marginBottom: 0, width: 'auto' }}>
                Track Bus →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '2px dashed var(--border)', borderRadius: 18, padding: 24, textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 32 }}>🎫</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 14px' }}>No active ticket. Book a ride to get started.</p>
            <Link href="/tickets" className="btn btn-primary" style={{ width: 'auto', display: 'inline-flex', padding: '10px 24px', fontSize: 13 }}>Book a Ticket</Link>
          </div>
        )}

        {/* Live Bus Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="sec-label" style={{ margin: 0 }}>Live Bus Status</p>
          <span className={`badge ${activeBuses > 0 ? 'badge-green' : 'badge-red'}`}>{activeBuses} Active</span>
        </div>
        {buses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 13 }}>No buses registered yet</div>
        ) : buses.map(bus => {
          const isActive = bus.status === 'Active';
          return (
            <Link key={bus.busNumber} href="/live-track" style={{
              background: isActive ? '#F0FDF4' : '#fff',
              border: `1.5px solid ${isActive ? '#22C55E' : 'var(--border)'}`,
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              textDecoration: 'none', color: 'var(--text)',
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{isActive ? '🟢' : '🔴'} {bus.busNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bus.route || 'Unassigned'}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Updated {bus.lastUpdate ? timeSince(new Date(bus.lastUpdate)) : 'Never'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${isActive ? 'badge-green' : 'badge-red'}`}>{bus.status}</span>
                {isActive && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{bus.speed || 0} km/h</div>}
              </div>
            </Link>
          );
        })}

        {/* Bus Arrival Notifications */}
        <p className="sec-label" style={{ marginTop: 24 }}>Bus Arrival Notifications</p>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Get notified on your phone when your bus is approaching your stop.
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Your Route</label>
            <select
              value={notifRoute}
              onChange={e => setNotifRoute(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, background: '#fff' }}
            >
              <option value="">Select your bus route</option>
              {routes.map((r: any) => (
                <option key={r.routeId} value={r.routeId}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Notify me <strong style={{ color: 'var(--accent)' }}>{notifBefore} minutes</strong> before bus arrives
            </label>
            <input
              type="range" min={5} max={30} step={5}
              value={notifBefore}
              onChange={e => setNotifBefore(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>5 min</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30 min</span>
            </div>
          </div>

          {notifEnabled ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} disabled={notifLoading} onClick={updateNotifPrefs}>
                {notifLoading ? 'Saving...' : '💾 Save Preferences'}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: 13 }} disabled={notifLoading} onClick={disableNotifications}>
                Turn Off
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', fontSize: 13 }} disabled={notifLoading || !notifRoute} onClick={enableNotifications}>
              {notifLoading ? 'Enabling...' : '🔔 Enable Notifications'}
            </button>
          )}

          {notifEnabled && (
            <div style={{ marginTop: 12, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#065F46' }}>
              ✓ Notifications active — you'll be alerted {notifBefore} min before your bus arrives
            </div>
          )}
        </div>

        {/* Journey History */}
        <p className="sec-label" style={{ marginTop: 24 }}>Previous Journeys</p>
        {pastTickets.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>
            <style>{`
              @keyframes bus1race { 0% { left: -80px; } 100% { left: calc(100% + 20px); } }
              @keyframes bus2race { 0% { left: -80px; } 100% { left: calc(100% + 20px); } }
              @keyframes bus3race { 0% { left: -80px; } 100% { left: calc(100% + 20px); } }
              @keyframes trackDash { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
              @keyframes crowd { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            `}</style>

            {/* Sky */}
            <div style={{ background: 'linear-gradient(180deg,#bfdbfe 0%,#dbeafe 100%)', padding: '12px 0 0', position: 'relative', height: 180, overflow: 'hidden' }}>

              {/* Clouds */}
              <div style={{ position: 'absolute', top: 10, left: '15%', background: '#fff', borderRadius: 20, width: 60, height: 18, opacity: 0.85 }} />
              <div style={{ position: 'absolute', top: 6, left: '17%', background: '#fff', borderRadius: 20, width: 40, height: 14, opacity: 0.85 }} />
              <div style={{ position: 'absolute', top: 12, left: '55%', background: '#fff', borderRadius: 20, width: 70, height: 18, opacity: 0.8 }} />
              <div style={{ position: 'absolute', top: 8, left: '57%', background: '#fff', borderRadius: 20, width: 45, height: 14, opacity: 0.8 }} />

              {/* Crowd / flags */}
              {[8,16,24,32,40,48,56,64,72,80,88].map((l,i) => (
                <div key={i} style={{ position: 'absolute', top: 28, left: `${l}%`, animation: `crowd 0.6s ease-in-out infinite`, animationDelay: `${i*0.1}s` }}>
                  <div style={{ width: 6, height: 14, background: ['#ef4444','#3b82f6','#22c55e','#f59e0b'][i%4], borderRadius: 2 }} />
                </div>
              ))}

              {/* Ground / grass strip */}
              <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, height: 12, background: '#4ade80' }} />

              {/* Track background */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, background: '#374151' }} />

              {/* Lane dividers */}
              <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 2, background: '#6b7280' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, height: 2, background: '#6b7280' }} />

              {/* Animated dashes lane 1 */}
              <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', animation: 'trackDash 0.5s linear infinite', width: '200%' }}>
                  {Array.from({length: 20}).map((_,i) => <div key={i} style={{ width: 40, height: 3, background: '#fbbf24', marginRight: 40, flexShrink: 0 }} />)}
                </div>
              </div>
              {/* Animated dashes lane 2 */}
              <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', animation: 'trackDash 0.4s linear infinite', width: '200%' }}>
                  {Array.from({length: 20}).map((_,i) => <div key={i} style={{ width: 40, height: 3, background: '#fbbf24', marginRight: 40, flexShrink: 0 }} />)}
                </div>
              </div>
              {/* Animated dashes lane 3 */}
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', animation: 'trackDash 0.6s linear infinite', width: '200%' }}>
                  {Array.from({length: 20}).map((_,i) => <div key={i} style={{ width: 40, height: 3, background: '#fbbf24', marginRight: 40, flexShrink: 0 }} />)}
                </div>
              </div>

              {/* Bus 1 — fastest, top lane */}
              <div style={{ position: 'absolute', bottom: 44, animation: 'bus1race 2.2s linear infinite' }}>
                <svg width="52" height="26" viewBox="0 0 52 26" fill="none">
                  <rect x="2" y="1" width="48" height="24" rx="5" fill="#F59E0B"/>
                  <rect x="5" y="3" width="42" height="18" rx="4" fill="#FCD34D"/>
                  <rect x="7" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.95"/>
                  <rect x="29" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <ellipse cx="9" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="43" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="9" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <ellipse cx="43" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <rect x="0" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="0" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <text x="26" y="16" textAnchor="middle" fontSize="5" fill="#1e3a8a" fontWeight="bold">BUS 1</text>
                </svg>
              </div>

              {/* Bus 2 — medium, middle lane */}
              <div style={{ position: 'absolute', bottom: 22, animation: 'bus2race 2.8s linear infinite', animationDelay: '0.4s' }}>
                <svg width="52" height="26" viewBox="0 0 52 26" fill="none">
                  <rect x="2" y="1" width="48" height="24" rx="5" fill="#3B82F6"/>
                  <rect x="5" y="3" width="42" height="18" rx="4" fill="#BFDBFE"/>
                  <rect x="7" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.95"/>
                  <rect x="29" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <ellipse cx="9" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="43" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="9" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <ellipse cx="43" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <rect x="0" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="0" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <text x="26" y="16" textAnchor="middle" fontSize="5" fill="#1e3a8a" fontWeight="bold">BUS 2</text>
                </svg>
              </div>

              {/* Bus 3 — slowest, bottom lane */}
              <div style={{ position: 'absolute', bottom: 2, animation: 'bus3race 3.5s linear infinite', animationDelay: '1s' }}>
                <svg width="52" height="26" viewBox="0 0 52 26" fill="none">
                  <rect x="2" y="1" width="48" height="24" rx="5" fill="#10B981"/>
                  <rect x="5" y="3" width="42" height="18" rx="4" fill="#A7F3D0"/>
                  <rect x="7" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.95"/>
                  <rect x="29" y="3" width="16" height="10" rx="2" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="6" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="2" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <rect x="45" y="14" width="5" height="6" rx="1" fill="#BAE6FD" opacity="0.8"/>
                  <ellipse cx="9" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="43" cy="2" rx="3" ry="2" fill="#FEF9C3"/>
                  <ellipse cx="9" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <ellipse cx="43" cy="24" rx="3" ry="2" fill="#FCA5A5"/>
                  <rect x="0" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="4" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="0" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <rect x="48" y="16" width="4" height="6" rx="2" fill="#1F2937"/>
                  <text x="26" y="16" textAnchor="middle" fontSize="5" fill="#065f46" fontWeight="bold">BUS 3</text>
                </svg>
              </div>

              {/* Finish flag */}
              <div style={{ position: 'absolute', right: 16, bottom: 0, top: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 2, height: '100%', background: '#fff', opacity: 0.6 }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 14, background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 7px 7px' }} />
              </div>
            </div>

            <div style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No past journeys yet — book your first ride! 🏁
            </div>
          </div>
        ) : pastTickets.map((t, i) => {
          const done = ['used', 'completed'].includes((t.status || '').toLowerCase());
          const date = t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
          return (
            <div key={i} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--orange-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🚌</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.routeName || t.route || 'Route'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>₹{t.amount || '—'}</div>
                <span className={`badge ${done ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 4 }}>{done ? 'Completed' : t.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
