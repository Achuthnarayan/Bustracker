'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Toast from '@/components/Toast';
import { useAuth, getToken } from '@/hooks/useAuth';

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState({ route: '', from: '', to: '', ticketType: 'Single' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [step, setStep] = useState<'details' | 'done'>('details');
  const [paidTicket, setPaidTicket] = useState<any>(null);

  useEffect(() => {
    fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []));
  }, []);

  const selectedRoute = routes.find(r => r.routeId === form.route);

  async function handlePay() {
    if (!selectedRoute || !form.from || !form.to) return;
    setLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your connection.');

      // 1. Create order on server
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: selectedRoute.price, receipt: `bus_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message);

      // 2. Get user info for prefill
      const userRaw = localStorage.getItem('bus_tracker_user');
      const user = userRaw ? JSON.parse(userRaw) : {};

      // 3. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BusTracker',
        description: `${selectedRoute.name} — ${form.from} → ${form.to}`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: { color: '#F97316' },
        handler: async (response: any) => {
          // 4. Verify payment & create ticket
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ticketType: form.ticketType,
              route: form.route,
              routeName: selectedRoute.name,
              from: form.from,
              to: form.to,
              amount: selectedRoute.price,
              paymentMethod: 'Razorpay',
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.message);
          setPaidTicket(verifyData.ticket);
          setStep('done');
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setToast({ msg: resp.error.description || 'Payment failed', type: 'error' });
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setToast({ msg: err.message || 'Something went wrong', type: 'error' });
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
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 6 }}>
            {selectedRoute?.name}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>
            {form.from} → {form.to}
          </p>
          {paidTicket && (
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, fontSize: 13 }}>
              <div>Ticket ID: <strong>{paidTicket.ticketId}</strong></div>
              <div style={{ marginTop: 6 }}>Amount: <strong>₹{paidTicket.amount}</strong></div>
              <div style={{ marginTop: 6 }}>Valid until: <strong>{new Date(paidTicket.validUntil).toLocaleDateString()}</strong></div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn" style={{ background: '#F1F5F9', color: 'var(--text)', padding: '12px 24px' }} onClick={() => router.push('/tickets')}>
              My Tickets
            </button>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', padding: '24px 20px 28px', color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>Secure Payment</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Book a Ticket</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Powered by Razorpay</div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 18 }}>

          <div className="input-group">
            <label>Route</label>
            <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value, from: '', to: '' }))} required>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.routeId} value={r.routeId}>{r.name} — ₹{r.price}</option>)}
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
            <div style={{ background: 'var(--orange-bg)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Route</span>
                <span style={{ fontWeight: 600 }}>{selectedRoute.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                <span>{selectedRoute.duration}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: 'var(--orange)' }}>₹{selectedRoute.price}</span>
              </div>
            </div>
          )}

          {/* Razorpay badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>🔒</span>
            <span>Secured by Razorpay — UPI, Cards, Net Banking, Wallets</span>
          </div>

          <button
            className="btn btn-primary"
            disabled={loading || !form.route || !form.from || !form.to}
            onClick={handlePay}
          >
            {loading ? 'Opening payment...' : `Pay ₹${selectedRoute?.price || '—'}`}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
