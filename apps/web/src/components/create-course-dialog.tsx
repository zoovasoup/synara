'use client'

import * as React from 'react'

import { useIsMobile } from '@/hooks/use-mobile'
import { useTRPC } from '@/utils/trpc'
import { Button } from '@gemastik/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@gemastik/ui/components/drawer'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@gemastik/ui/components/field'
import { Input } from '@gemastik/ui/components/input'
import { ToggleGroup, ToggleGroupItem } from '@gemastik/ui/components/toggle-group'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

type AnswerKey = 'topic' | 'level' | 'goal' | 'weeklyHours' | 'learningStyle'
type Answers = Record<AnswerKey, string>

const initialAnswers: Answers = {
  topic: '',
  level: '',
  goal: '',
  weeklyHours: '',
  learningStyle: '',
}

const stages = [
  {
    title: 'Goal',
    description: 'Define what you want to learn and why it matters.',
    required: ['topic', 'goal'] as AnswerKey[],
  },
  {
    title: 'Starting point',
    description: 'Choose the level and lesson style that fit you now.',
    required: ['level', 'learningStyle'] as AnswerKey[],
  },
  {
    title: 'Commitment',
    description: 'Set a realistic weekly pace and review your plan.',
    required: ['weeklyHours'] as AnswerKey[],
  },
] as const

const goalOptions = ['For school', 'For work', 'To build a project', 'For personal interest', 'Other']
const levelOptions = ['Beginner', 'Intermediate', 'Advanced']
const learningStyleOptions = ['Short reading lessons', 'Step-by-step practice', 'Video-style explanation', 'Projects/challenges', 'Mixed format']
const weeklyHourOptions = ['Less than 2 hours', '2-4 hours', '5-7 hours', '8+ hours']

function OptionField({
  id,
  label,
  description,
  options,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  description: string
  options: string[]
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <ToggleGroup
        aria-labelledby={`${id}-label`}
        value={value ? [value] : []}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? '')}
        disabled={disabled}
        spacing={2}
        className='grid w-full grid-cols-1 sm:grid-cols-2'
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            variant='outline'
            className='h-auto min-h-10 justify-start whitespace-normal px-3 py-2 text-left'
          >
            {option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  )
}

export function CreateCourseDialog({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [stageIndex, setStageIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Answers>(initialAnswers)

  const reset = React.useCallback(() => {
    setStageIndex(0)
    setAnswers(initialAnswers)
  }, [])

  const createCourse = useMutation(
    trpc.learning.create.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.learning.list.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.learning.getDashboard.queryKey() }),
        ])

        toast.success(result.generationStatus === 'generated' ? 'Course created' : 'Course saved as draft', {
          description:
            result.generationStatus === 'generated'
              ? `Your roadmap is ready with ${result.nodeCount} suggested steps.`
              : 'The course was saved, but roadmap generation needs another try.',
        })

        setOpen(false)
        reset()
      },
      onError: () => {
        toast.error('Unable to create the course. Review your answers and try again.')
      },
    }),
  )

  const stage = stages[stageIndex]!
  const canContinue = stage.required.every((key) => answers[key].trim().length > 0) && !createCourse.isPending

  const updateAnswer = React.useCallback((key: AnswerKey, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }, [])

  const handleNext = () => {
    if (!canContinue) return

    if (stageIndex < stages.length - 1) {
      setStageIndex((current) => current + 1)
      return
    }

    createCourse.mutate(answers)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (createCourse.isPending) return

    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className='data-[vaul-drawer-direction=right]:sm:max-w-lg'>
        <DrawerHeader className='gap-3 border-b'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex flex-col gap-1 text-left'>
              <DrawerTitle>Create course</DrawerTitle>
              <DrawerDescription>Step {stageIndex + 1} of 3 · {stage.title}</DrawerDescription>
            </div>
            <span className='text-xs tabular-nums text-muted-foreground'>{Math.round(((stageIndex + 1) / stages.length) * 100)}%</span>
          </div>
          <div
            role='progressbar'
            aria-label='Course setup progress'
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={stageIndex + 1}
            className='h-1.5 overflow-hidden rounded-full bg-muted'
          >
            <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${((stageIndex + 1) / stages.length) * 100}%` }} />
          </div>
        </DrawerHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-5'>
          <div className='flex flex-col gap-5'>
            <header className='flex flex-col gap-1'>
              <h2 className='text-lg font-semibold'>{stage.title}</h2>
              <p className='text-sm leading-6 text-muted-foreground'>{stage.description}</p>
            </header>

            <FieldGroup className='gap-5'>
              {stageIndex === 0 ? (
                <>
                  <Field>
                    <FieldLabel htmlFor='course-topic'>What do you want to learn?</FieldLabel>
                    <FieldDescription>Use a focused topic rather than a broad category.</FieldDescription>
                    <Input
                      id='course-topic'
                      name='course-topic'
                      autoComplete='off'
                      placeholder='Example: UI/UX design for mobile apps…'
                      disabled={createCourse.isPending}
                      value={answers.topic}
                      onChange={(event) => updateAnswer('topic', event.target.value)}
                    />
                  </Field>
                  <OptionField
                    id='course-goal'
                    label='Why do you want to learn this?'
                    description='This helps the roadmap stay relevant to your goal.'
                    options={goalOptions}
                    value={answers.goal}
                    disabled={createCourse.isPending}
                    onChange={(value) => updateAnswer('goal', value)}
                  />
                </>
              ) : stageIndex === 1 ? (
                <>
                  <OptionField
                    id='course-level'
                    label='What is your current level?'
                    description='Choose the closest starting point.'
                    options={levelOptions}
                    value={answers.level}
                    disabled={createCourse.isPending}
                    onChange={(value) => updateAnswer('level', value)}
                  />
                  <OptionField
                    id='learning-style'
                    label='How do you learn best?'
                    description='Synara will use this when shaping lesson steps.'
                    options={learningStyleOptions}
                    value={answers.learningStyle}
                    disabled={createCourse.isPending}
                    onChange={(value) => updateAnswer('learningStyle', value)}
                  />
                </>
              ) : (
                <>
                  <OptionField
                    id='weekly-hours'
                    label='How much time can you spend each week?'
                    description='Choose a pace that will be sustainable.'
                    options={weeklyHourOptions}
                    value={answers.weeklyHours}
                    disabled={createCourse.isPending}
                    onChange={(value) => updateAnswer('weeklyHours', value)}
                  />
                  <div className='rounded-md bg-muted/50 p-4'>
                    <h3 className='text-sm font-medium'>Review your course setup</h3>
                    <dl className='mt-3 grid gap-3 text-sm sm:grid-cols-2'>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Topic</dt>
                        <dd className='mt-1 break-words font-medium'>{answers.topic}</dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Starting point</dt>
                        <dd className='mt-1 font-medium'>{answers.level}</dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Goal</dt>
                        <dd className='mt-1 font-medium'>{answers.goal}</dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>Lesson style</dt>
                        <dd className='mt-1 font-medium'>{answers.learningStyle}</dd>
                      </div>
                    </dl>
                  </div>
                </>
              )}
            </FieldGroup>
          </div>
        </div>

        <DrawerFooter className='border-t'>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setStageIndex((current) => Math.max(0, current - 1))}
              disabled={stageIndex === 0 || createCourse.isPending}
            >
              Back
            </Button>
            <Button type='button' className='flex-1' onClick={handleNext} disabled={!canContinue}>
              {createCourse.isPending ? (
                <>
                  <LoaderCircleIcon data-icon='inline-start' className='animate-spin' aria-hidden='true' />
                  Building your roadmap…
                </>
              ) : stageIndex === stages.length - 1 ? 'Create course' : 'Continue'}
            </Button>
          </div>
          <DrawerClose asChild>
            <Button type='button' variant='ghost' disabled={createCourse.isPending}>Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
