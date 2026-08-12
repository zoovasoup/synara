'use client'

import * as React from 'react'

type AttemptState = {
  nodeId: string | null
  attemptId: string
  elapsedMilliseconds: number
  startedAt: number | null
  backtrackCount: number
}

function createAttemptId() {
  return globalThis.crypto.randomUUID()
}

function createAttemptState(nodeId: string | null): AttemptState {
  return {
    nodeId,
    attemptId: nodeId ? createAttemptId() : '',
    elapsedMilliseconds: 0,
    startedAt: null,
    backtrackCount: 0,
  }
}

export function useActiveStudyAttempt({
  nodeId,
  isTracking,
}: {
  nodeId: string | null
  isTracking: boolean
}) {
  const attemptRef = React.useRef<AttemptState>({
    nodeId: null,
    attemptId: '',
    elapsedMilliseconds: 0,
    startedAt: null,
    backtrackCount: 0,
  })

  const pause = React.useCallback(() => {
    const attempt = attemptRef.current
    if (attempt.startedAt === null) {
      return
    }

    attempt.elapsedMilliseconds += performance.now() - attempt.startedAt
    attempt.startedAt = null
  }, [])

  React.useEffect(() => {
    if (attemptRef.current.nodeId !== nodeId) {
      pause()
      attemptRef.current = createAttemptState(nodeId)
    }

    const syncTrackingState = () => {
      const attempt = attemptRef.current
      const shouldRun = Boolean(
        attempt.nodeId && isTracking && document.visibilityState === 'visible',
      )

      if (shouldRun && attempt.startedAt === null) {
        attempt.startedAt = performance.now()
      } else if (!shouldRun) {
        pause()
      }
    }

    syncTrackingState()
    document.addEventListener('visibilitychange', syncTrackingState)

    return () => {
      document.removeEventListener('visibilitychange', syncTrackingState)
      pause()
    }
  }, [isTracking, nodeId, pause])

  const recordBacktrack = React.useCallback(() => {
    if (!nodeId || attemptRef.current.nodeId !== nodeId) {
      return
    }

    attemptRef.current.backtrackCount += 1
  }, [nodeId])

  const getSnapshot = React.useCallback(() => {
    if (!nodeId || attemptRef.current.nodeId !== nodeId) {
      attemptRef.current = createAttemptState(nodeId)
    }

    const attempt = attemptRef.current
    const activeMilliseconds =
      attempt.elapsedMilliseconds +
      (attempt.startedAt === null ? 0 : performance.now() - attempt.startedAt)

    return {
      attemptId: attempt.attemptId,
      activeStudySeconds: Math.max(0, Math.floor(activeMilliseconds / 1000)),
      backtrackDelta: attempt.backtrackCount,
    }
  }, [nodeId])

  const completeAttempt = React.useCallback(() => {
    attemptRef.current = createAttemptState(nodeId)

    if (nodeId && isTracking && document.visibilityState === 'visible') {
      attemptRef.current.startedAt = performance.now()
    }
  }, [isTracking, nodeId])

  return { completeAttempt, getSnapshot, recordBacktrack }
}
