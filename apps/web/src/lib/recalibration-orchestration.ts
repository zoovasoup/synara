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
}: {
  inFlight: InFlightRecalibration
  recalibrate: () => Promise<RecalibrationResult>
  refresh: () => Promise<void>
  selectCurrentNode: (nodeId: string) => void
}) {
  if (inFlight.current) {
    return await inFlight.current
  }

  const operation = (async () => {
    const result = await recalibrate()
    await refresh()
    selectCurrentNode(result.currentNodeId)
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
