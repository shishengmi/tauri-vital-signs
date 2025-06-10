import { Link } from "react-router-dom"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
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
            <NavigationMenuTrigger>设置</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="p-4 w-[200px] space-y-1">
                <li>
                  <NavigationMenuLink asChild>
                    <Link to="/settings/1" className="block px-2 py-1 hover:bg-gray-100 rounded">
                      设置1
                    </Link>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Link to="/settings/2" className="block px-2 py-1 hover:bg-gray-100 rounded">
                      设置2
                    </Link>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Link to="/settings/3" className="block px-2 py-1 hover:bg-gray-100 rounded">
                      设置3
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
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
