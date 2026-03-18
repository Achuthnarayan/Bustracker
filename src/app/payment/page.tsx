'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Toast from '@/components/Toast';
import { useAuth, getToken } from '@/hooks/useAuth';

export default function PaymentPage() {
  useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState({ route: '', from: '', to: '', ticketType: 'Single', paymentMethod: 'Card', cardNumber: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [step, setStep] = useState<'details' | 'payment' | 'done'>('details');

  useEffect(() => {
    fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []));
  }, []);

  const selectedRoute = routes.find(r => r.routeId === form.route);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ticketType: form.ticketType,
          route: form.route,
          routeName: selectedRoute?.name,
          from: form.from,
          to: form.to,
          amount: selectedRoute?.price,
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep('done');
    } catch (err: any) {
      setToast({ msg: err.message || 'Payment failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="page-shell" style={{ background: 'var(--bg)' }}>
        <TopNav />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Your ticket has been booked for {selectedRoute?.name}.</p>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', padding: '24px 20px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>
          {step === 'details' ? 'Step 1 of 2' : 'Step 2 of 2'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{step === 'details' ? 'Trip Details' : 'Payment'}</div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>
        {step === 'details' ? (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div className="input-group">
              <label>Route</label>
              <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value, from: '', to: '' }))} required>
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
            {selectedRoute && (
              <div style={{ background: 'var(--orange-bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Route</span><span>{selectedRoute.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}>
                  <span>Duration</span><span>{selectedRoute.duration}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <span>Total</span><span style={{ color: 'var(--orange)' }}>KES {selectedRoute.price}</span>
                </div>
              </div>
            )}
            <button className="btn btn-primary" disabled={!form.route || !form.from || !form.to}
              onClick={() => setStep('payment')}>
              Continue to Payment →
            </button>
          </div>
        ) : (
          <form onSubmit={handlePay} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div className="input-group">
              <label>Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option>Card</option>
                <option>M-Pesa</option>
                <option>Cash</option>
              </select>
            </div>
            {form.paymentMethod === 'Card' && (
              <>
                <div className="input-group">
                  <label>Card Number</label>
                  <input placeholder="1234 5678 9012 3456" maxLength={19} value={form.cardNumber}
                    onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value }))} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>Expiry</label>
                    <input placeholder="MM/YY" maxLength={5} value={form.expiry}
                      onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label>CVV</label>
                    <input placeholder="123" maxLength={3} value={form.cvv}
                      onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} required />
                  </div>
                </div>
              </>
            )}
            {form.paymentMethod === 'M-Pesa' && (
              <div style={{ background: '#F0FDF4', border: '1px solid #22C55E', borderRadius: 10, padding: 14, fontSize: 13, marginBottom: 14 }}>
                You will receive an M-Pesa prompt on your registered phone number.
              </div>
            )}
            <div style={{ background: 'var(--orange-bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--orange)' }}>KES {selectedRoute?.price}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" style={{ flex: 1, background: '#F1F5F9', color: 'var(--text)' }} onClick={() => setStep('details')}>Back</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Processing...' : `Pay KES ${selectedRoute?.price}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
