const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://yvssofjvagavdcmghblt.supabase.co'

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_mj8wVuyvSl69UjYFUjm0ZA_LruQUSBe'

const TABLE = 'leaderboard'

function headers(extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...extra,
  }
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    score: row.score,
    totalSeconds: row.total_time,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString()
      : '',
  }
}

export async function fetchSharedLeaderboard(limit = 10) {
  const query = new URLSearchParams({
    select: 'id,name,score,total_time,created_at',
    order: 'score.desc,total_time.asc,created_at.asc',
    limit: String(limit),
  })

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?${query.toString()}`,
    {
      method: 'GET',
      headers: headers(),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Leaderboard load failed (${response.status}): ${message}`)
  }

  const rows = await response.json()
  return rows.map(mapRow)
}

export async function saveSharedScore({ name, score, totalSeconds }) {
  const cleanName = String(name || '').trim().slice(0, 30)

  if (!cleanName) throw new Error('Player name is required.')

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify({
      name: cleanName,
      score: Number(score),
      total_time: Number(totalSeconds),
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Leaderboard save failed (${response.status}): ${message}`)
  }

  return fetchSharedLeaderboard(10)
}

export function getSupabaseConnectionInfo() {
  return {
    url: SUPABASE_URL,
    configured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
  }
}
