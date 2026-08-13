'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'

import { CourseCard } from '@/components/course-card'
import { CreateCourseDialog } from '@/components/create-course-dialog'
import { getCourseGoalSummary, getCoursePace, type CourseOnboarding } from '@/lib/course-presentation'
import { useTRPC } from '@/utils/trpc'
import { Button, buttonVariants } from '@gemastik/ui/components/button'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { cn } from '@gemastik/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, BookOpenIcon, CirclePlusIcon } from 'lucide-react'

type RoadmapNodeData = {
  id: string
  title: string
  orderIndex: number
  isCompleted: boolean
}

type RoadmapCardData = {
  id: string
  goalDescription: string
  currentStatus: string | null
  metadata: {
    onboarding?: CourseOnboarding
    generationStatus?: 'generated' | 'draft'
  } | null
  nodes: RoadmapNodeData[]
}

function getCourseSummary(roadmap: RoadmapCardData) {
  const orderedNodes = [...roadmap.nodes].sort((left, right) => left.orderIndex - right.orderIndex)
  const completedSteps = orderedNodes.filter((node) => node.isCompleted).length
  const totalSteps = orderedNodes.length
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : null
  const currentNode = orderedNodes.find((node) => !node.isCompleted) ?? null
  const metadata = roadmap.metadata ?? {}

  return {
    title: metadata.onboarding?.topic ?? roadmap.goalDescription,
    goalSummary: getCourseGoalSummary(metadata.onboarding, roadmap.goalDescription),
    pace: getCoursePace(metadata.onboarding) || 'Custom pace',
    completedSteps,
    totalSteps,
    progress,
    currentNode,
    status:
      metadata.generationStatus === 'draft'
        ? 'Draft roadmap'
        : roadmap.currentStatus === 'needs_recalibration' || roadmap.currentStatus === 'recalibrating'
          ? 'Path adjusting'
          : roadmap.currentStatus === 'completed'
            ? 'Completed'
            : 'In progress',
  }
}

export function SectionCards() {
  const trpc = useTRPC()
  const roadmapQuery = useQuery(trpc.learning.list.queryOptions(undefined)) as UseQueryResult<RoadmapCardData[], Error>

  if (roadmapQuery.isPending) {
    return (
      <div className='flex flex-col gap-6' aria-label='Loading learning dashboard' aria-live='polite'>
        <section className='flex flex-col gap-4 rounded-lg bg-card px-5 py-6'>
          <div className='flex flex-col gap-1'>
            <h2 className='text-base font-semibold'>Preparing your learning overview…</h2>
            <p className='text-sm text-muted-foreground'>Your current course and next step will appear here.</p>
          </div>
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-5 w-2/3' />
            <Skeleton className='h-2 w-full' />
            <Skeleton className='h-8 w-36' />
          </div>
        </section>
        <div className='grid gap-4 lg:grid-cols-2'>
          <Skeleton className='h-56 w-full' />
          <Skeleton className='h-56 w-full' />
        </div>
      </div>
    )
  }

  if (roadmapQuery.isError) {
    return (
      <section className='rounded-lg bg-destructive/10 px-5 py-4' role='alert'>
        <h2 className='text-sm font-semibold'>Unable to load your courses</h2>
        <p className='mt-1 text-sm text-muted-foreground'>Refresh the page to try again.</p>
      </section>
    )
  }

  if (roadmapQuery.data.length === 0) {
    return (
      <section className='flex flex-col items-start gap-5 rounded-lg bg-card px-5 py-8 sm:px-8'>
        <div className='flex flex-col items-start gap-3'>
          <div className='flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground'>
            <BookOpenIcon aria-hidden='true' />
          </div>
          <div className='flex flex-col gap-1'>
            <h2 className='text-lg font-semibold'>Create your first course</h2>
            <p className='max-w-xl text-sm leading-6 text-muted-foreground'>
              Start with one learning goal. Synara will build the ordered roadmap and keep your next step clear.
            </p>
          </div>
        </div>
        <CreateCourseDialog>
          <Button size='lg'>
            <CirclePlusIcon data-icon='inline-start' aria-hidden='true' />
            Create first course
          </Button>
        </CreateCourseDialog>
      </section>
    )
  }

  const courseSummaries = roadmapQuery.data.map((roadmap) => ({
    roadmap,
    summary: getCourseSummary(roadmap),
  }))
  const activeCourse =
    courseSummaries.find(({ roadmap, summary }) => roadmap.currentStatus !== 'completed' && summary.currentNode) ??
    courseSummaries[0]!
  const activeHref = `/dashboard/courses/${activeCourse.roadmap.id}`
  const activeProgress = activeCourse.summary.progress ?? 0

  return (
    <div className='flex flex-col gap-12'>
      <section aria-labelledby='active-learning-heading' className='rounded-lg bg-card px-5 py-6 shadow-xs sm:px-7 sm:py-7'>
        <div className='grid gap-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
          <div className='flex min-w-0 flex-col gap-4'>
            <div className='flex flex-col gap-1'>
              <p className='text-xs font-medium tracking-wide text-primary'>Continue learning</p>
              <h2 id='active-learning-heading' className='text-xl font-semibold tracking-tight text-balance sm:text-2xl'>
                {activeCourse.summary.title}
              </h2>
              <p className='line-clamp-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground'>
                {activeCourse.summary.goalSummary}
              </p>
            </div>
            <div className='flex max-w-xl flex-col gap-2'>
              <div className='flex items-center justify-between gap-3 text-sm'>
                <span className='font-medium'>{activeProgress}% complete</span>
                <span className='tabular-nums text-muted-foreground'>
                  {activeCourse.summary.completedSteps} of {activeCourse.summary.totalSteps} steps
                </span>
              </div>
              <div
                role='progressbar'
                aria-label={`${activeCourse.summary.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={activeProgress}
                className='h-1.5 overflow-hidden rounded-full bg-muted'
              >
                <div className='h-full rounded-full bg-primary transition-[width] duration-200' style={{ width: `${activeProgress}%` }} />
              </div>
            </div>
            <p className='text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>Current step: </span>
              {activeCourse.summary.currentNode?.title ?? 'Review your completed roadmap'}
            </p>
          </div>
          <Link href={activeHref as Route} className={cn(buttonVariants({ size: 'lg' }), 'w-full md:w-auto')}>
            Open current path
            <ArrowRightIcon data-icon='inline-end' aria-hidden='true' />
          </Link>
        </div>
      </section>

      <section aria-labelledby='courses-heading' className='flex flex-col gap-4'>
        <div className='flex items-end justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <h2 id='courses-heading' className='text-lg font-semibold'>Your courses</h2>
            <p className='text-sm text-muted-foreground'>Every roadmap stays available for study or review.</p>
          </div>
          <span className='text-xs tabular-nums text-muted-foreground'>{roadmapQuery.data.length} total</span>
        </div>
        <div className='grid gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
          {courseSummaries.map(({ roadmap, summary }) => (
            <CourseCard
              key={roadmap.id}
              href={`/dashboard/courses/${roadmap.id}`}
              title={summary.title}
              secondaryMeta={summary.pace}
              completedSteps={summary.completedSteps}
              totalSteps={summary.totalSteps}
              progress={summary.progress}
              status={summary.status}
              currentNodeTitle={summary.currentNode?.title ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
