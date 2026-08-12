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
                className='min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground'
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
