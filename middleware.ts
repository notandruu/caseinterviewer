import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Check for Echo session token in cookies
  const echoToken = request.cookies.get("echo-token")?.value ||
                    request.cookies.get("echo_token")?.value ||
                    request.cookies.get("echo-session")?.value

  const isAuthenticated = !!echoToken
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isDashboardOrInterview =
    request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/interview")

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect to login if not authenticated and trying to access protected pages
  if (!isAuthenticated && isDashboardOrInterview) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
