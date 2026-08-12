import { Separator } from "@gemastik/ui/components/separator"
import { SidebarTrigger } from "@gemastik/ui/components/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1.5 px-3 lg:px-5">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mx-1.5 h-4 data-vertical:self-auto"
        />
        <span className="text-xs font-medium text-muted-foreground">Learning workspace</span>
      </div>
    </header>
  )
}
