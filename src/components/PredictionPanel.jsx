export default function PredictionPanel({ predictions, target, correct, unsure, rejectionReason }) {
  if (!predictions?.length) return null

  return (
    <div className={`prediction-card ${correct ? 'success' : unsure ? 'warning' : 'error'}`}>
      <div className="result-head">
        <div>
          <span className="eyebrow">AI RESULT</span>
          <h3>
            {rejectionReason === 'other'
              ? 'Drawing looks unclear / incomplete'
              : rejectionReason === 'margin'
                ? 'AI sees more than one possible answer'
                : unsure
                  ? 'AI is not confident enough'
                  : correct
                    ? 'Correct recognition!'
                    : `AI guessed ${predictions[0].className}`}
          </h3>
        </div>
        <div className="result-badge">{correct ? '✓' : unsure ? '?' : '×'}</div>
      </div>

      <div className="prediction-list">
        {predictions.map((item) => (
          <div className="prediction-row" key={item.className}>
            <div className="prediction-meta">
              <span>{item.className}</span>
              <strong>{Math.round(item.probability * 100)}%</strong>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${item.className.toLowerCase() === target.toLowerCase() ? 'target' : ''}`}
                style={{ width: `${Math.max(1, item.probability * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
