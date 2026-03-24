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
  const [notifStop, setNotifStop] = useState('');
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
      setNotifStop(prefs.boardingStop || '');
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
        body: JSON.stringify({ subscription: sub.toJSON(), routeId: notifRoute, boardingStop: notifStop, notifyBefore: notifBefore }),
      });

      localStorage.setItem('push_notif_prefs', JSON.stringify({ enabled: true, notifyBefore: notifBefore, routeId: notifRoute, boardingStop: notifStop }));
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
        body: JSON.stringify({ subscription: sub.toJSON(), routeId: notifRoute, boardingStop: notifStop, notifyBefore: notifBefore }),
      });
      localStorage.setItem('push_notif_prefs', JSON.stringify({ enabled: true, notifyBefore: notifBefore, routeId: notifRoute, boardingStop: notifStop }));
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

        {/* Animated side-view bus scene */}
        <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 120 }}>
          <style>{`
            @keyframes busMove { 0% { transform: translateX(-130px); } 100% { transform: translateX(calc(100vw + 130px)); } }
            @keyframes dashMove { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
            @keyframes treeSway { 0%,100% { transform-origin: bottom center; transform: rotate(0deg); } 50% { transform-origin: bottom center; transform: rotate(2deg); } }
            @keyframes cloudDrift { 0% { transform: translateX(0); } 100% { transform: translateX(-200px); } }
          `}</style>

          {/* Sky */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #e0f2fe 100%)' }} />

          {/* Clouds */}
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, overflow: 'hidden', height: 30 }}>
            <div style={{ display: 'flex', gap: 120, animation: 'cloudDrift 12s linear infinite', width: '300%' }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 60, height: 16, background: 'rgba(255,255,255,0.9)', borderRadius: 20 }} />
                  <div style={{ position: 'absolute', top: -8, left: 10, width: 36, height: 20, background: 'rgba(255,255,255,0.9)', borderRadius: 20 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Distant hills */}
          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0 }}>
            <svg width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="none">
              <ellipse cx="60" cy="40" rx="90" ry="35" fill="#86efac" />
              <ellipse cx="200" cy="40" rx="110" ry="30" fill="#4ade80" />
              <ellipse cx="340" cy="40" rx="90" ry="32" fill="#86efac" />
            </svg>
          </div>

          {/* Ground strip */}
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, height: 12, background: '#22c55e' }} />

          {/* Road surface */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: '#374151' }} />
          {/* Road top edge */}
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, height: 3, background: '#f9fafb' }} />
          {/* Road bottom edge */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#f9fafb' }} />

          {/* Animated road dashes */}
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
            <div style={{ display: 'flex', animation: 'dashMove 0.5s linear infinite', width: '200%' }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ width: 40, height: 3, background: '#fbbf24', marginRight: 40, flexShrink: 0 }} />
              ))}
            </div>
          </div>

          {/* Trees along the road */}
          {[8, 22, 38, 54, 70, 86].map((left, i) => (
            <div key={i} style={{ position: 'absolute', bottom: 18, left: `${left}%`, animation: `treeSway 2.5s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}>
              <svg width="14" height="28" viewBox="0 0 14 28">
                {/* trunk */}
                <rect x="5" y="18" width="4" height="10" fill="#92400e" />
                {/* foliage */}
                <ellipse cx="7" cy="14" rx="7" ry="8" fill="#15803d" />
                <ellipse cx="4" cy="12" rx="4" ry="5" fill="#16a34a" />
                <ellipse cx="10" cy="12" rx="4" ry="5" fill="#16a34a" />
                <ellipse cx="7" cy="8" rx="5" ry="6" fill="#22c55e" />
              </svg>
            </div>
          ))}

          {/* Side-view bus SVG */}
          <div style={{ position: 'absolute', bottom: 18, animation: 'busMove 4s linear infinite' }}>
            <svg width="110" height="48" viewBox="0 0 110 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Body */}
              <rect x="4" y="8" width="100" height="30" rx="4" fill="#F59E0B"/>
              {/* Roof */}
              <rect x="10" y="4" width="88" height="8" rx="4" fill="#D97706"/>
              {/* Front cab */}
              <path d="M96 8 L104 8 L108 20 L96 20 Z" fill="#FCD34D"/>
              {/* Windshield */}
              <path d="M97 9 L103 9 L106 19 L97 19 Z" fill="#BAE6FD" opacity="0.9"/>
              {/* Windows */}
              <rect x="14" y="11" width="14" height="12" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="32" y="11" width="14" height="12" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="50" y="11" width="14" height="12" rx="2" fill="#BAE6FD" opacity="0.9"/>
              <rect x="68" y="11" width="14" height="12" rx="2" fill="#BAE6FD" opacity="0.9"/>
              {/* Window glare */}
              <rect x="15" y="12" width="4" height="4" rx="1" fill="#fff" opacity="0.35"/>
              <rect x="33" y="12" width="4" height="4" rx="1" fill="#fff" opacity="0.35"/>
              <rect x="51" y="12" width="4" height="4" rx="1" fill="#fff" opacity="0.35"/>
              <rect x="69" y="12" width="4" height="4" rx="1" fill="#fff" opacity="0.35"/>
              {/* Door */}
              <rect x="86" y="11" width="8" height="16" rx="2" fill="#E5E7EB" opacity="0.6"/>
              <circle cx="93" cy="19" r="1.5" fill="#6B7280"/>
              {/* Undercarriage */}
              <rect x="4" y="36" width="100" height="4" rx="2" fill="#92400E"/>
              {/* Front wheel */}
              <circle cx="88" cy="42" r="7" fill="#1F2937"/>
              <circle cx="88" cy="42" r="4" fill="#374151"/>
              <circle cx="88" cy="42" r="2" fill="#6B7280"/>
              {/* Rear wheel */}
              <circle cx="22" cy="42" r="7" fill="#1F2937"/>
              <circle cx="22" cy="42" r="4" fill="#374151"/>
              <circle cx="22" cy="42" r="2" fill="#6B7280"/>
              {/* Headlight */}
              <ellipse cx="106" cy="24" rx="3" ry="4" fill="#FEF9C3"/>
              {/* Tail light */}
              <rect x="4" y="14" width="4" height="8" rx="1" fill="#FCA5A5"/>
              {/* SCMS label */}
              <rect x="30" y="25" width="44" height="9" rx="2" fill="#1e3a8a" opacity="0.75"/>
              <text x="52" y="32" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold" fontFamily="sans-serif">SCMS SSET</text>
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
              onChange={e => { setNotifRoute(e.target.value); setNotifStop(''); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, background: '#fff' }}
            >
              <option value="">Select your bus route</option>
              {routes.map((r: any) => (
                <option key={r.routeId} value={r.routeId}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Boarding stop selector — shows stops of selected route */}
          {notifRoute && (() => {
            const selectedRoute = routes.find((r: any) => r.routeId === notifRoute);
            const stops = selectedRoute?.stops?.sort((a: any, b: any) => a.order - b.order) || [];
            return (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Your Boarding Stop</label>
                <select
                  value={notifStop}
                  onChange={e => setNotifStop(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, background: '#fff' }}
                >
                  <option value="">Select your boarding stop</option>
                  {stops.map((s: any) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            );
          })()}

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
            <button className="btn btn-primary" style={{ width: '100%', fontSize: 13 }} disabled={notifLoading || !notifRoute || !notifStop} onClick={enableNotifications}>
              {notifLoading ? 'Enabling...' : '🔔 Enable Notifications'}
            </button>
          )}

          {notifEnabled && (
            <div style={{ marginTop: 12, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#065F46' }}>
              ✓ Notifications active — alerting {notifBefore} min before bus reaches <strong>{notifStop || 'your stop'}</strong>
            </div>
          )}
        </div>

        {/* Journey History */}
        <p className="sec-label" style={{ marginTop: 24 }}>Previous Journeys</p>
        {pastTickets.length === 0 ? (
          <div style={{ background: '#fff', border: '2px dashed var(--border)', borderRadius: 18, padding: 28, textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 36 }}>🎫</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>No past journeys yet — book your first ride!</p>
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
