import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSectionCandidates } from '@/lib/compose/sections'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 404 })
  }

  const caseId = request.nextUrl.searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'caseId required' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set to use this debug endpoint in dev' },
      { status: 500 }
    )
  }

  const supa = createAdminClient()
  const { data, error } = await supa.from('cases').select('sections').eq('id', caseId).single()
  if (error || !data) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const { raw, keys } = listSectionCandidates((data as any).sections)
  return NextResponse.json({ keys, rawCount: Array.isArray(raw) ? raw.length : 0 })
}
