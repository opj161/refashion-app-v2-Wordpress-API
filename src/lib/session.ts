import type { SessionOptions } from 'iron-session';
import type { SessionData } from '@/lib/types';

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'refashion-local-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production' && (process.env.FORCE_HTTPS === 'true' || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https:')), // Use secure cookies only if HTTPS is enabled
    httpOnly: true,
    sameSite: 'lax',
  },
  ttl: 60 * 60 * 24 * 7 // 7 days
};

// Augment the IronSession type definition if you're using TypeScript
// to include the structure of your session data.
declare module 'iron-session' {
  interface IronSessionData {
    user?: SessionData['user'];
  }
}
