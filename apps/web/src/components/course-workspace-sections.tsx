import { Badge } from '@gemastik/ui/components/badge'
import { Button, buttonVariants } from '@gemastik/ui/components/button'
import { ScrollArea } from '@gemastik/ui/components/scroll-area'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { cn } from '@gemastik/ui/lib/utils'
import {
  BookOpenIcon,
  CheckIcon,
  CircleCheckBigIcon,
  ExternalLinkIcon,
  LockIcon,
  MessageCircleQuestionIcon,
} from 'lucide-react'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type LessonContent = {
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

export type CourseNode = {
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

export function getDifficultyLabel(level: number) {
  if (level <= 3) return 'Foundational'
  if (level <= 7) return 'Intermediate'
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

export function RoadmapNavigation({
  nodes,
  selectedNodeId,
  onSelect,
  className,
  headingId = 'roadmap-heading',
}: {
  nodes: CourseNode[]
  selectedNodeId: string | null
  onSelect: (node: CourseNode) => void
  className?: string
  headingId?: string
}) {
  return (
    <aside className={cn('flex min-h-0 flex-col bg-muted/20 lg:h-full', className)} aria-labelledby={headingId}>
      <header className='flex shrink-0 flex-col gap-1 border-b px-4 py-3'>
        <h2 id={headingId} className='text-sm font-semibold'>Learning path</h2>
        <p className='text-xs leading-5 text-muted-foreground'>Your ordered route through this course.</p>
      </header>
      <ScrollArea className='h-72 min-h-0 lg:h-full lg:flex-1'>
        {nodes.length === 0 ? (
          <div className='m-4 rounded-md border border-dashed p-4 text-sm leading-6 text-muted-foreground'>
            This course is saved as a draft. Return later when its roadmap is ready.
          </div>
        ) : (
          <ol className='px-2 py-2' aria-label='Ordered roadmap steps'>
            {nodes.map((node, index) => {
              const isCurrent = node.progressionState === 'current'
              const isLocked = node.progressionState === 'locked'
              const isSelected = node.id === selectedNodeId

              return (
                <li key={node.id} className='relative grid grid-cols-[1.75rem_minmax(0,1fr)] pb-1 last:pb-0'>
                  {index < nodes.length - 1 ? (
                    <span className='absolute bottom-0 left-3.5 top-7 w-px bg-border/70' aria-hidden='true' />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-[1] mt-2 flex size-7 items-center justify-center rounded-full border bg-background',
                      isCurrent && 'border-primary bg-primary text-primary-foreground shadow-sm',
                      node.progressionState === 'completed' && 'border-primary/35 text-primary',
                      isLocked && 'border-border/70 text-muted-foreground',
                    )}
                    aria-hidden='true'
                  >
                    {node.progressionState === 'completed' ? (
                      <CheckIcon className='size-3.5' />
                    ) : isCurrent ? (
                      <span className='size-2 rounded-full bg-primary-foreground' />
                    ) : (
                      <LockIcon className='size-3' />
                    )}
                  </span>
                  <button
                    type='button'
                    onClick={() => onSelect(node)}
                    disabled={isLocked}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${node.title}. ${node.progressionState}.`}
                    title={isLocked ? 'Complete the previous step first.' : undefined}
                    className={cn(
                      'ml-1.5 flex min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      node.progressionState === 'completed' && 'text-muted-foreground hover:bg-background/70',
                      isCurrent && 'bg-primary/10 text-foreground',
                      isLocked && 'cursor-not-allowed text-muted-foreground opacity-60',
                      isSelected && !isCurrent && 'bg-background/80 shadow-sm',
                    )}
                  >
                    <span className='pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground'>{String(index + 1).padStart(2, '0')}</span>
                    <span className='flex min-w-0 flex-1 flex-col gap-1'>
                      <span className={cn('break-words text-sm font-medium leading-5', !isLocked && 'text-foreground')}>{node.title}</span>
                      {isCurrent ? <span className='text-[11px] font-medium text-primary'>Current</span> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </ScrollArea>
    </aside>
  )
}

export function LessonSurface({
  selectedNode,
  nodeCount,
  lessonContent,
  isPending,
  errorMessage,
  onOpenTutor,
  onOpenValidation,
  validationDisabled,
}: {
  selectedNode: CourseNode | null
  nodeCount: number
  lessonContent: LessonContent | undefined
  isPending: boolean
  errorMessage: string | null
  onOpenTutor: () => void
  onOpenValidation: () => void
  validationDisabled: boolean
}) {
  if (!selectedNode) {
    return (
      <section className='flex min-h-72 items-center justify-center bg-card p-8 text-center lg:h-full'>
        <div className='flex max-w-sm flex-col items-center gap-2'>
          <BookOpenIcon className='size-6 text-muted-foreground' aria-hidden='true' />
          <h2 className='text-base font-semibold'>No lesson is available yet</h2>
          <p className='text-sm leading-6 text-muted-foreground'>This draft course does not have roadmap steps. Return after its roadmap is generated.</p>
        </div>
      </section>
    )
  }

  return (
    <article className='flex min-h-0 min-w-0 flex-col bg-card lg:h-full' aria-labelledby='lesson-heading'>
      <header className='flex shrink-0 flex-col gap-3 border-b px-5 py-4 md:px-7'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            Step {selectedNode.orderIndex + 1} of {nodeCount}
          </p>
          {selectedNode.isCompleted ? <Badge variant='secondary'>Completed</Badge> : null}
        </div>
        <div className='flex max-w-3xl flex-col gap-1.5'>
          <h2 id='lesson-heading' className='text-xl font-semibold leading-tight tracking-tight text-pretty md:text-2xl'>{selectedNode.title}</h2>
          <p className='text-sm leading-6 text-foreground/75'>
            {selectedNode.successCriteria[0] ?? 'Build enough understanding to explain and apply this step.'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
          <span>{getDifficultyLabel(selectedNode.difficultyLevel)}</span>
          <span aria-hidden='true'>·</span>
          <span>~{selectedNode.estimatedTime} min</span>
          <span aria-hidden='true'>·</span>
          <span>{selectedNode.contentType}</span>
        </div>
      </header>

      <div className='lg:min-h-0 lg:flex-1 lg:overflow-y-auto'>
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-7 md:px-8 md:py-9'>
          {isPending ? (
            <div className='flex flex-col gap-4' role='status' aria-live='polite'>
              <p className='text-sm font-medium'>Preparing this lesson…</p>
              <Skeleton className='h-5 w-2/3' />
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-40 w-full' />
            </div>
          ) : errorMessage ? (
            <div role='alert' className='rounded-md border border-destructive/40 p-4'>
              <h3 className='text-sm font-medium'>Unable to prepare this lesson</h3>
              <p className='mt-1 text-sm leading-6 text-muted-foreground'>{errorMessage} Try opening the step again.</p>
            </div>
          ) : lessonContent ? (
            <>
              <section aria-labelledby='overview-heading' className='flex flex-col gap-3'>
                <h3 id='overview-heading' className='text-lg font-semibold tracking-tight'>Overview</h3>
                <p className='text-[15px] leading-7 text-foreground/80'>{lessonContent.summary}</p>
              </section>

              <section aria-labelledby='concepts-heading' className='flex flex-col gap-4'>
                <h3 id='concepts-heading' className='text-lg font-semibold tracking-tight'>Key concepts</h3>
                <ul className='flex flex-col gap-3'>
                  {lessonContent.concepts.map((concept) => (
                    <li key={concept} className='grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 text-[15px] leading-7 text-foreground/80'>
                      <span className='mt-3 size-1.5 rounded-full bg-primary' aria-hidden='true' />
                      <span className='break-words'>{concept}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby='steps-heading' className='flex flex-col gap-4'>
                <h3 id='steps-heading' className='text-lg font-semibold tracking-tight'>Guided steps</h3>
                <ol className='flex flex-col gap-5'>
                  {lessonContent.steps.map((step, index) => (
                    <li key={`${step}-${index}`} className='grid grid-cols-[2rem_minmax(0,1fr)] gap-3'>
                      <span className='flex size-8 items-center justify-center rounded-md bg-muted font-mono text-xs font-medium text-foreground' aria-hidden='true'>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className='break-words pt-1 text-[15px] leading-7 text-foreground/80'>{step}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby='practice-heading' className='flex flex-col gap-4'>
                <h3 id='practice-heading' className='text-lg font-semibold tracking-tight'>Practice</h3>
                <ul className='flex flex-col gap-3 rounded-md bg-muted/40 p-4'>
                  {lessonContent.exercises.map((exercise) => (
                    <li key={exercise} className='flex gap-3 text-sm leading-6 text-foreground/75'>
                      <BookOpenIcon className='mt-1 size-4 shrink-0 text-primary' aria-hidden='true' />
                      <span className='break-words'>{exercise}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby='criteria-heading' className='flex flex-col gap-4'>
                <h3 id='criteria-heading' className='text-lg font-semibold tracking-tight'>Ready when you can…</h3>
                <ul className='flex flex-col gap-2'>
                  {selectedNode.successCriteria.map((criterion) => (
                    <li key={criterion} className='flex gap-3 text-sm leading-6 text-foreground/75'>
                      <CircleCheckBigIcon className='mt-1 size-4 shrink-0 text-primary' aria-hidden='true' />
                      <span className='break-words'>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby='resources-heading' className='flex flex-col gap-4 border-t pt-8'>
                <div className='flex flex-col gap-1'>
                  <h3 id='resources-heading' className='text-lg font-semibold tracking-tight'>Trusted resources</h3>
                  <p className='text-sm text-muted-foreground'>External references selected from Synara’s verified catalog.</p>
                </div>
                {lessonContent.resources.length > 0 ? (
                  <ul className='flex flex-col divide-y'>
                    {lessonContent.resources.map((resource) => (
                      <li key={resource.sourceId} className='flex flex-col gap-3 py-4 first:pt-0 last:pb-0'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <h4 className='break-words text-sm font-semibold'>{resource.title}</h4>
                            <p className='mt-1 text-xs text-muted-foreground'>{resource.provider} · {getResourceLevelLabel(resource.level)}</p>
                          </div>
                          <Badge variant='outline'>{getResourceTypeLabel(resource.sourceType)}</Badge>
                        </div>
                        <p className='break-words text-sm leading-6 text-muted-foreground'>{resource.description}</p>
                        <div>
                          <a
                            href={resource.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'px-0')}
                            aria-label={`Open ${resource.title} in a new tab`}
                          >
                            Open resource
                            <ExternalLinkIcon data-icon='inline-end' aria-hidden='true' />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='rounded-md bg-muted/40 p-4 text-sm leading-6 text-muted-foreground'>
                    No curated external source is available for this step yet.
                  </p>
                )}
              </section>

              <section className='border-t pt-8' aria-labelledby='lesson-next-action-heading'>
                {selectedNode.isCompleted ? (
                  <div className='flex flex-col gap-4 rounded-md bg-muted/35 p-5 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex min-w-0 flex-col gap-1'>
                      <h3 id='lesson-next-action-heading' className='text-base font-semibold'>Completed</h3>
                      <p className='text-sm leading-6 text-muted-foreground'>Review this lesson any time, or ask the Tutor for another explanation.</p>
                    </div>
                    <Button type='button' variant='outline' onClick={onOpenTutor} className='w-full sm:w-auto'>
                      <MessageCircleQuestionIcon data-icon='inline-start' aria-hidden='true' />
                      Ask Tutor
                    </Button>
                  </div>
                ) : (
                  <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
                    <div className='flex max-w-xl flex-col gap-1'>
                      <h3 id='lesson-next-action-heading' className='text-lg font-semibold tracking-tight'>Ready to check your understanding?</h3>
                      <p className='text-sm leading-6 text-muted-foreground'>You should be able to explain and apply the ideas above.</p>
                    </div>
                    <div className='flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row'>
                      <Button type='button' variant='ghost' onClick={onOpenTutor}>
                        <MessageCircleQuestionIcon data-icon='inline-start' aria-hidden='true' />
                        Ask Tutor
                      </Button>
                      <Button type='button' onClick={onOpenValidation} disabled={validationDisabled}>
                        <CircleCheckBigIcon data-icon='inline-start' aria-hidden='true' />
                        {validationDisabled ? 'Validation paused' : 'Validate understanding'}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}
