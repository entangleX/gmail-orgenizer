import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const publicFrontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    request.nextUrl.origin;
  const redirectUrl = new URL('/', publicFrontendUrl);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}
