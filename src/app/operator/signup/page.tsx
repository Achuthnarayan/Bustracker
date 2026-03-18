'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function OperatorSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', operatorId: '', busNumber: '', route: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch('/api/auth/operator/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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
    <div className="page-shell">
      <div className="auth-header"><div style={{ fontSize: 52, marginBottom: 10 }}>🚍</div><h1>Register Operator</h1><p>Create your driver account</p></div>
      <div className="auth-body">
        <h2>Sign up</h2><p className="subtitle">Register as a bus operator</p>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Driver name' },
            { label: 'Operator ID', key: 'operatorId', placeholder: 'e.g. OP001' },
            { label: 'Bus Number', key: 'busNumber', placeholder: 'e.g. BUS01' },
            { label: 'Route ID', key: 'route', placeholder: 'e.g. ROUTE_A' },
            { label: 'Password', key: 'password', placeholder: 'Min 6 characters', type: 'password' },
          ].map(f => (
            <div className="input-group" key={f.key}>
              <label>{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={set(f.key)} required />
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" /> Registering...</> : 'Register'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Already registered? <Link href="/operator/login" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
