"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  Star,
  Vote,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/constants";

interface AdminStats {
  users: {
    total: number;
    students: number;
    lecturers: number;
    admins: number;
    active: number;
  };
  academic: {
    notes: number;
    assignments: number;
    exams: number;
    announcements: number;
  };
  community: {
    chatRooms: number;
    messages: number;
  };
  ratings: {
    total: number;
    avgCourseRating: number;
    avgLecturerRating: number;
  };
  votes: {
    total: number;
    srcVotes: number;
    facultyVotes: number;
  };
  distributions: {
    faculty: Array<{ _id: string; count: number }>;
    program: Array<{ _id: string; count: number }>;
    year: Array<{ _id: number; count: number }>;
  };
  recent: {
    users: any[];
    notes: any[];
    assignments: any[];
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("No authentication token found");
          return;
        }

        const response = await fetch(`${apiUrl}/stats/admin`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          toast.error("Failed to fetch stats");
          return;
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          toast.error(data.message || "Failed to fetch stats");
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to fetch dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [apiUrl]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 bg-gray-700" />
          <Skeleton className="h-4 w-64 bg-gray-700" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">Failed to load dashboard statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400">
          Welcome to the CUG SmartLearn administration panel
        </p>
      </div>

      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          User Statistics
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Users"
            value={stats.users.total}
            icon={<Users className="w-5 h-5" />}
            bgColor="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Students"
            value={stats.users.students}
            icon={<Users className="w-5 h-5" />}
            bgColor="from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Lecturers"
            value={stats.users.lecturers}
            icon={<BookOpen className="w-5 h-5" />}
            bgColor="from-purple-500 to-pink-500"
          />
          <StatsCard
            title="Admins"
            value={stats.users.admins}
            icon={<Users className="w-5 h-5" />}
            bgColor="from-orange-500 to-red-500"
          />
          <StatsCard
            title="Active Users"
            value={stats.users.active}
            icon={<TrendingUp className="w-5 h-5" />}
            bgColor="from-yellow-500 to-orange-500"
          />
        </div>
      </div>

      {/* Academic Content Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Academic Content
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Lecture Notes"
            value={stats.academic.notes}
            icon={<FileText className="w-5 h-5" />}
            bgColor="from-indigo-500 to-blue-500"
          />
          <StatsCard
            title="Assignments"
            value={stats.academic.assignments}
            icon={<ClipboardList className="w-5 h-5" />}
            bgColor="from-cyan-500 to-blue-500"
          />
          <StatsCard
            title="Examinations"
            value={stats.academic.exams}
            icon={<TrendingUp className="w-5 h-5" />}
            bgColor="from-teal-500 to-green-500"
          />
          <StatsCard
            title="Announcements"
            value={stats.academic.announcements}
            icon={<FileText className="w-5 h-5" />}
            bgColor="from-sky-500 to-cyan-500"
          />
        </div>
      </div>

      {/* Community Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Community Engagement
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatsCard
            title="Chat Rooms"
            value={stats.community.chatRooms}
            icon={<MessageSquare className="w-5 h-5" />}
            bgColor="from-violet-500 to-purple-500"
          />
          <StatsCard
            title="Total Messages"
            value={stats.community.messages}
            icon={<MessageSquare className="w-5 h-5" />}
            bgColor="from-rose-500 to-pink-500"
          />
          <StatsCard
            title="Ratings & Reviews"
            value={stats.ratings.total}
            icon={<Star className="w-5 h-5" />}
            bgColor="from-amber-500 to-yellow-500"
          />
        </div>
      </div>

      {/* Rating Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Ratings Overview
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatsCard
            title="Avg Course Rating"
            value={(stats.ratings.avgCourseRating ?? 0).toFixed(2)}
            icon={<Star className="w-5 h-5" />}
            bgColor="from-yellow-500 to-amber-500"
          />
          <StatsCard
            title="Avg Lecturer Rating"
            value={(stats.ratings.avgLecturerRating ?? 0).toFixed(2)}
            icon={<Star className="w-5 h-5" />}
            bgColor="from-orange-500 to-rose-500"
          />
          <StatsCard
            title="Total Votes"
            value={stats.votes.total}
            icon={<Vote className="w-5 h-5" />}
            bgColor="from-red-500 to-pink-500"
          />
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Faculty Distribution */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Faculty Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Students and lecturers by faculty
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.distributions.faculty.length > 0 ? (
              stats.distributions.faculty.map((faculty) => (
                <div
                  key={faculty._id}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-300">{faculty._id}</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {faculty.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No faculty data available</p>
            )}
          </CardContent>
        </Card>

        {/* Program Distribution */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Program Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Students by program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.distributions.program.length > 0 ? (
              stats.distributions.program.slice(0, 5).map((program) => (
                <div
                  key={program._id}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-300">{program._id}</span>
                  <span className="text-sm font-semibold text-green-400">
                    {program.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No program data available</p>
            )}
          </CardContent>
        </Card>

        {/* Year Distribution */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Year Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Students by year of study
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.distributions.year.length > 0 ? (
              stats.distributions.year.map((year) => (
                <div
                  key={year._id}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-300">Year {year._id}</span>
                  <span className="text-sm font-semibold text-purple-400">
                    {year.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No year data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
