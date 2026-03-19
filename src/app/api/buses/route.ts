import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus } from '@/models';
import { requireAuth } from '@/lib/auth';

const STALE_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(req: Request) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const now = Date.now();
  const buses = await Bus.find();

  // Auto-mark stale buses as Offline (no update in 2+ minutes)
  const result = buses.map(b => {
    const obj = b.toObject();
    const age = now - new Date(b.lastUpdate).getTime();
    if (obj.status === 'Active' && age > STALE_MS) {
      obj.status = 'Offline';
    }
    return obj;
  });

  return NextResponse.json({ buses: result });
}
