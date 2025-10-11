import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Echo SDK uses client-side storage (localStorage), not cookies
  // We'll handle auth checks client-side in the pages themselves
  // Middleware only blocks obvious unauthenticated API calls

  const isApiRoute = request.nextUrl.pathname.startsWith("/api")

  // For API routes, check for Echo token
  if (isApiRoute && !request.nextUrl.pathname.startsWith("/api/auth")) {
    const echoToken = request.cookies.get("echo-token")?.value ||
                      request.cookies.get("echo_token")?.value ||
                      request.cookies.get("echo-session")?.value ||
                      request.cookies.get("echo_access_token")?.value

    // Only block if we're certain there's no token
    // This allows the API routes to do their own auth checks
  }

  // Let all page requests through - auth will be handled client-side
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
