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
export const CONFIDENCE_THRESHOLD = 0.80
export const CONFIDENCE_MARGIN = 0.20

export function pickRandomUnused(usedNames) {
  const available = OBJECTS.filter((item) => !usedNames.includes(item.name))
  return available[Math.floor(Math.random() * available.length)]
}

export function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem('ai-draw-leaderboard') || '[]')
  } catch {
    return []
  }
}

export function saveLeaderboardEntry(entry) {
  const list = getLeaderboard()
  list.push(entry)
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.totalSeconds - b.totalSeconds
  })
  const trimmed = list.slice(0, 10)
  localStorage.setItem('ai-draw-leaderboard', JSON.stringify(trimmed))
  return trimmed
}
