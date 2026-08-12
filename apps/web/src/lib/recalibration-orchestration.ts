export type RecalibrationResult = {
  currentNodeId: string
  replacementCount: number
}

type InFlightRecalibration = {
  current: Promise<RecalibrationResult> | null
}

export async function runRecalibrationOrchestration({
  inFlight,
  recalibrate,
  refresh,
  selectCurrentNode,
  onComplete,
}: {
  inFlight: InFlightRecalibration
  recalibrate: () => Promise<RecalibrationResult>
  refresh: () => Promise<void>
  selectCurrentNode?: (nodeId: string) => void
  onComplete?: (result: RecalibrationResult) => void | Promise<void>
}) {
  if (inFlight.current) {
    return await inFlight.current
  }

  const operation = (async () => {
    const result = await recalibrate()
    await refresh()
    selectCurrentNode?.(result.currentNodeId)
    await onComplete?.(result)
    return result
  })()

  inFlight.current = operation

  try {
    return await operation
  } finally {
    if (inFlight.current === operation) {
      inFlight.current = null
    }
  }
}
