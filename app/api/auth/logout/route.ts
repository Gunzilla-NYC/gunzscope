import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/sessionCookie';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookie = clearSessionCookie();
  response.cookies.set(
    cookie.name,
    cookie.value,
    cookie.options as Parameters<typeof response.cookies.set>[2],
  );
  return response;
}
