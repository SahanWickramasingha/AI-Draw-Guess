export const MODEL_INPUT_SIZE = 224
export const MIN_INK_PIXELS = 180

/**
 * Convert the large browser drawing canvas into an input that more closely
 * matches the clean, centered Quick Draw training images.
 *
 * Steps:
 * 1. Find non-white pixels.
 * 2. Crop to the drawing bounding box.
 * 3. Add square padding.
 * 4. Center on a white 224x224 canvas.
 * 5. Return basic ink statistics for minimum-detail rejection.
 */
export function preprocessDrawingCanvas(sourceCanvas, options = {}) {
  const {
    size = MODEL_INPUT_SIZE,
    whiteThreshold = 245,
    paddingRatio = 0.16,
  } = options

  if (!sourceCanvas) {
    return { canvas: null, hasInk: false, inkPixels: 0, coverage: 0 }
  }

  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  const { width, height } = sourceCanvas
  const pixels = sourceCtx.getImageData(0, 0, width, height).data

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let inkPixels = 0

  // Sample every other physical pixel for speed on high-DPI canvases.
  const step = width * height > 900000 ? 2 : 1
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const a = pixels[i + 3]

      if (a > 0 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)) {
        inkPixels += 1
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const hasInk = maxX >= minX && maxY >= minY
  if (!hasInk) {
    return { canvas: null, hasInk: false, inkPixels: 0, coverage: 0 }
  }

  const boxWidth = Math.max(1, maxX - minX + 1)
  const boxHeight = Math.max(1, maxY - minY + 1)
  const squareSide = Math.max(boxWidth, boxHeight)
  const extraPadding = Math.max(8, squareSide * paddingRatio)
  const cropSide = squareSide + extraPadding * 2

  const cropX = minX + boxWidth / 2 - cropSide / 2
  const cropY = minY + boxHeight / 2 - cropSide / 2

  const output = document.createElement('canvas')
  output.width = size
  output.height = size
  const outCtx = output.getContext('2d', { willReadFrequently: true })

  outCtx.fillStyle = '#ffffff'
  outCtx.fillRect(0, 0, size, size)
  outCtx.imageSmoothingEnabled = true
  outCtx.imageSmoothingQuality = 'high'

  // drawImage tolerates crop areas outside the source poorly in some browsers,
  // so copy into a temporary square first.
  const temp = document.createElement('canvas')
  temp.width = Math.ceil(cropSide)
  temp.height = Math.ceil(cropSide)
  const tempCtx = temp.getContext('2d')
  tempCtx.fillStyle = '#ffffff'
  tempCtx.fillRect(0, 0, temp.width, temp.height)
  tempCtx.drawImage(sourceCanvas, -cropX, -cropY)

  outCtx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, size, size)

  const sampledTotal = Math.ceil(width / step) * Math.ceil(height / step)
  const coverage = inkPixels / Math.max(sampledTotal, 1)

  return {
    canvas: output,
    hasInk: true,
    inkPixels,
    coverage,
    bbox: { minX, minY, maxX, maxY, width: boxWidth, height: boxHeight },
  }
}

export function hasEnoughDrawingDetail(preprocessed) {
  if (!preprocessed?.hasInk) return false

  // Very small or almost-empty doodles are rejected before classification.
  const { inkPixels = 0, bbox } = preprocessed
  if (inkPixels < MIN_INK_PIXELS) return false
  if (!bbox) return false

  const minDimension = Math.min(bbox.width, bbox.height)
  return minDimension >= 18
}
