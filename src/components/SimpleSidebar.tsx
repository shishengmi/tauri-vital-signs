import { Home, User,Settings } from "lucide-react"
import { TooltipIconButton } from "./tooltip-icon-button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Link } from "react-router-dom"

const sidebarItems = [
  {
    icon: Home,
    tooltip: "首页",
    href: "/",
    type: "link" as const
  },
  {
    icon: User,
    tooltip: "病人信息",
    href: "/test/patientInfo",
    type: "link" as const
  },
  {
    icon: Settings,
    tooltip: "设置",
    href: "/config",
    type: "link" as const
  }
]

export function SimpleSidebar() {
  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 bottom-6 w-12 bg-background border-r border-border flex flex-col items-center py-3 space-y-2 z-40">
        {sidebarItems.map((item, index) => {
          const IconComponent = item.icon
          return (
            <Link key={index} to={item.href}>
              <TooltipIconButton
                tooltip={item.tooltip}
                side="right"
                className="w-8 h-8 transition-colors duration-200"
              >
                <IconComponent className="w-4 h-4" />
              </TooltipIconButton>
            </Link>
          )
        })}
      </div>
    </TooltipProvider>
  )
}