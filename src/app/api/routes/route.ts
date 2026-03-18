import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Route } from '@/models';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  if (!requireAuth(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const routes = await Route.find({ active: true });
  return NextResponse.json({ routes });
}
