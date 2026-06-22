"use client";

import React, { useState, useEffect } from "react";
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
  Users,
  Sparkles,
  MessageCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES as FACULTIES, FACULTY_PROGRAMS } from "@/constants/faculties";
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

interface ChatMessage {
  _id?: string;
  message: string;
  timestamp: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

const typeBadge: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400",
  course: "bg-green-500/20 text-green-400",
  faculty: "bg-purple-500/20 text-purple-400",
  program: "bg-pink-500/20 text-pink-400",
};

const LecturerChatPage = () => {
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

  // ── Chat state — lets the lecturer actually participate in the room ──
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const tok = () => localStorage.getItem("token") || "";
  const myId = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")._id || "";
    } catch {
      return "";
    }
  };

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
      toast.success("Updated");
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
      toast.success("Deleted");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Open the chat for a room: auto-join (idempotent) then load messages ──
  const openChat = async (room: ChatRoom) => {
    setChatRoom(room);
    setChatOpen(true);
    setChatMessages([]);
    setChatLoading(true);
    try {
      // Ensure the lecturer is a member so they're allowed to post.
      await fetch(`${apiUrl}/chat/rooms/${room._id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      }).catch(() => {});

      const res = await fetch(`${apiUrl}/chat/rooms/${room._id}?limit=100`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChatMessages(data.data.messages || []);
      } else {
        toast.error(data.message || "Failed to open chat");
      }
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !chatRoom) return;
    setChatSending(true);
    try {
      const res = await fetch(`${apiUrl}/chat/rooms/${chatRoom._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChatMessages((prev) => [...prev, data.data]);
        setChatInput("");
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setChatSending(false);
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
    <div className="flex gap-6">
      {/* ── Room list ── */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Chat Rooms</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage your course discussion rooms
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
                <SelectValue placeholder="Filter" />
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
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : filteredRooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No chat rooms found
            </p>
          ) : (
            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <div
                  key={room._id}
                  onClick={() => {
                    setAiRoomId(room._id);
                    setAiRoomName(room.name);
                  }}
                  className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${aiRoomId === room._id ? "border-orange-500/40 bg-gray-700/60" : "border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/70"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {room.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${typeBadge[room.type] || typeBadge.general}`}
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
                      {room.course && <span>{room.course}</span>}
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
                      className={`p-1.5 rounded-lg transition-colors ${aiRoomId === room._id ? "bg-orange-500/20 text-orange-400" : "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"}`}
                      title="AI Analysis"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-green-400"
                      title="Open chat"
                      onClick={() => openChat(room)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
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

      {/* Dialogs — same structure as admin, trimmed for brevity */}
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
              className="w-full min-h-20 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm resize-none"
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
                <SelectValue />
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
                onValueChange={(v) =>
                  setFormData({ ...formData, faculty: v, program: "" })
                }
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
            {formData.type === "program" &&
              (formData.faculty &&
              FACULTY_PROGRAMS[formData.faculty]?.length > 0 ? (
                <Select
                  value={formData.program}
                  onValueChange={(v) =>
                    setFormData({ ...formData, program: v })
                  }
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800">
                    <SelectValue placeholder="Select program *" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {FACULTY_PROGRAMS[formData.faculty].map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={
                    formData.faculty
                      ? "Program name *"
                      : "Select a faculty first"
                  }
                  value={formData.program}
                  onChange={(e) =>
                    setFormData({ ...formData, program: e.target.value })
                  }
                  disabled={!formData.faculty}
                  className="border-gray-700 bg-gray-800"
                />
              ))}
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
              className="w-full min-h-20 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm resize-none"
            />
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

      {/* ── Chat dialog — lecturer can read & post messages in the room ── */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              {chatRoom?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {chatLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Loading messages…
                </p>
              ) : chatMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                chatMessages.map((msg, idx) => {
                  const own = msg.user?._id === myId();
                  return (
                    <div
                      key={`${msg._id ?? "m"}-${idx}`}
                      className={`flex ${own ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[75%]">
                        <div
                          className={`mb-0.5 text-[11px] text-gray-400 ${own ? "text-right" : ""}`}
                        >
                          {own
                            ? "You"
                            : `${msg.user?.firstName ?? ""} ${msg.user?.lastName ?? ""}`}
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${own ? "bg-blue-600 text-white" : "bg-gray-800 text-white border border-gray-700"}`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-700">
              <Input
                placeholder="Type your message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                className="border-gray-700 bg-gray-800"
              />
              <Button
                onClick={sendChat}
                disabled={!chatInput.trim() || chatSending}
                className="bg-linear-to-r from-blue-500 to-orange-500 hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete Chat Room?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">
            Delete <strong>"{selectedRoom?.name}"</strong>? This cannot be
            undone.
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

export default LecturerChatPage;
