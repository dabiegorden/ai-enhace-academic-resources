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
import {
  Eye,
  Edit,
  Trash2,
  FileText,
  Plus,
  Upload,
  X,
  Download,
  File,
} from "lucide-react";
import { toast } from "sonner";

interface Attachment {
  url: string;
  cloudinaryId: string;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  dueDate: string;
  totalMarks: number;
  isActive: boolean;
  attachments?: Attachment[];
  lecturer: {
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
const PROGRAMS: Record<string, string[]> = {
  Engineering: ["Civil", "Electrical", "Mechanical"],
  Business: ["Accounting", "Finance", "Management"],
  Arts: ["English", "History", "Philosophy"],
  Science: ["Physics", "Chemistry", "Biology"],
  "Health Sciences": ["Medicine", "Nursing", "Pharmacy"],
  Law: ["Constitutional", "Criminal", "Commercial"],
  Education: ["Primary", "Secondary", "Higher"],
};

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const AdminAssignmentsPage = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filePreviewDialog, setFilePreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Selected assignment
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "",
    courseCode: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
    dueDate: "",
    totalMarks: "100",
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch assignments");

      const data = await response.json();
      setAssignments(data.data || []);
      setFilteredAssignments(data.data || []);
    } catch (error) {
      toast.error("Failed to load assignments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterAssignments(term, facultyFilter);
  };

  const handleFacultyFilterChange = (value: string) => {
    setFacultyFilter(value);
    filterAssignments(searchTerm, value);
  };

  const filterAssignments = (term: string, faculty: string) => {
    let filtered = assignments;

    if (term) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          a.course.toLowerCase().includes(term) ||
          a.courseCode.toLowerCase().includes(term)
      );
    }

    if (faculty !== "all") {
      filtered = filtered.filter((a) => a.faculty === faculty);
    }

    setFilteredAssignments(filtered);
  };

  const handleOpenAddDialog = () => {
    setFormData({
      title: "",
      description: "",
      course: "",
      courseCode: "",
      faculty: "",
      program: "",
      yearOfStudy: "",
      dueDate: "",
      totalMarks: "100",
    });
    setSelectedFiles([]);
    setSelectedAssignment(null);
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      course: assignment.course,
      courseCode: assignment.courseCode,
      faculty: assignment.faculty,
      program: assignment.program,
      yearOfStudy: String(assignment.yearOfStudy),
      dueDate: assignment.dueDate.split("T")[0],
      totalMarks: String(assignment.totalMarks),
    });
    setSelectedFiles([]);
    setEditDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) =>
      ALLOWED_FILE_TYPES.includes(file.type)
    );

    if (validFiles.length < files.length) {
      toast.error(
        "Some files were skipped - only PDF, Word, PowerPoint, and images are allowed"
      );
    }

    if (validFiles.length + selectedFiles.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) return "PDF";
    if (["doc", "docx"].includes(ext || "")) return "DOC";
    if (["ppt", "pptx"].includes(ext || "")) return "PPT";
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "IMG";
    return "FILE";
  };

  const handlePreviewFile = (url: string, fileName: string) => {
    setPreviewFile({ name: fileName, url });
    setFilePreviewDialog(true);
  };

  const handleSaveAssignment = async () => {
    if (
      !formData.title ||
      !formData.course ||
      !formData.faculty ||
      !formData.dueDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setActionLoading(true);

      if (selectedAssignment) {
        // For update, only send updateable fields (no files)
        const updateData = {
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          totalMarks: formData.totalMarks,
        };

        const response = await fetch(
          `${apiUrl}/assignments/${selectedAssignment._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update assignment");
        }

        toast.success("Assignment updated successfully");
        await fetchAssignments();
        setEditDialogOpen(false);
      } else {
        // For create, send FormData with files
        const submitFormData = new FormData();
        submitFormData.append("title", formData.title);
        submitFormData.append("description", formData.description);
        submitFormData.append("course", formData.course);
        submitFormData.append("courseCode", formData.courseCode);
        submitFormData.append("faculty", formData.faculty);
        submitFormData.append("program", formData.program);
        submitFormData.append("yearOfStudy", formData.yearOfStudy);
        submitFormData.append("dueDate", formData.dueDate);
        submitFormData.append("totalMarks", formData.totalMarks);

        selectedFiles.forEach((file) => {
          submitFormData.append("files", file);
        });

        const response = await fetch(`${apiUrl}/assignments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: submitFormData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create assignment");
        }

        toast.success("Assignment created successfully");
        await fetchAssignments();
        setAddDialogOpen(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save assignment"
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete assignment");

      toast.success("Assignment deleted successfully");
      await fetchAssignments();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete assignment");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-500/20 text-green-400 border border-green-500/30"
      : "bg-red-500/20 text-red-400 border border-red-500/30";
  };

  const getDueDateBadgeColor = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 3600 * 24)
    );

    if (daysLeft < 0) return "bg-red-600";
    if (daysLeft < 3) return "bg-orange-600";
    return "bg-green-600";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Assignments Management
              </h1>
              <p className="text-gray-400 text-sm">
                Total Assignments: {filteredAssignments.length}
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Assignment
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search assignments by title, course, or code..."
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

        {/* Assignments Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-400">Loading assignments...</div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No assignments found</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Course
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Faculty
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr
                    key={assignment._id}
                    className="border-b border-gray-700 hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 text-sm text-white">
                      {assignment.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {assignment.course}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {assignment.faculty}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getDueDateBadgeColor(
                          assignment.dueDate
                        )} text-white`}
                      >
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          assignment.isActive
                        )}`}
                      >
                        {assignment.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setViewDialogOpen(true);
                          }}
                          className="text-blue-400 hover:bg-blue-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(assignment)}
                          className="text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                Assignment Details
              </DialogTitle>
            </DialogHeader>
            {selectedAssignment && (
              <div className="space-y-4 text-gray-300">
                <div>
                  <p className="text-sm font-semibold text-gray-400">Title</p>
                  <p className="text-white">{selectedAssignment.title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-400">
                    Description
                  </p>
                  <p className="text-white">{selectedAssignment.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Course
                    </p>
                    <p className="text-white">{selectedAssignment.course}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Course Code
                    </p>
                    <p className="text-white">
                      {selectedAssignment.courseCode}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Faculty
                    </p>
                    <p className="text-white">{selectedAssignment.faculty}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Program
                    </p>
                    <p className="text-white">{selectedAssignment.program}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Due Date
                    </p>
                    <p className="text-white">
                      {new Date(
                        selectedAssignment.dueDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      Total Marks
                    </p>
                    <p className="text-white">
                      {selectedAssignment.totalMarks}
                    </p>
                  </div>
                </div>
                {selectedAssignment.attachments &&
                  selectedAssignment.attachments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-400 mb-2">
                        Attachments
                      </p>
                      <div className="space-y-2">
                        {selectedAssignment.attachments.map(
                          (attachment, idx) => {
                            const fileName =
                              attachment.url.split("/").pop() || "Document";
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-gray-700 p-3 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <File className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm text-white">
                                    {fileName}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handlePreviewFile(
                                        attachment.url,
                                        fileName
                                      )
                                    }
                                    className="text-blue-400 hover:bg-blue-500/10"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <a
                                    href={attachment.url}
                                    download
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Add Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                  placeholder="Assignment title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 p-2 rounded mt-1"
                  placeholder="Assignment description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Course *
                  </label>
                  <Input
                    value={formData.course}
                    onChange={(e) =>
                      setFormData({ ...formData, course: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                    placeholder="Course name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Course Code
                  </label>
                  <Input
                    value={formData.courseCode}
                    onChange={(e) =>
                      setFormData({ ...formData, courseCode: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                    placeholder="CS101"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Faculty *
                </label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, faculty: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {FACULTIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Program
                </label>
                <Select
                  value={formData.program}
                  onValueChange={(value) =>
                    setFormData({ ...formData, program: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {formData.faculty &&
                      PROGRAMS[formData.faculty]?.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Year of Study
                </label>
                <Select
                  value={formData.yearOfStudy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, yearOfStudy: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {[1, 2, 3, 4].map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Due Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Total Marks
                  </label>
                  <Input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMarks: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Attachment Files
                </label>
                <div className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      Click to select files (max 5)
                    </span>
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-700 p-2 rounded"
                      >
                        <span className="text-sm text-gray-300">
                          {file.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignment}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                  placeholder="Assignment title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 p-2 rounded mt-1"
                  placeholder="Assignment description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Due Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Total Marks
                  </label>
                  <Input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMarks: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 mt-1"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignment}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Delete Assignment
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-300">
              Are you sure you want to delete this assignment? This action
              cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAssignment}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Preview Dialog */}
        <Dialog open={filePreviewDialog} onOpenChange={setFilePreviewDialog}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {previewFile?.name}
              </DialogTitle>
            </DialogHeader>
            {previewFile && (
              <div className="w-full">
                {previewFile.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <img
                    src={previewFile.url || "/placeholder.svg"}
                    alt={previewFile.name}
                    className="w-full h-auto rounded"
                  />
                ) : previewFile.name.match(/\.pdf$/i) ? (
                  <iframe
                    src={`${previewFile.url}#toolbar=0`}
                    className="w-full h-150 rounded"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="bg-gray-700 p-8 rounded text-center">
                    <File className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">{previewFile.name}</p>
                    <a
                      href={previewFile.url}
                      download
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAssignmentsPage;
