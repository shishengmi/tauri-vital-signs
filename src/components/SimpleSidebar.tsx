import { Home, Settings, User, Terminal, Shield, Calendar, Search, Inbox } from "lucide-react"
import { TooltipIconButton } from "./tooltip-icon-button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Link } from "react-router-dom"

const sidebarItems = [
  {
    icon: Home,
    tooltip: "首页",
    href: "/"
  },
  {
    icon: Inbox,
    tooltip: "数据可视化", 
    href: "/visualization"
  },
  {
    icon: User,
    tooltip: "病人信息",
    href: "/test/patientInfo"
  },
  {
    icon: Shield,
    tooltip: "通信设置",
    href: "/configs/serial"
  },
  {
    icon: Terminal,
    tooltip: "串口调试",
    href: "/configs/serial-debug"
  },
  {
    icon: Settings,
    tooltip: "设置",
    href: "/config"
  }
]

export function SimpleSidebar() {
  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 bottom-6 w-12 bg-background border-r border-border flex flex-col items-center py-3 space-y-2 z-50">
        {sidebarItems.map((item, index) => (
          <Link key={index} to={item.href}>
            <TooltipIconButton 
              tooltip={item.tooltip}
              side="right"
              className="w-8 h-8 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              <item.icon className="w-4 h-4" />
            </TooltipIconButton>
          </Link>
        ))}
      </div>
    </TooltipProvider>
  )
}