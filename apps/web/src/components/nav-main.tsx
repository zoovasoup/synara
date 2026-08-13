'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@gemastik/ui/components/sidebar'
import { CreateCourseDialog } from '@/components/create-course-dialog'
import { CirclePlusIcon } from 'lucide-react'

import type { ResolvedSidebarItem } from '@/lib/sidebar-config'

export function NavMain({
  items,
}: {
  items: (ResolvedSidebarItem & { iconNode?: React.ReactNode })[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className='flex flex-col gap-2'>
        <SidebarMenu>
          <SidebarMenuItem className='flex items-center gap-2'>
            <CreateCourseDialog>
              <SidebarMenuButton
                tooltip='Create course'
                className='min-w-8 bg-sidebar-accent text-sidebar-foreground transition-[background-color,color] duration-200 hover:bg-primary/10 hover:text-primary active:bg-primary/10 active:text-primary'
              >
                <CirclePlusIcon />
                <span>Create course</span>
              </SidebarMenuButton>
            </CreateCourseDialog>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  render={<Link href={item.href as Route} />}
                  className='data-active:[box-shadow:inset_2px_0_0_var(--sidebar-primary)]'
                >
                {item.iconNode}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
