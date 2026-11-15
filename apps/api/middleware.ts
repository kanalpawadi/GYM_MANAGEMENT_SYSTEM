import { NextResponse, type NextRequest } from 'next/server';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-cron-secret',
};

/**
 * ALLOWED_ORIGIN may list several websites, comma-separated, e.g.
 *   https://my-gym.vercel.app,http://localhost:5173
 * A browser accepts only one origin in Access-Control-Allow-Origin, so the
 * caller's origin is echoed back when it is on the list.
 */
export function allowedOrigins(value = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'): string[] {
  return value
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = request.method === 'OPTIONS' ? new NextResponse(null, { status: 204 }) : NextResponse.next();

  for (const [key, value] of Object.entries(CORS_HEADERS)) response.headers.set(key, value);
  if (origin && allowedOrigins().includes(origin)) response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  return response;
}

export const config = { matcher: '/api/v1/:path*' };
