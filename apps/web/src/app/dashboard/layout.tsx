import { auth } from '@gemastik/auth'
import { db } from '@gemastik/db'
import { userSidebarPreferences } from '@gemastik/db/schema/sidebar'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { resolveLearnerSidebar } from '@/lib/sidebar-resolver'
import { SidebarInset, SidebarProvider } from '@gemastik/ui/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const sidebarPreferences = await db.query.userSidebarPreferences.findFirst({
    where: eq(userSidebarPreferences.userId, session.user.id),
  })

  const sidebar = resolveLearnerSidebar(sidebarPreferences)

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 56)',
        '--header-height': 'calc(var(--spacing) * 9)',
      } as CSSProperties}
    >
      <AppSidebar
        variant='sidebar'
        sidebar={sidebar}
        user={{
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
        }}
      />
      <SidebarInset className='overflow-hidden'>
        <SiteHeader />
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
