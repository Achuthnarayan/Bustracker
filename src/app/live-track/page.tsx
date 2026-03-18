'use client';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

// Leaflet must be client-only (uses window)
const LiveTrackMap = dynamic(() => import('@/components/LiveTrackMap'), { ssr: false, loading: () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
    <div className="spinner" style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: 'var(--orange)', width: 40, height: 40, borderWidth: 4 }} />
    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading map...</div>
  </div>
)});

export default function LiveTrackPage() {
  useAuth();
  return <LiveTrackMap />;
}
