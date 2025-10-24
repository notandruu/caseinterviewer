import { cookies } from "next/headers"

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"
const MOCK_USER_EMAIL = "demo@caseprep.ai"
const MOCK_USER_NAME = "Demo User"
const MOCK_AUTH_COOKIE = "mock-auth-session"

export async function setMockSession() {
  const cookieStore = await cookies()
  cookieStore.set(MOCK_AUTH_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })
}

export async function clearMockSession() {
  const cookieStore = await cookies()
  cookieStore.delete(MOCK_AUTH_COOKIE)
}

export async function getMockSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get(MOCK_AUTH_COOKIE)
  return session?.value === "true"
}

export function getMockUser() {
  return {
    id: MOCK_USER_ID,
    email: MOCK_USER_EMAIL,
    full_name: MOCK_USER_NAME,
  }
}
