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
import { Calendar, Clock, Download, Eye, FileText, Loader2 } from "lucide-react";
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
  classDate?: string;
  startTime?: string;
  endTime?: string;
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

const StudentTimetablePage = () => {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [activeSemester, setActiveSemester] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  // Preview is opt-in: the document only loads when the student clicks Preview.
  const [showPreview, setShowPreview] = useState(false);

  const token = localStorage.getItem("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Semesters supported by the backend.
  const SEMESTERS = ["1", "2"];

  // Select a timetable and reset the (opt-in) preview.
  const selectTimetable = (t: Timetable) => {
    setTimetable(t);
    setShowPreview(false);
  };

  // Fetch timetable(s) for the student's faculty + level
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
        const list: Timetable[] = data.timetables || (data.data ? [data.data] : []);
        setTimetables(list);
        setTimetable(data.data);
        if (data.data?.semester) setActiveSemester(data.data.semester);
      } else {
        setTimetables([]);
        setTimetable(null);
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

  // Load the actual document uploaded by the lecturer so it can be embedded
  // inline — but ONLY after the student clicks Preview (no auto-preview). The
  // download endpoint is auth-protected, so we fetch it as a blob and create
  // an object URL for the <iframe>.
  useEffect(() => {
    let revoked: string | null = null;

    const loadDocument = async () => {
      if (!showPreview || !timetable?._id || !timetable.timetableDocument) {
        setDocPreviewUrl(null);
        return;
      }

      try {
        setDocPreviewLoading(true);
        setDocPreviewUrl(null);
        const response = await fetch(
          `${apiUrl}/timetables/${timetable._id}/download-document`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) throw new Error("Failed to load document");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        revoked = url;
        setDocPreviewUrl(url);
      } catch (error) {
        console.error("Document preview error:", error);
        setDocPreviewUrl(null);
      } finally {
        setDocPreviewLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (revoked) window.URL.revokeObjectURL(revoked);
    };
  }, [showPreview, timetable?._id, apiUrl, token]);

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
          <Badge variant="outline" className="text-base px-4 py-2">
            Level {timetable.level}
          </Badge>
        </div>
      </div>

      {/* Semester tabs + program selector. The backend returns every published
          timetable for the student's faculty and level, so a CEMS student can
          see both Computer Science and Information Technology schedules, split
          by Semester 1 / Semester 2. */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Semester tabs */}
          <div className="flex flex-wrap gap-2">
            {SEMESTERS.map((sem) => {
              const count = timetables.filter(
                (t) => t.semester === sem,
              ).length;
              const isActive = activeSemester === sem;
              return (
                <Button
                  key={sem}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => {
                    setActiveSemester(sem);
                    const inSem = timetables.filter((t) => t.semester === sem);
                    if (inSem.length > 0) selectTimetable(inSem[0]);
                  }}
                >
                  Semester {sem}
                  <Badge
                    variant="secondary"
                    className="ml-2 px-1.5 py-0 text-xs"
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Program selector within the active semester */}
          {(() => {
            const inSem = timetables.filter(
              (t) => t.semester === activeSemester,
            );
            if (inSem.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  No timetable published for Semester {activeSemester} yet.
                </p>
              );
            }
            return (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-sm font-medium text-muted-foreground shrink-0">
                  {timetable.faculty} — Level {timetable.level}. Select program:
                </p>
                <div className="flex flex-wrap gap-2">
                  {inSem.map((t) => {
                    const isSelected = t._id === timetable._id;
                    return (
                      <Button
                        key={t._id}
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => selectTimetable(t)}
                      >
                        {t.programName} ({t.programCode})
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
          {timetable.classDate && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="size-4" />
                {new Date(timetable.classDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          {(timetable.startTime || timetable.endTime) && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-semibold flex items-center gap-1">
                <Clock className="size-4" />
                {timetable.startTime || ""}
                {timetable.endTime ? ` - ${timetable.endTime}` : ""}
              </p>
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

      {/* Uploaded Timetable Document */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Timetable</CardTitle>
              <CardDescription>
                Official timetable uploaded by your lecturer for{" "}
                {timetable.programName} — {timetable.academicYear} - Semester{" "}
                {timetable.semester}
              </CardDescription>
            </div>
            {timetable.timetableDocument && (
              <div className="flex gap-2">
                {timetable.timetableDocument.fileType === "pdf" && (
                  <Button
                    variant={showPreview ? "secondary" : "default"}
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    <Eye className="mr-2 size-4" />
                    {showPreview ? "Hide Preview" : "Preview"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 size-4" />
                  )}
                  Download
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!timetable.timetableDocument ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-14 text-muted-foreground mb-4" />
              <p className="text-muted-foreground max-w-md">
                Your lecturer has not uploaded a timetable document yet. Please
                check back later.
              </p>
            </div>
          ) : !showPreview ? (
            /* No auto-preview — show a prompt with Preview / Download actions. */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-14 text-muted-foreground mb-4" />
              <p className="font-medium mb-1">
                {timetable.timetableDocument.originalName}
              </p>
              <p className="text-muted-foreground mb-4 max-w-md">
                {timetable.timetableDocument.fileType === "pdf"
                  ? "Click Preview to view the timetable here, or download it."
                  : "This document can't be previewed inline. Download it to view your timetable."}
              </p>
              <div className="flex gap-2">
                {timetable.timetableDocument.fileType === "pdf" && (
                  <Button onClick={() => setShowPreview(true)}>
                    <Eye className="mr-2 size-4" />
                    Preview
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 size-4" />
                  )}
                  Download
                </Button>
              </div>
            </div>
          ) : docPreviewLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : docPreviewUrl ? (
            <iframe
              src={docPreviewUrl}
              title={timetable.timetableDocument.originalName}
              className="w-full h-[80vh] rounded-lg border"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-14 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Failed to load preview. Please download the document instead.
              </p>
              <Button onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 size-4" />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentTimetablePage;
