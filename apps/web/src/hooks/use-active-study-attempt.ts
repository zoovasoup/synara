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

function restoreAttemptState(nodeId: string | null, persistenceKey?: string) {
  if (!nodeId || !persistenceKey) return createAttemptState(nodeId)

  try {
    const value = window.sessionStorage.getItem(persistenceKey)
    if (!value) return createAttemptState(nodeId)
    const stored = JSON.parse(value) as Partial<AttemptState>
    if (
      stored.nodeId !== nodeId ||
      typeof stored.attemptId !== 'string' ||
      typeof stored.elapsedMilliseconds !== 'number' ||
      typeof stored.backtrackCount !== 'number'
    ) {
      return createAttemptState(nodeId)
    }

    return {
      nodeId,
      attemptId: stored.attemptId,
      elapsedMilliseconds: stored.elapsedMilliseconds,
      startedAt: null,
      backtrackCount: stored.backtrackCount,
    }
  } catch {
    return createAttemptState(nodeId)
  }
}

export function useActiveStudyAttempt({
  nodeId,
  isTracking,
  persistenceKey,
}: {
  nodeId: string | null
  isTracking: boolean
  persistenceKey?: string
}) {
  const attemptRef = React.useRef<AttemptState>({
    nodeId: null,
    attemptId: '',
    elapsedMilliseconds: 0,
    startedAt: null,
    backtrackCount: 0,
  })

  const persist = React.useCallback(() => {
    if (!persistenceKey || !attemptRef.current.nodeId) return
    window.sessionStorage.setItem(
      persistenceKey,
      JSON.stringify({ ...attemptRef.current, startedAt: null } satisfies AttemptState),
    )
  }, [persistenceKey])

  const pause = React.useCallback(() => {
    const attempt = attemptRef.current
    if (attempt.startedAt === null) {
      return
    }

    attempt.elapsedMilliseconds += performance.now() - attempt.startedAt
    attempt.startedAt = null
    persist()
  }, [persist])

  React.useEffect(() => {
    if (attemptRef.current.nodeId !== nodeId) {
      pause()
      attemptRef.current = restoreAttemptState(nodeId, persistenceKey)
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
  }, [isTracking, nodeId, pause, persistenceKey])

  const recordBacktrack = React.useCallback(() => {
    if (!nodeId || attemptRef.current.nodeId !== nodeId) {
      return
    }

    attemptRef.current.backtrackCount += 1
    persist()
  }, [nodeId, persist])

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
    persist()

    if (nodeId && isTracking && document.visibilityState === 'visible') {
      attemptRef.current.startedAt = performance.now()
    }
  }, [isTracking, nodeId, persist])

  const clearAttempt = React.useCallback(() => {
    if (persistenceKey) window.sessionStorage.removeItem(persistenceKey)
    attemptRef.current = createAttemptState(null)
  }, [persistenceKey])

  return { clearAttempt, completeAttempt, getSnapshot, recordBacktrack }
}
