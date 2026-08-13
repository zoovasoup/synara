import { SidebarTrigger } from "@gemastik/ui/components/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b border-border/60 bg-background/90 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-3 lg:px-4">
        <SidebarTrigger />
        <span className="text-xs text-muted-foreground">Learning workspace</span>
      </div>
    </header>
  )
}
