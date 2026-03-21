'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import { useAuth, getToken } from '@/hooks/useAuth';

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Single = flat ₹100, Monthly = ₹40 × km (one-time monthly fee)
function calcFare(km: number, type: string) {
  if (type === 'Monthly') return Math.round(km * 40);
  return 100; // Single – flat rate
}

const TICKET_TYPES = [
  { value: 'Single',  label: 'Single Trip',  desc: 'One-way journey · flat ₹100',      discount: null },
  { value: 'Monthly', label: 'Monthly Pass', desc: 'Monthly fee · ₹40 per km distance', discount: null },
];

export default function TicketsPage() {
  useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route: '', from: '', to: '', ticketType: 'Single' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const token = getToken();
    const [tr, tk] = await Promise.all([
      fetch('/api/routes', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/tickets', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setRoutes(tr.routes || []);
    setTickets(tk.tickets || []);
    setLoading(false);
  }

  const selectedRoute = routes.find(r => r.routeId === form.route);

  // Compute fare from stop coordinates
  const fare = (() => {
    if (!selectedRoute || !form.from || !form.to) return null;
    const stops: any[] = selectedRoute.stops || [];
    const fromStop = stops.find((s: any) => s.name === form.from);
    const toStop   = stops.find((s: any) => s.name === form.to);
    if (!fromStop || !toStop) return null;
    const km = haversine(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude);
    return { km: +km.toFixed(1), amount: calcFare(km, form.ticketType) };
  })();

  function goToPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.route || !form.from || !form.to || !fare) return;
    const params = new URLSearchParams({
      route: form.route,
      from: form.from,
      to: form.to,
      ticketType: form.ticketType,
      amount: String(fare.amount),
    });
    router.push(`/payment?${params.toString()}`);
  }

  const active = tickets.filter(t => ['active', 'Active'].includes(t.status));
  const past   = tickets.filter(t => !['active', 'Active'].includes(t.status));

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', padding: '24px 20px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>My Tickets</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Ticket Wallet</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{active.length} active · {past.length} past</div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>
        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Book New Ticket'}
        </button>

        {showForm && (
          <form onSubmit={goToPayment} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Book a Ticket</p>

            {/* Bus / Route selection */}
            <div className="input-group">
              <label>Select Bus</label>
              <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value, from: '', to: '' }))} required>
                <option value="">Choose your bus</option>
                {routes.map(r => (
                  <option key={r.routeId} value={r.routeId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoute && (
              <>
                <div className="input-group">
                  <label>Boarding Stop</label>
                  <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required>
                    <option value="">Where are you getting on?</option>
                    {selectedRoute.stops.map((s: any) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Destination Stop</label>
                  <select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required>
                    <option value="">Where are you getting off?</option>
                    {selectedRoute.stops.map((s: any) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Ticket type cards */}
            <label className="input-group" style={{ display: 'block', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Ticket Type</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {TICKET_TYPES.map(tt => (
                <div key={tt.value} onClick={() => setForm(f => ({ ...f, ticketType: tt.value }))}
                  style={{
                    border: `2px solid ${form.ticketType === tt.value ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    background: form.ticketType === tt.value ? 'var(--accent-light)' : '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tt.desc}</div>
                  </div>
                  {tt.discount && (
                    <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                      {tt.discount}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Fare breakdown */}
            {fare && (
              <div style={{ background: 'var(--accent-light)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Distance</span>
                  <span>{fare.km} km</span>
                </div>
                {form.ticketType === 'Single' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Flat rate (any distance)</span>
                    <span>₹100</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>₹40 × {fare.km} km</span>
                    <span>₹{fare.amount}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--accent)' }}>₹{fare.amount}</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={!form.route || !form.from || !form.to || !fare}>
              Continue to Payment →
            </button>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <p className="sec-label">Active Tickets</p>
                {active.map((t, i) => <TicketCard key={i} ticket={t} active />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="sec-label" style={{ marginTop: 20 }}>Past Tickets</p>
                {past.map((t, i) => <TicketCard key={i} ticket={t} active={false} />)}
              </>
            )}
            {tickets.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No tickets yet. Book your first ride!</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, active }: { ticket: any; active: boolean }) {
  const date = ticket.purchaseDate
    ? new Date(ticket.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const validUntil = ticket.validUntil
    ? new Date(ticket.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return (
    <div style={{
      background: active ? 'linear-gradient(135deg,#1A1A2E,#16213E)' : '#fff',
      border: `1.5px solid ${active ? 'transparent' : 'var(--border)'}`,
      borderRadius: 16, padding: 18, marginBottom: 12,
      color: active ? '#fff' : 'var(--text)', position: 'relative', overflow: 'hidden',
    }}>
      {active && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(79,70,229,0.15)', borderRadius: '50%' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{ticket.routeName || ticket.route}</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{ticket.from} → {ticket.to}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{ticket.ticketType || 'Single'} pass</div>
        </div>
        <span className={`badge ${active ? 'badge-green' : 'badge-red'}`}>{ticket.status}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Bought {date}</div>
          {active && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Valid until {validUntil}</div>}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: active ? 'var(--accent-muted)' : 'var(--accent)' }}>₹{ticket.amount}</div>
      </div>
    </div>
  );
}
