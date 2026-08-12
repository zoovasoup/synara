"use client";

import type {
	ResolvedSidebarData,
	ResolvedSidebarItem,
} from "@/lib/sidebar-config";
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
import { LayoutDashboardIcon, Settings2Icon, CommandIcon } from "lucide-react";

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
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="data-[slot=sidebar-menu-button]:p-1.5!"
							render={<a href="#" />}
						>
							<CommandIcon className="size-5!" />
							<span className="text-base font-semibold">Synara</span>
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
