import { useEffect, useRef, useState } from 'react'
import * as tmImage from '@teachablemachine/image'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BrainCircuit,
  Clock3,
  ChevronRight,
  CircleHelp,
  Home,
  Play,
  RotateCcw,
  ShieldCheck,
  Trophy,
  UserRound,
  WandSparkles,
  Zap,
} from 'lucide-react'
import DrawingCanvas from './components/DrawingCanvas'
import SpinWheel from './components/SpinWheel'
import PredictionPanel from './components/PredictionPanel'
import { preprocessDrawingCanvas, hasEnoughDrawingDetail } from './utils/preprocessDrawing'
import { fetchSharedLeaderboard, saveSharedScore } from './utils/supabaseLeaderboard'
import {
  CONFIDENCE_THRESHOLD,
  CONFIDENCE_MARGIN,
  TOTAL_ROUNDS,
  getLeaderboard,
  saveLeaderboardEntry,
} from './utils/game'

const MODEL_URL = '/model/model.json'
const METADATA_URL = '/model/metadata.json'
const DRAW_TIME_LIMIT = 20

function ColorGameIcon({ type }) {
  const common = { width: 48, height: 48, viewBox: '0 0 64 64', 'aria-hidden': true }

  if (type === 'Cat') {
    return (
      <svg {...common}>
        <defs><linearGradient id="catG" x1="0" x2="1"><stop stopColor="#ffb347"/><stop offset="1" stopColor="#ff5fa2"/></linearGradient></defs>
        <path d="M18 23 14 11l12 7c4-2 8-2 12 0l12-7-4 12c4 4 6 9 6 15 0 11-9 18-20 18S12 49 12 38c0-6 2-11 6-15Z" fill="url(#catG)" stroke="#ffe0ba" strokeWidth="2"/>
        <circle cx="25" cy="36" r="2.2" fill="#17203b"/><circle cx="39" cy="36" r="2.2" fill="#17203b"/>
        <path d="M29 43c2 2 4 2 6 0" fill="none" stroke="#17203b" strokeWidth="2.4" strokeLinecap="round"/>
      </svg>
    )
  }

  if (type === 'Fish') {
    return (
      <svg {...common}>
        <defs><linearGradient id="fishG" x1="0" x2="1"><stop stopColor="#23e5ff"/><stop offset="1" stopColor="#4386ff"/></linearGradient></defs>
        <path d="M12 32c10-13 25-15 35-5l10-8-2 13 2 13-10-8c-10 10-25 8-35-5Z" fill="url(#fishG)" stroke="#b8f8ff" strokeWidth="2"/>
        <circle cx="38" cy="29" r="2.4" fill="#071127"/>
        <path d="M21 32c5 3 10 3 15 0" fill="none" stroke="#d5fbff" strokeWidth="2" opacity=".8"/>
      </svg>
    )
  }

  if (type === 'Star') {
    return (
      <svg {...common}>
        <defs><linearGradient id="starG" x1="0" x2="1"><stop stopColor="#ffe56b"/><stop offset="1" stopColor="#ff9f43"/></linearGradient></defs>
        <path d="m32 7 7.2 15 16.4 2.4-11.8 11.5 2.8 16.2L32 44.4 17.4 52l2.8-16.1L8.4 24.4 24.8 22 32 7Z" fill="url(#starG)" stroke="#fff1a8" strokeWidth="2"/>
      </svg>
    )
  }

  if (type === 'House') {
    return (
      <svg {...common}>
        <defs><linearGradient id="houseG" x1="0" x2="1"><stop stopColor="#ff8b3d"/><stop offset="1" stopColor="#ff4f70"/></linearGradient></defs>
        <path d="M10 30 32 10l22 20" fill="none" stroke="#ffc083" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 28h32v25H16Z" fill="url(#houseG)" stroke="#ffd4a8" strokeWidth="2"/>
        <rect x="28" y="37" width="9" height="16" rx="2" fill="#17213b"/>
        <rect x="20" y="34" width="6" height="7" rx="1.5" fill="#ffe7b5"/>
        <rect x="40" y="34" width="6" height="7" rx="1.5" fill="#ffe7b5"/>
      </svg>
    )
  }

  return (
    <svg {...common}>
      <defs><linearGradient id="carG" x1="0" x2="1"><stop stopColor="#59e8ff"/><stop offset=".48" stopColor="#5d79ff"/><stop offset="1" stopColor="#ef5cff"/></linearGradient></defs>
      <path d="M12 39h4l5-13c1-3 4-5 7-5h12c4 0 6 2 8 5l5 13h2c3 0 5 2 5 5v4H7v-4c0-3 2-5 5-5Z" fill="url(#carG)" stroke="#c5f7ff" strokeWidth="2"/>
      <circle cx="20" cy="48" r="6" fill="#111b37" stroke="#7beaff" strokeWidth="2"/>
      <circle cx="48" cy="48" r="6" fill="#111b37" stroke="#b58cff" strokeWidth="2"/>
      <path d="M24 26h17l5 12H19l5-12Z" fill="#d8f9ff" opacity=".75"/>
    </svg>
  )
}

const OrbitCard = ({ className, label }) => (
  <div className={`orbit-card ${className}`}>
    <div className="orbit-card-icon colorful"><ColorGameIcon type={label} /></div>
    <span>{label}</span>
  </div>
)

function Stepper({ step = 1 }) {
  const items = [
    ['Player', 1],
    ['Challenge', 2],
    ['Draw', 3],
    ['Result', 4],
  ]
  return (
    <div className="progress-stepper" aria-label="Game progress">
      {items.map(([label, num], index) => (
        <div className="step-wrap" key={label}>
          <div className={`step-item ${step >= num ? 'active' : ''}`}>
            <div className="step-circle">{num}</div>
            <span>{label}</span>
          </div>
          {index < items.length - 1 && <div className={`step-line ${step > num ? 'active' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [name, setName] = useState('')
  const [draftName, setDraftName] = useState('')
  const [round, setRound] = useState(1)
  const [selectedObject, setSelectedObject] = useState(null)
  const [usedNames, setUsedNames] = useState([])
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([])
  const [predictions, setPredictions] = useState([])
  const [isPredicting, setIsPredicting] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [modelStatus, setModelStatus] = useState('loading')
  const [modelError, setModelError] = useState('')
  const [roundStartedAt, setRoundStartedAt] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('loading')
  const [leaderboardMessage, setLeaderboardMessage] = useState('Connecting to live leaderboard...')
  const [savedFinal, setSavedFinal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DRAW_TIME_LIMIT)
  const [timeExpired, setTimeExpired] = useState(false)

  const modelRef = useRef(null)
  const canvasRef = useRef(null)
  const finalSubmissionKeyRef = useRef(null)

  useEffect(() => {
    let active = true
    async function loadModel() {
      try {
        const model = await tmImage.load(MODEL_URL, METADATA_URL)
        if (!active) return
        modelRef.current = model
        setModelStatus('ready')
      } catch (error) {
        if (!active) return
        setModelStatus('missing')
        setModelError('Copy model.json, metadata.json and weights.bin into public/model/, then reload.')
      }
    }
    loadModel()

    // Show a local fallback immediately, then replace it with the shared
    // Supabase leaderboard when the network request succeeds.
    setLeaderboard(getLeaderboard())
    setLeaderboardStatus('loading')
    setLeaderboardMessage('Connecting to live leaderboard...')

    fetchSharedLeaderboard(10)
      .then((rows) => {
        if (!active) return
        setLeaderboard(rows)
        setLeaderboardStatus('live')
        setLeaderboardMessage('Live across all devices')
      })
      .catch((error) => {
        console.error(error)
        if (!active) return
        setLeaderboardStatus('offline')
        setLeaderboardMessage('Offline fallback · scores saved on this device')
      })

    return () => { active = false }
  }, [])

  const resetRoundState = () => {
    setSelectedObject(null)
    setPredictions([])
    setHasDrawing(false)
    setRoundStartedAt(null)
    setTimeLeft(DRAW_TIME_LIMIT)
    setTimeExpired(false)
    window.setTimeout(() => canvasRef.current?.clear?.(), 0)
  }

  const resetGameState = ({ keepPlayer = false } = {}) => {
    setScreen('welcome')
    if (!keepPlayer) {
      setName('')
      setDraftName('')
    }
    setRound(1)
    setSelectedObject(null)
    setUsedNames([])
    setScore(0)
    setResults([])
    setPredictions([])
    setHasDrawing(false)
    setRoundStartedAt(null)
    setSavedFinal(false)
    setTimeLeft(DRAW_TIME_LIMIT)
    setTimeExpired(false)
    finalSubmissionKeyRef.current = null
    window.setTimeout(() => canvasRef.current?.clear?.(), 0)
  }

  const startGame = () => setScreen('name')

  const submitName = (event) => {
    event.preventDefault()
    const clean = draftName.trim().slice(0, 24)
    if (!clean) return
    setName(clean)
    setScreen('wheel')
  }

  const handleWheelSelected = (item) => {
    setSelectedObject(item)
    setUsedNames((prev) => [...prev, item.name])
    setScreen('challenge')
  }

  const startDrawingRound = () => {
    setPredictions([])
    setHasDrawing(false)
    setTimeLeft(DRAW_TIME_LIMIT)
    setTimeExpired(false)
    setRoundStartedAt(Date.now())
    setScreen('draw')
    window.setTimeout(() => canvasRef.current?.clear?.(), 0)
  }

  const goHome = () => {
    resetGameState()
  }

  const goBack = () => {
    if (screen === 'name') {
      resetGameState()
      return
    }

    if (screen === 'wheel') {
      resetRoundState()
      setUsedNames([])
      setRound(1)
      setScore(0)
      setResults([])
      setSavedFinal(false)
      finalSubmissionKeyRef.current = null
      setScreen('name')
      return
    }

    if (screen === 'challenge') {
      setUsedNames((prev) => prev.filter((item) => item !== selectedObject?.name))
      resetRoundState()
      setScreen('wheel')
      return
    }

    if (screen === 'draw') {
      if (lastResult?.round === round) {
        if (lastResult.correct) {
          setScore((value) => Math.max(0, value - 1))
        }
        setResults((prev) => prev.filter((item) => item.round !== round))
      }
      setUsedNames((prev) => prev.filter((item) => item !== selectedObject?.name))
      resetRoundState()
      setScreen('wheel')
      return
    }

    if (screen === 'final') {
      resetGameState()
    }
  }

  const askAI = async () => {
    if (!modelRef.current || !hasDrawing || !selectedObject || isPredicting) return
    setIsPredicting(true)
    try {
      const sourceCanvas = canvasRef.current?.getCanvas?.()
      const prepared = preprocessDrawingCanvas(sourceCanvas)
      const seconds = Math.min(DRAW_TIME_LIMIT, Math.max(1, Math.round((Date.now() - roundStartedAt) / 1000)))

      // Reject almost-empty / too-small drawings before asking the model.
      if (!hasEnoughDrawingDetail(prepared)) {
        setPredictions([])
        setResults((prev) => [...prev, {
          round,
          target: selectedObject.name,
          emoji: selectedObject.emoji,
          predicted: 'Not enough detail',
          confidence: 0,
          correct: false,
          unsure: true,
          rejectionReason: 'detail',
          seconds,
        }])
        return
      }

      // Predict using the normalized 224x224 centered drawing rather than the
      // raw full-size game canvas.
      const raw = await modelRef.current.predict(prepared.canvas)
      const sorted = [...raw].sort((a, b) => b.probability - a.probability)
      setPredictions(sorted)

      const top = sorted[0]
      const second = sorted[1]
      const margin = top.probability - (second?.probability ?? 0)
      const isOther = ['other', 'monkey'].includes(top.className.toLowerCase())
      const lowConfidence = top.probability < CONFIDENCE_THRESHOLD
      const smallMargin = margin < CONFIDENCE_MARGIN
      const unsure = isOther || lowConfidence || smallMargin
      const correct = !unsure && top.className.toLowerCase() === selectedObject.name.toLowerCase()

      if (correct) setScore((value) => value + 1)

      setResults((prev) => [...prev, {
        round,
        target: selectedObject.name,
        emoji: selectedObject.emoji,
        predicted: top.className,
        confidence: top.probability,
        margin,
        correct,
        unsure,
        rejectionReason: isOther ? 'other' : lowConfidence ? 'confidence' : smallMargin ? 'margin' : null,
        seconds,
      }])
    } finally {
      setIsPredicting(false)
    }
  }

  const lastResult = results[results.length - 1]
  const roundFinished = predictions.length > 0 || lastResult?.round === round
  const topWinners = leaderboard.slice(0, 3)

  useEffect(() => {
    if (screen !== 'draw' || roundFinished || timeExpired || timeLeft <= 0) return
    const timer = window.setTimeout(() => {
      setTimeLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [screen, roundFinished, timeExpired, timeLeft])

  useEffect(() => {
    if (screen !== 'draw' || roundFinished || timeExpired || timeLeft !== 0 || !selectedObject) return

    setTimeExpired(true)

    if (hasDrawing && modelStatus === 'ready') {
      void askAI()
      return
    }

    setResults((prev) => [
      ...prev,
      {
        round,
        target: selectedObject.name,
        emoji: selectedObject.emoji,
        predicted: 'No drawing',
        confidence: 0,
        correct: false,
        unsure: true,
        seconds: DRAW_TIME_LIMIT,
      },
    ])
  }, [screen, roundFinished, timeExpired, timeLeft, selectedObject, hasDrawing, modelStatus])

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setScreen('final')
      return
    }
    setRound((value) => value + 1)
    setSelectedObject(null)
    setPredictions([])
    setHasDrawing(false)
    setTimeLeft(DRAW_TIME_LIMIT)
    setTimeExpired(false)
    setScreen('wheel')
  }

  useEffect(() => {
    if (screen !== 'final' || savedFinal || results.length !== TOTAL_ROUNDS) return

    const finalScore = results.filter((item) => item.correct).length
    const finalSeconds = results.reduce((sum, item) => sum + item.seconds, 0)
    const submissionKey = `${name}-${finalScore}-${finalSeconds}-${results.map((item) => `${item.round}:${item.target}:${item.correct}:${item.seconds}`).join('|')}`
    if (finalSubmissionKeyRef.current === submissionKey) return
    finalSubmissionKeyRef.current = submissionKey

    // Lock this result immediately so React re-renders cannot submit it twice.
    setSavedFinal(true)

    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      score: finalScore,
      totalSeconds: finalSeconds,
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
    }

    // Keep localStorage as a safety fallback for temporary internet outages.
    const localUpdated = saveLeaderboardEntry(entry)
    setLeaderboard(localUpdated)
    setLeaderboardStatus('syncing')
    setLeaderboardMessage('Saving score to live leaderboard...')

    saveSharedScore({
      name,
      score: finalScore,
      totalSeconds: finalSeconds,
    })
      .then((rows) => {
        setLeaderboard(rows)
        setLeaderboardStatus('live')
        setLeaderboardMessage('Live across all devices')
      })
      .catch((error) => {
        console.error(error)
        setLeaderboardStatus('offline')
        setLeaderboardMessage('Could not sync · score kept on this device')
      })
  }, [screen, savedFinal, results, name])

  const restart = () => {
    resetGameState()
  }

  const activeStep =
    screen === 'name' ? 1 :
    screen === 'wheel' || screen === 'challenge' ? 2 :
    screen === 'draw' ? 3 : 4

  return (
    <div className="app cinematic-app">
      <div className="space-bg" />
      <div className="scan-lines" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {screen === 'welcome' ? (
        <header className="cinematic-nav">
          <div className="brand brand-large">
            <div className="brand-mark"><BrainCircuit size={28} /></div>
            <div>
              <strong><span>AI</span> Draw & Guess</strong>
              <small>DRAW · PLAY · CHALLENGE</small>
            </div>
          </div>
          <div className="home-nav-actions">
            <div className="open-day-pill"><img className="ousl-badge-logo" src="/ousl-logo.png" alt="OUSL logo" /><span>Open Day 2026</span></div>
          </div>
        </header>
      ) : (
        <header className="cinematic-nav inner-nav">
          <div className="nav-controls" aria-label="Game navigation">
            <button className="nav-control-btn" type="button" onClick={goBack} aria-label="Go back">
              <ArrowLeft size={17} />
              <span>Back</span>
            </button>
            <button className="nav-control-btn" type="button" onClick={goHome} aria-label="Go home">
              <Home size={17} />
              <span>Home</span>
            </button>
          </div>
          <div className="brand">
            <div className="brand-mark"><BrainCircuit size={24} /></div>
            <div>
              <strong><span>AI</span> Draw & Guess</strong>
              <small>Open Day Interactive Game</small>
            </div>
          </div>
          <Stepper step={activeStep} />
          <div className={`model-pill ${modelStatus}`}>
            <span className="status-dot" />
            <div>
              <strong>{modelStatus === 'ready' ? 'AI Model Ready' : modelStatus === 'loading' ? 'Loading AI' : 'Model Required'}</strong>
              <small>7 challenges · AI rejection enabled</small>
            </div>
          </div>
        </header>
      )}

      <main className={screen === 'welcome' ? 'home-main' : 'page cinematic-page'}>
        {modelStatus === 'missing' && screen !== 'welcome' && (
          <div className="model-warning">
            <CircleHelp size={20} />
            <div><strong>Model files needed</strong><p>{modelError}</p></div>
          </div>
        )}

        {screen === 'welcome' && (
          <section className="cinematic-hero" id="home">
            <div className="side-note left-note">Simple<br/>Drawings<br/><b>Real AI<br/>Magic!</b></div>
            <div className="side-note right-note">Turn<br/>Your Ideas<br/>Into<br/><b>Discovery!</b></div>

            <div className="hero-center">
              <div className="ai-powered-pill"><Zap size={16} fill="currentColor"/> AI POWERED GAME</div>
              <h1>Can AI Understand<br/><span>Your Drawing?</span></h1>
              <p className="hero-sub">Spin <i>•</i> Draw <i>•</i> Challenge the AI</p>

              <div className="orb-stage">
                <div className="orbital-ring ring-one" />
                <div className="orbital-ring ring-two" />
                <div className="orbital-ring ring-three" />

                <OrbitCard className="oc-cat" label="Cat" />
                <OrbitCard className="oc-fish" label="Fish" />
                <OrbitCard className="oc-house" label="House" />
                <OrbitCard className="oc-star" label="Star" />
                <OrbitCard className="oc-car" label="Car" />

                <button className="ai-start-orb" type="button" onClick={startGame}>
                  <span className="orb-ai">AI</span>
                  <span className="tap-start">TAP TO START <ArrowRight size={18}/></span>
                  <span className="orb-arrow">↓</span>
                </button>

                <div className="orb-base">
                  <div className="base-ring br1" />
                  <div className="base-ring br2" />
                  <div className="base-platform" />
                </div>
              </div>

              <div className="hero-feature-row">
                <div className="feature-chip"><div className="feature-icon"><Play size={21}/></div><div><strong>3 Rounds</strong><span>Fun Challenges</span></div></div>
                <div className="feature-chip"><div className="feature-icon"><BrainCircuit size={23}/></div><div><strong>AI Powered</strong><span>Real ML Model</span></div></div>
                <div className="feature-chip"><div className="feature-icon gold"><Trophy size={22}/></div><div><strong>Can You Beat It?</strong><span>Find Out!</span></div></div>
              </div>
            </div>

            <div className="desk-prop left-prop">
              <div className="idea-screen">Good<br/>Ideas<br/>Start<br/>Here!</div>
            </div>
            <div className="robot-prop">
              <div className="robot-head"><div className="robot-face"><span/><span/></div><div className="robot-antenna"/></div>
              <div className="robot-body"><Bot size={30}/></div>
              <div className="book-stack"><span>Create</span><span>Play</span><span>Learn</span><span>Innovate</span></div>
            </div>

            <div className="home-footer left">Built for <b>Open Day 2026</b><small>Explore · Learn · Experience</small></div>
            <div className="home-footer right">AI Draw & Guess<small>A Smarter, More Creative Tomorrow</small></div>
          </section>
        )}

        {screen === 'name' && (
          <section className="player-setup-screen">
            <div className="setup-side-copy left-copy">Good<br/>Players<br/>Create<br/>Great<br/>Ideas!</div>
            <div className="setup-side-copy right-copy">Draw<br/>Play<br/>Learn<br/>Innovate</div>

            <div className="setup-robot">
              <div className="robot-head large"><div className="robot-face"><span/><span/></div><div className="robot-antenna"/></div>
              <div className="robot-body large"><Bot size={36}/></div>
            </div>

            <div className="setup-card-wrap">
              <div className="setup-card-glow" />
              <div className="glass-panel setup-card">
                <div className="setup-icon-ring"><UserRound size={52}/></div>
                <span className="eyebrow wide">PLAYER SETUP</span>
                <h2>What should we call<br/><span>you?</span></h2>
                <p>Your name will appear on the local Open Day<br/>leaderboard.</p>

                <form onSubmit={submitName} className="setup-form">
                  <div className="setup-input-wrap">
                    <UserRound size={24}/>
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={24}
                      placeholder="Enter your name"
                      aria-label="Player name"
                    />
                  </div>
                  <button className="setup-continue" type="submit" disabled={!draftName.trim()}>
                    Continue <ArrowRight size={24}/>
                  </button>
                </form>

                <div className="setup-tip"><ShieldCheck size={17}/> Be creative! Use your real name or a cool nickname.</div>
              </div>
              <div className="setup-platform"><span/><span/><span/></div>
            </div>

            <div className="quote-card">“ Turning<br/>Ideas<br/>Into<br/>Discovery ”</div>
            <div className="inner-footer left">● OUSL OPEN DAY 2026<small>EXPLORE · EXPERIENCE · INNOVATE</small></div>
            <div className="inner-footer right"><BrainCircuit size={21}/> AI Powered Drawing Recognition<small>A Smarter, More Creative Tomorrow</small></div>
          </section>
        )}

        {screen === 'wheel' && (
          <section className="game-screen modern-game-screen">
            <div className="game-top-copy">
              <div>
                <span className="eyebrow">ROUND {round} OF {TOTAL_ROUNDS}</span>
                <h2>Spin your <span>AI challenge.</span></h2>
                <p>Hi {name}, let the wheel choose what you draw next.</p>
              </div>
              <div className="score-pill"><Trophy size={18}/> Score {score}/{TOTAL_ROUNDS}</div>
            </div>

            <div className="glass-panel futuristic-panel wheel-panel">
              <SpinWheel usedNames={usedNames} onSelected={handleWheelSelected} />
            </div>
          </section>
        )}

        {screen === 'challenge' && selectedObject && (
          <section className="center-screen futuristic-center">
            <div className="glass-panel challenge-panel futuristic-panel">
              <span className="eyebrow">YOUR CHALLENGE</span>
              <div className="challenge-emoji">{selectedObject.emoji}</div>
              <h2>Draw a <span>{selectedObject.name}</span></h2>
              <p className="muted">{selectedObject.hint}. Keep it simple, bold and clear.</p>
              <button className="primary-btn large neon-btn" type="button" onClick={startDrawingRound}>
                <WandSparkles size={20}/> Start Drawing
              </button>
            </div>
          </section>
        )}

        {screen === 'draw' && selectedObject && (
          <section className="game-screen modern-game-screen">
            <div className="game-top-copy">
              <div>
                <span className="eyebrow">ROUND {round} OF {TOTAL_ROUNDS}</span>
                <h2>Draw: <span>{selectedObject.emoji} {selectedObject.name}</span></h2>
                <p>Use the canvas and ask the AI when you're ready.</p>
              </div>
              <div className="draw-head-actions">
                <div className={`timer-pill ${timeLeft <= 5 ? 'danger' : ''} ${roundFinished ? 'finished' : ''}`}>
                  <div
                    className="timer-ring"
                    style={{ '--timer-progress': `${Math.max(0, timeLeft / DRAW_TIME_LIMIT) * 360}deg` }}
                  >
                    <div className="timer-ring-inner"><Clock3 size={18}/></div>
                  </div>
                  <div>
                    <strong>{roundFinished ? 'Done' : `${timeLeft}s`}</strong>
                    <span>Drawing time</span>
                  </div>
                </div>
                <div className="score-pill"><Trophy size={18}/> Score {score}/{TOTAL_ROUNDS}</div>
              </div>
            </div>

            <div className="draw-grid">
              <div className="glass-panel futuristic-panel canvas-panel">
                <div className="canvas-stage">
                  <DrawingCanvas
                    ref={canvasRef}
                    onDrawingChange={setHasDrawing}
                    disabled={timeExpired || roundFinished || isPredicting}
                  />
                  {timeExpired && (
                    <div className="time-up-overlay">
                      <Clock3 size={28}/>
                      <strong>TIME'S UP!</strong>
                      <span>{hasDrawing ? 'AI is checking your drawing…' : 'No drawing was submitted.'}</span>
                    </div>
                  )}
                </div>

                <div className="canvas-actions">
                  <div className="draw-status">
                    <span className={`status-dot ${hasDrawing ? 'ready' : ''}`} />
                    {roundFinished
                      ? 'Round completed'
                      : timeExpired
                        ? '20 second limit reached'
                        : hasDrawing
                          ? 'Drawing detected'
                          : 'Start drawing on the canvas'}
                  </div>
                  <button
                    className="primary-btn neon-btn"
                    type="button"
                    onClick={askAI}
                    disabled={!hasDrawing || modelStatus !== 'ready' || isPredicting || roundFinished || timeExpired}
                  >
                    <BrainCircuit size={20}/>
                    {isPredicting ? 'AI is thinking...' : 'Ask AI'}
                  </button>
                </div>
              </div>

              <aside className="side-column">
                {!roundFinished ? (
                  <>
                    <div className="glass-panel futuristic-panel timer-tip-card">
                      <div className="timer-tip-top"><Clock3 size={21}/><strong>20 Second Challenge</strong></div>
                      <p>Draw quickly. When the timer reaches zero, the canvas locks and the AI checks automatically.</p>
                    </div>
                    <div className="glass-panel futuristic-panel tip-card">
                      <span className="eyebrow">DRAWING TIPS</span>
                      <h3>Keep it simple.</h3>
                      <ul>
                        <li>Draw only one object.</li>
                        <li>Use clear, bold outlines.</li>
                        <li>Stay inside the white canvas.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {predictions.length > 0 ? (
                      <PredictionPanel
                        predictions={predictions}
                        target={selectedObject.name}
                        correct={lastResult?.correct}
                        unsure={lastResult?.unsure}
                        rejectionReason={lastResult?.rejectionReason}
                      />
                    ) : lastResult?.rejectionReason === 'detail' ? (
                      <div className="glass-panel futuristic-panel timeout-result quality-result">
                        <BrainCircuit size={30}/>
                        <span className="eyebrow">AI QUALITY CHECK</span>
                        <h3>Add more detail</h3>
                        <p>The drawing was too small or incomplete for a reliable AI prediction, so no point was awarded.</p>
                      </div>
                    ) : (
                      <div className="glass-panel futuristic-panel timeout-result">
                        <Clock3 size={30}/>
                        <span className="eyebrow">ROUND ENDED</span>
                        <h3>Time's up!</h3>
                        <p>No drawing was submitted before the 20 second limit, so this round scores 0 points.</p>
                      </div>
                    )}
                    <button className="primary-btn full-width neon-btn" type="button" onClick={nextRound}>
                      {round >= TOTAL_ROUNDS ? 'View Final Result' : 'Next Round'}
                      <ChevronRight size={19}/>
                    </button>
                  </>
                )}
              </aside>
            </div>
          </section>
        )}

        {screen === 'final' && (
          <section className="final-layout cinematic-final">
            <div className="glass-panel futuristic-panel final-card">
              <div className="trophy-orb"><Trophy size={42}/></div>
              <span className="eyebrow">GAME COMPLETE</span>
              <h2>{score === 3 ? 'Perfect score!' : score >= 2 ? 'Great job!' : 'Nice try!'}</h2>
              <p className="muted">{name}, you completed all three AI drawing challenges.</p>

              <div className="big-score"><strong>{score}</strong><span>/ {TOTAL_ROUNDS}</span></div>

              <div className="round-summary">
                {results.map((item) => (
                  <div className="summary-row" key={item.round}>
                    <span className="summary-icon">{item.emoji}</span>
                    <div><strong>Round {item.round}: {item.target}</strong><span>AI guessed {item.predicted} · {Math.round(item.confidence * 100)}% · {item.seconds}s</span></div>
                    <div className={`summary-result ${item.correct ? 'good' : 'bad'}`}>{item.correct ? '✓' : '×'}</div>
                  </div>
                ))}
              </div>
              <button className="primary-btn large neon-btn" type="button" onClick={restart}><RotateCcw size={19}/> Play Again</button>
            </div>

            <div className="glass-panel futuristic-panel leaderboard-card">
              <div className="leaderboard-head">
                <div>
                  <span className="eyebrow">LIVE LEADERBOARD</span>
                  <h3>Open Day Top Players</h3>
                  <div className={`leaderboard-sync ${leaderboardStatus}`}>
                    <span className="sync-dot" />
                    <span>{leaderboardMessage}</span>
                  </div>
                </div>
                <Trophy size={24}/>
              </div>
              <div className="top-winners">
                <div className="top-winners-title">
                  <span className="eyebrow">TOP CHALLENGE WINNERS</span>
                  <strong>Best scores in the last 24 hours</strong>
                </div>
                {topWinners.length === 0 ? (
                  <p className="muted">No winners yet.</p>
                ) : (
                  <div className="winner-grid">
                    {topWinners.map((entry, index) => (
                      <div className={`winner-card rank-${index + 1}`} key={`winner-${entry.id}`}>
                        <div className="winner-rank">
                          <Trophy size={18} />
                          <span>#{index + 1}</span>
                        </div>
                        <strong>{entry.name}</strong>
                        <div className="winner-stats">
                          <span>{entry.score}/{TOTAL_ROUNDS}</span>
                          <span>{entry.totalSeconds}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="leaderboard-list">
                {leaderboard.length === 0 ? <p className="muted">No scores yet.</p> :
                  leaderboard.slice(0, 7).map((entry, index) => (
                    <div className={`leader-row rank-${index + 1}`} key={entry.id}>
                      <span className="rank">#{index + 1}</span>
                      <div><strong>{entry.name}</strong><span>{entry.date || 'Today'}</span></div>
                      <div className="leader-score"><strong>{entry.score}/{TOTAL_ROUNDS}</strong><span>{entry.totalSeconds}s</span></div>
                    </div>
                  ))
                }
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
