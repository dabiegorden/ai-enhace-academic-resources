"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus,
  Upload,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface TimetableDocument {
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
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
  isActive: boolean;
  isPublished: boolean;
  timeSlots?: any[];
  timetableDocument?: TimetableDocument;
  createdBy?: { firstName: string; lastName: string };
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
const LEVELS = ["100", "200", "300", "400"];
const SEMESTERS = ["1", "2"];

const AdminTimetablePage = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [filteredTimetables, setFilteredTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(
    null
  );
  const [formData, setFormData] = useState({
    programCode: "",
    programName: "",
    yearOfStudy: "",
    level: "",
    faculty: "",
    semester: "",
    academicYear: "",
    isActive: true,
    isPublished: false,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = () => localStorage.getItem("token") || "";

  const parseErrorResponse = async (response: Response) => {
    try {
      const error = await response.json();
      return error.message || `Error: ${response.status}`;
    } catch {
      return `Error: ${response.status} ${response.statusText}`;
    }
  };

  const handlePreviewDocument = async (timetableId: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/timetables/${timetableId}/download-document`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to preview document"
      );
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/timetables`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.status === 401) {
        toast.error("Unauthorized. Please login again.");
        return;
      }

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const data = await response.json();
      setTimetables(data.data || []);
      filterTimetables(data.data || [], searchTerm, facultyFilter);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load timetables"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterTimetables = (
    list: Timetable[],
    search: string,
    faculty: string
  ) => {
    let filtered = list;

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.programCode.toLowerCase().includes(search.toLowerCase()) ||
          t.programName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (faculty !== "all")
      filtered = filtered.filter((t) => t.faculty === faculty);

    setFilteredTimetables(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterTimetables(timetables, value, facultyFilter);
  };

  const handleAddTimetable = async () => {
    if (
      !formData.programCode ||
      !formData.programName ||
      !formData.yearOfStudy ||
      !formData.level ||
      !formData.faculty ||
      !formData.semester
    ) {
      toast.error("Please fill in all required fields (marked with *)");
      return;
    }

    try {
      setActionLoading(true);

      const timeSlots = Array.from({ length: 7 }, (_, i) => ({
        slotNumber: i + 1,
        startTime: `${8 + i}:00`,
        endTime: `${9 + i}:00`,
        monday: { courseCode: "" },
        tuesday: { courseCode: "" },
        wednesday: { courseCode: "" },
        thursday: { courseCode: "" },
        friday: { courseCode: "" },
      }));

      const response = await fetch(`${apiUrl}/timetables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          yearOfStudy: Number(formData.yearOfStudy),
          timeSlots,
        }),
      });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const data = await response.json();
      setTimetables([...timetables, data.data]);
      filterTimetables([...timetables, data.data], searchTerm, facultyFilter);
      setAddDialogOpen(false);
      setFormData({
        programCode: "",
        programName: "",
        yearOfStudy: "",
        level: "",
        faculty: "",
        semester: "",
        academicYear: "",
        isActive: true,
        isPublished: false,
      });
      toast.success("Timetable created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create timetable"
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedTimetable) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${apiUrl}/timetables/${selectedTimetable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            programName: formData.programName,
            semester: formData.semester,
            academicYear: formData.academicYear,
            isActive: formData.isActive,
            isPublished: formData.isPublished,
          }),
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const data = await response.json();
      const updated = timetables.map((t) =>
        t._id === selectedTimetable._id ? data.data : t
      );
      setTimetables(updated);
      filterTimetables(updated, searchTerm, facultyFilter);
      setEditDialogOpen(false);
      setSelectedTimetable(null);
      toast.success("Timetable updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update timetable"
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTimetable) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${apiUrl}/timetables/${selectedTimetable._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const updated = timetables.filter((t) => t._id !== selectedTimetable._id);
      setTimetables(updated);
      filterTimetables(updated, searchTerm, facultyFilter);
      setDeleteDialogOpen(false);
      setSelectedTimetable(null);
      toast.success("Timetable deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete timetable"
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedTimetable || !selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploadingDocument(true);
      const formDataObj = new FormData();
      formDataObj.append("timetableDocument", selectedFile);

      const response = await fetch(
        `${apiUrl}/timetables/${selectedTimetable._id}/upload-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formDataObj,
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const data = await response.json();
      const updated = timetables.map((t) =>
        t._id === selectedTimetable._id ? data.data : t
      );
      setTimetables(updated);
      setSelectedTimetable(data.data);
      filterTimetables(updated, searchTerm, facultyFilter);
      setDocumentDialogOpen(false);
      setSelectedFile(null);
      toast.success("Document uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      console.error(error);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = async (timetableId: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/timetables/${timetableId}/download-document`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("content-disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "timetable";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Document downloaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download document"
      );
      console.error(error);
    }
  };

  const handleDeleteDocument = async (timetableId: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/timetables/${timetableId}/delete-document`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw new Error(error);
      }

      const data = await response.json();
      const updated = timetables.map((t) =>
        t._id === timetableId ? data.data : t
      );
      setTimetables(updated);
      if (selectedTimetable?._id === timetableId) {
        setSelectedTimetable(data.data);
      }
      filterTimetables(updated, searchTerm, facultyFilter);
      toast.success("Document deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete document"
      );
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Timetables
        </h1>
        <Button
          onClick={() => {
            setFormData({
              programCode: "",
              programName: "",
              yearOfStudy: "",
              level: "",
              faculty: "",
              semester: "",
              academicYear: "",
              isActive: true,
              isPublished: false,
            });
            setAddDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Timetable
        </Button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Search timetables..."
            value={searchTerm}
            onChange={handleSearch}
            className="border-gray-700 bg-gray-800"
          />
          <Select
            value={facultyFilter}
            onValueChange={(value) => {
              setFacultyFilter(value);
              filterTimetables(timetables, searchTerm, value);
            }}
          >
            <SelectTrigger className="border-gray-700 bg-gray-800">
              <SelectValue placeholder="Filter by faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculties</SelectItem>
              {FACULTIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            Loading timetables...
          </div>
        ) : filteredTimetables.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No timetables found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimetables.map((timetable) => (
              <div
                key={timetable._id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {timetable.programCode} - {timetable.programName}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          timetable.isPublished
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {timetable.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {timetable.faculty} • Level {timetable.level} • Year{" "}
                      {timetable.yearOfStudy} • Semester {timetable.semester}
                    </p>
                    {timetable.timetableDocument && (
                      <div className="mt-3 flex items-center gap-3 rounded bg-gray-700/50 p-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-200">
                            {timetable.timetableDocument.originalName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(
                              timetable.timetableDocument.fileSize
                            )}{" "}
                            •{" "}
                            {formatDate(timetable.timetableDocument.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTimetable(timetable);
                        setViewDialogOpen(true);
                      }}
                      title="View timetable details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTimetable(timetable);
                        setFormData({
                          programCode: timetable.programCode,
                          programName: timetable.programName,
                          yearOfStudy: timetable.yearOfStudy.toString(),
                          level: timetable.level,
                          faculty: timetable.faculty,
                          semester: timetable.semester,
                          academicYear: timetable.academicYear,
                          isActive: timetable.isActive,
                          isPublished: timetable.isPublished,
                        });
                        setEditDialogOpen(true);
                      }}
                      title="Edit timetable"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTimetable(timetable);
                        setDocumentDialogOpen(true);
                      }}
                      className="text-cyan-400 hover:text-cyan-300"
                      title="Upload document"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    {timetable.timetableDocument && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewDocument(timetable._id)}
                          className="text-purple-400 hover:text-purple-300"
                          title="Preview document in new tab"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadDocument(timetable._id)}
                          className="text-green-400 hover:text-green-300"
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(timetable._id)}
                          className="text-orange-400 hover:text-orange-300"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTimetable(timetable);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-400 hover:text-red-300"
                      title="Delete timetable"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Timetable</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new timetable
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="programCode">Program Code *</Label>
              <Input
                id="programCode"
                value={formData.programCode}
                onChange={(e) =>
                  setFormData({ ...formData, programCode: e.target.value })
                }
                placeholder="e.g., CS101"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="programName">Program Name *</Label>
              <Input
                id="programName"
                value={formData.programName}
                onChange={(e) =>
                  setFormData({ ...formData, programName: e.target.value })
                }
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yearOfStudy">Year of Study *</Label>
              <Input
                id="yearOfStudy"
                type="number"
                value={formData.yearOfStudy}
                onChange={(e) =>
                  setFormData({ ...formData, yearOfStudy: e.target.value })
                }
                placeholder="e.g., 1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faculty">Faculty *</Label>
              <Select
                value={formData.faculty}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="semester">Semester *</Label>
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
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({ ...formData, academicYear: e.target.value })
                }
                placeholder="e.g., 2024/2025"
              />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                />
                <span>Published</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTimetable}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? "Creating..." : "Create Timetable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timetable</DialogTitle>
            <DialogDescription>
              Update the timetable information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-programName">Program Name</Label>
              <Input
                id="edit-programName"
                value={formData.programName}
                onChange={(e) =>
                  setFormData({ ...formData, programName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-semester">Semester</Label>
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
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-academicYear">Academic Year</Label>
              <Input
                id="edit-academicYear"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({ ...formData, academicYear: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                />
                <span>Published</span>
              </label>
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
            <Button
              onClick={handleSaveTimetable}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timetable</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timetable? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTimetable && (
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <p className="font-semibold">
                {selectedTimetable.programCode} -{" "}
                {selectedTimetable.programName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTimetable.faculty} • Level {selectedTimetable.level}
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
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timetable Details</DialogTitle>
          </DialogHeader>
          {selectedTimetable && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Program Code
                  </p>
                  <p className="font-semibold">
                    {selectedTimetable.programCode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Program Name
                  </p>
                  <p className="font-semibold">
                    {selectedTimetable.programName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Faculty
                  </p>
                  <p className="font-semibold">{selectedTimetable.faculty}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Level
                  </p>
                  <p className="font-semibold">{selectedTimetable.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Year of Study
                  </p>
                  <p className="font-semibold">
                    {selectedTimetable.yearOfStudy}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Semester
                  </p>
                  <p className="font-semibold">{selectedTimetable.semester}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Academic Year
                  </p>
                  <p className="font-semibold">
                    {selectedTimetable.academicYear}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status
                  </p>
                  <p className="font-semibold">
                    {selectedTimetable.isPublished ? "Published" : "Draft"}
                  </p>
                </div>
              </div>
              {selectedTimetable.timetableDocument && (
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Document
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {selectedTimetable.timetableDocument.originalName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(
                          selectedTimetable.timetableDocument.fileSize
                        )}{" "}
                        •{" "}
                        {formatDate(
                          selectedTimetable.timetableDocument.uploadedAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setViewDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Timetable Document</DialogTitle>
            <DialogDescription>
              Upload a PDF or document file for this timetable
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="document">Select File</Label>
              <input
                id="document"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                className="rounded border border-gray-300 p-2 dark:border-gray-600"
              />
            </div>
            {selectedFile && (
              <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDocumentDialogOpen(false);
                setSelectedFile(null);
              }}
              disabled={uploadingDocument}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={uploadingDocument || !selectedFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadingDocument ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTimetablePage;
