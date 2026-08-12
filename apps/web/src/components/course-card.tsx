import type { Route } from 'next'
import Link from 'next/link'

import { Badge } from '@gemastik/ui/components/badge'
import { buttonVariants } from '@gemastik/ui/components/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@gemastik/ui/components/card'
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
    <Card className='h-full transition-[background-color,box-shadow] hover:bg-accent/20 hover:shadow-sm'>
      <CardHeader className='gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <Badge variant='secondary'>{level}</Badge>
          <span className='text-xs text-muted-foreground'>{status}</span>
        </div>
        <div className='flex min-w-0 flex-col gap-2'>
          <CardTitle className='text-base leading-snug text-pretty'>{title}</CardTitle>
          <p className='line-clamp-2 break-words text-sm leading-6 text-muted-foreground'>{description}</p>
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-4'>
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
            <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progressValue}%` }} />
          </div>
        </div>
        <p className='text-sm leading-6 text-muted-foreground'>
          <span className='font-medium text-foreground'>{currentNodeTitle ? 'Current: ' : totalSteps === 0 ? 'Next: ' : 'Review: '}</span>
          {currentNodeTitle ?? (totalSteps === 0 ? 'Generate the roadmap' : 'Review completed work')}
        </p>
      </CardContent>
      <CardFooter className='justify-end border-t-0 pt-0'>
        <Link href={href as Route} className={cn(buttonVariants({ variant: 'outline' }))}>
          {progress === 100 ? 'Review course' : 'Continue'}
          <ArrowRightIcon data-icon='inline-end' aria-hidden='true' />
        </Link>
      </CardFooter>
    </Card>
  )
}
