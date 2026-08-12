import {
  consumeCurrentNodeBacktrack,
  getRoadmapNodeHref,
  getRoadmapNodeInteraction,
  getValidationNavigationIntent,
  markCurrentLessonExit,
  markEarlierCompletedReview,
} from '../src/lib/roadmap-navigation'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
  }
}

const states = ['completed', 'current', 'locked'] as const
assertEqual(
  states.map((state) => getRoadmapNodeInteraction(state)),
  [
    { isNavigable: true, stateLabel: 'Completed' },
    { isNavigable: true, stateLabel: 'Current' },
    { isNavigable: false, stateLabel: 'Locked' },
  ],
  'Roadmap A progression interaction mapping',
)

assertEqual(
  getRoadmapNodeHref({ courseId: 'course-1', nodeId: 'locked-2', progressionState: 'locked' }),
  null,
  'Roadmap B locked node cannot navigate',
)
assertEqual(
  [
    getRoadmapNodeHref({ courseId: 'course-1', nodeId: 'current-1', progressionState: 'current' }),
    getRoadmapNodeHref({ courseId: 'course-1', nodeId: 'completed-0', progressionState: 'completed' }),
  ],
  [
    '/dashboard/courses/course-1/nodes/current-1',
    '/dashboard/courses/course-1/nodes/completed-0',
  ],
  'Roadmap C accessible node destinations',
)

assertEqual(
  getValidationNavigationIntent({ competencyScore: 88, recalibrationRequired: false }),
  'stay_on_node',
  'Roadmap D mastery stays on completed node',
)
assertEqual(
  getValidationNavigationIntent({ competencyScore: 55, recalibrationRequired: true }),
  'roadmap_after_recalibration',
  'Roadmap E recalibration returns to roadmap',
)

const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
} as unknown as Storage

markCurrentLessonExit({
  storage,
  courseId: 'course-1',
  currentNodeId: 'current-1',
  currentOrderIndex: 2,
})
markEarlierCompletedReview({ storage, courseId: 'course-1', nodeOrderIndex: 1 })
assertEqual(
  consumeCurrentNodeBacktrack({ storage, courseId: 'course-1', currentNodeId: 'current-1' }),
  true,
  'Roadmap backtrack resumes current after earlier review',
)
assertEqual(
  consumeCurrentNodeBacktrack({ storage, courseId: 'course-1', currentNodeId: 'current-1' }),
  false,
  'Roadmap backtrack is consumed once',
)

console.log('Roadmap navigation checks passed (Scenarios A-E and route backtracking).')
