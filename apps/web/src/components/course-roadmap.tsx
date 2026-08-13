'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'

import { AuthenticatedPageContainer } from '@/components/authenticated-page-container'
import type { CourseNode } from '@/components/course-workspace-sections'
import { getCourseGoalSummary, getCoursePace, type CourseOnboarding } from '@/lib/course-presentation'
import { getRoadmapNodeHref, getRoadmapNodeInteraction, markEarlierCompletedReview } from '@/lib/roadmap-navigation'
import { useTRPC } from '@/utils/trpc'
import { Badge } from '@gemastik/ui/components/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@gemastik/ui/components/card'
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

function RoadmapConnector({ fromLeft, completed }: { fromLeft: boolean; completed: boolean }) {
  return (
    <svg
      viewBox='0 0 100 100'
      preserveAspectRatio='none'
      className='pointer-events-none absolute inset-x-0 top-5 hidden h-[calc(100%+0.25rem)] w-full md:block'
      aria-hidden='true'
      focusable='false'
    >
      <path
        d={fromLeft ? 'M 30 2 C 31 42, 69 58, 70 98' : 'M 70 2 C 69 42, 31 58, 30 98'}
        vectorEffect='non-scaling-stroke'
        strokeWidth='1.5'
        strokeLinecap='round'
        className={cn('fill-none stroke-border', completed && 'stroke-primary/45')}
      />
    </svg>
  )
}

function RoadmapStateMarker({ state }: { state: CourseNode['progressionState'] }) {
  return (
    <span
      className={cn(
        'relative z-[2] flex size-11 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-[border-color,background-color,color,box-shadow] duration-200',
        state === 'current' && 'border-primary bg-primary text-primary-foreground ring-6 ring-primary/10',
        state === 'completed' && 'border-success/40 bg-success/10 text-success',
        state === 'locked' && 'border-border bg-muted text-muted-foreground',
      )}
      aria-hidden='true'
    >
      {state === 'completed' ? <CheckIcon /> : null}
      {state === 'current' ? <CircleIcon className='fill-current' /> : null}
      {state === 'locked' ? <LockIcon /> : null}
    </span>
  )
}

function RoadmapWaypoint({
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
    <span className='flex w-full items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center'>
      <RoadmapStateMarker state={node.progressionState} />
      <span
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg px-3 py-2.5 transition-[background-color,color,box-shadow,transform] duration-200 md:w-72 md:flex-none md:px-4 md:py-3',
          isCurrent && 'bg-primary/10 shadow-xs',
          isCompleted && 'text-muted-foreground group-hover:bg-card/70 group-hover:text-foreground',
          !href && 'text-muted-foreground opacity-65',
          href && !isCurrent && 'group-hover:-translate-y-0.5 motion-reduce:transform-none',
        )}
      >
        <span className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:justify-center'>
          <span className='font-mono tabular-nums'>{String(index + 1).padStart(2, '0')}</span>
          <span aria-hidden='true'>·</span>
          <span className='inline-flex items-center gap-1.5'>
            <Clock3Icon className='size-3.5' aria-hidden='true' />
            {node.estimatedTime} min
          </span>
        </span>
        <span className={cn('break-words text-sm font-semibold leading-5 text-balance', !href && 'font-medium')}>
          {node.title}
        </span>
        {isCurrent ? <Badge className='mt-0.5 w-fit md:self-center'>Current</Badge> : null}
        {isCompleted ? <span className='text-xs'>Completed</span> : null}
      </span>
    </span>
  )

  if (!href) {
    return (
      <div
        aria-disabled='true'
        aria-label={`Step ${index + 1}: ${node.title}. ${interaction.stateLabel}.`}
        title='Complete the previous step first.'
        className='w-full'
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href as Route}
      aria-current={isCurrent ? 'step' : undefined}
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
      className='group block w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
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
      <div className='flex min-h-0 flex-1 overflow-y-auto' aria-live='polite'>
        <AuthenticatedPageContainer className='flex flex-col gap-8 py-6'>
          <p className='text-sm font-medium'>Preparing your learning path…</p>
          <Skeleton className='h-24 w-full' />
          <div className='flex w-full flex-col gap-8'>
            <Skeleton className='h-24 w-64 max-w-full' />
            <Skeleton className='h-24 w-64 max-w-full self-end' />
            <Skeleton className='h-24 w-64 max-w-full' />
          </div>
        </AuthenticatedPageContainer>
      </div>
    )
  }

  if (courseQuery.isError) {
    return (
      <div className='flex min-h-0 flex-1 overflow-y-auto'>
        <AuthenticatedPageContainer className='flex flex-col gap-4 py-6'>
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
        </AuthenticatedPageContainer>
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
    <div className='flex min-h-0 flex-1 overflow-y-auto'>
      <AuthenticatedPageContainer className='flex flex-col gap-8 py-5 lg:py-7'>
        <header className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
          <div className='flex min-w-0 max-w-3xl flex-col gap-2'>
            <Link href='/dashboard' className='mb-1 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
              <ArrowLeftIcon className='size-4' aria-hidden='true' />
              Back to dashboard
            </Link>
            <h1 className='text-2xl font-semibold tracking-tight text-balance md:text-3xl'>{courseTitle}</h1>
            <p className='max-w-2xl text-sm leading-6 text-foreground/80'>{courseSummary}</p>
            {coursePace ? <p className='text-xs text-muted-foreground'>{coursePace}</p> : null}
          </div>
          <div className='flex w-full max-w-xs flex-col gap-2.5'>
            <div className='flex items-center justify-between gap-3 text-xs'>
              <span className='font-medium'>{progress}% complete</span>
              <span className='tabular-nums text-muted-foreground'>{completedCount} of {course.nodes.length} steps</span>
            </div>
            <div role='progressbar' aria-label='Course progress' aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className='h-1.5 overflow-hidden rounded-full bg-muted'>
              <div className='h-full rounded-full bg-primary transition-[width] duration-200' style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {course.metadata?.lastRecalibrationAt && !adaptivePending ? (
          <p className='flex items-center gap-2 rounded-md bg-primary/8 px-4 py-3 text-sm text-muted-foreground'>
            <SparklesIcon className='size-4 shrink-0 text-primary' aria-hidden='true' />
            Your learning path was adjusted to reinforce a prerequisite.
          </p>
        ) : null}

        {adaptivePending ? (
          <p className='rounded-md bg-attention/10 px-4 py-3 text-sm text-foreground' role='status'>
            Adjusting your learning path…
          </p>
        ) : null}

        <section aria-labelledby='roadmap-title' className='flex flex-col gap-7 pb-8'>
          <div className='flex max-w-xl flex-col gap-1'>
            <h2 id='roadmap-title' className='text-lg font-semibold tracking-tight'>Learning path</h2>
            <p className='text-sm text-muted-foreground'>Enter the current step or revisit completed work.</p>
          </div>

          {course.nodes.length === 0 ? (
            <p className='max-w-xl rounded-md bg-muted/50 p-5 text-sm leading-6 text-muted-foreground'>
              This course is saved as a draft. Its learning path is not available yet.
            </p>
          ) : (
            <ol className='relative w-full py-2 md:py-5' aria-label='Ordered course roadmap'>
              <span className='absolute bottom-8 left-[1.35rem] top-8 w-px bg-border md:hidden' aria-hidden='true' />
              {course.nodes.map((node, index) => {
                const fromLeft = index % 2 === 0
                const isLast = index === course.nodes.length - 1

                return (
                  <li key={node.id} className={cn('relative min-h-32 pb-8 md:min-h-40 md:pb-0', isLast && 'min-h-0 pb-0 md:min-h-28')}>
                    {!isLast ? <RoadmapConnector fromLeft={fromLeft} completed={node.progressionState === 'completed'} /> : null}
                    <div
                      className={cn(
                        'relative z-[1] w-full md:absolute md:top-0 md:w-72 md:-translate-x-1/2',
                        fromLeft ? 'md:left-[30%]' : 'md:left-[70%]',
                      )}
                    >
                      <RoadmapWaypoint courseId={course.id} node={node} index={index} currentNode={currentNode} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </AuthenticatedPageContainer>
    </div>
  )
}
