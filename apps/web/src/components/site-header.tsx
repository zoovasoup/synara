import { Separator } from "@gemastik/ui/components/separator"
import { SidebarTrigger } from "@gemastik/ui/components/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mx-2 h-5 data-vertical:self-auto"
        />
        <span className="text-sm font-medium text-muted-foreground">Learning workspace</span>
      </div>
    </header>
  )
}
