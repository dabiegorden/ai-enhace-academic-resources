"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  FileCheck,
  MessageSquare,
  TrendingUp,
  Award,
  Target,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/constants";

interface StudentStats {
  submittedAssignments: number;
  completedExams: number;
  chatRoomsJoined: number;
}

export default function StudentsDashboardPage() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        if (!token || !userStr) {
          toast.error("No authentication token found");
          return;
        }

        const user = JSON.parse(userStr);
        const userId = user.id || user._id;

        console.log("[v0] Fetching student stats for userId:", userId);

        const response = await fetch(`${apiUrl}/stats/student/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("[v0] Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[v0] Error response:", errorData);
          toast.error("Failed to fetch stats");
          return;
        }

        const data = await response.json();
        console.log("[v0] Stats data:", data);

        if (data.success) {
          setStats(data.data);
        } else {
          toast.error(data.message || "Failed to fetch stats");
        }
      } catch (error) {
        console.error("[v0] Error fetching stats:", error);
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
          {[...Array(4)].map((_, i) => (
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

  const totalActivities = stats.submittedAssignments + stats.completedExams;
  const completionRate =
    totalActivities > 0
      ? (
          ((stats.submittedAssignments + stats.completedExams) /
            totalActivities) *
          100
        ).toFixed(0)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
        <p className="text-gray-400">
          Welcome to your CUG SmartLearn student panel
        </p>
      </div>

      {/* Main Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Your Academic Progress
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Assignments Submitted"
            value={stats.submittedAssignments}
            icon={<ClipboardCheck className="w-5 h-5" />}
            bgColor="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Exams Completed"
            value={stats.completedExams}
            icon={<FileCheck className="w-5 h-5" />}
            bgColor="from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Chat Rooms Joined"
            value={stats.chatRoomsJoined}
            icon={<MessageSquare className="w-5 h-5" />}
            bgColor="from-purple-500 to-pink-500"
          />
        </div>
      </div>

      {/* Performance Overview */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Activity Overview
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatsCard
            title="Total Activities"
            value={totalActivities}
            icon={<TrendingUp className="w-5 h-5" />}
            bgColor="from-indigo-500 to-blue-500"
          />
          <StatsCard
            title="Community Engagement"
            value={stats.chatRoomsJoined}
            icon={<Activity className="w-5 h-5" />}
            bgColor="from-cyan-500 to-teal-500"
          />
          <StatsCard
            title="Completion Rate"
            value={`${completionRate}%`}
            icon={<Award className="w-5 h-5" />}
            bgColor="from-orange-500 to-red-500"
          />
        </div>
      </div>

      {/* Progress Info */}
      <div className="bg-linear-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Target className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Keep Making Progress!
            </h3>
            <p className="text-gray-300 text-sm">
              You have submitted {stats.submittedAssignments} assignments and
              completed {stats.completedExams} examinations. You are actively
              participating in {stats.chatRoomsJoined} chat rooms. Continue your
              learning journey and stay engaged with your coursework.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
