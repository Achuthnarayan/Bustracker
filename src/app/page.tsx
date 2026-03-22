'use client';
import Link from 'next/link';

const features = [
  { icon: '📍', title: 'Live GPS Tracking',     desc: 'See your bus on an interactive map, updated every 5 seconds via ESP32 hardware.' },
  { icon: '🤖', title: 'ML Arrival Estimates',  desc: 'Smart predictions that learn from real trip history — like "Where is my Train".' },
  { icon: '🎫', title: 'Digital Tickets',        desc: 'Buy passes online via Razorpay — UPI, cards, wallets. No queues, no paper.' },
  { icon: '🗺️', title: 'Route Info',             desc: 'Browse all routes, stops, timings, and pricing before you board.' },
  { icon: '🚍', title: 'Operator Dashboard',     desc: 'Drivers manage their route and share live GPS from phone or ESP32.' },
  { icon: '🔒', title: 'Secure Access',          desc: 'JWT authentication and encrypted passwords keep your data safe.' },
];

const s: Record<string, React.CSSProperties> = {
  page:    { fontFamily: 'Segoe UI, system-ui, sans-serif', background: '#F8FAFC', minHeight: '100vh', width: '100%' },
  nav:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5%', height: 64, background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 },
  logo:    { fontSize: 17, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  navBtns: { display: 'flex', gap: 10 },
  hero:    { background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)', padding: '80px 5% 90px', textAlign: 'center' },
  badge:   { display: 'inline-block', background: 'rgba(79,70,229,0.1)', color: '#3730A3', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, border: '1px solid rgba(79,70,229,0.2)' },
  h1:      { fontSize: 'clamp(30px,5vw,52px)' as any, fontWeight: 800, color: '#1E1B4B', lineHeight: 1.15, marginBottom: 18 },
  heroP:   { fontSize: 16, color: '#4338CA', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.75, fontWeight: 400 },
  heroBtns:{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as any },
  section: { padding: '72px 5%', maxWidth: 1100, margin: '0 auto' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 },
  card:    { background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '24px 22px' },
  stats:   { background: '#4F46E5', padding: '56px 5%', textAlign: 'center' },
  statsRow:{ display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap' as any, maxWidth: 600, margin: '0 auto' },
  cta:     { padding: '72px 5%', textAlign: 'center' },
  ctaBox:  { background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20, padding: '52px 36px', maxWidth: 520, margin: '0 auto', boxShadow: '0 8px 32px rgba(15,23,42,0.07)' },
  footer:  { textAlign: 'center', padding: '20px 5%', color: '#94A3B8', fontSize: 12, borderTop: '1px solid #E2E8F0' },
};

function NavBtn({ href, outline, children }: { href: string; outline?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
      textDecoration: 'none',
      ...(outline
        ? { border: '1.5px solid #4F46E5', color: '#4F46E5', background: 'transparent' }
        : { background: '#4F46E5', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }),
    }}>{children}</Link>
  );
}

function HeroBtn({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: '14px 30px', borderRadius: 12, fontSize: 15, fontWeight: 700,
      textDecoration: 'none',
      ...(primary
        ? { background: '#4F46E5', color: '#fff', boxShadow: '0 6px 20px rgba(79,70,229,0.3)' }
        : { background: 'rgba(255,255,255,0.7)', color: '#3730A3', border: '1.5px solid rgba(79,70,229,0.25)' }),
    }}>{children}</Link>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page" style={{ fontFamily: 'Segoe UI, system-ui, sans-serif', background: '#F8FAFC' }}>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.logo}>🚌 BusTracker</div>
        <div style={s.navBtns}>
          <NavBtn href="/login" outline>Login</NavBtn>
          <NavBtn href="/signup">Sign Up</NavBtn>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.badge}>🎓 SSET – Karukutty</div>
        <h1 style={s.h1}>Track Your Bus<br />In Real Time</h1>
        <p style={s.heroP}>
          Never miss your college bus again. Live GPS updates, ML-powered arrival estimates,
          and digital tickets — all in one place.
        </p>
        <div style={s.heroBtns}>
          <HeroBtn href="/signup" primary>Get Started Free</HeroBtn>
          <HeroBtn href="/login">Sign In</HeroBtn>
        </div>
      </section>

      {/* Features */}
      <section style={s.section}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
          Everything you need
        </h2>
        <p style={{ textAlign: 'center', color: '#64748B', fontSize: 15, marginBottom: 44 }}>
          Built for students, designed for simplicity
        </p>
        <div style={s.grid}>
          {features.map(f => (
            <div key={f.title} style={s.card}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={s.stats}>
        <div style={s.statsRow}>
          {[['7', 'Bus Routes'], ['Live', 'GPS Updates'], ['24/7', 'Availability']].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{val}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <div style={s.ctaBox}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚌</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Ready to get started?</h2>
          <p style={{ color: '#64748B', fontSize: 15, marginBottom: 30, lineHeight: 1.6 }}>
            Create your free account and start tracking your college bus today.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', background: '#4F46E5', color: '#fff',
              boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
            }}>Create Account</Link>
            <Link href="/operator/login" style={{
              padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', background: '#F8FAFC', color: '#0F172A',
              border: '1.5px solid #E2E8F0',
            }}>Operator Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        © 2024 BusTracker · College Bus Real-Time Tracking System
      </footer>
    </div>
  );
}
