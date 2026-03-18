'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', collegeId: '', phone: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, collegeId: form.collegeId.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const expiry = new Date(); expiry.setHours(expiry.getHours() + 24);
      localStorage.setItem('bus_tracker_token', data.token);
      localStorage.setItem('bus_tracker_token_expiry', expiry.toISOString());
      localStorage.setItem('bus_tracker_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setToast({ msg: err.message || 'Registration failed', type: 'error' });
    } finally { setLoading(false); }
  }

  return (
    <div className="page-shell">
      <div className="auth-header">
        <div style={{ fontSize: 52, marginBottom: 10 }}>🚌</div>
        <h1>Create Account</h1>
        <p>Join BusTracker today</p>
      </div>
      <div className="auth-body">
        <h2>Sign up</h2>
        <p className="subtitle">Create your student account</p>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
            { label: 'College ID', key: 'collegeId', type: 'text', placeholder: 'e.g. IIIT001' },
            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '10-digit number' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@college.edu' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 6 characters' },
          ].map(f => (
            <div className="input-group" key={f.key}>
              <label>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]} onChange={set(f.key)} required />
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
