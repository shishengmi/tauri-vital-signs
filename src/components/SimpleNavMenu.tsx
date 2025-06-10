import { Link } from "react-router-dom"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

export function SimpleNavMenu() {
  return (
    <div className="h-10 shadow-md m-1">
      <NavigationMenu>
        <NavigationMenuList>
          {/* 首页 */}
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link to="/" className="px-4 py-2 hover:underline">
                首页
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* 设置（带下拉） */}
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link to="/config" className="px-4 py-2 hover:underline">
                设置
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* 联系 */}
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link to="/contact" className="px-4 py-2 hover:underline">
                联系
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link to="/test" className="px-4 py-2 hover:underline">
                测试界面
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}
