"use client";

import React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Upload,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES, FACULTY_PROGRAMS } from "@/constants/faculties";

interface LectureNote {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  semester?: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  downloads: number;
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const LecturerNotesPage = () => {
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<LectureNote | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "",
    courseCode: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
    semester: "1",
    tags: "",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const faculties = FACULTY_NAMES;
  const programs = FACULTY_PROGRAMS;

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/notes/uploaded-by-me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const result = await response.json();
      setNotes(result.data || []);
    } catch (error) {
      toast.error("Failed to fetch notes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Only PDF and image files (JPG, PNG, WEBP, GIF) are allowed");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (
      !formData.title ||
      !formData.course ||
      !formData.courseCode ||
      !formData.faculty ||
      !formData.program ||
      !formData.yearOfStudy ||
      !selectedFile
    ) {
      toast.error("Please fill all required fields and select a file");
      return;
    }

    try {
      setActionLoading(true);

      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("title", formData.title);
      uploadFormData.append("description", formData.description);
      uploadFormData.append("course", formData.course);
      uploadFormData.append("courseCode", formData.courseCode);
      uploadFormData.append("faculty", formData.faculty);
      uploadFormData.append("program", formData.program);
      uploadFormData.append("yearOfStudy", formData.yearOfStudy);
      uploadFormData.append("semester", formData.semester);
      uploadFormData.append("tags", JSON.stringify(formData.tags.split(",")));

      const response = await fetch(`${apiUrl}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload note");
      }

      toast.success("Note uploaded successfully");
      setUploadDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        course: "",
        courseCode: "",
        faculty: "",
        program: "",
        yearOfStudy: "",
        semester: "1",
        tags: "",
      });
      setSelectedFile(null);
      fetchNotes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload note",
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedNote) return;

    if (
      !formData.title ||
      !formData.course ||
      !formData.courseCode ||
      !formData.faculty ||
      !formData.program ||
      !formData.yearOfStudy
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/notes/${selectedNote._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map((tag) => tag.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update note");
      }

      toast.success("Note updated successfully");
      setEditDialogOpen(false);
      setSelectedNote(null);
      fetchNotes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update note",
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;

    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/notes/${selectedNote._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      toast.success("Note deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedNote(null);
      fetchNotes();
    } catch (error) {
      toast.error("Failed to delete note");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (note: LectureNote) => {
    try {
      // The download endpoint returns the deliverable URL (Cloudinary, or a
      // legacy local-disk URL) plus the original filename.
      const response = await fetch(`${apiUrl}/notes/${note._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "File not available");
      }

      const a = document.createElement("a");
      a.href = data.data.fileUrl;
      a.download = data.data.filename || note.originalName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Download started");
      fetchNotes();
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download file.",
      );
    }
  };

  const handlePreview = async (note: LectureNote) => {
    // Cloudinary-hosted notes can be opened directly.
    if (note.fileUrl) {
      window.open(note.fileUrl, "_blank");
      fetchNotes();
      return;
    }

    // Legacy local-disk notes — stream via the preview endpoint.
    try {
      const response = await fetch(`${apiUrl}/notes/${note._id}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`File not accessible: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      fetchNotes();
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to preview file. The file may not exist.");
    }
  };

  const openEditDialog = (note: LectureNote) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      description: note.description || "",
      course: note.course,
      courseCode: note.courseCode,
      faculty: note.faculty,
      program: note.program,
      yearOfStudy: note.yearOfStudy.toString(),
      semester: note.semester || "1",
      tags: note.tags.join(", "),
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (note: LectureNote) => {
    setSelectedNote(note);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (note: LectureNote) => {
    setSelectedNote(note);
    setDeleteDialogOpen(true);
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lecture Notes</h1>
          <p className="text-muted-foreground">
            Manage and upload lecture notes for students
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Upload Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title, course, code, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "No notes found matching your search"
                : "No notes uploaded yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <Card key={note._id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-lg">
                      {note.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {note.course} ({note.courseCode})
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {note.fileType.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {note.description || "No description provided"}
                </p>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Faculty:</span> {note.faculty}
                  </p>
                  <p>
                    <span className="font-medium">Program:</span> {note.program}
                  </p>
                  <p>
                    <span className="font-medium">Year:</span> Year{" "}
                    {note.yearOfStudy}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span>{" "}
                    {formatFileSize(note.fileSize)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{note.downloads} downloads</span>
                  <span>{note.views} views</span>
                </div>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openViewDialog(note)}
                    className="flex-1"
                  >
                    <Eye className="mr-1 size-3" />
                    View
                  </Button>
                  {note.filename && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(note)}
                      title="Preview file"
                    >
                      <FileText className="size-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(note)}
                    disabled={!note.filename}
                    title="Download file"
                  >
                    <Download className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(note)}
                  >
                    <Edit className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(note)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Lecture Note</DialogTitle>
            <DialogDescription>
              Upload a new lecture note with file attachment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter note title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter note description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course">
                  Course <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="course"
                  placeholder="e.g., Data Structures"
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseCode">
                  Course Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., CS201"
                  value={formData.courseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, courseCode: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="faculty">
                  Faculty <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, faculty: value, program: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* General = course offered to the WHOLE SCHOOL */}
                    <SelectItem value="General">
                      General (All Faculties)
                    </SelectItem>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">
                  Program <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.program}
                  onValueChange={(value) =>
                    setFormData({ ...formData, program: value })
                  }
                  disabled={!formData.faculty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* When faculty is General (Whole School) the note targets
                        every program across all faculties. */}
                    {formData.faculty === "General" && (
                      <SelectItem value="General">
                        General (All Programmes)
                      </SelectItem>
                    )}
                    {/* General = course offered to the WHOLE FACULTY */}
                    {formData.faculty && formData.faculty !== "General" && (
                      <SelectItem value="General">
                        General (All Programmes in Faculty)
                      </SelectItem>
                    )}
                    {formData.faculty &&
                      programs[formData.faculty as keyof typeof programs]?.map(
                        (program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ),
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearOfStudy">
                  Year of Study <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.yearOfStudy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, yearOfStudy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Years / Levels</SelectItem>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">
                  Semester <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) =>
                    setFormData({ ...formData, semester: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., algorithms, graphs, trees"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                File <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} (
                  {formatFileSize(selectedFile.size)})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF and images (JPG, PNG, WEBP, GIF)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={actionLoading}>
              {actionLoading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lecture Note</DialogTitle>
            <DialogDescription>Update note details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="Enter note title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter note description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-course">
                  Course <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-course"
                  placeholder="e.g., Data Structures"
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-courseCode">
                  Course Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-courseCode"
                  placeholder="e.g., CS201"
                  value={formData.courseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, courseCode: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-faculty">
                  Faculty <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, faculty: value, program: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* General = course offered to the WHOLE SCHOOL */}
                    <SelectItem value="General">
                      General (All Faculties)
                    </SelectItem>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-program">
                  Program <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.program}
                  onValueChange={(value) =>
                    setFormData({ ...formData, program: value })
                  }
                  disabled={!formData.faculty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.faculty === "General" && (
                      <SelectItem value="General">
                        General (All Programmes)
                      </SelectItem>
                    )}
                    {formData.faculty && formData.faculty !== "General" && (
                      <SelectItem value="General">
                        General (All Programmes in Faculty)
                      </SelectItem>
                    )}
                    {formData.faculty &&
                      programs[formData.faculty as keyof typeof programs]?.map(
                        (program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ),
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-yearOfStudy">
                Year of Study <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.yearOfStudy}
                onValueChange={(value) =>
                  setFormData({ ...formData, yearOfStudy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                placeholder="e.g., algorithms, graphs, trees"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Note Details</DialogTitle>
          </DialogHeader>

          {selectedNote && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold mb-1">Title</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedNote.title}
                </p>
              </div>

              {selectedNote.description && (
                <div>
                  <h3 className="font-semibold mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-1">Course</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.course}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Course Code</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.courseCode}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-1">Faculty</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.faculty}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Program</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.program}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-1">Year of Study</h3>
                  <p className="text-sm text-muted-foreground">
                    Year {selectedNote.yearOfStudy}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">File Type</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.fileType.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <h3 className="font-semibold mb-1">File Name</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedNote.originalName || "No file"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">File Size</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedNote.fileSize)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Downloads</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.downloads}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-1">Views</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedNote.views}
                  </p>
                </div>
              </div>

              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-1">Uploaded</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedNote.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Last Updated</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedNote.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedNote?.filename && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handlePreview(selectedNote)}
                >
                  <Eye className="mr-2 size-4" />
                  Preview File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedNote)}
                >
                  <Download className="mr-2 size-4" />
                  Download File
                </Button>
              </>
            )}
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lecture Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {selectedNote && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-semibold">Title:</span>{" "}
                {selectedNote.title}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Course:</span>{" "}
                {selectedNote.course} ({selectedNote.courseCode})
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LecturerNotesPage;
