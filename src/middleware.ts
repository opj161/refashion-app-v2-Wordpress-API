import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import type { SessionData } from '@/lib/types';

const ALLOWED_ORIGINS = [
  'https://marcodirenzo.ch',
  'https://demo.marcodirenzo.ch',
];

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isApiV1Route = request.nextUrl.pathname.startsWith('/api/v1/');

  // Handle CORS preflight requests for the API
  if (isApiV1Route && request.method === 'OPTIONS') {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { user } = session;

  const { pathname } = request.nextUrl;

  // Allow access to login page and public assets/API routes
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/') || 
      pathname.startsWith('/uploads/') || // Allow access to uploaded files
      pathname.includes('.')) { // Allows requests for static files like .png, .css
    
    const response = NextResponse.next();
    
    // Add CORS headers for API v1 routes on actual requests
    if (isApiV1Route && origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    return response;
  }

  if (!user?.isLoggedIn) {
    // Redirect to login page, preserving the intended destination
    const loginUrl = new URL('/login', request.url);
    // loginUrl.searchParams.set('redirect_to', pathname); // Optional: redirect back after login
    return NextResponse.redirect(loginUrl);
  }
  // Check admin-only routes
  if (pathname.startsWith('/admin/')) {
    if (user.role !== 'admin') {
      // Redirect non-admin users to home page or show 403
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Allow admin users to access admin routes only if they explicitly navigate to them
    // This prevents automatic redirects to admin areas
  }

  const response = NextResponse.next();
  
  // Add CORS headers for API v1 routes on actual requests
  if (isApiV1Route && origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  return response;
}

// Define which paths the middleware should run on
export const config = {
  matcher: [
    // Match all paths except for static files and image optimization
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
