import { SectionCards } from '@/components/section-cards'

export default function DashboardPage() {
  return (
    <div className='flex min-h-0 flex-1 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-10 lg:py-10'>
        <header className='flex max-w-3xl flex-col gap-2'>
          <h1 className='text-2xl font-semibold tracking-tight text-balance md:text-3xl'>Your learning, clearly in view.</h1>
          <p className='text-sm leading-6 text-muted-foreground'>Continue the next useful step or revisit a course.</p>
        </header>
        <SectionCards />
      </div>
    </div>
  )
}
