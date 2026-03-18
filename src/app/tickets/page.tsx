'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Toast from '@/components/Toast';
import { useAuth, getToken } from '@/hooks/useAuth';

export default function TicketsPage() {
  useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route: '', from: '', to: '', ticketType: 'Single', paymentMethod: 'Card' });
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

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

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoute) return;
    setBooking(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...form,
          routeName: selectedRoute.name,
          amount: selectedRoute.price,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setToast({ msg: 'Ticket booked!', type: 'success' });
      setShowForm(false);
      setForm({ route: '', from: '', to: '', ticketType: 'Single', paymentMethod: 'Card' });
      loadAll();
    } catch (err: any) {
      setToast({ msg: err.message || 'Booking failed', type: 'error' });
    } finally {
      setBooking(false);
    }
  }

  const active = tickets.filter(t => ['active', 'Active'].includes(t.status));
  const past = tickets.filter(t => !['active', 'Active'].includes(t.status));

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', padding: '24px 20px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>My Tickets</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Ticket Wallet</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{active.length} active · {past.length} past</div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Book New Ticket'}
        </button>

        {showForm && (
          <form onSubmit={handleBook} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Book a Ticket</p>
            <div className="input-group">
              <label>Route</label>
              <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} required>
                <option value="">Select route</option>
                {routes.map(r => <option key={r.routeId} value={r.routeId}>{r.name} — KES {r.price}</option>)}
              </select>
            </div>
            {selectedRoute && (
              <>
                <div className="input-group">
                  <label>From</label>
                  <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required>
                    <option value="">Select stop</option>
                    {selectedRoute.stops.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>To</label>
                  <select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required>
                    <option value="">Select stop</option>
                    {selectedRoute.stops.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="input-group">
              <label>Ticket Type</label>
              <select value={form.ticketType} onChange={e => setForm(f => ({ ...f, ticketType: e.target.value }))}>
                <option>Single</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="input-group">
              <label>Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option>Card</option>
                <option>M-Pesa</option>
                <option>Cash</option>
              </select>
            </div>
            {selectedRoute && (
              <div style={{ background: 'var(--orange-bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                Total: <strong>KES {selectedRoute.price}</strong>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={booking}>
              {booking ? 'Booking...' : 'Confirm Booking'}
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

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

function TicketCard({ ticket, active }: { ticket: any; active: boolean }) {
  const date = ticket.purchaseDate
    ? new Date(ticket.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return (
    <div style={{
      background: active ? 'linear-gradient(135deg,#1A1A2E,#16213E)' : '#fff',
      border: `1.5px solid ${active ? 'transparent' : 'var(--border)'}`,
      borderRadius: 16, padding: 18, marginBottom: 12, color: active ? '#fff' : 'var(--text)',
      position: 'relative', overflow: 'hidden',
    }}>
      {active && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(249,115,22,0.15)', borderRadius: '50%' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{ticket.routeName || ticket.route}</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{ticket.from} → {ticket.to}</div>
        </div>
        <span className={`badge ${active ? 'badge-green' : 'badge-red'}`}>{ticket.status}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{date}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: active ? '#F97316' : 'var(--orange)' }}>KES {ticket.amount}</div>
      </div>
    </div>
  );
}
