'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('bus_tracker_user');
    if (u) setUser(JSON.parse(u));
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function logout() {
    localStorage.removeItem('bus_tracker_token');
    localStorage.removeItem('bus_tracker_token_expiry');
    localStorage.removeItem('bus_tracker_user');
    router.push('/login');
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100, background: '#fff',
      borderBottom: '1.5px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 58,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    }}>
      <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--accent)', textDecoration: 'none' }}>
        <span style={{ fontSize: 22 }}>🚌</span> BusTracker
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} ref={ref}>
        {/* Avatar */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            color: '#fff', fontWeight: 800, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: '2px solid var(--accent-light)',
          }}
        >
          {user?.name?.charAt(0).toUpperCase() || 'S'}
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 58, right: 16,
            background: '#fff', border: '1.5px solid var(--border)',
            borderRadius: 14, boxShadow: 'var(--shadow-lg)',
            minWidth: 200, zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{user?.name || 'Student'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ID: {user?.collegeId || '—'}</div>
            </div>
            {[
              { href: '/tickets',   icon: '🎫', label: 'My Tickets' },
              { href: '/routes',    icon: '🚌', label: 'Routes' },
              { href: '/live-track',icon: '🗺️', label: 'Live Track' },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', fontSize: 14, fontWeight: 600,
                color: 'var(--text)', textDecoration: 'none',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon}&nbsp;&nbsp;{item.label}
              </Link>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', fontSize: 14, fontWeight: 600,
              color: 'var(--red)', background: 'none', border: 'none',
              width: '100%', cursor: 'pointer', textAlign: 'left',
            }}>
              🚪&nbsp;&nbsp;Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
