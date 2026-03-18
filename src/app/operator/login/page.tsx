'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ operatorId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch('/api/auth/operator/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const expiry = new Date(); expiry.setHours(expiry.getHours() + 24);
      localStorage.setItem('bus_tracker_token', data.token);
      localStorage.setItem('bus_tracker_token_expiry', expiry.toISOString());
      localStorage.setItem('bus_tracker_user', JSON.stringify(data.user));
      router.push('/operator/dashboard');
    } catch (err: any) { setToast({ msg: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: 48, marginBottom: 10 }}>🚍</div>
          <h1>Driver Portal</h1>
          <p>Operator login</p>
        </div>
        <div className="auth-body">
          <h2>Sign in</h2>
          <p className="subtitle">Enter your operator credentials</p>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Operator ID</label>
              <input placeholder="e.g. OP001" value={form.operatorId}
                onChange={e => setForm(f => ({ ...f, operatorId: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--text-muted)' }}>
            New operator?{' '}
            <Link href="/operator/signup" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Register</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: 'var(--text-muted)' }}>
            Student?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Student login</Link>
          </p>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
