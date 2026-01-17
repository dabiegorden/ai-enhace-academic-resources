import {
  BarChart3,
  Users,
  FileText,
  BookOpen,
  ClipboardList,
  Calendar,
  MessageSquare,
  Star,
  Vote,
  Bell,
  LayoutGrid,
} from "lucide-react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { LecturerSidebar } from "@/components/LecturerSidebar";
import { StatsCard } from "@/components/StatsCard";

export { AdminSidebar, StatsCard, LecturerSidebar };

export const adminSidebarItems = [
  {
    title: "Dashboard",
    url: "/admin-dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Management",
    items: [
      {
        title: "Users",
        url: "/admin-dashboard/users",
        icon: Users,
      },
      {
        title: "Lecturers",
        url: "/admin-dashboard/lecturers",
        icon: BookOpen,
      },
      {
        title: "Students",
        url: "/admin-dashboard/students",
        icon: Users,
      },
    ],
  },
  {
    title: "Academic",
    items: [
      {
        title: "Lecture Notes",
        url: "/admin-dashboard/lecture-notes",
        icon: FileText,
      },
      {
        title: "Assignments",
        url: "/admin-dashboard/assignments",
        icon: ClipboardList,
      },
      {
        title: "Examinations",
        url: "/admin-dashboard/examinations",
        icon: BarChart3,
      },
      {
        title: "Timetables",
        url: "/admin-dashboard/timetables",
        icon: Calendar,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Chat Rooms",
        url: "/admin-dashboard/chat-rooms",
        icon: MessageSquare,
      },
      {
        title: "Announcements",
        url: "/admin-dashboard/announcements",
        icon: Bell,
      },
    ],
  },
  {
    title: "Feedback",
    items: [
      {
        title: "Ratings & Reviews",
        url: "/admin-dashboard/ratings",
        icon: Star,
      },
      {
        title: "Voting System",
        url: "/admin-dashboard/voting",
        icon: Vote,
      },
    ],
  },
];

export const lecturerSidebarItems = [
  {
    title: "Dashboard",
    url: "/lecturer-dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Management",
    items: [
      {
        title: "Students",
        url: "/lecturer-dashboard/students",
        icon: Users,
      },
    ],
  },
  {
    title: "Academic",
    items: [
      {
        title: "Lecture Notes",
        url: "/lecturer-dashboard/lecture-notes",
        icon: FileText,
      },
      {
        title: "Assignments",
        url: "/lecturer-dashboard/assignments",
        icon: ClipboardList,
      },
      {
        title: "Examinations",
        url: "/lecturer-dashboard/examinations",
        icon: BarChart3,
      },
      {
        title: "Timetables",
        url: "/lecturer-dashboard/timetables",
        icon: Calendar,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Chat Rooms",
        url: "/lecturer-dashboard/chat-rooms",
        icon: MessageSquare,
      },
      {
        title: "Announcements",
        url: "/lecturer-dashboard/announcements",
        icon: Bell,
      },
    ],
  },
];
