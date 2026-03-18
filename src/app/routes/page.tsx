'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth, getToken } from '@/hooks/useAuth';

export default function RoutesPage() {
  useAuth();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { setRoutes(d.routes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', padding: '24px 20px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>Available Routes</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Bus Routes</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{routes.length} routes available</div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading routes...</div>
        ) : routes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No routes found. <Link href="/api/seed" style={{ color: 'var(--orange)' }}>Seed data?</Link></div>
        ) : routes.map((route: any) => (
          <div key={route.routeId} style={{
            background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16,
            padding: 18, marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{route.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{route.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>KES {route.price}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{route.duration}</div>
              </div>
            </div>

            {/* Stops */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              {(route.stops || []).map((stop: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < route.stops.length - 1 ? 8 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: i === 0 || i === route.stops.length - 1 ? 'var(--orange)' : '#CBD5E1',
                      border: '2px solid #fff', boxShadow: '0 0 0 2px var(--orange)',
                      flexShrink: 0,
                    }} />
                    {i < route.stops.length - 1 && <div style={{ width: 2, height: 16, background: '#E2E8F0' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{stop.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {stop.expectedTime === 0 ? 'Start' : `+${stop.expectedTime} min`}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <Link href="/tickets" className="btn btn-primary" style={{ fontSize: 13, padding: '10px 20px', display: 'inline-flex', width: 'auto' }}>
                Book This Route →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
