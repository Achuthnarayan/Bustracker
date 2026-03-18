'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Toast from '@/components/Toast';
import { useAuth, getToken } from '@/hooks/useAuth';

declare global {
  interface Window { Razorpay: any; }
}

const RZP_KEY = 'rzp_test_SScUV0d4LsRdGw';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
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
  const [selectedRouteName, setSelectedRouteName] = useState('');

  useEffect(() => {
    fetch('/api/routes', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []));
  }, []);

  const selectedRoute = routes.find(r => r.routeId === form.route);

  async function handlePay() {
    if (!selectedRoute || !form.from || !form.to) return;
    setLoading(true);
    setSelectedRouteName(selectedRoute.name);

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.');

      // 2. Create order server-side
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: selectedRoute.price, receipt: `bus_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

      // 3. Prefill user info
      const userRaw = localStorage.getItem('bus_tracker_user');
      const user = userRaw ? JSON.parse(userRaw) : {};

      // Capture form values for use inside handler closure
      const capturedForm = { ...form };
      const capturedRoute = { ...selectedRoute };

      // 4. Open Razorpay modal
      const options = {
        key: RZP_KEY,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BusTracker',
        description: `${capturedRoute.name} · ${capturedForm.from} → ${capturedForm.to}`,
        image: 'https://i.imgur.com/n5tjHFD.png',
        order_id: orderData.orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        notes: {
          route: capturedForm.route,
          from: capturedForm.from,
          to: capturedForm.to,
        },
        theme: { color: '#F97316' },
        handler: function (response: any) {
          // Verify & create ticket after successful payment
          fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ticketType: capturedForm.ticketType,
              route: capturedForm.route,
              routeName: capturedRoute.name,
              from: capturedForm.from,
              to: capturedForm.to,
              amount: capturedRoute.price,
              paymentMethod: 'Razorpay',
            }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                setPaidTicket(data.ticket);
                setStep('done');
              } else {
                setToast({ msg: data.message || 'Verification failed', type: 'error' });
              }
              setLoading(false);
            })
            .catch(() => {
              setToast({ msg: 'Payment verified but ticket creation failed. Contact support.', type: 'error' });
              setLoading(false);
            });
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setToast({ msg: resp.error?.description || 'Payment failed', type: 'error' });
        setLoading(false);
      });
      rzp.open();

    } catch (err: any) {
      setToast({ msg: err.message || 'Something went wrong', type: 'error' });
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="page-shell" style={{ background: 'var(--bg)' }}>
        <TopNav />
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>{selectedRouteName}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            {form.from} → {form.to}
          </p>
          {paidTicket && (
            <div style={{
              background: '#fff', border: '1.5px solid var(--border)',
              borderRadius: 14, padding: '16px 24px', marginBottom: 28,
              fontSize: 13, textAlign: 'left', minWidth: 240,
            }}>
              <div style={{ marginBottom: 6 }}>Ticket ID: <strong>{paidTicket.ticketId}</strong></div>
              <div style={{ marginBottom: 6 }}>Amount: <strong>₹{paidTicket.amount}</strong></div>
              <div>Valid until: <strong>{new Date(paidTicket.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn" style={{ background: '#F1F5F9', color: 'var(--text)', padding: '12px 24px' }}
              onClick={() => router.push('/tickets')}>My Tickets</button>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }}
              onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Booking form ──────────────────────────────────────────────────────────
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
            <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value, from: '', to: '' }))}>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.routeId} value={r.routeId}>{r.name} — ₹{r.price}</option>)}
            </select>
          </div>

          {selectedRoute && (
            <>
              <div className="input-group">
                <label>From</label>
                <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))}>
                  <option value="">Select stop</option>
                  {selectedRoute.stops.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>To</label>
                <select value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
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

          {/* Razorpay trust badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18,
            background: '#F8FAFC', borderRadius: 10, padding: '10px 14px',
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Secured by Razorpay</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>UPI · Cards · Net Banking · Wallets</div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={loading || !form.route || !form.from || !form.to}
            onClick={handlePay}
            style={{ fontSize: 15, padding: '14px' }}
          >
            {loading
              ? <><span className="spinner" /> Opening Razorpay...</>
              : `Pay ₹${selectedRoute?.price || '—'} via Razorpay`}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
