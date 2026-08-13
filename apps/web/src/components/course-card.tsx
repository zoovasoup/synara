import type { Route } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@gemastik/ui/components/button'
import { cn } from '@gemastik/ui/lib/utils'
import { ArrowRightIcon } from 'lucide-react'

type CourseCardProps = {
  title: string
  description: string
  level: string
  completedSteps: number
  totalSteps: number
  progress: number | null
  status: string
  currentNodeTitle: string | null
  href: string
}

export function CourseCard({
  title,
  description,
  level,
  completedSteps,
  totalSteps,
  progress,
  status,
  currentNodeTitle,
  href,
}: CourseCardProps) {
  const progressValue = progress ?? 0
  const progressLabel = progress === null ? 'Roadmap draft' : `${progress}% complete`

  return (
    <article className='group flex h-full flex-col gap-5 rounded-lg bg-card/65 p-5 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-sm motion-reduce:transform-none'>
      <div className='flex min-w-0 flex-col gap-2'>
        <p className='text-xs text-muted-foreground'>
          {level}{status === 'In progress' ? '' : ` · ${status}`}
        </p>
        <h3 className='text-base font-semibold leading-snug tracking-tight text-balance'>{title}</h3>
        <p className='line-clamp-2 break-words text-sm leading-6 text-muted-foreground'>{description}</p>
      </div>
      <div className='flex flex-1 flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-3 text-xs'>
            <span className='font-medium'>{progressLabel}</span>
            <span className='tabular-nums text-muted-foreground'>
              {completedSteps} of {totalSteps} steps
            </span>
          </div>
          <div
            role='progressbar'
            aria-label={`${title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
            className='h-1.5 overflow-hidden rounded-full bg-muted'
          >
            <div className='h-full rounded-full bg-primary transition-[width] duration-200' style={{ width: `${progressValue}%` }} />
          </div>
        </div>
        <p className='text-sm leading-6 text-muted-foreground'>
          <span className='font-medium text-foreground'>{currentNodeTitle ? 'Current: ' : totalSteps === 0 ? 'Next: ' : 'Review: '}</span>
          {currentNodeTitle ?? (totalSteps === 0 ? 'Generate the roadmap' : 'Review completed work')}
        </p>
      </div>
      <div className='flex justify-end'>
        <Link href={href as Route} className={cn(buttonVariants({ variant: 'ghost' }), '-mr-2 group-hover:text-primary')}>
          {progress === 100 ? 'Review course' : 'Continue'}
          <ArrowRightIcon data-icon='inline-end' aria-hidden='true' />
        </Link>
      </div>
    </article>
  )
}
