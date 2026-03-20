'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Toast from '@/components/Toast';
import { useAuth, getToken } from '@/hooks/useAuth';

declare global { interface Window { Razorpay: any; } }

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

function PaymentForm() {
  useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState({
    route:      searchParams.get('route')      || '',
    from:       searchParams.get('from')       || '',
    to:         searchParams.get('to')         || '',
    ticketType: searchParams.get('ticketType') || 'Single',
    amount:     Number(searchParams.get('amount') || 0),
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [done, setDone] = useState(false);
  const [paidTicket, setPaidTicket] = useState<any>(null);
  const [paidRouteName, setPaidRouteName] = useState('');

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
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.');

      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: form.amount || selectedRoute?.price, receipt: `bus_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

      const userRaw = localStorage.getItem('bus_tracker_user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      const cf = { ...form };
      const cr = { name: selectedRoute?.name || '', price: form.amount || selectedRoute?.price || 0 };

      const options = {
        key: RZP_KEY,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BusTracker',
        description: `${cr.name} · ${cf.from} → ${cf.to}`,
        order_id: orderData.orderId,
        prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' },
        theme: { color: '#4F46E5' },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: function (response: any) {
          fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ticketType: cf.ticketType,
              route:      cf.route,
              routeName:  cr.name,
              from:       cf.from,
              to:         cf.to,
              amount:     cr.price,
              paymentMethod: 'Razorpay',
            }),
          })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                setPaidTicket(data.ticket);
                setPaidRouteName(cr.name);
                setDone(true);
              } else {
                setToast({ msg: data.message || 'Verification failed', type: 'error' });
              }
              setLoading(false);
            })
            .catch(() => {
              setToast({ msg: 'Payment verified but ticket creation failed.', type: 'error' });
              setLoading(false);
            });
        },
        modal: { ondismiss: () => setLoading(false) },
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

  if (done) {
    return (
      <div className="page-shell" style={{ background: 'var(--bg)' }}>
        <TopNav />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>{paidRouteName}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{form.from} → {form.to}</p>
          {paidTicket && (
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '16px 24px', marginBottom: 28, fontSize: 13, textAlign: 'left', minWidth: 240 }}>
              <div style={{ marginBottom: 6 }}>Ticket ID: <strong>{paidTicket.ticketId}</strong></div>
              <div style={{ marginBottom: 6 }}>Amount: <strong>₹{paidTicket.amount}</strong></div>
              <div>Valid until: <strong>{new Date(paidTicket.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => router.push('/tickets')}>My Tickets</button>
            <button className="btn btn-primary"   style={{ width: 'auto', padding: '12px 24px' }} onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', padding: '24px 20px 28px', color: '#fff' }}>
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
            <div style={{ background: 'var(--accent-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
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
                <span style={{ color: 'var(--accent)' }}>₹{form.amount || selectedRoute?.price}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Secured by Razorpay</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>UPI · Cards · Net Banking · Wallets</div>
            </div>
          </div>

          <button className="btn btn-primary" disabled={loading || !form.route || !form.from || !form.to} onClick={handlePay} style={{ fontSize: 15, padding: '14px' }}>
            {loading ? <><span className="spinner" /> Opening Razorpay...</> : `Pay ₹${form.amount || selectedRoute?.price || '—'} via Razorpay`}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading...</div>}>
      <PaymentForm />
    </Suspense>
  );
}
