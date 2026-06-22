"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Users,
  LogIn,
  LogOut,
  Search,
  Book,
  Building2,
  GraduationCap,
  Globe,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  message: string;
  timestamp: string;
}

interface ChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: "course" | "faculty" | "program" | "general";
  course?: string;
  faculty?: string;
  program?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  members: Array<string | { _id: string }>;
  lastActivity: string;
  messages?: Message[];
  totalMessages?: number;
}

const StudentChatRooms = () => {
  const [activeTab, setActiveTab] = useState<"my-rooms" | "discover">(
    "my-rooms",
  );
  const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
  const [allRooms, setAllRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  // The login flow stores the signed-in user as a JSON object under "user"
  // (NOT a bare "userId" key). Reading the wrong key left userId null, so
  // membership detection (isMember) and own-message highlighting always
  // failed — which is why students appeared unable to join/chat.
  const userId =
    typeof window !== "undefined"
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem("user") || "{}")._id || null;
          } catch {
            return null;
          }
        })()
      : null;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch my rooms
  const fetchMyRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/chat/my-rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setMyRooms(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch chat rooms");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch chat rooms");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  // Fetch all rooms for discovery
  const fetchAllRooms = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = searchQuery
        ? `?search=${encodeURIComponent(searchQuery)}`
        : "";
      const response = await fetch(`${apiUrl}/chat/rooms${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setAllRooms(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch rooms");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, searchQuery]);

  // Fetch room messages
  const fetchRoomMessages = useCallback(
    async (roomId: string) => {
      try {
        const response = await fetch(
          `${apiUrl}/chat/rooms/${roomId}?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        if (data.success) {
          setSelectedRoom(data.data);
          setMessages(data.data.messages || []);
        } else {
          toast.error(data.message || "Failed to fetch messages");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to fetch messages");
      }
    },
    [apiUrl, token],
  );

  // Join room
  const joinRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${apiUrl}/chat/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Joined room successfully");
        fetchMyRooms();
        fetchRoomMessages(roomId);
      } else {
        toast.error(data.message || "Failed to join room");
      }
    } catch (error) {
      console.error("Join error:", error);
      toast.error("Failed to join room");
    }
  };

  // Leave room
  const leaveRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${apiUrl}/chat/rooms/${roomId}/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Left room successfully");
        setSelectedRoom(null);
        setMessages([]);
        fetchMyRooms();
      } else {
        toast.error(data.message || "Failed to leave room");
      }
    } catch (error) {
      console.error("Leave error:", error);
      toast.error("Failed to leave room");
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      setSending(true);
      const response = await fetch(
        `${apiUrl}/chat/rooms/${selectedRoom._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: newMessage }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessage("");
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my-rooms") {
      fetchMyRooms();
    } else {
      fetchAllRooms();
    }
  }, [activeTab, fetchMyRooms, fetchAllRooms]);

  // Get room type icon
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return <Book className="size-4" />;
      case "faculty":
        return <Building2 className="size-4" />;
      case "program":
        return <GraduationCap className="size-4" />;
      default:
        return <Globe className="size-4" />;
    }
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Check if user is room member. Members may arrive either as raw id strings
  // (list endpoints) or as populated user objects (room detail endpoint), so
  // handle both shapes.
  const isMember = (room: ChatRoom) => {
    if (!userId) return false;
    return room.members.some((m) =>
      typeof m === "string" ? m === userId : m?._id === userId,
    );
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const roomsToDisplay = activeTab === "my-rooms" ? myRooms : allRooms;
  const filteredRooms = roomsToDisplay;

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar - Room List */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="size-6 text-blue-400" />
            Chat Rooms
          </h1>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="my-rooms" className="flex-1">
                My Rooms ({myRooms.length})
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex-1">
                Discover
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "discover" && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                Loading rooms...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {activeTab === "my-rooms"
                  ? "No rooms joined yet"
                  : "No rooms found"}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <Card
                  key={room._id}
                  className={`mb-2 cursor-pointer hover:shadow-lg transition-shadow bg-gray-700 border-gray-600 ${
                    selectedRoom?._id === room._id
                      ? "border-blue-500 border-2"
                      : ""
                  }`}
                  onClick={() => {
                    console.log(
                      "[v0] Room clicked:",
                      room._id,
                      "Is member:",
                      isMember(room),
                    );
                    if (isMember(room) || activeTab === "my-rooms") {
                      fetchRoomMessages(room._id);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {getRoomTypeIcon(room.type)}
                        <h3 className="font-semibold text-sm text-white line-clamp-1">
                          {room.name}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-600 text-gray-200 border-gray-500"
                      >
                        {room.type}
                      </Badge>
                    </div>
                    {room.description && (
                      <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="size-3" />
                        <span>{room.members.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{formatTime(room.lastActivity)}</span>
                      </div>
                    </div>
                    {!isMember(room) && activeTab === "discover" && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinRoom(room._id);
                        }}
                      >
                        <LogIn className="size-3 mr-1" />
                        Join Room
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {getRoomTypeIcon(selectedRoom.type)}
                  {selectedRoom.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedRoom.members.length} members • {selectedRoom.type}{" "}
                  room
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveRoom(selectedRoom._id)}
                className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <LogOut className="size-4 mr-2" />
                Leave Room
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-900">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageCircle className="size-12 mx-auto mb-4 text-gray-600" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwnMessage = msg.user._id === userId;
                    return (
                      <div
                        key={`${msg._id}-${idx}`}
                        className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="size-8">
                          <AvatarImage
                            src={msg.user.profileImage || "/placeholder.svg"}
                          />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {getInitials(msg.user.firstName, msg.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex-1 max-w-md ${isOwnMessage ? "text-right" : ""}`}
                        >
                          <div
                            className={`flex items-center gap-2 mb-1 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                          >
                            <span className="text-sm font-semibold text-white">
                              {isOwnMessage
                                ? "You"
                                : `${msg.user.firstName} ${msg.user.lastName}`}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 inline-block ${
                              isOwnMessage
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-white border border-gray-700"
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <MessageCircle className="size-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Select a Chat Room
              </h3>
              <p className="text-gray-400">
                Choose a room from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentChatRooms;
