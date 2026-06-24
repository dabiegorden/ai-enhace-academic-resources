"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  FileText,
  ClipboardList,
  Star,
  TrendingUp,
  Award,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/constants";

interface LecturerStats {
  notesCount: number;
  assignmentsCount: number;
  examsCount: number;
  avgRating: number;
  ratingsCount: number;
}

interface CourseItem {
  course: string;
  courseCode: string;
}

export default function LecturerDashboard() {
  const [stats, setStats] = useState<LecturerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coursesBySemester, setCoursesBySemester] = useState<
    Record<string, CourseItem[]>
  >({});
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Derive the courses a lecturer teaches from the lecture notes they
        // have uploaded, grouped by semester with duplicates removed.
        const response = await fetch(`${apiUrl}/notes/uploaded-by-me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const data = await response.json();
        const notes: Array<{
          course: string;
          courseCode: string;
          semester?: string;
        }> = data.data || [];

        const grouped: Record<string, CourseItem[]> = {};
        const seen: Record<string, Set<string>> = {};
        notes.forEach((note) => {
          const sem = note.semester ? `Semester ${note.semester}` : "Other";
          if (!grouped[sem]) {
            grouped[sem] = [];
            seen[sem] = new Set();
          }
          const key = `${note.courseCode}-${note.course}`;
          if (!seen[sem].has(key)) {
            seen[sem].add(key);
            grouped[sem].push({
              course: note.course,
              courseCode: note.courseCode,
            });
          }
        });
        setCoursesBySemester(grouped);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };

    fetchCourses();
  }, [apiUrl]);

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

        console.log("[v0] Fetching lecturer stats for userId:", userId);

        const response = await fetch(`${apiUrl}/stats/lecturer/${userId}`, {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Lecturer Dashboard</h1>
        <p className="text-gray-400">
          Welcome to your CUG SmartLearn lecturer panel
        </p>
      </div>

      {/* Main Statistics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Your Content Statistics
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Lecture Notes"
            value={stats.notesCount}
            icon={<BookOpen className="w-5 h-5" />}
            bgColor="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Assignments"
            value={stats.assignmentsCount}
            icon={<ClipboardList className="w-5 h-5" />}
            bgColor="from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Examinations"
            value={stats.examsCount}
            icon={<FileText className="w-5 h-5" />}
            bgColor="from-purple-500 to-pink-500"
          />
          <StatsCard
            title="Average Rating"
            value={stats.avgRating.toFixed(2)}
            icon={<Star className="w-5 h-5" />}
            bgColor="from-yellow-500 to-orange-500"
          />
        </div>
      </div>

      {/* Performance Overview */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Performance Overview
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <StatsCard
            title="Total Content"
            value={stats.notesCount + stats.assignmentsCount + stats.examsCount}
            icon={<TrendingUp className="w-5 h-5" />}
            bgColor="from-indigo-500 to-blue-500"
          />
          <StatsCard
            title="Ratings Received"
            value={stats.ratingsCount}
            icon={<Clock className="w-5 h-5" />}
            bgColor="from-cyan-500 to-teal-500"
          />

          {/* <StatsCard
            title="Rating Score"
            value={`${((stats.avgRating / 5) * 100).toFixed(0)}%`}
            icon={<Award className="w-5 h-5" />}
            bgColor="from-orange-500 to-red-500"
          /> */}
        </div>
      </div>

      {/* Courses Taught per Semester */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Courses You Teach
        </h2>
        {Object.keys(coursesBySemester).length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-center text-gray-400">
            No courses yet. Courses are derived from the lecture notes you
            upload.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {Object.keys(coursesBySemester)
              .sort((a, b) => {
                if (a === "Other") return 1;
                if (b === "Other") return -1;
                return a.localeCompare(b, undefined, { numeric: true });
              })
              .map((semester) => (
                <div
                  key={semester}
                  className="rounded-lg border border-gray-700 bg-gray-900 p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                    <h3 className="font-semibold text-white">{semester}</h3>
                    <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                      {coursesBySemester[semester].length} course
                      {coursesBySemester[semester].length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {coursesBySemester[semester].map((c) => (
                      <li
                        key={`${semester}-${c.courseCode}-${c.course}`}
                        className="flex items-center justify-between rounded bg-gray-800 px-3 py-2"
                      >
                        <span className="text-sm text-gray-200">
                          {c.course}
                        </span>
                        <span className="text-xs font-medium text-gray-400">
                          {c.courseCode}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions Info */}
      <div className="bg-linear-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <CheckCircle className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Keep Up the Great Work!
            </h3>
            <p className="text-gray-300 text-sm">
              You have created {stats.notesCount} lecture notes,{" "}
              {stats.assignmentsCount} assignments, and {stats.examsCount}{" "}
              examinations. Your average rating is {stats.avgRating.toFixed(2)}{" "}
              out of 5.0. Continue providing quality educational content for
              your students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
