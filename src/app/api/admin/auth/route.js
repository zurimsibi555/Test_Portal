import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { secretKey } = await req.json();
    const validSecret = process.env.ADMIN_SESSION_TOKEN || process.env.ADMIN_SECRET_KEY || 'teacher123';

    if (secretKey === validSecret) {
      const response = NextResponse.json({ success: true, message: 'Authenticated successfully' });
      
      // Set admin session cookie valid for 7 days
      response.cookies.set('admin_session', validSecret, {
        path: '/',
        httpOnly: false, // Accessible to verify and middleware
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid Admin Secret Key. (Default: teacher123)' },
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
    maxAge: 0,
  });
  return response;
}
