import { SignJWT } from 'jose';

const COOKIE_NAME = 'gs_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function createSessionCookie(
  wallet: string,
): Promise<{ name: string; value: string; options: object }> {
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const token = await new SignJWT({ wallet })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);

  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    },
  };
}

export function clearSessionCookie(): {
  name: string;
  value: string;
  options: object;
} {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    },
  };
}

export { COOKIE_NAME };
