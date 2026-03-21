'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Suspense } from 'react';

const LiveTrackMap = dynamic(() => import('@/components/LiveTrackMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 4 }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading map...</div>
    </div>
  ),
});

function MapPageInner() {
  useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const routeId = params.get('route') || '';

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <button onClick={() => router.back()} style={{
        position: 'fixed', top: 16, left: 16, zIndex: 1100,
        background: '#fff', border: 'none', borderRadius: 10,
        padding: '10px 16px', fontWeight: 700, fontSize: 13,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
      }}>← Back</button>
      <LiveTrackMap routeId={routeId} />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapPageInner />
    </Suspense>
  );
}
