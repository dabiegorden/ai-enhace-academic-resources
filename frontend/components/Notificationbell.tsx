"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, X, BellOff } from "lucide-react";
import { toast } from "sonner";
import { io as SocketIO, Socket } from "socket.io-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AppNotification {
  _id: string;
  type:
    | "assignment"
    | "exam"
    | "note"
    | "announcement"
    | "timetable"
    | "voting"
    | "upload"
    | "room_upload"
    | string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Notification icon map ────────────────────────────────────────────────────
const typeEmoji: Record<string, string> = {
  assignment: "📝",
  exam: "📋",
  note: "📄",
  announcement: "📢",
  timetable: "🗓️",
  voting: "🗳️",
  upload: "📁",
  room_upload: "📁",
};

const typeBg: Record<string, string> = {
  assignment: "bg-blue-500/15 border-blue-500/25",
  exam: "bg-red-500/15 border-red-500/25",
  note: "bg-purple-500/15 border-purple-500/25",
  announcement: "bg-orange-500/15 border-orange-500/25",
  timetable: "bg-green-500/15 border-green-500/25",
  voting: "bg-pink-500/15 border-pink-500/25",
  upload: "bg-gray-500/15 border-gray-500/25",
  room_upload: "bg-gray-500/15 border-gray-500/25",
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Socket.IO real-time listener
  useEffect(() => {
    if (!userId || !token) return;

    const socket = SocketIO(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join", `user-${userId}`);
    });

    socket.on(
      "notification:new",
      (notif: Omit<AppNotification, "isRead"> & { id: string }) => {
        const newNotif: AppNotification = {
          _id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: false,
          metadata: notif.metadata,
          createdAt: notif.createdAt,
        };
        setNotifications((prev) => [newNotif, ...prev.slice(0, 29)]);
        setUnreadCount((c) => c + 1);

        // Browser toast
        toast(notif.title, {
          description: notif.message,
          duration: 5000,
        });
      },
    );

    socketRef.current = socket;
    fetchNotifications();

    return () => {
      socket.disconnect();
    };
  }, [userId, token, fetchNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await fetch(`${apiUrl}/notifications/${id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* */
      }
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* */
    }
  }, [token]);

  const deleteOne = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await fetch(`${apiUrl}/notifications/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) => {
          const notif = prev.find((n) => n._id === id);
          if (notif && !notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
          return prev.filter((n) => n._id !== id);
        });
      } catch {
        /* */
      }
    },
    [token],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteOne,
  };
}

// ─── Time formatter ────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Notification Bell Dropdown ───────────────────────────────────────────────
interface NotificationBellProps {
  userId: string | null;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteOne,
  } = useNotifications(userId);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) fetchNotifications();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-linear-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 z-50 rounded-2xl bg-gray-900 border border-gray-700/60 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800/60">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-bold text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-100">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
                <div className="h-4 w-4 border-2 border-gray-700 border-t-orange-400 rounded-full animate-spin" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BellOff className="h-8 w-8 text-gray-700" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`group relative flex gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 transition-colors cursor-pointer ${notif.isRead ? "bg-transparent hover:bg-gray-800/30" : "bg-gray-800/50 hover:bg-gray-800/70"}`}
                  onClick={() => {
                    if (!notif.isRead) markRead(notif._id);
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base border ${typeBg[notif.type] || typeBg.upload}`}
                  >
                    {typeEmoji[notif.type] || "🔔"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${notif.isRead ? "text-gray-300" : "text-white"}`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5" />
                  )}

                  {/* Action buttons (hover) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif._id);
                        }}
                        className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-green-400 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOne(notif._id);
                      }}
                      className="p-1 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-800/30 text-center">
              <p className="text-[10px] text-gray-500">
                Showing latest {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
