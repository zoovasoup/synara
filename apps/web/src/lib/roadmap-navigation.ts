export type RoadmapProgressionState = 'completed' | 'current' | 'locked'

export function getRoadmapNodeInteraction(progressionState: RoadmapProgressionState) {
  return {
    isNavigable: progressionState !== 'locked',
    stateLabel:
      progressionState === 'completed'
        ? 'Completed'
        : progressionState === 'current'
          ? 'Current'
          : 'Locked',
  }
}

export function getRoadmapNodeHref({
  courseId,
  nodeId,
  progressionState,
}: {
  courseId: string
  nodeId: string
  progressionState: RoadmapProgressionState
}) {
  if (!getRoadmapNodeInteraction(progressionState).isNavigable) return null
  return `/dashboard/courses/${courseId}/nodes/${nodeId}`
}

export function getValidationNavigationIntent({
  recalibrationRequired,
}: {
  competencyScore: number
  recalibrationRequired: boolean
}) {
  return recalibrationRequired ? 'roadmap_after_recalibration' : 'stay_on_node'
}

type BacktrackNavigationState = {
  currentNodeId: string
  currentOrderIndex: number
  reviewedEarlierNode: boolean
}

function getBacktrackKey(courseId: string) {
  return `synara:backtrack:${courseId}`
}

function readBacktrackState(storage: Storage, courseId: string) {
  const value = storage.getItem(getBacktrackKey(courseId))
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<BacktrackNavigationState>
    if (
      typeof parsed.currentNodeId !== 'string' ||
      typeof parsed.currentOrderIndex !== 'number' ||
      typeof parsed.reviewedEarlierNode !== 'boolean'
    ) {
      return null
    }
    return parsed as BacktrackNavigationState
  } catch {
    return null
  }
}

export function markCurrentLessonExit({
  storage,
  courseId,
  currentNodeId,
  currentOrderIndex,
}: {
  storage: Storage
  courseId: string
  currentNodeId: string
  currentOrderIndex: number
}) {
  storage.setItem(
    getBacktrackKey(courseId),
    JSON.stringify({ currentNodeId, currentOrderIndex, reviewedEarlierNode: false } satisfies BacktrackNavigationState),
  )
}

export function markEarlierCompletedReview({
  storage,
  courseId,
  nodeOrderIndex,
}: {
  storage: Storage
  courseId: string
  nodeOrderIndex: number
}) {
  const state = readBacktrackState(storage, courseId)
  if (!state || nodeOrderIndex >= state.currentOrderIndex) return

  storage.setItem(
    getBacktrackKey(courseId),
    JSON.stringify({ ...state, reviewedEarlierNode: true } satisfies BacktrackNavigationState),
  )
}

export function consumeCurrentNodeBacktrack({
  storage,
  courseId,
  currentNodeId,
}: {
  storage: Storage
  courseId: string
  currentNodeId: string
}) {
  const state = readBacktrackState(storage, courseId)
  if (!state || state.currentNodeId !== currentNodeId || !state.reviewedEarlierNode) return false

  storage.removeItem(getBacktrackKey(courseId))
  return true
}
