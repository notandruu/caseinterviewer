import { redirect } from "next/navigation"
import { clearMockSession } from "@/lib/auth/mock-auth"

export async function POST() {
  await clearMockSession()
  redirect("/")
}
