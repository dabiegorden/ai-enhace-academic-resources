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
import { Eye, Edit, Trash2, Plus, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AiChatInsightPanel from "@/components/AiChatInsightPanel";

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

const typeBadge: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400",
  course: "bg-green-500/20 text-green-400",
  faculty: "bg-purple-500/20 text-purple-400",
  program: "bg-pink-500/20 text-pink-400",
};

const AdminChatRoomPage = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [aiRoomId, setAiRoomId] = useState<string | null>(null);
  const [aiRoomName, setAiRoomName] = useState<string | undefined>();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "general" as ChatRoom["type"],
    course: "",
    faculty: "",
    program: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const tok = () => localStorage.getItem("token") || "";

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/chat/rooms`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setChatRooms(data.data || []);
      filter(data.data || [], searchTerm, typeFilter);
    } catch {
      toast.error("Failed to load chat rooms");
    } finally {
      setLoading(false);
    }
  };

  const filter = (list: ChatRoom[], s: string, t: string) => {
    let f = list;
    if (s)
      f = f.filter(
        (r) =>
          r.name.toLowerCase().includes(s.toLowerCase()) ||
          r.description?.toLowerCase().includes(s.toLowerCase()),
      );
    if (t !== "all") f = f.filter((r) => r.type === t);
    setFilteredRooms(f);
  };

  const validate = () => {
    if (!formData.name.trim()) {
      toast.error("Room name is required");
      return false;
    }
    if (formData.type === "course" && !formData.course.trim()) {
      toast.error("Course name required");
      return false;
    }
    if (["faculty", "program"].includes(formData.type) && !formData.faculty) {
      toast.error("Faculty required");
      return false;
    }
    if (formData.type === "program" && !formData.program.trim()) {
      toast.error("Program name required");
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setActionLoading(true);
    try {
      const payload: Record<string, string> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
      };
      if (formData.type === "course") payload.course = formData.course.trim();
      if (formData.type === "faculty") payload.faculty = formData.faculty;
      if (formData.type === "program") {
        payload.faculty = formData.faculty;
        payload.program = formData.program.trim();
      }

      const res = await fetch(`${apiUrl}/chat/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const updated = [data.data, ...chatRooms];
      setChatRooms(updated);
      filter(updated, searchTerm, typeFilter);
      setAddOpen(false);
      reset();
      toast.success("Chat room created");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to create");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRoom || !formData.name.trim()) {
      toast.error("Name required");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/chat/rooms/${selectedRoom._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const updated = chatRooms.map((r) =>
        r._id === selectedRoom._id ? data.data : r,
      );
      setChatRooms(updated);
      filter(updated, searchTerm, typeFilter);
      setEditOpen(false);
      setSelectedRoom(null);
      toast.success("Chat room updated");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoom) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/chat/rooms/${selectedRoom._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const updated = chatRooms.filter((r) => r._id !== selectedRoom._id);
      setChatRooms(updated);
      filter(updated, searchTerm, typeFilter);
      setDeleteOpen(false);
      setSelectedRoom(null);
      if (aiRoomId === selectedRoom._id) setAiRoomId(null);
      toast.success("Chat room deleted");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const reset = () =>
    setFormData({
      name: "",
      description: "",
      type: "general",
      course: "",
      faculty: "",
      program: "",
    });

  return (
    <div className="flex gap-6 h-full">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Chat Rooms</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage all discussion rooms
            </p>
          </div>
          <Button
            onClick={() => {
              reset();
              setAddOpen(true);
            }}
            className="bg-linear-to-r from-blue-500 to-orange-500 hover:opacity-90 text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Room
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 p-5 space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Search chat rooms…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                filter(chatRooms, e.target.value, typeFilter);
              }}
              className="border-gray-700 bg-gray-900/60 text-white placeholder-gray-500"
            />
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                filter(chatRooms, searchTerm, v);
              }}
            >
              <SelectTrigger className="w-40 border-gray-700 bg-gray-900/60 text-white">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                {["all", "general", "course", "faculty", "program"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t === "all" ? "All Types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Loading…
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No chat rooms found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-all cursor-pointer ${aiRoomId === room._id ? "border-orange-500/40 bg-gray-700/60" : "border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/70"}`}
                  onClick={() => {
                    setAiRoomId(room._id);
                    setAiRoomName(room.name);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm truncate">
                        {room.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeBadge[room.type] || typeBadge.general}`}
                      >
                        {room.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {room.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {room.members?.length ?? 0}
                      </span>
                      <span>By {room.createdBy.firstName}</span>
                      {room.type === "course" && room.course && (
                        <span>{room.course}</span>
                      )}
                      {room.faculty && <span>{room.faculty}</span>}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 ml-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setAiRoomId(room._id);
                        setAiRoomName(room.name);
                      }}
                      title="AI Analysis"
                      className={`p-1.5 rounded-lg transition-colors ${aiRoomId === room._id ? "bg-orange-500/20 text-orange-400" : "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"}`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                      onClick={() => {
                        setSelectedRoom(room);
                        setViewOpen(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-white"
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
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        setSelectedRoom(room);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Panel ── */}
      <div className="w-80 shrink-0 hidden lg:block">
        <AiChatInsightPanel
          roomId={aiRoomId}
          roomName={aiRoomName}
          autoLoad={false}
        />
      </div>

      {/* ── Dialogs ── */}
      {/* View */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>{selectedRoom?.name}</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-3 text-sm">
              {[
                { l: "Description", v: selectedRoom.description || "—" },
                { l: "Type", v: selectedRoom.type },
                ...(selectedRoom.course
                  ? [{ l: "Course", v: selectedRoom.course }]
                  : []),
                ...(selectedRoom.faculty
                  ? [{ l: "Faculty", v: selectedRoom.faculty }]
                  : []),
                ...(selectedRoom.program
                  ? [{ l: "Program", v: selectedRoom.program }]
                  : []),
                {
                  l: "Created by",
                  v: `${selectedRoom.createdBy.firstName} ${selectedRoom.createdBy.lastName}`,
                },
                { l: "Members", v: String(selectedRoom.members?.length ?? 0) },
              ].map(({ l, v }) => (
                <div key={l}>
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-white capitalize">{v}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>New Chat Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Room name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full min-h-20 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/50"
            />
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  type: v as ChatRoom["type"],
                  course: "",
                  faculty: "",
                  program: "",
                })
              }
            >
              <SelectTrigger className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Type *" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                {["general", "course", "faculty", "program"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.type === "course" && (
              <Input
                placeholder="Course name *"
                value={formData.course}
                onChange={(e) =>
                  setFormData({ ...formData, course: e.target.value })
                }
                className="border-gray-700 bg-gray-800"
              />
            )}
            {["faculty", "program"].includes(formData.type) && (
              <Select
                value={formData.faculty}
                onValueChange={(v) => setFormData({ ...formData, faculty: v })}
              >
                <SelectTrigger className="border-gray-700 bg-gray-800">
                  <SelectValue placeholder="Select faculty *" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
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
                placeholder="Program name *"
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
                setAddOpen(false);
                reset();
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={actionLoading}
              className="bg-linear-to-r from-blue-500 to-orange-500 hover:opacity-90"
            >
              {actionLoading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>Edit Chat Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Room name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border-gray-700 bg-gray-800"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full min-h-20 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm resize-none focus:outline-none"
            />
            <p className="text-xs text-gray-500">
              Room type and type-specific fields cannot be changed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setSelectedRoom(null);
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={actionLoading}
              className="bg-linear-to-r from-blue-500 to-orange-500 hover:opacity-90"
            >
              {actionLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete Chat Room?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">
            Are you sure you want to delete{" "}
            <strong>"{selectedRoom?.name}"</strong>? This cannot be undone and
            will delete all messages.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setSelectedRoom(null);
              }}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChatRoomPage;
