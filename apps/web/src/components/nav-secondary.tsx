"use client"

import * as React from "react"
import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@gemastik/ui/components/sidebar"

import type { ResolvedSidebarItem } from "@/lib/sidebar-config"

export function NavSecondary({
  items,
  ...props
}: {
  items: (ResolvedSidebarItem & { iconNode?: React.ReactNode })[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<Link href={item.href as Route} />}
                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                className="data-active:[box-shadow:inset_2px_0_0_var(--sidebar-primary)]"
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
