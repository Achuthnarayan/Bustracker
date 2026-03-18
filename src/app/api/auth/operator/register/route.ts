import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Operator, Bus } from '@/models';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, operatorId, busNumber, route, password } = await req.json();
    if (!name || !operatorId || !busNumber || !password)
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    const existing = await Operator.findOne({ operatorId });
    if (existing) return NextResponse.json({ message: 'Operator ID already registered' }, { status: 409 });
    const hashed = await bcrypt.hash(password, 10);
    const operator = await Operator.create({ name, operatorId, busNumber, route, password: hashed });
    if (!(await Bus.findOne({ busNumber }))) await Bus.create({ busNumber, route: route || 'Unassigned' });
    const token = signToken({ id: operator._id, operatorId: operator.operatorId, role: 'operator' });
    return NextResponse.json({ token, user: { id: operator._id, name: operator.name, operatorId: operator.operatorId, busNumber: operator.busNumber, route: operator.route, role: 'operator' } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
