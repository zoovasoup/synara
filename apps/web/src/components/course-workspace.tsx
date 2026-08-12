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
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gemastik/ui/components/tabs'
import { cn } from '@gemastik/ui/lib/utils'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CircleCheckBigIcon,
  Clock3Icon,
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
                  : 'border bg-background text-foreground',
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
  const [activeTab, setActiveTab] = React.useState<'tutor' | 'validation'>('tutor')
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
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 lg:px-6'>
        <div className='flex flex-col gap-2' role='status' aria-live='polite'>
          <p className='text-sm font-medium'>Preparing your learning workspace…</p>
          <Skeleton className='h-8 w-64' />
        </div>
        <div className='grid gap-4 xl:grid-cols-[minmax(14rem,0.22fr)_minmax(30rem,0.55fr)_minmax(18rem,0.25fr)]'>
          <Skeleton className='h-72 w-full xl:h-[36rem]' />
          <Skeleton className='h-[36rem] w-full' />
          <Skeleton className='h-[32rem] w-full xl:h-[36rem]' />
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

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 lg:px-6 xl:overflow-hidden'>
      <header className='flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div className='flex min-w-0 flex-col gap-2'>
          <Link href='/dashboard' className='inline-flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            <ArrowLeftIcon className='size-4' aria-hidden='true' />
            Back to dashboard
          </Link>
          <div className='min-w-0'>
            <p className='text-xs font-medium uppercase tracking-widest text-muted-foreground'>Course workspace</p>
            <h1 className='mt-1 break-words text-2xl font-semibold tracking-tight text-pretty'>{onboarding?.topic ?? course.goalDescription}</h1>
            <p className='mt-1 line-clamp-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground'>{course.goalDescription}</p>
          </div>
        </div>
        <div className='flex w-full max-w-sm flex-col gap-2'>
          <div className='flex items-center justify-between gap-3 text-xs'>
            <span className='font-medium'>{progress}% complete</span>
            <span className='tabular-nums text-muted-foreground'>{completedCount} of {course.nodes.length} steps</span>
          </div>
          <div role='progressbar' aria-label='Course progress' aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className='h-1.5 overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {adaptiveState ? (
        <div
          role={adaptiveState === 'error' ? 'alert' : 'status'}
          aria-live='polite'
          className='flex shrink-0 flex-col gap-3 rounded-md border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
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

      <div className='grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(14rem,0.22fr)_minmax(30rem,0.55fr)_minmax(18rem,0.25fr)] xl:overflow-hidden'>
        <RoadmapNavigation nodes={course.nodes} selectedNodeId={selectedNode?.id ?? null} onSelect={handleSelectNode} />

        <LessonSurface
          selectedNode={selectedNode}
          nodeCount={course.nodes.length}
          lessonContent={lessonContentQuery.data?.lessonContent}
          isPending={lessonContentQuery.isPending}
          errorMessage={lessonContentQuery.isError ? 'The lesson could not be prepared right now.' : null}
          onOpenValidation={() => setActiveTab('validation')}
          validationDisabled={roadmapStatus !== 'active' || recalibration.isPending || Boolean(recalibrationError)}
        />

        <aside className='flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/20 xl:h-full xl:min-h-0' aria-labelledby='coach-heading'>
          <header className='flex flex-col gap-1 border-b px-4 py-4'>
            <h2 id='coach-heading' className='text-sm font-semibold'>Learning coach</h2>
            <p className='text-xs leading-5 text-muted-foreground'>Get help while studying, then validate when you are ready.</p>
          </header>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'tutor' | 'validation')}
            className='flex min-h-0 flex-1 flex-col gap-0'
          >
            <TabsList className='m-4 mb-0 grid w-[calc(100%-2rem)] grid-cols-2'>
              <TabsTrigger value='tutor'>Tutor</TabsTrigger>
              <TabsTrigger value='validation'>Validation</TabsTrigger>
            </TabsList>

            <TabsContent value='tutor' className='flex min-h-0 flex-1 flex-col pt-3'>
              <div className='px-4 pb-3'>
                <p className='text-sm font-medium'>Help me understand</p>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>Ask for an explanation, example, or a simpler next step.</p>
              </div>
              <ScrollArea className='h-80 min-h-0 flex-1 xl:h-auto'>
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
              <div className='px-4 pb-3'>
                <p className='text-sm font-medium'>Check whether I am ready to continue</p>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>Explain the idea in your own words. The Validator, not the Tutor, checks mastery.</p>
              </div>
              <ScrollArea className='h-80 min-h-0 flex-1 xl:h-auto'>
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
        </aside>
      </div>
    </div>
  )
}
