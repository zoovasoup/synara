import { Badge } from '@gemastik/ui/components/badge'
import { Button, buttonVariants } from '@gemastik/ui/components/button'
import { ScrollArea } from '@gemastik/ui/components/scroll-area'
import { Separator } from '@gemastik/ui/components/separator'
import { Skeleton } from '@gemastik/ui/components/skeleton'
import { cn } from '@gemastik/ui/lib/utils'
import {
  BookOpenIcon,
  CheckIcon,
  CircleCheckBigIcon,
  CircleDashedIcon,
  ExternalLinkIcon,
  LockIcon,
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
}: {
  nodes: CourseNode[]
  selectedNodeId: string | null
  onSelect: (node: CourseNode) => void
}) {
  return (
    <aside className='flex min-h-0 flex-col rounded-lg border bg-muted/20 xl:h-full' aria-labelledby='roadmap-heading'>
      <header className='flex flex-col gap-1 border-b px-4 py-4'>
        <h2 id='roadmap-heading' className='text-sm font-semibold'>Learning path</h2>
        <p className='text-xs leading-5 text-muted-foreground'>Follow the steps in order. Completed work stays open for review.</p>
      </header>
      <ScrollArea className='h-72 min-h-0 xl:h-full xl:flex-1'>
        {nodes.length === 0 ? (
          <div className='m-4 rounded-md border border-dashed p-4 text-sm leading-6 text-muted-foreground'>
            This course is saved as a draft. Return later when its roadmap is ready.
          </div>
        ) : (
          <ol className='p-3' aria-label='Ordered roadmap steps'>
            {nodes.map((node, index) => {
              const isCurrent = node.progressionState === 'current'
              const isLocked = node.progressionState === 'locked'
              const isSelected = node.id === selectedNodeId

              return (
                <li key={node.id} className='relative grid grid-cols-[2rem_minmax(0,1fr)] pb-2 last:pb-0'>
                  {index < nodes.length - 1 ? (
                    <span className='absolute bottom-0 left-4 top-8 w-px bg-border' aria-hidden='true' />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-[1] mt-2 flex size-8 items-center justify-center rounded-full border bg-background',
                      isCurrent && 'border-primary bg-primary text-primary-foreground',
                      node.progressionState === 'completed' && 'border-primary/40 text-primary',
                      isLocked && 'text-muted-foreground',
                    )}
                    aria-hidden='true'
                  >
                    {node.progressionState === 'completed' ? (
                      <CheckIcon className='size-4' />
                    ) : isCurrent ? (
                      <CircleDashedIcon className='size-4' />
                    ) : (
                      <LockIcon className='size-3.5' />
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
                      'ml-2 flex min-w-0 flex-col gap-1 rounded-md px-3 py-2 text-left transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      node.progressionState === 'completed' && 'text-muted-foreground hover:bg-muted',
                      isCurrent && 'bg-primary/10 text-foreground',
                      isLocked && 'cursor-not-allowed text-muted-foreground opacity-65',
                      isSelected && !isCurrent && 'bg-background shadow-sm ring-1 ring-border',
                    )}
                  >
                    <span className='text-[11px] font-medium uppercase tracking-widest'>Step {index + 1}</span>
                    <span className={cn('break-words text-sm font-medium leading-5', !isLocked && 'text-foreground')}>{node.title}</span>
                    <span className='text-xs leading-5'>
                      {isCurrent
                        ? 'Current · Study this next'
                        : node.progressionState === 'completed'
                          ? 'Completed · Open for review'
                          : 'Locked · Complete the previous step first'}
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
  onOpenValidation,
  validationDisabled,
}: {
  selectedNode: CourseNode | null
  nodeCount: number
  lessonContent: LessonContent | undefined
  isPending: boolean
  errorMessage: string | null
  onOpenValidation: () => void
  validationDisabled: boolean
}) {
  if (!selectedNode) {
    return (
      <section className='flex min-h-72 items-center justify-center rounded-lg border bg-card p-8 text-center'>
        <div className='flex max-w-sm flex-col items-center gap-2'>
          <BookOpenIcon className='size-6 text-muted-foreground' aria-hidden='true' />
          <h2 className='text-base font-semibold'>No lesson is available yet</h2>
          <p className='text-sm leading-6 text-muted-foreground'>This draft course does not have roadmap steps. Return after its roadmap is generated.</p>
        </div>
      </section>
    )
  }

  return (
    <article className='flex min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-lg border bg-card xl:h-full xl:min-h-0' aria-labelledby='lesson-heading'>
      <header className='flex flex-col gap-4 border-b px-5 py-5 md:px-7'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-xs font-medium uppercase tracking-widest text-muted-foreground'>
            Step {selectedNode.orderIndex + 1} of {nodeCount}
          </p>
          {selectedNode.isCompleted ? <Badge variant='secondary'>Completed</Badge> : <span className='text-xs font-medium text-primary'>Current focus</span>}
        </div>
        <div className='flex flex-col gap-2'>
          <h2 id='lesson-heading' className='text-2xl font-semibold leading-tight text-pretty'>{selectedNode.title}</h2>
          <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
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
        {selectedNode.isCompleted ? (
          <p className='text-sm text-muted-foreground'>This step is mastered and remains available for lesson and Tutor review.</p>
        ) : (
          <div>
            <Button type='button' onClick={onOpenValidation} disabled={validationDisabled}>
              <CircleCheckBigIcon data-icon='inline-start' aria-hidden='true' />
              {validationDisabled ? 'Validation paused' : 'Validate understanding'}
            </Button>
          </div>
        )}
      </header>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-7 md:px-8 md:py-9'>
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
                <h3 id='overview-heading' className='text-lg font-semibold'>Overview</h3>
                <p className='text-[15px] leading-7 text-muted-foreground'>{lessonContent.summary}</p>
              </section>

              <Separator />

              <section aria-labelledby='concepts-heading' className='flex flex-col gap-4'>
                <h3 id='concepts-heading' className='text-lg font-semibold'>Key concepts</h3>
                <ul className='flex flex-col gap-3'>
                  {lessonContent.concepts.map((concept) => (
                    <li key={concept} className='grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 text-[15px] leading-7 text-muted-foreground'>
                      <span className='mt-3 size-1.5 rounded-full bg-primary' aria-hidden='true' />
                      <span className='break-words'>{concept}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Separator />

              <section aria-labelledby='steps-heading' className='flex flex-col gap-4'>
                <h3 id='steps-heading' className='text-lg font-semibold'>Guided steps</h3>
                <ol className='flex flex-col gap-5'>
                  {lessonContent.steps.map((step, index) => (
                    <li key={`${step}-${index}`} className='grid grid-cols-[2rem_minmax(0,1fr)] gap-3'>
                      <span className='flex size-8 items-center justify-center rounded-md bg-muted font-mono text-xs font-medium text-foreground' aria-hidden='true'>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className='break-words pt-1 text-[15px] leading-7 text-muted-foreground'>{step}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <Separator />

              <section aria-labelledby='practice-heading' className='flex flex-col gap-4'>
                <h3 id='practice-heading' className='text-lg font-semibold'>Practice</h3>
                <ul className='flex flex-col gap-3 rounded-md bg-muted/40 p-4'>
                  {lessonContent.exercises.map((exercise) => (
                    <li key={exercise} className='flex gap-3 text-sm leading-6 text-muted-foreground'>
                      <BookOpenIcon className='mt-1 size-4 shrink-0 text-primary' aria-hidden='true' />
                      <span className='break-words'>{exercise}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby='criteria-heading' className='flex flex-col gap-4'>
                <h3 id='criteria-heading' className='text-lg font-semibold'>Ready when you can…</h3>
                <ul className='flex flex-col gap-2'>
                  {selectedNode.successCriteria.map((criterion) => (
                    <li key={criterion} className='flex gap-3 text-sm leading-6 text-muted-foreground'>
                      <CircleCheckBigIcon className='mt-1 size-4 shrink-0 text-primary' aria-hidden='true' />
                      <span className='break-words'>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Separator />

              <section aria-labelledby='resources-heading' className='flex flex-col gap-4'>
                <div className='flex flex-col gap-1'>
                  <h3 id='resources-heading' className='text-lg font-semibold'>Trusted resources</h3>
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
            </>
          ) : null}
        </div>
      </ScrollArea>
    </article>
  )
}
