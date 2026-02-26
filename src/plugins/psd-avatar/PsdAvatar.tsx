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
  mouth: string[][]
  eye: string[][]
  threshold: number
  sensitivity: number
  mouthTransitionFrames: number
  blinkInterval: number
  blinkSpeed: number
  layerVisibility: Record<string, boolean>
  preview?: boolean
}

type RenderItem =
  | { kind: 'segment'; canvas: HTMLCanvasElement }
  | { kind: 'dynamic'; role: 'eye' | 'mouth'; layer: PsdLayer }

interface ResolvedLayers {
  sequence: RenderItem[]
  eye: (PsdLayer[] | null)[]
  mouth: (PsdLayer[] | null)[]
}

/** Fill null entries with the nearest non-null neighbor */
function fillNearestNeighbor<T>(arr: (T | null)[]): (T | null)[] {
  const result = [...arr]
  for (let i = 0; i < result.length; i++) {
    if (result[i] !== null) continue
    let left = i - 1
    let right = i + 1
    while (left >= 0 || right < result.length) {
      if (left >= 0 && arr[left] !== null) { result[i] = arr[left]; break }
      if (right < result.length && arr[right] !== null) { result[i] = arr[right]; break }
      left--
      right++
    }
  }
  return result
}

function buildRenderSequence(
  psd: PsdData,
  mouthPaths: string[][],
  eyePaths: string[][],
  layerVisibility: Record<string, boolean>,
): ResolvedLayers {
  const leafLayers = getLeafLayers(psd)
  const mouthSet = new Set(mouthPaths.flat().filter(Boolean))
  const eyeSet = new Set(eyePaths.flat().filter(Boolean))

  const sequence: RenderItem[] = []
  let segmentLayers: PsdLayer[] = []

  const flushSegment = (): void => {
    if (segmentLayers.length === 0) return
    const offscreen = document.createElement('canvas')
    offscreen.width = psd.width
    offscreen.height = psd.height
    const ctx = offscreen.getContext('2d')!
    for (const layer of segmentLayers) drawLayer(ctx, layer)
    sequence.push({ kind: 'segment', canvas: offscreen })
    segmentLayers = []
  }

  for (const layer of leafLayers) {
    if (eyeSet.has(layer.path)) {
      flushSegment()
      sequence.push({ kind: 'dynamic', role: 'eye', layer })
    } else if (mouthSet.has(layer.path)) {
      flushSegment()
      sequence.push({ kind: 'dynamic', role: 'mouth', layer })
    } else {
      const visible = layer.path in layerVisibility ? layerVisibility[layer.path] : !layer.hidden
      if (visible) segmentLayers.push(layer)
    }
  }
  flushSegment()

  const layerMap = new Map<string, PsdLayer>(leafLayers.map((l) => [l.path, l]))
  const resolve = (paths: string[]): PsdLayer[] | null => {
    const layers = paths.map((p) => layerMap.get(p)).filter(Boolean) as PsdLayer[]
    return layers.length > 0 ? layers : null
  }

  return {
    sequence,
    eye: fillNearestNeighbor(eyePaths.map(resolve)),
    mouth: fillNearestNeighbor(mouthPaths.map(resolve)),
  }
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
  const mouthLevelRef = useRef(props.preview ? -1 : 0)
  const eyeFrameRef = useRef(props.preview ? -1 : 0)
  const ttsQueueRef = useRef<TtsQueue | null>(null)
  const resolvedRef = useRef<ResolvedLayers | null>(null)
  const pendingFrameRef = useRef<number | null>(null)
  const prevMouthRef = useRef(-1)
  const prevEyeRef = useRef(-1)

  // Render once — draws sequence in z-order, activating the current eye/mouth frame
  const render = useCallback(() => {
    pendingFrameRef.current = null
    const canvas = canvasRef.current
    const resolved = resolvedRef.current
    if (!canvas || !resolved) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const activeEyes = resolved.eye[eyeFrameRef.current] ?? []
    const activeMouths = resolved.mouth[mouthLevelRef.current] ?? []

    for (const item of resolved.sequence) {
      if (item.kind === 'segment') {
        ctx.drawImage(item.canvas, 0, 0)
      } else if (item.role === 'eye') {
        if (activeEyes.includes(item.layer)) drawLayer(ctx, item.layer)
      } else {
        if (activeMouths.includes(item.layer)) drawLayer(ctx, item.layer)
      }
    }

    prevMouthRef.current = mouthLevelRef.current
    prevEyeRef.current = eyeFrameRef.current
  }, [])

  // Schedule a render if not already pending
  const requestRender = useCallback(() => {
    if (pendingFrameRef.current === null) {
      pendingFrameRef.current = requestAnimationFrame(render)
    }
  }, [render])

  // Load PSD
  useEffect(() => {
    const url = new URL(`../${props.psdFile}`, location.href).href
    loadPsd(url)
      .then(setPsd)
      .catch((e) => setError(String(e)))
  }, [props.psdFile])

  // Resolve layers + build render sequence when PSD or config changes
  useEffect(() => {
    if (!psd) return
    resolvedRef.current = buildRenderSequence(psd, props.mouth, props.eye, props.layerVisibility)

    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = psd.width
      canvas.height = psd.height
    }
    requestRender()
  }, [psd, props.mouth, props.eye, props.layerVisibility, requestRender])

  // TTS queue
  useEffect(() => {
    const queue = new TtsQueue({
      host: props.voicevoxHost,
      speaker: props.speaker,
      speed: props.speed,
      volume: props.volume,
      threshold: props.threshold,
      sensitivity: props.sensitivity,
      mouthTransitionFrames: props.mouthTransitionFrames,
      onLipLevel: (level) => {
        const target = props.preview && level === 0 ? -1 : level
        if (mouthLevelRef.current !== target) {
          mouthLevelRef.current = target
          requestRender()
        }
      },
    })
    ttsQueueRef.current = queue
    return () => queue.destroy()
  }, [props.voicevoxHost, props.speaker, props.speed, props.volume, props.threshold, props.sensitivity, props.mouthTransitionFrames, requestRender])

  // Eye blink timer (disabled in preview mode)
  useEffect(() => {
    if (props.preview) return
    const { blinkInterval, blinkSpeed } = props
    if (props.eye.every((p) => p.length === 0)) return

    let blinkTimer: ReturnType<typeof setTimeout>
    let animFrame: number | null = null

    const doBlink = (): void => {
      const totalFrames = blinkSpeed * 2
      let frame = 0

      const animate = (): void => {
        frame++
        let next: number
        if (frame <= blinkSpeed) {
          next = Math.min(4, Math.round((frame / blinkSpeed) * 4))
        } else {
          next = Math.max(0, Math.round(((totalFrames - frame) / blinkSpeed) * 4))
        }

        if (eyeFrameRef.current !== next) {
          eyeFrameRef.current = next
          requestRender()
        }

        if (frame < totalFrames) {
          animFrame = requestAnimationFrame(animate)
        } else {
          eyeFrameRef.current = 0
          requestRender()
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
      requestRender()
    }
  }, [props.blinkInterval, props.blinkSpeed, props.eye, props.preview, requestRender])

  // Cleanup pending frame on unmount
  useEffect(() => {
    return () => {
      if (pendingFrameRef.current !== null) {
        cancelAnimationFrame(pendingFrameRef.current)
      }
    }
  }, [])

  // Test speak via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'nicomview:test-speak') {
        const text = e.data.text as string
        if (text) ttsQueueRef.current?.enqueue(text)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Comment handler (no-op in preview mode)
  const onComment = useCallback((data: CommentData) => {
    if (props.preview) return
    if (data.isHistory) return
    if (!data.content) return
    ttsQueueRef.current?.enqueue(data.content)
  }, [props.preview])

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
