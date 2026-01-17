"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { lecturerSidebarItems } from "@/constants";

export function LecturerSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="bg-gray-900 border-r border-gray-800">
      <SidebarHeader className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-r from-blue-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
            <Image
              src="/assets/cuglogo.png"
              alt="CUG"
              width={32}
              height={32}
              className="rounded"
            />
          </div>
          <div>
            <h2 className="font-semibold text-white text-base">CUG Admin</h2>
            <p className="text-xs text-gray-400">Management Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-900">
        {lecturerSidebarItems.map((item, index) => (
          <SidebarGroup key={index}>
            {item.title && !item.items && (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="w-full hover:bg-gray-800/80 hover:text-white data-[active=true]:bg-linear-to-r data-[active=true]:from-blue-500 data-[active=true]:to-orange-500 text-gray-300 data-[active=true]:text-white transition-all duration-200 mx-2 rounded-lg"
                  >
                    <Link
                      href={item.url}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}

            {item.items && (
              <>
                <SidebarGroupLabel className="text-gray-500 text-xs font-bold uppercase tracking-wider px-5 py-3 mt-2">
                  {item.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((subItem) => (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(subItem.url)}
                          className="hover:bg-gray-800/80 hover:text-white data-[active=true]:bg-linear-to-r data-[active=true]:from-blue-500 data-[active=true]:to-orange-500 text-gray-300 data-[active=true]:text-white transition-all duration-200 mx-2 rounded-lg"
                        >
                          <Link
                            href={subItem.url}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <subItem.icon className="w-5 h-5" />
                            <span className="font-medium">{subItem.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="text-xs text-gray-400">
          <p>© 2026 CUG SmartLearn</p>
          <p>Academic Management System</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
