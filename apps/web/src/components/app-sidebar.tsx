"use client";

import type {
	ResolvedSidebarData,
	ResolvedSidebarItem,
} from "@/lib/sidebar-config";
import Link from "next/link";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@gemastik/ui/components/sidebar";
import { BookOpenCheckIcon, LayoutDashboardIcon, Settings2Icon } from "lucide-react";

const iconMap = {
	"layout-dashboard": <LayoutDashboardIcon />,
	"settings-2": <Settings2Icon />,
};

function withIcons(items: ResolvedSidebarItem[]) {
	return items.map((item) => ({
		...item,
		iconNode: iconMap[item.icon],
	}));
}

export function AppSidebar({
	sidebar,
	user,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	sidebar: ResolvedSidebarData;
	user: {
		name: string;
		email: string;
		avatar?: string | null;
	};
}) {
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader className="px-3 pb-2 pt-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="h-9 px-1! hover:bg-transparent"
							render={<Link href="/dashboard" />}
						>
							<span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
								<BookOpenCheckIcon aria-hidden="true" />
							</span>
							<span className="text-sm font-semibold tracking-tight">Synara</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={withIcons(sidebar.main)} />
				<NavSecondary
					items={withIcons(sidebar.secondary)}
					className="mt-auto"
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	);
}
