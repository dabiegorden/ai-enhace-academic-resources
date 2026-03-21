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
import { LogOut, User, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { StudentSidebar } from "@/components/StudentSidebar";
import NotificationBell from "@/components/Notificationbell";

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  faculty?: string;
  program?: string;
  yearOfStudy?: number;
  profileImage?: string;
  studentId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResponse {
  success: boolean;
  data?: UserData;
  message?: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function DashboardContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/");
          return;
        }

        const res = await fetch(`${apiUrl}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data: AuthResponse = await res.json();

        if (data.success && data.data) {
          setUser(data.data);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.error("Session expired. Please login again.");
          router.push("/");
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Authentication failed. Please login again.");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/");
  };

  const getInitials = (u: UserData) =>
    `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  const getFullName = (u: UserData) => `${u.firstName} ${u.lastName}`;

  const roleBadge: Record<string, string> = {
    admin: "bg-linear-to-r from-red-500 to-red-600",
    lecturer: "bg-linear-to-r from-blue-500 to-blue-600",
    student: "bg-linear-to-r from-green-500 to-green-600",
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-pink-500" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <StudentSidebar />
      <SidebarInset>
        <header className="fixed top-0 right-0 left-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 shadow-lg transition-all duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 group-has-data-[collapsible=icon]/sidebar-wrapper:left-12">
          <div className="flex items-center gap-2 px-4">
            <Separator
              orientation="vertical"
              className="mr-2 h-4 bg-gray-700"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center">
                      <Image
                        src="/assets/cuglogo.png"
                        alt="CUG SmartLearn"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    </div>
                    <span className="text-xl md:text-2xl font-bold bg-linear-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">
                      CUG
                    </span>
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-gray-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white font-semibold flex items-center gap-2">
                    <SidebarTrigger className="-ml-1 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded-lg p-2" />
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex items-center gap-2 px-4">
            {/* 🔔 Real notification bell */}
            <NotificationBell userId={user?.id ?? null} />

            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-white">
                    {getFullName(user)}
                  </p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <div className="flex items-center gap-2 rounded-lg hover:bg-gray-800 transition-colors p-1 cursor-pointer">
                      <Avatar className="h-9 w-9 border-2 border-orange-500/40">
                        <AvatarImage
                          src={user.profileImage || "/placeholder.svg"}
                          alt={getFullName(user)}
                        />
                        <AvatarFallback className="bg-linear-to-br from-blue-500 to-orange-500 text-white font-semibold">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-72 bg-gray-900 border-gray-800 text-gray-200 mt-2"
                    align="end"
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center gap-3 p-2">
                        <Avatar className="h-12 w-12 border-2 border-orange-500/40">
                          <AvatarImage
                            src={user.profileImage || "/placeholder.svg"}
                          />
                          <AvatarFallback className="bg-linear-to-br from-blue-500 to-orange-500 text-white font-semibold">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium text-white">
                            {getFullName(user)}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                          {user.studentId && (
                            <p className="text-xs text-gray-500">
                              ID: {user.studentId}
                            </p>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${roleBadge[user.role] || roleBadge.student} text-white font-bold uppercase tracking-wider`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    {(user.role === "student" || user.role === "lecturer") && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        <div className="px-2 py-2 text-xs text-gray-400 space-y-1">
                          {user.faculty && (
                            <div className="flex justify-between">
                              <span>Faculty:</span>
                              <span className="text-gray-300 font-medium">
                                {user.faculty}
                              </span>
                            </div>
                          )}
                          {user.program && (
                            <div className="flex justify-between">
                              <span>Program:</span>
                              <span className="text-gray-300 font-medium">
                                {user.program}
                              </span>
                            </div>
                          )}
                          {user.yearOfStudy && (
                            <div className="flex justify-between">
                              <span>Year:</span>
                              <span className="text-gray-300 font-medium">
                                Year {user.yearOfStudy}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer text-gray-300 focus:text-white focus:bg-gray-800"
                    >
                      <Link href="/student-dashboard/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
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

        <div className="pt-16 flex flex-1 flex-col min-h-screen bg-slate-900">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
              <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-linear-to-br from-blue-500/10 to-orange-500/10 blur-3xl" />
              <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-linear-to-br from-purple-500/10 to-pink-500/10 blur-3xl" />
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
