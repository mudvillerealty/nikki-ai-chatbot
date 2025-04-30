import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Health check for deployment tools
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // TEMP FIX: Skip auth for now until guest logic is ready
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
