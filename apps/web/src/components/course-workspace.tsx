'use client'

import * as React from 'react'

import type { UseQueryResult } from '@tanstack/react-query'
import Link from 'next/link'

import { useActiveStudyAttempt } from '@/hooks/use-active-study-attempt'
import { runRecalibrationOrchestration, type RecalibrationResult } from '@/lib/recalibration-orchestration'
import { useTRPC } from '@/utils/trpc'
import { Badge } from '@gemastik/ui/components/badge'
import { Button } from '@gemastik/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gemastik/ui/components/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@gemastik/ui/components/field'
import { Input } from '@gemastik/ui/components/input'
import { ScrollArea } from '@gemastik/ui/components/scroll-area'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gemastik/ui/components/tabs'
import { cn } from '@gemastik/ui/lib/utils'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CircleCheckBigIcon,
  CircleDashedIcon,
  Clock3Icon,
  ExternalLinkIcon,
  LockIcon,
  RefreshCwIcon,
  SendIcon,
  SparklesIcon,
} from 'lucide-react'
import { toast } from 'sonner'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type LessonContent = {
  resourceModelVersion: 1
  summary: string
  concepts: string[]
  steps: string[]
  exercises: string[]
  resources: {
    sourceId: string
    title: string
    provider: string
    url: string
    sourceType: 'official_documentation' | 'open_courseware' | 'verified_tutorial'
    level: 'beginner' | 'intermediate' | 'advanced' | 'all'
    description: string
  }[]
}

type CourseNode = {
  id: string
  title: string
  orderIndex: number
  contentType: string
  estimatedTime: number
  successCriteria: string[]
  difficultyLevel: number
  isCompleted: boolean
  completedAt: string | Date | null
  progressionState: 'completed' | 'current' | 'locked'
}

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

function getDifficultyLabel(level: number) {
  if (level <= 3) return 'Easy'
  if (level <= 7) return 'Medium'
  return 'Advanced'
}

function getResourceTypeLabel(type: LessonContent['resources'][number]['sourceType']) {
  if (type === 'official_documentation') return 'Official documentation'
  if (type === 'open_courseware') return 'Open courseware'
  return 'Verified tutorial'
}

function getResourceLevelLabel(level: LessonContent['resources'][number]['level']) {
  if (level === 'all') return 'All levels'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function getValidationPrompt(nodeTitle: string) {
  return `Explain ${nodeTitle} in your own words, describe how you would apply it, or answer the AI's follow-up questions.`
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
  const recalibrationInFlight = React.useRef<Promise<RecalibrationResult> | null>(null)
  const automaticRecalibrationStarted = React.useRef(false)

  const courseQuery = useQuery(trpc.learning.getById.queryOptions({ id: courseId })) as UseQueryResult<CourseDetail, Error>

  React.useEffect(() => {
    if (!courseQuery.data) {
      return
    }

    const selectedNode = courseQuery.data.nodes.find((node) => node.id === selectedNodeId)
    if (selectedNode && selectedNode.progressionState !== 'locked') {
      return
    }

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

    try {
      const result = await runRecalibrationOrchestration({
        inFlight: recalibrationInFlight,
        recalibrate: async () =>
          await recalibration.mutateAsync({ roadmapId: courseId }),
        refresh: refreshCourseData,
        selectCurrentNode: setSelectedNodeId,
      })

      toast.success('Your learning path was adjusted.', {
        description: 'We added a more guided route before you continue.',
      })

      return result
    } catch {
      const message = "We couldn't adjust the learning path yet. Try again."
      setRecalibrationError(message)
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

    if (
      roadmapStatus === 'needs_recalibration' &&
      !recalibrationError &&
      !automaticRecalibrationStarted.current
    ) {
      automaticRecalibrationStarted.current = true
      void adjustLearningPath()
    }
  }, [adjustLearningPath, recalibrationError, roadmapStatus])

  if (courseQuery.isPending) {
    return (
      <div className='flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:px-6 md:py-6'>
        <Skeleton className='h-8 w-56' />
        <div className='grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_24rem]'>
          <Skeleton className='h-[28rem] w-full' />
          <Skeleton className='h-[28rem] w-full' />
          <Skeleton className='h-[28rem] w-full' />
        </div>
      </div>
    )
  }

  if (courseQuery.isError) {
    return (
      <div className='flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:px-6 md:py-6'>
        <Link href='/dashboard' className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'>
          <ArrowLeftIcon className='size-4' />
          Back to dashboard
        </Link>
        <Card className='border-destructive/40'>
          <CardHeader>
            <CardTitle>Unable to load this course</CardTitle>
            <CardDescription>{courseQuery.error.message}</CardDescription>
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

    if (!selectedNode || tutorChat.isPending || currentNodeWritesPaused) {
      return
    }

    const message = draftTutorMessage.trim()
    if (!message) {
      return
    }

    setDraftTutorMessage('')

    try {
      const result = await tutorChat.mutateAsync({
        roadmapId: course.id,
        nodeId: selectedNode.id,
        message,
      })

      queryClient.setQueryData(trpc.learning.getTutorSession.queryKey({ nodeId: selectedNode.id }), result.chatHistory)
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to get a tutor response.'
      toast.error(messageText)
      setDraftTutorMessage(message)
    }
  }

  const handleSendValidationMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedNode || validationChat.isPending || recalibration.isPending || recalibrationError || roadmapStatus !== 'active') {
      return
    }

    const message = draftValidationMessage.trim()
    if (!message) {
      return
    }

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
        toast.message("This step is taking more effort than expected. We're adjusting the next part of your learning path.")
        await adjustLearningPath()
        return
      }

      await refreshCourseData()

      if (result.competency_score >= 80) {
        if (result.nextNodeId) {
          setSelectedNodeId(result.nextNodeId)
        }

        toast.success('Step completed through validation', {
          description: result.roadmapCompleted
            ? 'All roadmap steps are now complete.'
            : 'The next roadmap step is now accessible.',
        })
      } else {
        toast.message('Validation submitted', {
          description: 'Keep going until your Socratic score reaches the passing threshold.',
        })
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to validate this node.'
      toast.error(messageText)
      setDraftValidationMessage(message)
    }
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 lg:px-6 md:py-6'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-2'>
          <Link href='/dashboard' className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'>
            <ArrowLeftIcon className='size-4' />
            Back to dashboard
          </Link>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>{onboarding?.topic ?? course.goalDescription}</h1>
            <p className='text-sm text-muted-foreground'>{course.goalDescription}</p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant='secondary'>{onboarding?.level ?? 'Custom roadmap'}</Badge>
          <Badge variant='secondary'>{progress}% complete</Badge>
          <Badge variant='secondary'>{course.nodes.length} steps</Badge>
          <Badge variant='secondary'>{course.currentStatus ?? 'active'}</Badge>
        </div>
      </div>

      <div className='grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)_24rem]'>
        <Card className='flex min-h-0 flex-col xl:h-full'>
          <CardHeader>
            <CardTitle>Full roadmap</CardTitle>
            <CardDescription>Follow the roadmap in order. Completed steps remain available for review.</CardDescription>
          </CardHeader>
          <CardContent className='min-h-0 flex-1 p-0'>
            <ScrollArea className='h-full w-full'>
              <div className='space-y-2 p-6'>
                {course.nodes.length === 0 ? (
                  <div className='rounded-none border border-dashed px-3 py-4 text-sm text-muted-foreground'>
                    This course is saved, but its roadmap is still in draft mode.
                  </div>
                ) : (
                  course.nodes.map((node, index) => {
                    const isSelected = node.id === selectedNode?.id
                    const isCurrent = node.progressionState === 'current'
                    const isLocked = node.progressionState === 'locked'

                    return (
                      <button
                        key={node.id}
                        type='button'
                        onClick={() => handleSelectNode(node)}
                        disabled={isLocked}
                        aria-current={isCurrent ? 'step' : undefined}
                        title={isLocked ? 'Complete the previous step first.' : undefined}
                        className={cn(
                          'flex w-full flex-col gap-2 border px-3 py-3 text-left transition-colors',
                          node.progressionState === 'completed' && 'border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40',
                          isCurrent && 'border-primary bg-primary/10 hover:bg-primary/15',
                          isLocked && 'cursor-not-allowed border-border/50 bg-muted/20 text-muted-foreground opacity-70',
                          isSelected && 'border-primary bg-primary/5',
                        )}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='text-[11px] uppercase tracking-[0.2em] text-muted-foreground'>Step {index + 1}</p>
                            <p className='mt-1 text-sm font-medium text-foreground'>{node.title}</p>
                          </div>
                          {node.progressionState === 'completed' ? (
                            <CircleCheckBigIcon className='mt-0.5 size-4 text-primary' aria-label='Completed' />
                          ) : isCurrent ? (
                            <CircleDashedIcon className='mt-0.5 size-4 text-primary' aria-label='Current step' />
                          ) : (
                            <LockIcon className='mt-0.5 size-4' aria-label='Locked' />
                          )}
                        </div>
                        <div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
                          <span>{node.contentType}</span>
                          <span>•</span>
                          <span>{node.estimatedTime} min</span>
                          <span>•</span>
                          <span>{getDifficultyLabel(node.difficultyLevel)}</span>
                        </div>
                        <div className='flex items-center justify-between gap-2'>
                          <Badge variant={isCurrent ? 'default' : isLocked ? 'outline' : 'secondary'}>
                            {node.progressionState === 'completed' ? 'Completed' : isCurrent ? 'Current' : 'Locked'}
                          </Badge>
                          {isLocked ? <span className='text-[11px]'>Complete the previous step first.</span> : null}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className='flex min-h-0 flex-col xl:h-full'>
          <CardHeader>
            <CardTitle>Node content</CardTitle>
            <CardDescription>
              {selectedNode ? 'Real lesson content generated and stored for the selected node.' : 'Select a roadmap step to load its lesson content.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='min-h-0 flex-1 p-0'>
            <ScrollArea className='h-full w-full'>
              <div className='space-y-6 p-6'>
                {selectedNode ? (
                  lessonContentQuery.isPending ? (
                    <div className='space-y-4'>
                      <Skeleton className='h-6 w-32' />
                      <Skeleton className='h-20 w-full' />
                      <Skeleton className='h-32 w-full' />
                    </div>
                  ) : lessonContentQuery.isError ? (
                    <div className='rounded-none border border-destructive/40 px-4 py-4 text-sm text-muted-foreground'>
                      {lessonContentQuery.error.message}
                    </div>
                  ) : (
                    <>
                  <div className='space-y-3 border-b pb-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='secondary'>{selectedNode.contentType}</Badge>
                      <Badge variant='secondary'>{selectedNode.estimatedTime} min</Badge>
                      <Badge variant='secondary'>{getDifficultyLabel(selectedNode.difficultyLevel)}</Badge>
                      {selectedNode.isCompleted ? <Badge variant='secondary'>Completed</Badge> : null}
                    </div>
                    <div>
                      <h2 className='text-lg font-semibold'>{selectedNode.title}</h2>
                      <p className='mt-2 text-sm leading-6 text-muted-foreground'>{lessonContentQuery.data?.lessonContent.summary}</p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {selectedNode.isCompleted ? (
                        <p className='text-sm text-muted-foreground'>This step is mastered and remains available for review and tutor questions.</p>
                      ) : (
                        <Button type='button' onClick={() => setActiveTab('validation')}>
                          <CircleCheckBigIcon data-icon='inline-start' />
                          Validate to finish step
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <h3 className='text-sm font-medium'>Core concepts</h3>
                    <div className='space-y-2'>
                      {lessonContentQuery.data?.lessonContent.concepts.map((concept) => (
                        <div key={concept} className='border px-3 py-3 text-sm text-muted-foreground'>
                          {concept}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <h3 className='text-sm font-medium'>Suggested steps</h3>
                    <div className='space-y-2'>
                      {lessonContentQuery.data?.lessonContent.steps.map((step, index) => (
                        <div key={`${step}-${index}`} className='flex items-start gap-3 border px-3 py-3 text-sm text-muted-foreground'>
                          <span className='font-medium text-foreground'>{index + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='space-y-3 border p-4'>
                      <div className='flex items-center gap-2 text-sm font-medium'>
                        <BookOpenIcon className='size-4' />
                        Exercises
                      </div>
                      <div className='space-y-2'>
                        {lessonContentQuery.data?.lessonContent.exercises.map((exercise) => (
                          <p key={exercise} className='text-sm leading-6 text-muted-foreground'>
                            {exercise}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className='space-y-3 border p-4'>
                      <div className='flex items-center gap-2 text-sm font-medium'>
                        <SparklesIcon className='size-4' />
                        Success criteria
                      </div>
                      <div className='space-y-2'>
                        {selectedNode.successCriteria.map((criterion) => (
                          <p key={criterion} className='text-sm leading-6 text-muted-foreground'>
                            {criterion}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <h3 className='text-sm font-medium'>Resources</h3>
                    {lessonContentQuery.data?.lessonContent.resources.length ? (
                      <div className='space-y-2'>
                        {lessonContentQuery.data.lessonContent.resources.map((resource) => (
                          <div key={resource.sourceId} className='border px-3 py-3'>
                            <div>
                              <p className='text-sm font-medium'>{resource.title}</p>
                              <p className='mt-1 text-xs text-muted-foreground'>
                                {resource.provider} · {getResourceTypeLabel(resource.sourceType)} · {getResourceLevelLabel(resource.level)}
                              </p>
                            </div>
                            <p className='mt-2 text-sm leading-6 text-muted-foreground'>{resource.description}</p>
                            <a
                              href={resource.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              aria-label={`Open ${resource.title} in a new tab`}
                            >
                              Open resource
                              <ExternalLinkIcon className='size-3.5' aria-hidden='true' />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='border border-dashed px-3 py-4 text-sm text-muted-foreground'>
                        No curated external source is available for this step yet.
                      </div>
                    )}
                  </div>
                    </>
                  )
                ) : (
                  <div className='rounded-none border border-dashed px-4 py-8 text-sm text-muted-foreground'>
                    This course does not have roadmap nodes yet. Open the dashboard later after the roadmap is generated.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className='flex min-h-0 flex-col xl:h-full'>
          <CardHeader>
            <CardTitle>Coach panel</CardTitle>
            <CardDescription>
              Switch between tutor help and Socratic validation. Passing validation is what finishes a step.
            </CardDescription>
          </CardHeader>
          <CardContent className='min-h-0 flex-1 overflow-hidden p-0'>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tutor' | 'validation')} className='flex h-full min-h-0 flex-col'>
              <TabsList className='mx-6 mt-6 w-[calc(100%-3rem)]'>
                <TabsTrigger value='tutor'>Tutor</TabsTrigger>
                <TabsTrigger value='validation'>Validation</TabsTrigger>
              </TabsList>

              <TabsContent value='tutor' className='flex min-h-0 flex-1 flex-col pt-4'>
                <ScrollArea className='min-h-0 flex-1'>
                  <div className='space-y-3 px-6 pb-2 pr-8'>
                    {tutorSessionQuery.isPending && selectedNode ? (
                      <div className='space-y-2'>
                        <Skeleton className='h-16 w-full' />
                        <Skeleton className='h-16 w-full' />
                      </div>
                    ) : tutorMessages.length > 0 ? (
                      tutorMessages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] whitespace-pre-wrap border px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 text-foreground'}`}>
                            {message.content}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-none border border-dashed px-3 py-4 text-sm text-muted-foreground'>
                        {selectedNode ? `No tutor thread yet. Ask a question about ${selectedNode.title}.` : 'Select a node to start the tutor thread.'}
                      </div>
                    )}

                    {tutorChat.isPending && selectedNode ? (
                      <div className='flex justify-start'>
                        <div className='max-w-[90%] border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
                          Thinking through {selectedNode.title.toLowerCase()}...
                        </div>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendTutorMessage} className='mt-4 space-y-3 border-t px-6 pb-6 pt-4'>
                  <label htmlFor='tutor-message' className='text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground'>
                    Ask the tutor
                  </label>
                  <textarea
                    id='tutor-message'
                    value={draftTutorMessage}
                    onChange={(event) => setDraftTutorMessage(event.target.value)}
                    placeholder={selectedNode ? `Ask about ${selectedNode.title}...` : 'Select a roadmap node first'}
                    disabled={!selectedNode || tutorChat.isPending || currentNodeWritesPaused}
                    className='min-h-28 w-full resize-y rounded-none border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50'
                  />
                  <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
                    <div className='flex items-center gap-2'>
                      <Clock3Icon className='size-4' />
                      <span>{selectedNode ? `${selectedNode.estimatedTime} minute study block` : 'No active node selected'}</span>
                    </div>
                    <Button type='submit' disabled={!selectedNode || !draftTutorMessage.trim() || tutorChat.isPending || currentNodeWritesPaused}>
                      <SendIcon className='size-4' />
                      Send
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value='validation' className='flex min-h-0 flex-1 flex-col pt-4'>
                <ScrollArea className='min-h-0 flex-1'>
                  <div className='space-y-4 px-6 pb-2 pr-8'>
                    <div className='rounded-none border px-3 py-3 text-sm text-muted-foreground'>
                      {selectedNode ? getValidationPrompt(selectedNode.title) : 'Select a node first to start Socratic validation.'}
                    </div>

                    {socraticSessionQuery.data ? (
                      <div className='border px-3 py-2 text-xs'>
                        <p className='text-muted-foreground'>Latest competency</p>
                        <p className='mt-1 font-medium text-foreground'>{Math.round(socraticSessionQuery.data.competencyScore ?? 0)} / 100</p>
                      </div>
                    ) : null}

                    <div className='space-y-3'>
                      {socraticSessionQuery.isPending && selectedNode ? (
                        <div className='space-y-2'>
                          <Skeleton className='h-16 w-full' />
                          <Skeleton className='h-16 w-full' />
                        </div>
                      ) : validationMessages.length > 0 ? (
                        validationMessages.map((message, index) => (
                          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] whitespace-pre-wrap border px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/40 text-foreground'}`}>
                              {message.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className='rounded-none border border-dashed px-3 py-4 text-sm text-muted-foreground'>
                          Validation history will appear here after your first response.
                        </div>
                      )}

                      {validationChat.isPending && selectedNode ? (
                        <div className='flex justify-start'>
                          <div className='max-w-[90%] border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
                            Evaluating your understanding of {selectedNode.title.toLowerCase()}...
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendValidationMessage} className='mt-4 flex flex-col gap-3 border-t px-6 pb-6 pt-4'>
                  {recalibration.isPending || roadmapStatus === 'recalibrating' ? (
                    <p role='status' className='text-sm text-muted-foreground'>Adjusting your learning path...</p>
                  ) : recalibrationError || roadmapStatus === 'needs_recalibration' ? (
                    <div className='flex flex-col items-start gap-2'>
                      <p role='alert' className='text-sm text-muted-foreground'>
                        {recalibrationError ?? "This step needs a more guided route before you continue."}
                      </p>
                      <Button type='button' variant='outline' onClick={() => void adjustLearningPath()} disabled={recalibration.isPending}>
                        <RefreshCwIcon data-icon='inline-start' />
                        Try again
                      </Button>
                    </div>
                  ) : null}
                  <label htmlFor='validation-message' className='text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground'>
                    Respond for validation
                  </label>
                  <textarea
                    id='validation-message'
                    value={draftValidationMessage}
                    onChange={(event) => setDraftValidationMessage(event.target.value)}
                    placeholder={selectedNode ? `Explain ${selectedNode.title} in your own words...` : 'Select a roadmap node first'}
                    disabled={!selectedNode || validationChat.isPending || recalibration.isPending || Boolean(recalibrationError) || roadmapStatus !== 'active' || selectedNode?.isCompleted}
                    className='min-h-28 w-full resize-y rounded-none border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50'
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
                          <span>1 = Very low effort</span>
                          <span>9 = Very high effort</span>
                        </FieldDescription>
                      </Field>
                    </FieldGroup>
                  ) : null}
                  <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
                    <span>
                      {selectedNode?.isCompleted
                        ? 'This step is already mastered. Review the lesson or ask the tutor any time.'
                        : 'A score of 80 or above finishes the selected step.'}
                    </span>
                    <Button type='submit' disabled={!selectedNode || !draftValidationMessage.trim() || validationChat.isPending || recalibration.isPending || Boolean(recalibrationError) || roadmapStatus !== 'active' || selectedNode?.isCompleted}>
                      <CircleCheckBigIcon data-icon='inline-start' />
                      Validate
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
