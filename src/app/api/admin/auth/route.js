import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConfiguredAdminSecret } from '@/lib/adminAuth';

export async function POST(req) {
  try {
    const { secretKey } = await req.json();
    const validSecret = getConfiguredAdminSecret();
    const candidate = typeof secretKey === 'string' ? secretKey : '';

    const hashA = crypto.createHash('sha256').update(candidate).digest();
    const hashB = crypto.createHash('sha256').update(validSecret).digest();

    if (candidate && crypto.timingSafeEqual(hashA, hashB)) {
      const response = NextResponse.json({ success: true, message: 'Authenticated successfully' });

      // Store session in an httpOnly cookie so frontend JS/localStorage never holds the password
      response.cookies.set('admin_session', validSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: req.headers.get('x-forwarded-proto') === 'https',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid Admin Secret Key' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('admin_session', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
  });
  return response;
}
