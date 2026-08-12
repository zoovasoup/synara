'use client'

import * as React from 'react'

import type { UseQueryResult } from '@tanstack/react-query'
import Link from 'next/link'

import {
  LessonSurface,
  RoadmapNavigation,
  type ChatMessage,
  type CourseNode,
  type LessonContent,
} from '@/components/course-workspace-sections'
import { useActiveStudyAttempt } from '@/hooks/use-active-study-attempt'
import { runRecalibrationOrchestration, type RecalibrationResult } from '@/lib/recalibration-orchestration'
import { useTRPC } from '@/utils/trpc'
import { Badge } from '@gemastik/ui/components/badge'
import { Button } from '@gemastik/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@gemastik/ui/components/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@gemastik/ui/components/field'
import { Input } from '@gemastik/ui/components/input'
import { ScrollArea } from '@gemastik/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@gemastik/ui/components/sheet'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gemastik/ui/components/tabs'
import { cn } from '@gemastik/ui/lib/utils'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CircleCheckBigIcon,
  Clock3Icon,
  ListTreeIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SendIcon,
} from 'lucide-react'
import { toast } from 'sonner'

type CourseDetail = {
  id: string
  goalDescription: string
  currentStatus: 'active' | 'completed' | 'recalibrating' | 'needs_recalibration' | null
  metadata: {
    onboarding?: {
      topic: string
      level: string
      goal: string
      weeklyHours: string
      learningStyle: string
    }
  } | null
  nodes: CourseNode[]
}

type SocraticSession = {
  id: string
  chatHistory: ChatMessage[]
  competencyScore: number | null
  stumbleCount: number
  sentimentScore: number
}

function getValidationPrompt(nodeTitle: string) {
  return `Explain ${nodeTitle} in your own words, describe how you would apply it, or answer the Validator's follow-up questions.`
}

function getCourseGoalSummary(topic: string | undefined, goal: string | undefined, fallback: string) {
  if (!topic || !goal) return fallback.split(/(?<=[.!?])\s/)[0] ?? fallback

  if (goal === 'To build a project') return `Build a practical project in ${topic}.`
  if (goal === 'For school') return `Build a strong foundation in ${topic}.`
  if (goal === 'For work') return `Apply ${topic} with confidence at work.`
  if (goal === 'For personal interest') return `Explore ${topic} through a structured path.`
  return `Build practical confidence in ${topic}.`
}

function MessageThread({
  messages,
  emptyMessage,
  pendingMessage,
}: {
  messages: ChatMessage[]
  emptyMessage: string
  pendingMessage: string | null
}) {
  return (
    <div className='flex flex-col gap-3' aria-live='polite'>
      {messages.length > 0 ? (
        messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[92%] whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm leading-6',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground',
              )}
            >
              {message.content}
            </div>
          </div>
        ))
      ) : (
        <p className='rounded-md border border-dashed p-4 text-sm leading-6 text-muted-foreground'>{emptyMessage}</p>
      )}
      {pendingMessage ? (
        <div className='flex justify-start' role='status'>
          <div className='flex max-w-[92%] items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground'>
            <LoaderCircleIcon className='size-4 animate-spin' aria-hidden='true' />
            {pendingMessage}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CourseWorkspace({ courseId }: { courseId: string }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [draftTutorMessage, setDraftTutorMessage] = React.useState('')
  const [draftValidationMessage, setDraftValidationMessage] = React.useState('')
  const [mentalEffort, setMentalEffort] = React.useState(5)
  const [supportMode, setSupportMode] = React.useState<'tutor' | 'validation' | null>(null)
  const [roadmapOpen, setRoadmapOpen] = React.useState(false)
  const [recalibrationError, setRecalibrationError] = React.useState<string | null>(null)
  const [recalibrationSucceeded, setRecalibrationSucceeded] = React.useState(false)
  const recalibrationInFlight = React.useRef<Promise<RecalibrationResult> | null>(null)
  const automaticRecalibrationStarted = React.useRef(false)

  const courseQuery = useQuery(trpc.learning.getById.queryOptions({ id: courseId })) as UseQueryResult<CourseDetail, Error>

  React.useEffect(() => {
    if (!courseQuery.data) return

    const selectedNode = courseQuery.data.nodes.find((node) => node.id === selectedNodeId)
    if (selectedNode && selectedNode.progressionState !== 'locked') return

    const defaultNode =
      courseQuery.data.nodes.find((node) => node.progressionState === 'current') ??
      courseQuery.data.nodes.find((node) => node.progressionState === 'completed')
    setSelectedNodeId(defaultNode?.id ?? null)
  }, [courseQuery.data, selectedNodeId])

  const selectedCandidate = courseQuery.data?.nodes.find((node) => node.id === selectedNodeId)
  const selectedNode =
    (selectedCandidate?.progressionState !== 'locked' ? selectedCandidate : null) ??
    courseQuery.data?.nodes.find((node) => node.progressionState === 'current') ??
    courseQuery.data?.nodes.find((node) => node.progressionState === 'completed') ??
    null
  const currentNode = courseQuery.data?.nodes.find((node) => node.progressionState === 'current') ?? null
  const roadmapStatus = courseQuery.data?.currentStatus ?? 'active'

  const lessonContentQuery = useQuery({
    ...trpc.learning.getNodeContent.queryOptions(selectedNode ? { roadmapId: courseId, nodeId: selectedNode.id } : skipToken),
    enabled: Boolean(selectedNode),
  }) as UseQueryResult<{ nodeId: string; lessonContent: LessonContent }, Error>

  const tutorSessionQuery = useQuery({
    ...trpc.learning.getTutorSession.queryOptions(selectedNode ? { nodeId: selectedNode.id } : skipToken),
    enabled: Boolean(selectedNode),
  }) as UseQueryResult<ChatMessage[], Error>

  const socraticSessionQuery = useQuery({
    ...trpc.validation.getSocraticSession.queryOptions(selectedNode ? { nodeId: selectedNode.id } : skipToken),
    enabled: Boolean(selectedNode),
  }) as UseQueryResult<SocraticSession | null, Error>

  const tutorChat = useMutation(trpc.learning.askTutor.mutationOptions())
  const validationChat = useMutation(trpc.validation.submitSocratic.mutationOptions())
  const recalibration = useMutation(trpc.learning.recalibrate.mutationOptions())
  const activeStudyAttempt = useActiveStudyAttempt({
    nodeId: currentNode?.id ?? null,
    isTracking: Boolean(
      currentNode &&
      selectedNode?.id === currentNode.id &&
      lessonContentQuery.isSuccess &&
      lessonContentQuery.data?.nodeId === currentNode.id &&
      !validationChat.isPending &&
      roadmapStatus === 'active' &&
      !recalibration.isPending &&
      !recalibrationError,
    ),
  })

  React.useEffect(() => {
    setMentalEffort(5)
  }, [currentNode?.id])

  const refreshCourseData = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.learning.getById.queryKey({ id: courseId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.learning.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.learning.getDashboard.queryKey() }),
    ])
  }, [courseId, queryClient, trpc])

  const adjustLearningPath = React.useCallback(async () => {
    setRecalibrationError(null)
    setRecalibrationSucceeded(false)

    try {
      const result = await runRecalibrationOrchestration({
        inFlight: recalibrationInFlight,
        recalibrate: async () => await recalibration.mutateAsync({ roadmapId: courseId }),
        refresh: refreshCourseData,
        selectCurrentNode: setSelectedNodeId,
      })

      setRecalibrationSucceeded(true)
      setSupportMode(null)
      toast.success('Your learning path was adjusted.', {
        description: 'We added a more guided route before you continue.',
      })
      return result
    } catch {
      const message = "We couldn't adjust the learning path yet. Try again."
      setRecalibrationError(message)
      setRecalibrationSucceeded(false)
      await refreshCourseData().catch(() => undefined)
      toast.error(message)
      return null
    }
  }, [courseId, recalibration, refreshCourseData])

  React.useEffect(() => {
    if (roadmapStatus === 'active') {
      automaticRecalibrationStarted.current = false
      return
    }

    if (roadmapStatus === 'needs_recalibration' && !recalibrationError && !automaticRecalibrationStarted.current) {
      automaticRecalibrationStarted.current = true
      void adjustLearningPath()
    }
  }, [adjustLearningPath, recalibrationError, roadmapStatus])

  if (courseQuery.isPending) {
    return (
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 lg:px-5'>
        <div className='flex flex-col gap-2' role='status' aria-live='polite'>
          <p className='text-sm font-medium'>Preparing your learning workspace…</p>
          <Skeleton className='h-8 w-64' />
        </div>
        <div className='grid min-h-0 flex-1 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-[15rem_minmax(0,1fr)]'>
          <Skeleton className='hidden h-full w-full rounded-none lg:block' />
          <Skeleton className='min-h-72 w-full rounded-none' />
        </div>
      </div>
    )
  }

  if (courseQuery.isError) {
    return (
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 lg:px-6'>
        <Link href='/dashboard' className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
          <ArrowLeftIcon className='size-4' aria-hidden='true' />
          Back to dashboard
        </Link>
        <Card className='border-destructive/40'>
          <CardHeader>
            <CardTitle>Unable to load this course</CardTitle>
            <CardDescription>Return to the dashboard and try opening this course again.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const course = courseQuery.data
  const onboarding = course.metadata?.onboarding
  const completedCount = course.nodes.filter((node) => node.isCompleted).length
  const progress = course.nodes.length > 0 ? Math.round((completedCount / course.nodes.length) * 100) : 0
  const tutorMessages = tutorSessionQuery.data ?? []
  const validationMessages = socraticSessionQuery.data?.chatHistory ?? []
  const latestCompetency = socraticSessionQuery.data?.competencyScore ?? null
  const currentNodeWritesPaused = Boolean(
    !selectedNode?.isCompleted &&
    (recalibration.isPending || roadmapStatus === 'recalibrating'),
  )

  const handleSelectNode = (node: CourseNode) => {
    if (
      currentNode &&
      selectedNode?.id === currentNode.id &&
      node.progressionState === 'completed' &&
      node.orderIndex < currentNode.orderIndex
    ) {
      activeStudyAttempt.recordBacktrack()
    }

    setSelectedNodeId(node.id)
    setRoadmapOpen(false)
  }

  const handleSendTutorMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedNode || tutorChat.isPending || currentNodeWritesPaused) return

    const message = draftTutorMessage.trim()
    if (!message) return

    setDraftTutorMessage('')
    try {
      const result = await tutorChat.mutateAsync({
        roadmapId: course.id,
        nodeId: selectedNode.id,
        message,
      })
      queryClient.setQueryData(trpc.learning.getTutorSession.queryKey({ nodeId: selectedNode.id }), result.chatHistory)
    } catch {
      toast.error('Unable to get a Tutor response. Try again.')
      setDraftTutorMessage(message)
    }
  }

  const handleSendValidationMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedNode || validationChat.isPending || recalibration.isPending || recalibrationError || roadmapStatus !== 'active') return

    const message = draftValidationMessage.trim()
    if (!message) return

    setDraftValidationMessage('')
    const attempt = activeStudyAttempt.getSnapshot()

    try {
      const result = await validationChat.mutateAsync({
        nodeId: selectedNode.id,
        message,
        effortScore: mentalEffort,
        ...attempt,
      })

      activeStudyAttempt.completeAttempt()
      setMentalEffort(5)
      await queryClient.invalidateQueries({ queryKey: trpc.validation.getSocraticSession.queryKey({ nodeId: selectedNode.id }) })

      if (result.recalibrationRequired) {
        setRecalibrationSucceeded(false)
        toast.message("This step is taking more effort than expected. We're adjusting the next part of your learning path.")
        await adjustLearningPath()
        return
      }

      await refreshCourseData()
      if (result.competency_score >= 80) {
        if (result.nextNodeId) setSelectedNodeId(result.nextNodeId)
        setSupportMode(null)
        toast.success('Ready to continue', {
          description: result.roadmapCompleted
            ? 'All roadmap steps are now complete.'
            : 'The next roadmap step is now accessible.',
        })
      } else {
        toast.message('Review this concept once more', {
          description: 'Use the feedback, revisit the lesson, and explain the idea again when ready.',
        })
      }
    } catch {
      toast.error('Unable to validate this step. Try again.')
      setDraftValidationMessage(message)
    }
  }

  const adaptiveState = recalibration.isPending || roadmapStatus === 'recalibrating' || (roadmapStatus === 'needs_recalibration' && !recalibrationError)
    ? 'pending'
    : recalibrationError
      ? 'error'
      : recalibrationSucceeded
        ? 'success'
        : null
  const courseSummary = getCourseGoalSummary(onboarding?.topic, onboarding?.goal, course.goalDescription)
  const coursePace = [
    onboarding?.level,
    onboarding?.weeklyHours ? `${onboarding.weeklyHours.replace('-', '–')}/week` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-4 lg:overflow-hidden lg:px-5'>
      <header className='flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div className='flex min-w-0 flex-col gap-1.5'>
          <Link href='/dashboard' className='inline-flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            <ArrowLeftIcon className='size-4' aria-hidden='true' />
            Back to dashboard
          </Link>
          <div className='min-w-0'>
            <h1 className='break-words text-xl font-semibold tracking-tight text-pretty md:text-2xl'>{onboarding?.topic ?? course.goalDescription}</h1>
            <p className='mt-0.5 line-clamp-1 max-w-3xl break-words text-sm leading-5 text-foreground/75'>{courseSummary}</p>
            {coursePace ? <p className='mt-1 text-xs text-muted-foreground'>{coursePace}</p> : null}
          </div>
        </div>
        <div className='flex w-full max-w-xs flex-col gap-1.5'>
          <div className='flex items-center justify-between gap-3 text-xs'>
            <span className='font-medium'>{progress}% complete</span>
            <span className='tabular-nums text-muted-foreground'>{completedCount} of {course.nodes.length} steps</span>
          </div>
          <div role='progressbar' aria-label='Course progress' aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className='h-1.5 overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className='flex shrink-0 lg:hidden'>
        <Button type='button' variant='outline' onClick={() => setRoadmapOpen(true)} className='w-full justify-start'>
          <ListTreeIcon data-icon='inline-start' aria-hidden='true' />
          Learning path
          {currentNode ? <span className='ml-auto truncate text-muted-foreground'>Step {currentNode.orderIndex + 1}</span> : null}
        </Button>
      </div>

      <Sheet open={roadmapOpen} onOpenChange={setRoadmapOpen}>
        <SheetContent side='left' className='w-[min(21rem,90vw)] p-0 sm:max-w-sm'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Learning path</SheetTitle>
            <SheetDescription>Select a completed or current roadmap step.</SheetDescription>
          </SheetHeader>
          <RoadmapNavigation
            className='h-full bg-popover pt-10'
            headingId='mobile-roadmap-heading'
            nodes={course.nodes}
            selectedNodeId={selectedNode?.id ?? null}
            onSelect={handleSelectNode}
          />
        </SheetContent>
      </Sheet>

      {adaptiveState ? (
        <div
          role={adaptiveState === 'error' ? 'alert' : 'status'}
          aria-live='polite'
          className='flex shrink-0 flex-col gap-3 rounded-md bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
        >
          <div className='flex items-start gap-3'>
            {adaptiveState === 'pending' ? <LoaderCircleIcon className='mt-0.5 size-4 animate-spin text-primary' aria-hidden='true' /> : null}
            <div>
              <p className='text-sm font-medium'>
                {adaptiveState === 'pending'
                  ? 'Adjusting your learning path…'
                  : adaptiveState === 'success'
                    ? 'Your learning path was adjusted.'
                    : "We couldn't adjust the learning path yet."}
              </p>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                {adaptiveState === 'pending'
                  ? 'This step is taking more effort than expected. Mastery controls are paused while a more guided route is prepared.'
                  : adaptiveState === 'success'
                    ? 'We added a more guided route before you continue.'
                    : 'Your current path is still available for review. Try the adjustment again.'}
              </p>
            </div>
          </div>
          {adaptiveState === 'error' ? (
            <Button type='button' variant='outline' onClick={() => void adjustLearningPath()} disabled={recalibration.isPending}>
              <RefreshCwIcon data-icon='inline-start' aria-hidden='true' />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className='grid min-h-0 flex-none overflow-visible rounded-lg border bg-border lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden'>
        <RoadmapNavigation className='hidden border-r lg:flex' nodes={course.nodes} selectedNodeId={selectedNode?.id ?? null} onSelect={handleSelectNode} />

        <LessonSurface
          selectedNode={selectedNode}
          nodeCount={course.nodes.length}
          lessonContent={lessonContentQuery.data?.lessonContent}
          isPending={lessonContentQuery.isPending}
          errorMessage={lessonContentQuery.isError ? 'The lesson could not be prepared right now.' : null}
          onOpenTutor={() => setSupportMode('tutor')}
          onOpenValidation={() => setSupportMode('validation')}
          validationDisabled={roadmapStatus !== 'active' || recalibration.isPending || Boolean(recalibrationError)}
        />

        <Sheet open={supportMode !== null} onOpenChange={(open) => !open && setSupportMode(null)}>
          <SheetContent side='right' className='w-full p-0 sm:max-w-md md:max-w-[30rem]'>
          <SheetHeader className='shrink-0 border-b px-5 py-4 pr-12'>
            <SheetTitle>{supportMode === 'validation' ? 'Check your understanding' : 'Tutor'}</SheetTitle>
            <SheetDescription>
              {supportMode === 'validation' ? 'Explain the idea in your own words when you are ready to continue.' : 'Help me understand this step.'}
            </SheetDescription>
          </SheetHeader>
          <Tabs
            value={supportMode ?? 'tutor'}
            onValueChange={(value) => setSupportMode(value as 'tutor' | 'validation')}
            className='flex min-h-0 flex-1 flex-col gap-0'
          >
            <TabsList className='m-4 mb-0 grid w-[calc(100%-2rem)] grid-cols-2'>
              <TabsTrigger value='tutor'>Tutor</TabsTrigger>
              <TabsTrigger value='validation'>Validation</TabsTrigger>
            </TabsList>

            {adaptiveState ? (
              <div
                role={adaptiveState === 'error' ? 'alert' : 'status'}
                aria-live='polite'
                className='mx-4 mt-3 flex items-start gap-2 rounded-md bg-muted/60 p-3'
              >
                {adaptiveState === 'pending' ? <LoaderCircleIcon className='mt-0.5 size-4 shrink-0 animate-spin text-primary' aria-hidden='true' /> : null}
                <div className='min-w-0'>
                  <p className='text-sm font-medium'>
                    {adaptiveState === 'pending'
                      ? 'Adjusting your learning path…'
                      : adaptiveState === 'success'
                        ? 'Your learning path was adjusted.'
                        : "We couldn't adjust the learning path yet."}
                  </p>
                  {adaptiveState === 'error' ? (
                    <Button type='button' variant='link' size='sm' className='mt-1 h-auto px-0' onClick={() => void adjustLearningPath()}>
                      Try again
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <TabsContent value='tutor' className='flex min-h-0 flex-1 flex-col pt-3'>
              <ScrollArea className='min-h-0 flex-1'>
                <div className='px-4 pb-3 pr-6'>
                  {tutorSessionQuery.isError ? (
                    <p role='alert' className='rounded-md border border-destructive/40 p-3 text-sm leading-6 text-muted-foreground'>
                      Tutor history could not be loaded. You can try this step again shortly.
                    </p>
                  ) : tutorSessionQuery.isPending && selectedNode ? (
                    <div className='flex flex-col gap-2' role='status'>
                      <p className='text-xs text-muted-foreground'>Loading your Tutor history…</p>
                      <Skeleton className='h-16 w-full' />
                      <Skeleton className='h-16 w-4/5' />
                    </div>
                  ) : (
                    <MessageThread
                      messages={tutorMessages}
                      emptyMessage={selectedNode ? `No Tutor messages yet. Ask a question about ${selectedNode.title}.` : 'Choose a roadmap step to start a Tutor conversation.'}
                      pendingMessage={tutorChat.isPending ? 'Thinking through your question…' : null}
                    />
                  )}
                </div>
              </ScrollArea>
              <form onSubmit={handleSendTutorMessage} className='mt-auto flex flex-col gap-3 border-t bg-background/60 p-4'>
                <label htmlFor='tutor-message' className='text-xs font-medium'>Ask the Tutor</label>
                <textarea
                  id='tutor-message'
                  name='tutor-message'
                  autoComplete='off'
                  value={draftTutorMessage}
                  onChange={(event) => setDraftTutorMessage(event.target.value)}
                  placeholder={selectedNode ? `Ask about ${selectedNode.title}…` : 'Choose a roadmap step first…'}
                  disabled={!selectedNode || tutorChat.isPending || currentNodeWritesPaused}
                  className='min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'
                />
                <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
                  <span className='flex min-w-0 items-center gap-2'>
                    <Clock3Icon className='size-3.5 shrink-0' aria-hidden='true' />
                    <span className='truncate'>{selectedNode ? `${selectedNode.estimatedTime} min study block` : 'No step selected'}</span>
                  </span>
                  <Button type='submit' disabled={!selectedNode || !draftTutorMessage.trim() || tutorChat.isPending || currentNodeWritesPaused}>
                    <SendIcon data-icon='inline-start' aria-hidden='true' />
                    Send
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value='validation' className='flex min-h-0 flex-1 flex-col pt-3'>
              <ScrollArea className='min-h-0 flex-1'>
                <div className='flex flex-col gap-4 px-4 pb-3 pr-6'>
                  <p className='rounded-md bg-background p-3 text-sm leading-6 text-muted-foreground'>
                    {selectedNode ? getValidationPrompt(selectedNode.title) : 'Choose a roadmap step to begin Socratic Validation.'}
                  </p>

                  {latestCompetency !== null ? (
                    <div className='rounded-md border bg-background p-3' aria-live='polite'>
                      <p className='text-sm font-medium'>{latestCompetency >= 80 ? 'Ready to continue' : 'Review this concept once more'}</p>
                      <p className='mt-1 text-xs leading-5 text-muted-foreground'>Latest competency estimate: {Math.round(latestCompetency)} / 100</p>
                    </div>
                  ) : null}

                  {socraticSessionQuery.isError ? (
                    <p role='alert' className='rounded-md border border-destructive/40 p-3 text-sm leading-6 text-muted-foreground'>
                      Validation history could not be loaded. Try opening this step again.
                    </p>
                  ) : socraticSessionQuery.isPending && selectedNode ? (
                    <div className='flex flex-col gap-2' role='status'>
                      <p className='text-xs text-muted-foreground'>Loading validation history…</p>
                      <Skeleton className='h-16 w-full' />
                      <Skeleton className='h-16 w-4/5' />
                    </div>
                  ) : (
                    <MessageThread
                      messages={validationMessages}
                      emptyMessage='No validation history yet. Your first explanation will start the dialogue.'
                      pendingMessage={validationChat.isPending ? 'Considering your explanation…' : null}
                    />
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleSendValidationMessage} className='mt-auto flex flex-col gap-3 border-t bg-background/60 p-4'>
                <label htmlFor='validation-message' className='text-xs font-medium'>Your explanation</label>
                <textarea
                  id='validation-message'
                  name='validation-message'
                  autoComplete='off'
                  value={draftValidationMessage}
                  onChange={(event) => setDraftValidationMessage(event.target.value)}
                  placeholder={selectedNode ? `Explain ${selectedNode.title} in your own words…` : 'Choose a roadmap step first…'}
                  disabled={!selectedNode || validationChat.isPending || recalibration.isPending || Boolean(recalibrationError) || roadmapStatus !== 'active' || selectedNode?.isCompleted}
                  className='min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'
                />

                {selectedNode && !selectedNode.isCompleted ? (
                  <FieldGroup className='gap-3'>
                    <Field>
                      <div className='flex items-center justify-between gap-3'>
                        <FieldLabel htmlFor='mental-effort'>How mentally demanding did this step feel?</FieldLabel>
                        <Badge variant='outline'>{mentalEffort} / 9</Badge>
                      </div>
                      <Input
                        id='mental-effort'
                        name='mental-effort'
                        type='range'
                        min={1}
                        max={9}
                        step={1}
                        value={mentalEffort}
                        onChange={(event) => setMentalEffort(Number(event.target.value))}
                        disabled={validationChat.isPending || recalibration.isPending || Boolean(recalibrationError) || roadmapStatus !== 'active'}
                        aria-valuetext={`${mentalEffort} out of 9`}
                      />
                      <FieldDescription className='flex justify-between gap-3'>
                        <span>1 — Very low</span>
                        <span>9 — Very high</span>
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                ) : null}

                <p className='text-xs leading-5 text-muted-foreground'>
                  {selectedNode?.isCompleted
                    ? 'This step is mastered. Review the lesson or ask the Tutor any time.'
                    : 'A competency estimate of 80 or above completes this step.'}
                </p>
                <Button type='submit' disabled={!selectedNode || !draftValidationMessage.trim() || validationChat.isPending || recalibration.isPending || Boolean(recalibrationError) || roadmapStatus !== 'active' || selectedNode?.isCompleted}>
                  <CircleCheckBigIcon data-icon='inline-start' aria-hidden='true' />
                  Validate understanding
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
