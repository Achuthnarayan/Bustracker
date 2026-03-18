import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Bus } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const buses = await Bus.find();
  return NextResponse.json({ buses });
}
