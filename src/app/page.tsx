'use client';
import Link from 'next/link';

const features = [
  { icon: '📍', title: 'Live GPS Tracking', desc: 'See your bus on an interactive map, updated every 5 seconds via ESP32 hardware.' },
  { icon: '🤖', title: 'ML Arrival Estimates', desc: 'Smart predictions that learn from real trip history — like "Where is my Train".' },
  { icon: '🎫', title: 'Digital Tickets', desc: 'Buy monthly or single passes online via Razorpay. No queues, no paper.' },
  { icon: '🗺️', title: 'Route Info', desc: 'Browse all routes, stops, timings, and pricing before you board.' },
  { icon: '🚍', title: 'Operator Dashboard', desc: 'Drivers manage their route and share live GPS from their phone or ESP32.' },
  { icon: '🔒', title: 'Secure Access', desc: 'JWT authentication and encrypted passwords keep your data safe.' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', background: '#fff',
        borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 8 }}>
          🚌 BusTracker
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/login" style={{
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            textDecoration: 'none', border: '2px solid #F97316', color: '#F97316', background: 'transparent',
          }}>Login</Link>
          <Link href="/signup" style={{
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            textDecoration: 'none', background: '#F97316', color: '#fff',
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
          }}>Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(160deg, #FED7AA 0%, #FDBA74 40%, #F97316 100%)',
        padding: '70px 24px 80px', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.3)', color: '#7C2D12',
          padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          marginBottom: 20, border: '1px solid rgba(255,255,255,0.4)',
        }}>
          🎓 College Bus Tracking System
        </div>
        <h1 style={{ fontSize: 'clamp(32px,7vw,52px)', fontWeight: 800, color: '#7C2D12', lineHeight: 1.15, marginBottom: 16 }}>
          Track Your Bus<br />In Real Time
        </h1>
        <p style={{ fontSize: 16, color: '#9A3412', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7, fontWeight: 500 }}>
          Never miss your college bus again. Live GPS updates, ML-powered arrival estimates, and digital tickets — all in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            textDecoration: 'none', background: '#7C2D12', color: '#fff',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          }}>Get Started Free</Link>
          <Link href="/login" style={{
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            textDecoration: 'none', background: 'rgba(255,255,255,0.5)', color: '#7C2D12',
            border: '2px solid rgba(255,255,255,0.6)',
          }}>Sign In</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E', textAlign: 'center', marginBottom: 8 }}>
          Everything you need
        </h2>
        <p style={{ textAlign: 'center', color: '#64748B', fontSize: 15, marginBottom: 40 }}>
          Built for students, designed for simplicity
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: '#fff', border: '2px solid #E2E8F0', borderRadius: 16, padding: 24,
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#F97316', padding: '50px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 50, flexWrap: 'wrap', maxWidth: 600, margin: '0 auto' }}>
          {[['3+', 'Bus Routes'], ['Live', 'GPS Updates'], ['24/7', 'Availability']].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{val}</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          background: '#fff', border: '2px solid #E2E8F0', borderRadius: 20,
          padding: '48px 32px', maxWidth: 500, margin: '0 auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E', marginBottom: 10 }}>Ready to get started?</h2>
          <p style={{ color: '#64748B', fontSize: 15, marginBottom: 28 }}>
            Create your free account and start tracking your college bus today.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', background: '#F97316', color: '#fff',
              boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
            }}>Create Account</Link>
            <Link href="/operator/login" style={{
              padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', background: '#F8FAFC', color: '#1A1A2E',
              border: '2px solid #E2E8F0',
            }}>Operator Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 12, borderTop: '1px solid #E2E8F0' }}>
        © 2024 BusTracker. College Bus Real-Time Tracking System.
      </footer>
    </div>
  );
}
