import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, collegeId, phone, email, password } = await req.json();
    if (!name || !collegeId || !phone || !email || !password)
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    const existing = await User.findOne({ $or: [{ collegeId }, { email }] });
    if (existing) return NextResponse.json({ message: existing.collegeId === collegeId ? 'College ID already registered' : 'Email already registered' }, { status: 409 });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, collegeId, phone, email, password: hashed });
    const token = signToken({ id: user._id, collegeId: user.collegeId });
    return NextResponse.json({ token, user: { id: user._id, name: user.name, collegeId: user.collegeId, email: user.email } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
