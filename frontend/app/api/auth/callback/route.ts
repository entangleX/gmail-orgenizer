import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const redirectUrl = new URL('/', request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}
