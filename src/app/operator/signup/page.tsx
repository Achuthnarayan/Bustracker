'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';
import PasswordInput from '@/components/PasswordInput';

const ROUTES = [
  { id: 'ROUTE_1', label: 'Route 1 – Angamaly → SSET',      bus: 'KL07-BUS01' },
  { id: 'ROUTE_2', label: 'Route 2 – Chalakudy → SSET',     bus: 'KL07-BUS02' },
  { id: 'ROUTE_3', label: 'Route 3 – Aluva → SSET',         bus: 'KL07-BUS03' },
  { id: 'ROUTE_4', label: 'Route 4 – Perumbavoor → SSET',   bus: 'KL07-BUS04' },
  { id: 'ROUTE_5', label: 'Route 5 – Kalady → SSET',        bus: 'KL07-BUS05' },
  { id: 'ROUTE_6', label: 'Route 6 – North Paravur → SSET', bus: 'KL07-BUS06' },
  { id: 'ROUTE_7', label: 'Route 7 – Thrissur → SSET',      bus: 'KL07-BUS07' },
];

function generateOperatorId(name: string) {
  if (!name.trim()) return '';
  const initials = name.trim().split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);
  const num = Math.floor(100 + Math.random() * 900);
  return `OP-${initials}${num}`;
}

export default function OperatorSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', operatorId: '', busNumber: '', route: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Auto-generate operatorId when name is filled
  useEffect(() => {
    if (form.name.trim().length >= 2) {
      setForm(f => ({ ...f, operatorId: generateOperatorId(form.name) }));
    }
  }, [form.name]);

  // Auto-fill bus number when route is selected
  function handleRouteChange(routeId: string) {
    const r = ROUTES.find(r => r.id === routeId);
    setForm(f => ({ ...f, route: routeId, busNumber: r?.bus || '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/operator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      localStorage.setItem('bus_tracker_token', data.token);
      localStorage.setItem('bus_tracker_token_expiry', expiry.toISOString());
      localStorage.setItem('bus_tracker_user', JSON.stringify(data.user));
      router.push('/operator/dashboard');
    } catch (err: any) {
      setToast({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: 48, marginBottom: 10 }}>🚍</div>
          <h1>Register Operator</h1>
          <p>Create your driver account</p>
        </div>
        <div className="auth-body">
          <h2>Sign up</h2>
          <p className="subtitle">Register as a bus operator for SSET</p>
          <form onSubmit={handleSubmit}>

            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text" placeholder="Driver name" value={form.name} required
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Auto-generated operator ID — read only */}
            <div className="input-group">
              <label>Operator ID (auto-generated)</label>
              <input
                type="text" value={form.operatorId} readOnly
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, cursor: 'default' }}
                placeholder="Fill your name first..."
              />
            </div>

            <div className="input-group">
              <label>Assigned Route</label>
              <select value={form.route} onChange={e => handleRouteChange(e.target.value)} required>
                <option value="">Select your route</option>
                {ROUTES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Auto-filled bus number — read only */}
            <div className="input-group">
              <label>Bus Number (auto-assigned)</label>
              <input
                type="text" value={form.busNumber} readOnly
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, cursor: 'default' }}
                placeholder="Select a route first..."
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <PasswordInput
                placeholder="Min 6 characters" value={form.password} required minLength={6}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !form.operatorId || !form.route} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" /> Registering...</> : 'Register'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--text-muted)' }}>
            Already registered?{' '}
            <Link href="/operator/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
