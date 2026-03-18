import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { Operator } from '@/models';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { operatorId, password } = await req.json();
    const operator = await Operator.findOne({ operatorId });
    if (!operator || !(await bcrypt.compare(password, operator.password)))
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    const token = signToken({ id: operator._id, operatorId: operator.operatorId, role: 'operator' });
    return NextResponse.json({ token, user: { id: operator._id, name: operator.name, operatorId: operator.operatorId, busNumber: operator.busNumber, route: operator.route, role: 'operator' } });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
