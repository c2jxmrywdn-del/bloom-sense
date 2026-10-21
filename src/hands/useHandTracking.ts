import { useCallback, useEffect, useMemo, useRef } from 'react'
import { HandController } from './HandController'

export type TrackingMode = 'camera'

export function useHandTracking() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<HandController | null>(null)

  if (!controllerRef.current) controllerRef.current = new HandController()

  const start = useCallback(async (mode: TrackingMode) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) throw new Error('hand view is not mounted')
    canvas.width = 640
    canvas.height = 480
    await controllerRef.current!.start(mode, video, canvas)
  }, [])

  const stop = useCallback(() => {
    controllerRef.current?.stop()
  }, [])

  const markUiBloom = useCallback(() => {
    controllerRef.current?.markUiBloom()
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.dispose()
    }
  }, [])

  return useMemo(
    () => ({ videoRef, canvasRef, start, stop, markUiBloom, controllerRef }),
    [start, stop, markUiBloom]
  )
}
