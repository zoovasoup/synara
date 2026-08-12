export type CourseOnboarding = {
  topic: string
  level: string
  goal: string
  weeklyHours: string
  learningStyle: string
}

export function getCourseGoalSummary(
  onboarding: CourseOnboarding | undefined,
  fallback: string,
) {
  if (!onboarding) return fallback.split(/(?<=[.!?])\s/)[0] ?? fallback

  const { topic, goal } = onboarding
  if (goal === 'To build a project') return `Build a practical project in ${topic}.`
  if (goal === 'For school') return `Build a strong foundation in ${topic}.`
  if (goal === 'For work') return `Apply ${topic} with confidence at work.`
  if (goal === 'For personal interest') return `Explore ${topic} through a structured path.`
  return `Build practical confidence in ${topic}.`
}

export function getCoursePace(onboarding: CourseOnboarding | undefined) {
  return [
    onboarding?.level,
    onboarding?.weeklyHours ? `${onboarding.weeklyHours.replace('-', '–')}/week` : null,
  ].filter(Boolean).join(' · ')
}
