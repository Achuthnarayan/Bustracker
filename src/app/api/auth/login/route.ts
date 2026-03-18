import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import { User } from '@/models';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { collegeId, password } = await req.json();
    const user = await User.findOne({ collegeId });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    const token = signToken({ id: user._id, collegeId: user.collegeId });
    return NextResponse.json({ token, user: { id: user._id, name: user.name, collegeId: user.collegeId, email: user.email } });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
