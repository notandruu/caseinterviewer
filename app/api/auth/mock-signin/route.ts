import { setMockSession } from "@/lib/auth/mock-auth"
import { NextResponse } from "next/server"

export async function POST() {
  await setMockSession()
  return NextResponse.json({ success: true })
}
