"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus,
  Clock,
  Pin,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES as FACULTIES, FACULTY_PROGRAMS } from "@/constants/faculties";

interface Attachment {
  url: string;
  cloudinaryId?: string;
  originalName?: string;
  mimeType?: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: "general" | "faculty" | "academic" | "event" | "urgent";
  faculty?: string;
  author: { firstName: string; lastName: string; email: string };
  views: number;
  isPinned: boolean;
  expiryDate?: string;
  attachments?: Attachment[];
  createdAt: string;
}

const ANNOUNCEMENT_TYPES = [
  { value: "general", label: "General" },
  { value: "faculty", label: "Faculty" },
  { value: "academic", label: "Academic" },
  { value: "event", label: "Event" },
  { value: "urgent", label: "Urgent" },
];

const isImage = (mimeType?: string) => mimeType?.startsWith("image/");

const AttachmentIcon = ({ mimeType }: { mimeType?: string }) =>
  isImage(mimeType) ? (
    <ImageIcon className="size-4 text-blue-400 shrink-0" />
  ) : (
    <FileText className="size-4 text-blue-400 shrink-0" />
  );

const AdminAnnouncementPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<
    Announcement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "general" as "general" | "faculty" | "academic" | "event" | "urgent",
    faculty: "",
    expiryDate: "",
  });
  // Selected files for the add form
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/announcements`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      setAnnouncements(data.data || []);
      filterAnnouncements(
        data.data || [],
        searchTerm,
        typeFilter,
        facultyFilter,
      );
    } catch (error) {
      toast.error("Failed to load announcements");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterAnnouncements = (
    list: Announcement[],
    search: string,
    type: string,
    faculty: string,
  ) => {
    let filtered = list;
    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.content.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (type !== "all") filtered = filtered.filter((a) => a.type === type);
    if (faculty !== "all")
      filtered = filtered.filter((a) => a.faculty === faculty);
    setFilteredAnnouncements(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterAnnouncements(announcements, value, typeFilter, facultyFilter);
  };

  const validateFormData = () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required");
      return false;
    }
    if (!formData.type) {
      toast.error("Announcement type is required");
      return false;
    }
    if (formData.type === "faculty" && !formData.faculty) {
      toast.error("Faculty is required for faculty-type announcements");
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
    // Reset input so the same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAnnouncement = async () => {
    if (!validateFormData()) return;

    try {
      setActionLoading(true);

      // Use FormData so files are sent as multipart/form-data
      const form = new FormData();
      form.append("title", formData.title.trim());
      form.append("content", formData.content.trim());
      form.append("type", formData.type);
      if (formData.type === "faculty") form.append("faculty", formData.faculty);
      if (formData.expiryDate) form.append("expiryDate", formData.expiryDate);
      selectedFiles.forEach((file) => form.append("files", file));

      const response = await fetch(`${apiUrl}/announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          // Do NOT set Content-Type — browser sets it with the boundary automatically
        },
        body: form,
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create announcement");

      setAnnouncements([data.data, ...announcements]);
      filterAnnouncements(
        [data.data, ...announcements],
        searchTerm,
        typeFilter,
        facultyFilter,
      );
      setAddDialogOpen(false);
      resetFormData();
      toast.success("Announcement created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create announcement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!selectedAnnouncement) return;
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required");
      return;
    }

    try {
      setActionLoading(true);
      const payload: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
      };
      if (formData.expiryDate) payload.expiryDate = formData.expiryDate;

      const response = await fetch(
        `${apiUrl}/announcements/${selectedAnnouncement._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to update announcement");

      const updated = announcements.map((a) =>
        a._id === selectedAnnouncement._id ? data.data : a,
      );
      setAnnouncements(updated);
      filterAnnouncements(updated, searchTerm, typeFilter, facultyFilter);
      setEditDialogOpen(false);
      setSelectedAnnouncement(null);
      toast.success("Announcement updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update announcement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const response = await fetch(
        `${apiUrl}/announcements/${announcement._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ isPinned: !announcement.isPinned }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to update announcement");
      const updated = announcements.map((a) =>
        a._id === announcement._id ? { ...a, isPinned: !a.isPinned } : a,
      );
      setAnnouncements(updated);
      filterAnnouncements(updated, searchTerm, typeFilter, facultyFilter);
      toast.success(
        `Announcement ${!announcement.isPinned ? "pinned" : "unpinned"}`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update announcement");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAnnouncement) return;
    try {
      setActionLoading(true);
      const response = await fetch(
        `${apiUrl}/announcements/${selectedAnnouncement._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to delete announcement");
      const updated = announcements.filter(
        (a) => a._id !== selectedAnnouncement._id,
      );
      setAnnouncements(updated);
      filterAnnouncements(updated, searchTerm, typeFilter, facultyFilter);
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      toast.success("Announcement deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete announcement");
    } finally {
      setActionLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title: "",
      content: "",
      type: "general",
      faculty: "",
      expiryDate: "",
    });
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTypeChange = (value: string) => {
    setFormData({
      ...formData,
      type: value as any,
      faculty: value === "faculty" ? formData.faculty : "",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500/20 text-red-400";
      case "event":
        return "bg-green-500/20 text-green-400";
      case "academic":
        return "bg-yellow-500/20 text-yellow-400";
      case "faculty":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Announcements
        </h1>
        <Button
          onClick={() => {
            resetFormData();
            setAddDialogOpen(true);
          }}
          className="bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Announcement
        </Button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={handleSearch}
            className="border-gray-700 bg-gray-800"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              filterAnnouncements(
                announcements,
                searchTerm,
                value,
                facultyFilter,
              );
            }}
          >
            <SelectTrigger className="border-gray-700 bg-gray-800">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ANNOUNCEMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeFilter === "faculty" && (
            <Select
              value={facultyFilter}
              onValueChange={(value) => {
                setFacultyFilter(value);
                filterAnnouncements(
                  announcements,
                  searchTerm,
                  typeFilter,
                  value,
                );
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
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            Loading announcements...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No announcements found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement._id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {announcement.title}
                    </h3>
                    {announcement.isPinned && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(announcement.type)}`}
                    >
                      {announcement.type}
                    </span>
                    {announcement.attachments &&
                      announcement.attachments.length > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-gray-600/40 px-2 py-1 text-xs font-medium text-gray-300">
                          <Paperclip className="h-3 w-3" />
                          {announcement.attachments.length} file
                          {announcement.attachments.length !== 1 ? "s" : ""}
                        </span>
                      )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {announcement.content.length > 100
                      ? `${announcement.content.substring(0, 100)}...`
                      : announcement.content}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      By {announcement.author.firstName}{" "}
                      {announcement.author.lastName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {announcement.views} views
                    </span>
                    {announcement.faculty && (
                      <span>Faculty: {announcement.faculty}</span>
                    )}
                    {announcement.expiryDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires:{" "}
                        {new Date(announcement.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePin(announcement)}
                    title={announcement.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin
                      className={`h-4 w-4 ${announcement.isPinned ? "text-red-400" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      setFormData({
                        title: announcement.title,
                        content: announcement.content,
                        type: announcement.type,
                        faculty: announcement.faculty || "",
                        expiryDate: announcement.expiryDate
                          ? new Date(announcement.expiryDate)
                              .toISOString()
                              .slice(0, 16)
                          : "",
                      });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Content</p>
                <p className="whitespace-pre-wrap text-gray-300">
                  {selectedAnnouncement.content}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white capitalize">
                    {selectedAnnouncement.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Views</p>
                  <p className="text-white">{selectedAnnouncement.views}</p>
                </div>
              </div>
              {selectedAnnouncement.faculty && (
                <div>
                  <p className="text-sm text-gray-400">Faculty</p>
                  <p className="text-white">{selectedAnnouncement.faculty}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Author</p>
                <p className="text-white">
                  {selectedAnnouncement.author.firstName}{" "}
                  {selectedAnnouncement.author.lastName}
                </p>
              </div>
              {selectedAnnouncement.expiryDate && (
                <div>
                  <p className="text-sm text-gray-400">Expires On</p>
                  <p className="text-white">
                    {new Date(selectedAnnouncement.expiryDate).toLocaleString()}
                  </p>
                </div>
              )}
              {/* Attachments */}
              {selectedAnnouncement.attachments &&
                selectedAnnouncement.attachments.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Attachments</p>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gray-800 rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2">
                            <AttachmentIcon mimeType={att.mimeType} />
                            <span className="text-sm text-gray-300">
                              {att.originalName || `Attachment ${idx + 1}`}
                            </span>
                          </div>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Download className="size-3 mr-1" /> Open
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">Add Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title *"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Content *"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="min-h-32 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500"
            />
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Type *" />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.type === "faculty" && (
              <Select
                value={formData.faculty}
                onValueChange={(value) =>
                  setFormData({ ...formData, faculty: value })
                }
              >
                <SelectTrigger className="border-gray-700 bg-gray-800">
                  <SelectValue placeholder="Select Faculty *" />
                </SelectTrigger>
                <SelectContent>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div>
              <label className="text-sm text-gray-400">
                Expiry Date (optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="border-gray-700 bg-gray-800 mt-1"
              />
            </div>

            {/* File attachment section */}
            <div>
              <label className="text-sm text-gray-400">
                Attachments — images or PDFs (optional, max 5)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:border-gray-400 transition-colors">
                  <Paperclip className="h-4 w-4" />
                  Choose files
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-500">
                  {selectedFiles.length}/5 selected
                </span>
              </div>
              {/* Selected file list */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded bg-gray-800 px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                        )}
                        <span className="text-xs text-gray-300 truncate max-w-50">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetFormData();
              }}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAnnouncement}
              disabled={actionLoading}
              className="bg-linear-to-r from-blue-500 to-purple-600"
            >
              {actionLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title *"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Content *"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="min-h-32 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500"
            />
            <div>
              <label className="text-sm text-gray-400">
                Expiry Date (optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="border-gray-700 bg-gray-800 mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              Note: Type, faculty, and attachments cannot be changed after
              creation
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedAnnouncement(null);
              }}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAnnouncement}
              disabled={actionLoading}
              className="bg-linear-to-r from-blue-500 to-purple-600"
            >
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete Announcement?
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to delete "{selectedAnnouncement?.title}"?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedAnnouncement(null);
              }}
              className="border-gray-700"
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
    </div>
  );
};

export default AdminAnnouncementPage;
