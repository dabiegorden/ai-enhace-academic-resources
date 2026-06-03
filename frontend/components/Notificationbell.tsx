"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, X, BellOff } from "lucide-react";
import { toast } from "sonner";
import { io as SocketIO, Socket } from "socket.io-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AppNotification {
  _id: string;
  type:
    | "assignment"
    | "exam"
    | "exam-reminder"
    | "note"
    | "announcement"
    | "timetable"
    | "voting"
    | "upload"
    | "room_upload"
    | "lecture-reminder"
    | "chat"
    | "general"
    | string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const UNREAD_KEY = "notif_unread_count";

function readCachedCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(UNREAD_KEY);
  const parsed = parseInt(raw ?? "", 10);
  return isNaN(parsed) ? 0 : parsed;
}

function writeCachedCount(n: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem(UNREAD_KEY, String(n));
  }
}

// ─── Notification icon map ────────────────────────────────────────────────────
const typeEmoji: Record<string, string> = {
  assignment: "📝",
  exam: "📋",
  "exam-reminder": "📋",
  note: "📄",
  announcement: "📢",
  timetable: "🗓️",
  "lecture-reminder": "🗓️",
  voting: "🗳️",
  upload: "📁",
  room_upload: "📁",
  chat: "💬",
  general: "🔔",
};

const typeBg: Record<string, string> = {
  assignment: "bg-blue-500/15 border-blue-500/25",
  exam: "bg-red-500/15 border-red-500/25",
  "exam-reminder": "bg-red-500/15 border-red-500/25",
  note: "bg-purple-500/15 border-purple-500/25",
  announcement: "bg-orange-500/15 border-orange-500/25",
  timetable: "bg-green-500/15 border-green-500/25",
  "lecture-reminder": "bg-green-500/15 border-green-500/25",
  voting: "bg-pink-500/15 border-pink-500/25",
  upload: "bg-gray-500/15 border-gray-500/25",
  room_upload: "bg-gray-500/15 border-gray-500/25",
  chat: "bg-sky-500/15 border-sky-500/25",
  general: "bg-gray-500/15 border-gray-500/25",
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Initialise from localStorage immediately so the badge shows before any fetch
  const [unreadCount, setUnreadCount] = useState<number>(readCachedCount);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  // Track whether we've done the initial fetch for this userId
  const didInitialFetch = useRef(false);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // Keep localStorage in sync whenever unreadCount changes
  const syncCount = useCallback((n: number) => {
    setUnreadCount(n);
    writeCachedCount(n);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/notifications?limit=30`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        syncCount(data.unreadCount ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [syncCount]);

  // Lightweight unread-count fetch — used on mount so the badge is accurate
  // immediately without opening the panel
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/unread-count`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        syncCount(data.data?.unreadCount ?? 0);
      }
    } catch {
      // silently fail — cached value stays in place
    }
  }, [syncCount]);

  // ── Effect 1: fetch unread count as soon as userId is available ────────────
  // This runs independently of the socket setup so the badge appears even if
  // the socket hasn't connected yet, and runs again if userId changes (login/logout).
  useEffect(() => {
    if (!userId) {
      // User logged out — clear badge and cache
      syncCount(0);
      didInitialFetch.current = false;
      return;
    }

    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      fetchUnreadCount();
    }
  }, [userId, fetchUnreadCount, syncCount]);

  // ── Effect 2: Socket.IO connection ────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!userId || !token) return;

    const socket = SocketIO(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join", `user-${userId}`);
      socket.emit("joinRoom", `user-${userId}`);
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
        // Increment optimistically and persist to localStorage immediately
        setUnreadCount((c) => {
          const next = c + 1;
          writeCachedCount(next);
          return next;
        });

        toast(notif.title, {
          description: notif.message,
          duration: 5000,
        });
      },
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: "PUT",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => {
          const next = Math.max(0, c - 1);
          writeCachedCount(next);
          return next;
        });
      }
    } catch {
      /* */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: "PUT",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        syncCount(0);
      }
    } catch {
      /* */
    }
  }, [syncCount]);

  const deleteOne = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => {
          const notif = prev.find((n) => n._id === id);
          if (notif && !notif.isRead) {
            setUnreadCount((c) => {
              const next = Math.max(0, c - 1);
              writeCachedCount(next);
              return next;
            });
          }
          return prev.filter((n) => n._id !== id);
        });
      }
    } catch {
      /* */
    }
  }, []);

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
    const next = !open;
    setOpen(next);
    // Fetch fresh list when opening the panel
    if (next) fetchNotifications();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
      >
        <Bell className="h-4 w-4" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-linear-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold leading-none shadow-sm">
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
          <div className="overflow-y-auto max-h-96">
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
                  className={`group relative flex gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 transition-colors cursor-pointer ${
                    notif.isRead
                      ? "bg-transparent hover:bg-gray-800/30"
                      : "bg-gray-800/50 hover:bg-gray-800/70"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markRead(notif._id);
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base border ${
                      typeBg[notif.type] || typeBg.general
                    }`}
                  >
                    {typeEmoji[notif.type] || "🔔"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        notif.isRead ? "text-gray-300" : "text-white"
                      }`}
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
