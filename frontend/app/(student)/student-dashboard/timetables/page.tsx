"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface CourseSession {
  courseCode?: string;
  courseName?: string;
  lecturer?: string;
  location?: string;
  lecturer_initials?: string;
}

interface TimeSlot {
  _id: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
  monday?: CourseSession;
  tuesday?: CourseSession;
  wednesday?: CourseSession;
  thursday?: CourseSession;
  friday?: CourseSession;
}

interface TimetableDocument {
  filename: string;
  originalName: string;
  fileType: "pdf" | "excel";
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface Timetable {
  _id: string;
  programCode: string;
  programName: string;
  yearOfStudy: number;
  level: string;
  faculty: string;
  semester: string;
  academicYear: string;
  specialization?: string;
  timeSlots: TimeSlot[];
  breakTime: {
    startTime: string;
    endTime: string;
    name: string;
  };
  timetableDocument?: TimetableDocument;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const StudentTimetablePage = () => {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const token = localStorage.getItem("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch timetable
  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/timetables/my-timetable`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTimetable(data.data);
      } else {
        toast.error(data.message || "Failed to fetch timetable");
      }
    } catch (error) {
      toast.error("Failed to fetch timetable");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  // Download timetable document
  const handleDownload = async () => {
    if (!timetable?._id || !timetable.timetableDocument) {
      toast.error("No document available for download");
      return;
    }

    try {
      setDownloading(true);
      const response = await fetch(
        `${apiUrl}/timetables/${timetable._id}/download-document`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = timetable.timetableDocument.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Timetable downloaded successfully");
    } catch (error) {
      toast.error("Failed to download timetable");
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Check if a time slot falls within break time
  const isBreakTime = (slot: TimeSlot): boolean => {
    if (!timetable?.breakTime) return false;
    return (
      slot.startTime === timetable.breakTime.startTime &&
      slot.endTime === timetable.breakTime.endTime
    );
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="size-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Timetable Available</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Your timetable has not been published yet. Please check back later
              or contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Timetable</h1>
          <p className="text-muted-foreground">
            {timetable.programName} - Level {timetable.level}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-4 py-2">
            Semester {timetable.semester}
          </Badge>
          <Badge variant="secondary" className="text-base px-4 py-2">
            {timetable.academicYear}
          </Badge>
        </div>
      </div>

      {/* Timetable Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Program Information</CardTitle>
              <CardDescription>
                Your current academic program details
              </CardDescription>
            </div>
            {timetable.timetableDocument && (
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Download Timetable
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Program Code</p>
            <p className="font-semibold">{timetable.programCode}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Faculty</p>
            <p className="font-semibold">{timetable.faculty}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Year of Study</p>
            <p className="font-semibold">Year {timetable.yearOfStudy}</p>
          </div>
          {timetable.specialization && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Specialization</p>
              <p className="font-semibold">{timetable.specialization}</p>
            </div>
          )}
          {timetable.timetableDocument && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Document Type</p>
                <Badge variant="outline">
                  <FileText className="mr-1 size-3" />
                  {timetable.timetableDocument.fileType.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-semibold">
                  {formatFileSize(timetable.timetableDocument.fileSize)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Your class timetable for {timetable.academicYear} - Semester{" "}
            {timetable.semester}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-200">
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              <div className="font-semibold text-sm text-muted-foreground flex items-center">
                <Clock className="mr-2 size-4" />
                Time
              </div>
              {DAY_LABELS.map((day) => (
                <div key={day} className="font-semibold text-sm text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {timetable.timeSlots.map((slot) => {
                const isBreak = isBreakTime(slot);

                if (isBreak) {
                  return (
                    <div
                      key={slot._id}
                      className="grid grid-cols-6 gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex flex-col justify-center">
                        <p className="text-sm font-semibold">
                          {slot.startTime} - {slot.endTime}
                        </p>
                      </div>
                      <div className="col-span-5 flex items-center justify-center">
                        <Badge className="bg-yellow-500 text-white px-4 py-2 text-base">
                          {timetable.breakTime.name}
                        </Badge>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot._id}
                    className="grid grid-cols-6 gap-2 p-2 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Time Column */}
                    <div className="flex flex-col justify-center px-2">
                      <p className="text-sm font-semibold">{slot.startTime}</p>
                      <p className="text-xs text-muted-foreground">
                        {slot.endTime}
                      </p>
                    </div>

                    {/* Day Columns */}
                    {DAYS.map((day) => {
                      const session = slot[day as keyof TimeSlot] as
                        | CourseSession
                        | undefined;

                      if (!session || !session.courseCode) {
                        return (
                          <div
                            key={day}
                            className="flex items-center justify-center p-2 bg-gray-50 rounded text-xs text-muted-foreground"
                          >
                            -
                          </div>
                        );
                      }

                      return (
                        <div
                          key={day}
                          className="p-3 bg-blue-50 border border-blue-200 rounded space-y-1"
                        >
                          <p className="font-bold text-sm text-blue-900">
                            {session.courseCode}
                          </p>
                          {session.courseName && (
                            <p className="text-xs text-blue-800 line-clamp-1">
                              {session.courseName}
                            </p>
                          )}
                          {session.lecturer_initials && (
                            <div className="flex items-center gap-1 text-xs text-blue-700">
                              <User className="size-3" />
                              {session.lecturer_initials}
                            </div>
                          )}
                          {session.location && (
                            <div className="flex items-center gap-1 text-xs text-blue-700">
                              <MapPin className="size-3" />
                              {session.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="size-4 bg-blue-50 border border-blue-200 rounded" />
            <span className="text-sm">Class Session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 bg-yellow-50 border border-yellow-200 rounded" />
            <span className="text-sm">Break Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 bg-gray-50 rounded" />
            <span className="text-sm">No Class</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentTimetablePage;
