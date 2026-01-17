"use client";

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
import { Eye, Edit, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface ChatRoom {
  _id: string;
  name: string;
  description: string;
  type: "general" | "course" | "faculty" | "program";
  course?: string;
  faculty?: string;
  program?: string;
  createdBy: { firstName: string; lastName: string; email: string };
  members: string[];
  lastActivity: string;
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

const AdminChatRoomPage = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "general" as "general" | "course" | "faculty" | "program",
    course: "",
    faculty: "",
    program: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/chat/rooms`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch chat rooms");

      const data = await response.json();
      setChatRooms(data.data || []);
      filterRooms(data.data || [], searchTerm, typeFilter);
    } catch (error) {
      toast.error("Failed to load chat rooms");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterRooms = (list: ChatRoom[], search: string, type: string) => {
    let filtered = list;

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (type !== "all") filtered = filtered.filter((r) => r.type === type);

    setFilteredRooms(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterRooms(chatRooms, value, typeFilter);
  };

  const validateFormData = () => {
    if (!formData.name.trim()) {
      toast.error("Room name is required");
      return false;
    }

    if (!formData.type) {
      toast.error("Room type is required");
      return false;
    }

    if (formData.type === "course" && !formData.course.trim()) {
      toast.error("Course name is required for course-type rooms");
      return false;
    }

    if (
      (formData.type === "faculty" || formData.type === "program") &&
      !formData.faculty
    ) {
      toast.error("Faculty is required for faculty and program-type rooms");
      return false;
    }

    if (formData.type === "program" && !formData.program.trim()) {
      toast.error("Program name is required for program-type rooms");
      return false;
    }

    return true;
  };

  const handleAddChatRoom = async () => {
    if (!validateFormData()) return;

    try {
      setActionLoading(true);

      // Build payload based on room type
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
      };

      // Only add type-specific fields if they're required and have values
      if (formData.type === "course") {
        payload.course = formData.course.trim();
      } else if (formData.type === "faculty") {
        payload.faculty = formData.faculty;
      } else if (formData.type === "program") {
        payload.faculty = formData.faculty;
        payload.program = formData.program.trim();
      }
      // For "general" type, no additional fields needed

      const response = await fetch(`${apiUrl}/chat/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create chat room");
      }

      setChatRooms([data.data, ...chatRooms]);
      filterRooms([data.data, ...chatRooms], searchTerm, typeFilter);
      setAddDialogOpen(false);
      resetFormData();
      toast.success("Chat room created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create chat room");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveChatRoom = async () => {
    if (!selectedRoom) return;

    if (!formData.name.trim()) {
      toast.error("Room name is required");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/chat/rooms/${selectedRoom._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update chat room");
      }

      const updated = chatRooms.map((r) =>
        r._id === selectedRoom._id ? data.data : r
      );
      setChatRooms(updated);
      filterRooms(updated, searchTerm, typeFilter);
      setEditDialogOpen(false);
      setSelectedRoom(null);
      toast.success("Chat room updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update chat room");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRoom) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/chat/rooms/${selectedRoom._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete chat room");
      }

      const updated = chatRooms.filter((r) => r._id !== selectedRoom._id);
      setChatRooms(updated);
      filterRooms(updated, searchTerm, typeFilter);
      setDeleteDialogOpen(false);
      setSelectedRoom(null);
      toast.success("Chat room deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete chat room");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      type: "general",
      course: "",
      faculty: "",
      program: "",
    });
  };

  const handleTypeChange = (value: string) => {
    setFormData({
      ...formData,
      type: value as any,
      course: "",
      faculty: "",
      program: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Chat Rooms
        </h1>
        <Button
          onClick={() => {
            resetFormData();
            setAddDialogOpen(true);
          }}
          className="bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Chat Room
        </Button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Search chat rooms..."
            value={searchTerm}
            onChange={handleSearch}
            className="border-gray-700 bg-gray-800"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              filterRooms(chatRooms, searchTerm, value);
            }}
          >
            <SelectTrigger className="border-gray-700 bg-gray-800">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="program">Program</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            Loading chat rooms...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No chat rooms found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <div
                key={room._id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{room.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        room.type === "general"
                          ? "bg-blue-500/20 text-blue-400"
                          : room.type === "course"
                          ? "bg-green-500/20 text-green-400"
                          : room.type === "faculty"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-pink-500/20 text-pink-400"
                      }`}
                    >
                      {room.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {room.description || "No description"}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {room.members?.length || 0}{" "}
                      members
                    </span>
                    <span>Created by {room.createdBy.firstName}</span>
                    {room.type === "course" && room.course && (
                      <span>Course: {room.course}</span>
                    )}
                    {room.faculty && <span>Faculty: {room.faculty}</span>}
                    {room.program && <span>Program: {room.program}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRoom(room);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRoom(room);
                      setFormData({
                        name: room.name,
                        description: room.description || "",
                        type: room.type,
                        course: room.course || "",
                        faculty: room.faculty || "",
                        program: room.program || "",
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
                      setSelectedRoom(room);
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
        <DialogContent className="border-gray-700 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedRoom?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-gray-300">
                  {selectedRoom.description || "No description"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="text-white capitalize">{selectedRoom.type}</p>
              </div>
              {selectedRoom.type === "course" && selectedRoom.course && (
                <div>
                  <p className="text-sm text-gray-400">Course</p>
                  <p className="text-white">{selectedRoom.course}</p>
                </div>
              )}
              {selectedRoom.faculty && (
                <div>
                  <p className="text-sm text-gray-400">Faculty</p>
                  <p className="text-white">{selectedRoom.faculty}</p>
                </div>
              )}
              {selectedRoom.program && (
                <div>
                  <p className="text-sm text-gray-400">Program</p>
                  <p className="text-white">{selectedRoom.program}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Created By</p>
                <p className="text-white">
                  {selectedRoom.createdBy.firstName}{" "}
                  {selectedRoom.createdBy.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-white">
                  {selectedRoom.members?.length || 0}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">Add Chat Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Room Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-20 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Room Type *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="program">Program</SelectItem>
              </SelectContent>
            </Select>
            {formData.type === "course" && (
              <Input
                placeholder="Course Name *"
                value={formData.course}
                onChange={(e) =>
                  setFormData({ ...formData, course: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            )}
            {(formData.type === "faculty" || formData.type === "program") && (
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
            {formData.type === "program" && (
              <Input
                placeholder="Program Name *"
                value={formData.program}
                onChange={(e) =>
                  setFormData({ ...formData, program: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            )}
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
              onClick={handleAddChatRoom}
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
            <DialogTitle className="text-white">Edit Chat Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Room Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-20 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500">
              Note: Room type and type-specific fields cannot be changed after
              creation
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedRoom(null);
              }}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChatRoom}
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
              Delete Chat Room?
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to delete "{selectedRoom?.name}"? This action
            cannot be undone and will delete all messages in this room.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedRoom(null);
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

export default AdminChatRoomPage;
