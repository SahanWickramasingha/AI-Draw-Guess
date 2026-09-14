import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import { Eraser, PenLine, RotateCcw } from 'lucide-react'

const ERASER_SIZE = 30

const DrawingCanvas = forwardRef(function DrawingCanvas({ onDrawingChange, disabled = false }, ref) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const [mode, setMode] = useState('draw')
  const [brushSize, setBrushSize] = useState(12)

  const fillWhite = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const snapshot = document.createElement('canvas')
    snapshot.width = canvas.width || 1
    snapshot.height = canvas.height || 1
    const snapshotCtx = snapshot.getContext('2d')
    if (canvas.width && canvas.height) snapshotCtx.drawImage(canvas, 0, 0)

    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (snapshot.width > 1 && snapshot.height > 1) {
      ctx.drawImage(snapshot, 0, 0, canvas.width, canvas.height)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    requestAnimationFrame(resizeCanvas)

    const ro = new ResizeObserver(() => resizeCanvas())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    clear: () => {
      fillWhite()
      onDrawingChange(false)
    },
  }))

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (event) => {
    if (disabled) return
    event.preventDefault()
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(event)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const draw = (event) => {
    if (disabled || !drawingRef.current) return
    event.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = pointFromEvent(event)
    const previous = lastPointRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = (mode === 'erase' ? ERASER_SIZE : brushSize) * dpr
    ctx.strokeStyle = mode === 'erase' ? '#ffffff' : '#111827'
    ctx.beginPath()
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    ctx.restore()

    lastPointRef.current = point
    onDrawingChange(true)
  }

  const stopDrawing = (event) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {}
  }

  const clearCanvas = () => {
    if (disabled) return
    fillWhite()
    onDrawingChange(false)
  }

  return (
    <div className="drawing-shell">
      <div className="canvas-toolbar">
        <div className="tool-group" role="group" aria-label="Drawing tools">
          <button
            type="button"
            className={`tool-btn ${mode === 'draw' ? 'active' : ''}`}
            onClick={() => setMode('draw')}
            aria-pressed={mode === 'draw'}
            disabled={disabled}
          >
            <PenLine size={18} />
            Draw
          </button>
          <button
            type="button"
            className={`tool-btn eraser-tool ${mode === 'erase' ? 'active' : ''}`}
            onClick={() => setMode('erase')}
            aria-pressed={mode === 'erase'}
            disabled={disabled}
          >
            <Eraser size={18} />
            Erase
          </button>
        </div>

        <label className="brush-control">
          <span>Brush</span>
          <input
            type="range"
            min="4"
            max="28"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={disabled}
          />
        </label>

        <button type="button" className="tool-btn" onClick={clearCanvas} disabled={disabled}>
          <RotateCcw size={18} />
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${disabled ? 'locked' : ''}`}
        aria-label="Drawing canvas"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </div>
  )
})

export default DrawingCanvas
