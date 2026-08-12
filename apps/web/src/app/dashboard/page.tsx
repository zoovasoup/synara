import { SectionCards } from '@/components/section-cards'

export default function DashboardPage() {
  return (
    <div className='flex min-h-0 flex-1 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8'>
        <header className='flex max-w-3xl flex-col gap-2'>
          <p className='text-xs font-medium uppercase tracking-widest text-muted-foreground'>Learning workspace</p>
          <h1 className='text-2xl font-semibold tracking-tight text-pretty md:text-3xl'>Stay focused on the next useful step.</h1>
          <p className='text-sm leading-6 text-muted-foreground'>See your current path, resume learning, or review a course without sorting through dashboard metrics.</p>
        </header>
        <SectionCards />
      </div>
    </div>
  )
}
