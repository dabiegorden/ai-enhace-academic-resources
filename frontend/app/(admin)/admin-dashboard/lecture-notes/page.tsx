"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit, Trash2, BookOpen, Download } from "lucide-react";
import { toast } from "sonner";

interface LectureNote {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  views: number;
  downloads: number;
  tags: string[];
  uploadedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

const FACULTIES = [
  "Engineering",
  "Business",
  "Arts",
  "Science",
  "Health Sciences",
  "Law",
  "Education",
];

const AdminLectureNotesPage = () => {
  const [lectureNotes, setLectureNotes] = useState<LectureNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Selected lecture note
  const [selectedNote, setSelectedNote] = useState<LectureNote | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "",
    courseCode: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
    tags: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    fetchLectureNotes();
  }, []);

  const fetchLectureNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch lecture notes");
      }

      const data = await response.json();
      const notesList = data.data || [];
      setLectureNotes(notesList);
      filterNotes(notesList, searchTerm, facultyFilter);
    } catch (error) {
      toast.error("Failed to load lecture notes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = (
    notesList: LectureNote[],
    search: string,
    faculty: string
  ) => {
    let filtered = notesList;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchLower) ||
          note.course.toLowerCase().includes(searchLower) ||
          note.courseCode.toLowerCase().includes(searchLower)
      );
    }

    if (faculty !== "all") {
      filtered = filtered.filter((note) => note.faculty === faculty);
    }

    setFilteredNotes(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterNotes(lectureNotes, value, facultyFilter);
  };

  const handleFacultyFilterChange = (value: string) => {
    setFacultyFilter(value);
    filterNotes(lectureNotes, searchTerm, value);
  };

  const handleViewNote = (note: LectureNote) => {
    setSelectedNote(note);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (note: LectureNote) => {
    setSelectedNote(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
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
        throw new Error("Failed to delete lecture note");
      }

      const updatedNotes = lectureNotes.filter(
        (n) => n._id !== selectedNote._id
      );
      setLectureNotes(updatedNotes);
      filterNotes(updatedNotes, searchTerm, facultyFilter);
      toast.success("Lecture note deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedNote(null);
    } catch (error) {
      toast.error("Failed to delete lecture note");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditDialog = (note: LectureNote) => {
    setFormData({
      title: note.title,
      description: note.description,
      course: note.course,
      courseCode: note.courseCode,
      faculty: note.faculty,
      program: note.program,
      yearOfStudy: note.yearOfStudy.toString(),
      tags: note.tags.join(", "),
    });
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveNote = async () => {
    if (!formData.title || !formData.course || !formData.faculty) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        course: formData.course,
        courseCode: formData.courseCode,
        faculty: formData.faculty,
        program: formData.program,
        yearOfStudy: Number.parseInt(formData.yearOfStudy),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      const response = await fetch(`${apiUrl}/notes/${selectedNote?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update lecture note");
      }

      await fetchLectureNotes();
      toast.success("Lecture note updated successfully");
      setEditDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update lecture note");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (note: LectureNote) => {
    try {
      const response = await fetch(`${apiUrl}/notes/${note._id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const data = await response.json();
      window.open(data.data.fileUrl, "_blank");
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-purple-600 to-pink-600 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Lecture Notes Management
              </h1>
              <p className="text-gray-400 text-sm">
                Total Notes: {filteredNotes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search notes by title, course, or code..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
          <Select
            value={facultyFilter}
            onValueChange={handleFacultyFilterChange}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by faculty" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Faculties</SelectItem>
              {FACULTIES.map((faculty) => (
                <SelectItem key={faculty} value={faculty}>
                  {faculty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lecture Notes Table */}
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    File Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading lecture notes...
                    </td>
                  </tr>
                ) : filteredNotes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No lecture notes found
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => (
                    <tr
                      key={note._id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                        {note.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {note.course}
                        <span className="text-gray-500">
                          {" "}
                          ({note.courseCode})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {note.faculty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatFileSize(note.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {note.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {note.downloads}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewNote(note)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(note)}
                          className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(note)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(note)}
                          className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Lecture Note Details</DialogTitle>
            </DialogHeader>
            {selectedNote && (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Title</p>
                  <p className="text-white font-medium">{selectedNote.title}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Description</p>
                  <p className="text-white font-medium">
                    {selectedNote.description || "N/A"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Course</p>
                    <p className="text-white font-medium">
                      {selectedNote.course}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Code</p>
                    <p className="text-white font-medium">
                      {selectedNote.courseCode}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Faculty</p>
                    <p className="text-white font-medium">
                      {selectedNote.faculty}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Program</p>
                    <p className="text-white font-medium">
                      {selectedNote.program}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">File Size</p>
                    <p className="text-white font-medium">
                      {formatFileSize(selectedNote.fileSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">File Type</p>
                    <p className="text-white font-medium">
                      {selectedNote.fileType.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Views</p>
                    <p className="text-white font-medium">
                      {selectedNote.views}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Downloads</p>
                    <p className="text-white font-medium">
                      {selectedNote.downloads}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Uploaded By</p>
                  <p className="text-white font-medium">
                    {selectedNote.uploadedBy.firstName}{" "}
                    {selectedNote.uploadedBy.lastName}
                  </p>
                </div>
                {selectedNote.tags.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm">Tags</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-600/30 border border-blue-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setViewDialogOpen(false)}
                className="hover:bg-gray-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Lecture Note</DialogTitle>
            </DialogHeader>
            <p className="text-gray-400">
              Are you sure you want to delete "{selectedNote?.title}"? This
              action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditDialogOpen(false);
            }
          }}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Lecture Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="Note title"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  placeholder="Note description"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Course *
                </label>
                <Input
                  value={formData.course}
                  onChange={(e) => handleFormChange("course", e.target.value)}
                  placeholder="Course name"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Course Code *
                </label>
                <Input
                  value={formData.courseCode}
                  onChange={(e) =>
                    handleFormChange("courseCode", e.target.value)
                  }
                  placeholder="e.g., CS101"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Faculty *
                </label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) => handleFormChange("faculty", value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {FACULTIES.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Program
                </label>
                <Input
                  value={formData.program}
                  onChange={(e) => handleFormChange("program", e.target.value)}
                  placeholder="Program"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Year of Study *
                </label>
                <Select
                  value={formData.yearOfStudy}
                  onValueChange={(value) =>
                    handleFormChange("yearOfStudy", value)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                    <SelectItem value="5">Year 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Tags
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) => handleFormChange("tags", e.target.value)}
                  placeholder="Separate tags with commas"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminLectureNotesPage;
