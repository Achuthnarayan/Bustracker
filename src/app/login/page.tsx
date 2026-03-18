'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ collegeId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
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
      router.push('/dashboard');
    } catch (err: any) {
      setToast({ msg: err.message || 'Login failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="auth-header">
        <div style={{ fontSize: 52, marginBottom: 10 }}>🚌</div>
        <h1>BusTracker</h1>
        <p>Real-time college bus tracking</p>
      </div>

      <div className="auth-body">
        <h2>Welcome back</h2>
        <p className="subtitle">Sign in to your student account</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>College ID</label>
            <input placeholder="e.g. IIIT001" value={form.collegeId}
              onChange={e => setForm(f => ({ ...f, collegeId: e.target.value.toUpperCase() }))} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>Sign up</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: 'var(--text-muted)' }}>
          Operator?{' '}
          <Link href="/operator/login" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>Operator login</Link>
        </p>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
