import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const publicFrontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null) ||
    'https://gmail-organizer-frontend-390552628217.us-central1.run.app';
  const redirectUrl = new URL('/', publicFrontendUrl);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}
