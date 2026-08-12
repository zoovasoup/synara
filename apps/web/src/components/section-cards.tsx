'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { Route } from 'next'
import Link from 'next/link'

import { CourseCard } from '@/components/course-card'
import { CreateCourseDialog } from '@/components/create-course-dialog'
import { useTRPC } from '@/utils/trpc'
import { Badge } from '@gemastik/ui/components/badge'
import { Button, buttonVariants } from '@gemastik/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gemastik/ui/components/card'
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
    onboarding?: {
      topic: string
      level: string
    }
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
    level: metadata.onboarding?.level ?? 'Custom',
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
      <div className='flex flex-col gap-6' aria-label='Loading learning dashboard'>
        <Card>
          <CardHeader>
            <CardTitle>Preparing your learning overview…</CardTitle>
            <CardDescription>Your current course and next step will appear here.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <Skeleton className='h-5 w-2/3' />
            <Skeleton className='h-2 w-full' />
            <Skeleton className='h-8 w-36' />
          </CardContent>
        </Card>
        <div className='grid gap-4 lg:grid-cols-2'>
          <Skeleton className='h-60 w-full' />
          <Skeleton className='h-60 w-full' />
        </div>
      </div>
    )
  }

  if (roadmapQuery.isError) {
    return (
      <Card className='border-destructive/40'>
        <CardHeader>
          <CardTitle>Unable to load your courses</CardTitle>
          <CardDescription>Refresh the page to try again.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (roadmapQuery.data.length === 0) {
    return (
      <Card className='border-dashed'>
        <CardHeader className='items-start gap-3'>
          <div className='flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground'>
            <BookOpenIcon className='size-5' aria-hidden='true' />
          </div>
          <div className='flex flex-col gap-1'>
            <CardTitle className='text-lg'>Create your first course</CardTitle>
            <CardDescription className='max-w-xl text-sm'>
              Start with one learning goal. Synara will build the ordered roadmap and keep your next step clear.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CreateCourseDialog>
            <Button size='lg'>
              <CirclePlusIcon data-icon='inline-start' aria-hidden='true' />
              Create first course
            </Button>
          </CreateCourseDialog>
        </CardContent>
      </Card>
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
    <div className='flex flex-col gap-10'>
      <section aria-labelledby='active-learning-heading'>
        <Card className='bg-muted/20'>
          <CardContent className='grid gap-6 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
            <div className='flex min-w-0 flex-col gap-4'>
              <div className='flex flex-col gap-1'>
                <p className='text-xs font-medium uppercase tracking-widest text-muted-foreground'>Active learning</p>
                <h2 id='active-learning-heading' className='text-xl font-semibold text-pretty'>
                  {activeCourse.summary.title}
                </h2>
                <p className='line-clamp-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground'>
                  {activeCourse.roadmap.goalDescription}
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
                  className='h-2 overflow-hidden rounded-full bg-muted'
                >
                  <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${activeProgress}%` }} />
                </div>
              </div>
              <p className='text-sm text-muted-foreground'>
                <span className='font-medium text-foreground'>Current step: </span>
                {activeCourse.summary.currentNode?.title ?? 'Review your completed roadmap'}
              </p>
            </div>
            <Link href={activeHref as Route} className={cn(buttonVariants({ size: 'lg' }), 'w-full md:w-auto')}>
              Continue learning
              <ArrowRightIcon data-icon='inline-end' aria-hidden='true' />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby='courses-heading' className='flex flex-col gap-4'>
        <div className='flex items-end justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <h2 id='courses-heading' className='text-lg font-semibold'>Your courses</h2>
            <p className='text-sm text-muted-foreground'>Open any course to review its full learning path.</p>
          </div>
          <Badge variant='secondary'>{roadmapQuery.data.length} total</Badge>
        </div>
        <div className='grid gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
          {courseSummaries.map(({ roadmap, summary }) => (
            <CourseCard
              key={roadmap.id}
              href={`/dashboard/courses/${roadmap.id}`}
              title={summary.title}
              description={roadmap.goalDescription}
              level={summary.level}
              completedSteps={summary.completedSteps}
              totalSteps={summary.totalSteps}
              progress={summary.progress}
              status={summary.status}
              currentNodeTitle={summary.currentNode?.title ?? null}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby='continue-heading' className='flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-1'>
          <h2 id='continue-heading' className='text-base font-semibold'>Continue where you left off</h2>
          <p className='text-sm text-muted-foreground'>
            {activeCourse.summary.currentNode?.title ?? 'Your completed course remains available for review.'}
          </p>
        </div>
        <Link href={activeHref as Route} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
          Open learning workspace
          <ArrowRightIcon data-icon='inline-end' aria-hidden='true' />
        </Link>
      </section>
    </div>
  )
}
