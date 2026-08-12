'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'

import type { CourseNode } from '@/components/course-workspace-sections'
import { getCourseGoalSummary, getCoursePace, type CourseOnboarding } from '@/lib/course-presentation'
import { getRoadmapNodeHref, getRoadmapNodeInteraction, markEarlierCompletedReview } from '@/lib/roadmap-navigation'
import { useTRPC } from '@/utils/trpc'
import { Badge } from '@gemastik/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gemastik/ui/components/card'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { cn } from '@gemastik/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckIcon, CircleIcon, Clock3Icon, LockIcon, SparklesIcon } from 'lucide-react'

type CourseRoadmapDetail = {
  id: string
  goalDescription: string
  currentStatus: 'active' | 'completed' | 'recalibrating' | 'needs_recalibration' | null
  metadata: {
    onboarding?: CourseOnboarding
    lastRecalibrationAt?: string
  } | null
  nodes: CourseNode[]
}

function RoadmapNodeCard({
  courseId,
  node,
  index,
  currentNode,
}: {
  courseId: string
  node: CourseNode
  index: number
  currentNode: CourseNode | null
}) {
  const href = getRoadmapNodeHref({
    courseId,
    nodeId: node.id,
    progressionState: node.progressionState,
  })
  const interaction = getRoadmapNodeInteraction(node.progressionState)
  const isCurrent = node.progressionState === 'current'
  const isCompleted = node.progressionState === 'completed'
  const content = (
    <Card
      className={cn(
        'w-full max-w-sm border-border/70 bg-card shadow-none transition-[border-color,background-color,box-shadow,opacity]',
        isCurrent && 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20',
        isCompleted && 'bg-card/70 text-muted-foreground',
        !href && 'border-border/50 bg-muted/25 opacity-60',
        href && !isCurrent && 'hover:border-foreground/20 hover:bg-muted/20',
      )}
    >
      <CardContent className='flex items-start gap-4 p-4'>
        <span className='font-mono text-xs tabular-nums text-muted-foreground'>{String(index + 1).padStart(2, '0')}</span>
        <span className='flex min-w-0 flex-1 flex-col gap-2'>
          <span className={cn('text-sm font-semibold leading-5 text-pretty', !href && 'text-muted-foreground')}>{node.title}</span>
          <span className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
            <span className='inline-flex items-center gap-1.5'>
              <Clock3Icon className='size-3.5' aria-hidden='true' />
              {node.estimatedTime} min
            </span>
            {isCurrent ? <Badge>Current</Badge> : null}
            {isCompleted ? <span>Review</span> : null}
          </span>
        </span>
      </CardContent>
    </Card>
  )

  if (!href) {
    return (
      <div aria-disabled='true' aria-label={`Step ${index + 1}: ${node.title}. ${interaction.stateLabel}.`} title='Complete the previous step first.'>
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href as Route}
      aria-label={`${isCompleted ? 'Review' : 'Open'} step ${index + 1}: ${node.title}`}
      onClick={() => {
        if (isCompleted && currentNode && typeof window !== 'undefined') {
          markEarlierCompletedReview({
            storage: window.sessionStorage,
            courseId,
            nodeOrderIndex: node.orderIndex,
          })
        }
      }}
      className='block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      {content}
    </Link>
  )
}

export function CourseRoadmap({ courseId }: { courseId: string }) {
  const trpc = useTRPC()
  const courseQuery = useQuery(trpc.learning.getById.queryOptions({ id: courseId })) as UseQueryResult<CourseRoadmapDetail, Error>

  if (courseQuery.isPending) {
    return (
      <div className='flex min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8' aria-live='polite'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-6'>
          <p className='text-sm font-medium'>Preparing your learning path…</p>
          <Skeleton className='h-24 w-full' />
          <div className='mx-auto flex w-full max-w-4xl flex-col gap-6'>
            <Skeleton className='h-28 w-full max-w-sm' />
            <Skeleton className='h-28 w-full max-w-sm self-end' />
            <Skeleton className='h-28 w-full max-w-sm' />
          </div>
        </div>
      </div>
    )
  }

  if (courseQuery.isError) {
    return (
      <div className='flex min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8'>
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-4'>
          <Link href='/dashboard' className='inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground'>
            <ArrowLeftIcon className='size-4' aria-hidden='true' />
            Back to dashboard
          </Link>
          <Card className='border-destructive/40'>
            <CardHeader>
              <CardTitle>Unable to load this course</CardTitle>
              <CardDescription>Return to the dashboard and try opening it again.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  const course = courseQuery.data
  const onboarding = course.metadata?.onboarding
  const completedCount = course.nodes.filter((node) => node.isCompleted).length
  const progress = course.nodes.length > 0 ? Math.round((completedCount / course.nodes.length) * 100) : 0
  const currentNode = course.nodes.find((node) => node.progressionState === 'current') ?? null
  const courseTitle = onboarding?.topic ?? course.goalDescription
  const courseSummary = getCourseGoalSummary(onboarding, course.goalDescription)
  const coursePace = getCoursePace(onboarding)
  const adaptivePending = course.currentStatus === 'needs_recalibration' || course.currentStatus === 'recalibrating'

  return (
    <div className='flex min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-5'>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-7'>
        <header className='flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
          <div className='flex min-w-0 max-w-3xl flex-col gap-1.5'>
            <Link href='/dashboard' className='mb-1 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
              <ArrowLeftIcon className='size-4' aria-hidden='true' />
              Back to dashboard
            </Link>
            <h1 className='text-2xl font-semibold tracking-tight text-pretty md:text-3xl'>{courseTitle}</h1>
            <p className='text-sm leading-6 text-foreground/75'>{courseSummary}</p>
            {coursePace ? <p className='text-xs text-muted-foreground'>{coursePace}</p> : null}
          </div>
          <div className='flex w-full max-w-xs flex-col gap-2'>
            <div className='flex items-center justify-between gap-3 text-xs'>
              <span className='font-medium'>{progress}% complete</span>
              <span className='tabular-nums text-muted-foreground'>{completedCount} of {course.nodes.length} steps</span>
            </div>
            <div role='progressbar' aria-label='Course progress' aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className='h-1.5 overflow-hidden rounded-full bg-muted'>
              <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {course.metadata?.lastRecalibrationAt && !adaptivePending ? (
          <p className='flex items-center gap-2 rounded-md bg-muted/45 px-4 py-3 text-sm text-muted-foreground'>
            <SparklesIcon className='size-4 shrink-0 text-primary' aria-hidden='true' />
            Your learning path was adjusted to reinforce a prerequisite.
          </p>
        ) : null}

        {adaptivePending ? (
          <p className='rounded-md bg-muted/45 px-4 py-3 text-sm text-muted-foreground' role='status'>
            Adjusting your learning path…
          </p>
        ) : null}

        <section aria-labelledby='roadmap-title' className='flex flex-col gap-5 rounded-lg bg-card px-3 py-5 sm:px-6 lg:px-10 lg:py-8'>
          <div className='mx-auto flex max-w-2xl flex-col gap-1 text-center'>
            <h2 id='roadmap-title' className='text-lg font-semibold tracking-tight'>Course roadmap</h2>
            <p className='text-sm text-muted-foreground'>Choose the current step, or revisit completed work.</p>
          </div>

          {course.nodes.length === 0 ? (
            <p className='mx-auto max-w-xl rounded-md border border-dashed p-5 text-center text-sm leading-6 text-muted-foreground'>
              This course is saved as a draft. Its learning path is not available yet.
            </p>
          ) : (
            <ol className='relative mx-auto flex w-full max-w-4xl flex-col gap-5 py-2' aria-label='Ordered course roadmap'>
              <span className='absolute bottom-8 left-7 top-8 w-px bg-border md:left-1/2 md:-translate-x-px' aria-hidden='true' />
              {course.nodes.map((node, index) => {
                const isEven = index % 2 === 0
                return (
                  <li key={node.id} className='relative grid grid-cols-[3.5rem_minmax(0,1fr)] items-center md:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]'>
                    <span
                      className={cn(
                        'relative z-[1] col-start-1 row-start-1 mx-auto flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground md:col-start-2',
                        node.progressionState === 'current' && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/10',
                        node.progressionState === 'completed' && 'border-primary/40 text-primary',
                        node.progressionState === 'locked' && 'border-border bg-muted',
                      )}
                      aria-hidden='true'
                    >
                      {node.progressionState === 'completed' ? <CheckIcon className='size-5' /> : null}
                      {node.progressionState === 'current' ? <CircleIcon className='size-4 fill-current' /> : null}
                      {node.progressionState === 'locked' ? <LockIcon className='size-4' /> : null}
                    </span>
                    <div className={cn('col-start-2 row-start-1 min-w-0 md:col-span-1', isEven ? 'md:col-start-1 md:justify-self-end' : 'md:col-start-3 md:justify-self-start')}>
                      <RoadmapNodeCard courseId={course.id} node={node} index={index} currentNode={currentNode} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
