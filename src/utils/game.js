export const OBJECTS = [
  { name: 'Car', emoji: '🚗', hint: 'Draw one simple car' },
  { name: 'Cat', emoji: '🐱', hint: 'Draw one simple cat' },
  { name: 'Fish', emoji: '🐟', hint: 'Draw one simple fish' },
  { name: 'House', emoji: '🏠', hint: 'Draw one simple house' },
  { name: 'Star', emoji: '⭐', hint: 'Draw one simple star' },
  { name: 'Lion', emoji: '🦁', hint: 'Draw one simple lion face' },
  { name: 'Scorpion', emoji: '🦂', hint: 'Draw one simple scorpion' },
]

export const TOTAL_ROUNDS = 3
export const LEADERBOARD_RETENTION_HOURS = 24

export function getLeaderboardCutoffDate(now = Date.now()) {
  return new Date(now - LEADERBOARD_RETENTION_HOURS * 60 * 60 * 1000)
}

export function pickRandomUnused(usedNames) {
  const available = OBJECTS.filter((item) => !usedNames.includes(item.name))
  return available[Math.floor(Math.random() * available.length)]
}

export function getLeaderboard() {
  try {
    const cutoff = getLeaderboardCutoffDate().getTime()
    return JSON.parse(localStorage.getItem('ai-draw-leaderboard') || '[]')
      .filter((entry) => {
        const createdAt = entry.createdAt || entry.created_at || entry.date
        const time = createdAt ? new Date(createdAt).getTime() : 0
        return Number.isFinite(time) && time >= cutoff
      })
      .sort(sortLeaderboardEntries)
  } catch {
    return []
  }
}

export function sortLeaderboardEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score
  if (a.totalSeconds !== b.totalSeconds) return a.totalSeconds - b.totalSeconds

  const aTime = new Date(a.createdAt || a.created_at || a.date || 0).getTime()
  const bTime = new Date(b.createdAt || b.created_at || b.date || 0).getTime()
  return aTime - bTime
}

export function saveLeaderboardEntry(entry) {
  const list = getLeaderboard()
  list.push(entry)
  list.sort(sortLeaderboardEntries)
  const trimmed = list.slice(0, 10)
  localStorage.setItem('ai-draw-leaderboard', JSON.stringify(trimmed))
  return trimmed
}
