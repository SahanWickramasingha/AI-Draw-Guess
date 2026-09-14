import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, BrainCircuit } from 'lucide-react'
import { OBJECTS } from '../utils/game'

const SEGMENT_COLORS = [
  ['#0f4464', '#123654'],
  ['#253d7a', '#1e315f'],
  ['#15556a', '#16455e'],
  ['#503b79', '#372f65'],
  ['#62375d', '#402b58'],
  ['#6a422d', '#4f3028'],
  ['#315c48', '#24483c'],
  ['#553367', '#3e2954'],
]

function buildGradient(count) {
  const slice = 360 / count
  const stops = []
  for (let i = 0; i < count; i += 1) {
    const [a, b] = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
    const start = i * slice
    const mid = start + slice * 0.56
    const end = (i + 1) * slice
    stops.push(`${a} ${start}deg ${mid}deg`)
    stops.push(`${b} ${mid}deg ${end}deg`)
  }
  return `conic-gradient(${stops.join(',')})`
}

export default function SpinWheel({ usedNames, onSelected }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const spinTimeoutRef = useRef(null)

  const segments = useMemo(() => OBJECTS, [])
  const segmentAngle = 360 / segments.length

  const spin = () => {
    if (spinning) return

    const availableIndexes = segments
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !usedNames.includes(item.name))

    if (!availableIndexes.length) return

    const picked = availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
    const targetCenter = picked.index * segmentAngle + segmentAngle / 2
    const extraTurns = 5 + Math.floor(Math.random() * 3)
    const finalRotation = rotation + extraTurns * 360 + (360 - targetCenter)

    setSpinning(true)
    setRotation(finalRotation)

    spinTimeoutRef.current = window.setTimeout(() => {
      setSpinning(false)
      onSelected(picked.item)
      spinTimeoutRef.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="wheel-layout">
      <div className="wheel-stage">
        <div className="wheel-pointer">
          <span />
        </div>

        <div
          className={`wheel ${spinning ? 'is-spinning' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            background: buildGradient(segments.length),
          }}
          aria-label="Drawing challenge wheel"
        >
          <div className="wheel-separator-overlay" />

          {segments.map((item, index) => {
            const angle = index * segmentAngle + segmentAngle / 2
            return (
              <div
                className="wheel-label"
                key={item.name}
                style={{
                  transform: `rotate(${angle}deg) translateY(var(--wheel-label-radius)) rotate(${-angle}deg)`,
                }}
              >
                <span className="wheel-emoji">{item.emoji}</span>
                <small>{item.name}</small>
              </div>
            )
          })}

          <div className="wheel-center">
            <BrainCircuit size={31} />
            <strong>AI</strong>
            <small>CHALLENGE</small>
          </div>
        </div>

        <div className="wheel-floor-glow" />
      </div>

      <button className="primary-btn large spin-button" type="button" disabled={spinning} onClick={spin}>
        <Sparkles size={20} />
        {spinning ? 'Spinning...' : 'Spin the Wheel'}
      </button>

      <div className="wheel-help-row">
        <span className="wheel-help-dot" />
        7 possible challenges · each selected object appears only once in your 3 rounds
      </div>
    </div>
  )
}
