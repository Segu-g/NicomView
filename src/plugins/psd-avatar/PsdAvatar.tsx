import { useEffect, useRef, useCallback, useState } from 'react'
import { loadPsd, getLeafLayers, type PsdData, type PsdLayer } from './psdLoader'
import { TtsQueue } from './ttsQueue'
import { useCommentEvents, type CommentData } from '../hooks/useCommentEvents'

export interface PsdAvatarProps {
  psdFile: string
  voicevoxHost: string
  speaker: number
  speed: number
  volume: number
  mouth: string[]
  eye: string[]
  threshold: number
  sensitivity: number
  blinkInterval: number
  blinkSpeed: number
}

interface ResolvedLayers {
  base: PsdLayer[]
  mouth: (PsdLayer | null)[]
  eye: (PsdLayer | null)[]
}

function resolveLayers(psd: PsdData, mouthPaths: string[], eyePaths: string[]): ResolvedLayers {
  const leafLayers = getLeafLayers(psd)
  const mouthSet = new Set(mouthPaths.filter(Boolean))
  const eyeSet = new Set(eyePaths.filter(Boolean))

  const base = leafLayers.filter((l) => !l.hidden && !mouthSet.has(l.path) && !eyeSet.has(l.path))
  const mouth = mouthPaths.map((p) => (p ? leafLayers.find((l) => l.path === p) ?? null : null))
  const eye = eyePaths.map((p) => (p ? leafLayers.find((l) => l.path === p) ?? null : null))

  return { base, mouth, eye }
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: PsdLayer): void {
  if (!layer.canvas) return
  const prevAlpha = ctx.globalAlpha
  ctx.globalAlpha = layer.opacity
  ctx.drawImage(layer.canvas, layer.left, layer.top)
  ctx.globalAlpha = prevAlpha
}

export function PsdAvatar(props: PsdAvatarProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [psd, setPsd] = useState<PsdData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mouthLevelRef = useRef(0)
  const eyeFrameRef = useRef(0)
  const ttsQueueRef = useRef<TtsQueue | null>(null)
  const resolvedRef = useRef<ResolvedLayers | null>(null)

  // Load PSD
  useEffect(() => {
    const url = new URL(`../${props.psdFile}`, location.href).href
    loadPsd(url)
      .then(setPsd)
      .catch((e) => setError(String(e)))
  }, [props.psdFile])

  // Resolve layers when PSD or config changes
  useEffect(() => {
    if (!psd) return
    resolvedRef.current = resolveLayers(psd, props.mouth, props.eye)
  }, [psd, props.mouth, props.eye])

  // TTS queue
  useEffect(() => {
    const queue = new TtsQueue({
      host: props.voicevoxHost,
      speaker: props.speaker,
      speed: props.speed,
      volume: props.volume,
      threshold: props.threshold,
      sensitivity: props.sensitivity,
      onLipLevel: (level) => {
        mouthLevelRef.current = level
      },
    })
    ttsQueueRef.current = queue
    return () => queue.destroy()
  }, [props.voicevoxHost, props.speaker, props.speed, props.volume, props.threshold, props.sensitivity])

  // Eye blink timer
  useEffect(() => {
    const { blinkInterval, blinkSpeed } = props
    if (props.eye.every((p) => !p)) return

    let blinkTimer: ReturnType<typeof setTimeout>
    let animFrame: number | null = null

    const doBlink = (): void => {
      const totalFrames = blinkSpeed * 2
      let frame = 0

      const animate = (): void => {
        frame++
        if (frame <= blinkSpeed) {
          eyeFrameRef.current = Math.min(4, Math.round((frame / blinkSpeed) * 4))
        } else {
          eyeFrameRef.current = Math.max(0, Math.round(((totalFrames - frame) / blinkSpeed) * 4))
        }

        if (frame < totalFrames) {
          animFrame = requestAnimationFrame(animate)
        } else {
          eyeFrameRef.current = 0
          scheduleNext()
        }
      }
      animFrame = requestAnimationFrame(animate)
    }

    const scheduleNext = (): void => {
      const jitter = (Math.random() - 0.5) * blinkInterval * 0.4
      blinkTimer = setTimeout(doBlink, (blinkInterval + jitter) * 1000)
    }
    scheduleNext()

    return () => {
      clearTimeout(blinkTimer)
      if (animFrame !== null) cancelAnimationFrame(animFrame)
      eyeFrameRef.current = 0
    }
  }, [props.blinkInterval, props.blinkSpeed, props.eye])

  // Render loop
  useEffect(() => {
    if (!psd) return

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = psd.width
    canvas.height = psd.height
    const ctx = canvas.getContext('2d')!

    let animId: number

    const render = (): void => {
      ctx.clearRect(0, 0, psd.width, psd.height)

      const resolved = resolvedRef.current
      if (!resolved) {
        animId = requestAnimationFrame(render)
        return
      }

      // Draw base layers
      for (const layer of resolved.base) {
        drawLayer(ctx, layer)
      }

      // Draw current eye layer
      const eyeLayer = resolved.eye[eyeFrameRef.current]
      if (eyeLayer) drawLayer(ctx, eyeLayer)

      // Draw current mouth layer
      const mouthLayer = resolved.mouth[mouthLevelRef.current]
      if (mouthLayer) drawLayer(ctx, mouthLayer)

      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)

    return () => cancelAnimationFrame(animId)
  }, [psd])

  // Comment handler
  const onComment = useCallback((data: CommentData) => {
    if (data.isHistory) return
    if (!data.content) return
    ttsQueueRef.current?.enqueue(data.content)
  }, [])

  useCommentEvents({ onComment })

  if (error) {
    return <div style={{ color: 'red', padding: 16 }}>PSD読み込みエラー: {error}</div>
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: 'transparent',
      }}
    />
  )
}
