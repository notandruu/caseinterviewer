import { cookies } from "next/headers"

/**
 * Get Echo session token from cookies (server-side)
 */
export async function getEchoSession() {
  const cookieStore = await cookies()
  const echoToken = cookieStore.get("echo-token")?.value ||
                    cookieStore.get("echo_token")?.value ||
                    cookieStore.get("echo-session")?.value

  return echoToken ? { token: echoToken } : null
}

/**
 * Check if user is authenticated with Echo (server-side)
 */
export async function isEchoAuthenticated(): Promise<boolean> {
  const session = await getEchoSession()
  return !!session
}

/**
 * Get Echo user ID from session
 * Note: This extracts the user ID from the Echo token if available
 */
export async function getEchoUserId(): Promise<string | null> {
  const session = await getEchoSession()
  if (!session) return null

  try {
    // Echo tokens are typically JWT, decode the payload
    const parts = session.token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return payload.sub || payload.userId || payload.user_id || null
  } catch (error) {
    console.error('Failed to decode Echo token:', error)
    return null
  }
}
