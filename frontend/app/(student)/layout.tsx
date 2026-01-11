"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppSidebar } from "@/constants";
import Link from "next/link";
import Image from "next/image";

function DashboardContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push("/sign-in");
        }
      } catch (error) {
        console.log("Auth check failed:", error);
        router.push("/sign-in");
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/sign-in");
    } catch (error) {
      console.log("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-pink-500"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Enhanced Header with Dark Theme */}
        <header className="fixed top-0 right-0 left-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-all duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 shadow-lg group-has-data-[collapsible=icon]/sidebar-wrapper:left-12">
          <div className="flex items-center gap-2 px-4">
            <Separator
              orientation="vertical"
              className="mr-2 h-4 bg-gray-700"
            />
            {/* Enhanced Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <div className="text-gray-400 hover:text-white transition-colors duration-200 font-medium">
                    <div className="flex items-center">
                      <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-linear-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Image
                            src="/assets/logo.jpeg"
                            alt="Mauricefx Logo"
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        </div>
                        <span className="text-xl md:text-2xl font-bold bg-linear-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                          Mauricefx
                        </span>
                      </Link>
                    </div>
                  </div>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-gray-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white font-semibold flex items-center gap-2 cursor-pointer">
                    <SidebarTrigger className="-ml-1 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 rounded-lg p-2" />
                    Overview
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Enhanced Header Actions */}
          <div className="ml-auto flex items-center gap-2 px-4">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200 rounded-lg relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-linear-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></span>
              </Button>
            </div>

            {/* User Profile Section */}
            {user && (
              <div className="flex items-center gap-3">
                {/* Desktop User Info */}
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>

                {/* User Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <div className="flex items-center gap-2 rounded-lg hover:bg-gray-800 transition-colors p-1 cursor-pointer">
                      <Avatar className="h-9 w-9 border-2 border-linear-to-r from-red-500 to-pink-500">
                        <AvatarImage
                          src={user.avatar || "/placeholder.svg"}
                          alt={user.name}
                        />
                        <AvatarFallback className="bg-linear-to-br from-red-500 to-pink-500 text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-64 bg-gray-900 border-gray-800 text-gray-200 mt-2"
                    align="end"
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center gap-3 p-2">
                        <Avatar className="h-12 w-12 border-2 border-linear-to-r from-red-500 to-pink-500">
                          <AvatarImage
                            src={user.avatar || "/placeholder.svg"}
                            alt={user.name}
                          />
                          <AvatarFallback className="bg-linear-to-br from-red-500 to-pink-500 text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none text-white">
                            {user.name}
                          </p>
                          <p className="text-xs leading-none text-gray-400">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-linear-to-r from-red-500 to-pink-500 text-white font-bold uppercase tracking-wider">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-800" />

                    {/* Mobile Actions */}
                    <div className="sm:hidden">
                      <DropdownMenuItem className="cursor-pointer text-gray-300 focus:text-white focus:bg-gray-800">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-gray-800" />
                    </div>

                    <DropdownMenuSeparator className="bg-gray-800" />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-500 focus:text-red-400 focus:bg-red-500/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>

        {/* Enhanced Main Content with Dark Theme */}
        <div className="pt-16 flex flex-1 flex-col min-h-screen bg-linear-to-br from-gray-900 via-purple-900/20 to-gray-900">
          {/* Content Wrapper with proper spacing and mobile optimization */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Background Decoration - Grid Pattern */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
              <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-linear-to-br from-red-500/10 to-pink-500/10 blur-3xl"></div>
              <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-linear-to-br from-purple-500/10 to-pink-500/10 blur-3xl"></div>
            </div>

            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>;
}
