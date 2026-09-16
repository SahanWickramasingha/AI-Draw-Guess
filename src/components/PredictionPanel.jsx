import { canonicalClassName, normalizeClassName } from '../utils/game'

export default function PredictionPanel({ predictions, target, correct, unsure, rejectionReason }) {
  if (!predictions?.length) return null

  const topPrediction = canonicalClassName(predictions[0].className)

  return (
    <div className={`prediction-card ${correct ? 'success' : unsure ? 'warning' : 'error'}`}>
      <div className="result-head">
        <div>
          <span className="eyebrow">AI RESULT</span>
          <h3>
            {rejectionReason === 'other'
              ? 'Drawing looks unclear / incomplete'
                : rejectionReason === 'monkey'
                  ? 'Monkey is not an active challenge'
                  : unsure
                    ? 'AI could not accept this drawing'
                    : `AI guessed ${topPrediction}`}
          </h3>
        </div>
        <div className="result-badge">{correct ? '✓' : unsure ? '?' : '×'}</div>
      </div>

      <div className="prediction-list">
        {predictions.map((item) => (
          <div className="prediction-row" key={item.className}>
            <div className="prediction-meta">
              <span>{canonicalClassName(item.className)}</span>
              <strong>{Math.round(item.probability * 100)}%</strong>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${normalizeClassName(item.className) === normalizeClassName(target) ? 'target' : ''}`}
                style={{ width: `${Math.max(1, item.probability * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
