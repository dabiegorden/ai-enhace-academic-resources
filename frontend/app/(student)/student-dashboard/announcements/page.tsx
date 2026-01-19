"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Calendar,
  Download,
  Eye,
  FileText,
  Pin,
  User,
  Filter,
} from "lucide-react";

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: "general" | "faculty" | "academic" | "event" | "urgent";
  faculty?: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  attachments: Array<{
    url: string;
    cloudinaryId: string;
  }>;
  isPinned: boolean;
  expiryDate?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function StudentAnnouncementPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const queryParams = filterType !== "all" ? `?type=${filterType}` : "";
      const response = await fetch(`${apiUrl}/announcements${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch announcements");
      }
    } catch (error) {
      toast.error("Failed to fetch announcements");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // View announcement details and increment view count
  const viewAnnouncement = async (announcement: Announcement) => {
    try {
      const response = await fetch(
        `${apiUrl}/announcements/${announcement._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        setSelectedAnnouncement(data.data);
        setDialogOpen(true);
      } else {
        toast.error("Failed to load announcement details");
      }
    } catch (error) {
      toast.error("Failed to load announcement details");
      console.error("View error:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [filterType]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get type badge color
  const getTypeBadge = (type: string) => {
    const badges = {
      general: "bg-blue-900/30 text-blue-300 border-blue-700",
      faculty: "bg-purple-900/30 text-purple-300 border-purple-700",
      academic: "bg-green-900/30 text-green-300 border-green-700",
      event: "bg-orange-900/30 text-orange-300 border-orange-700",
      urgent: "bg-red-900/30 text-red-300 border-red-700",
    };
    return badges[type as keyof typeof badges] || badges.general;
  };

  // Download attachment
  const downloadAttachment = (url: string) => {
    window.open(url, "_blank");
  };

  const filterTypes = [
    { value: "all", label: "All" },
    { value: "general", label: "General" },
    { value: "faculty", label: "Faculty" },
    { value: "academic", label: "Academic" },
    { value: "event", label: "Events" },
    { value: "urgent", label: "Urgent" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Bell className="size-8 text-blue-400" />
              Announcements
            </h1>
            <p className="text-gray-400">
              Stay updated with the latest news and updates
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-gray-800 text-gray-300 border-gray-700 text-lg px-4 py-2"
          >
            {announcements.length} Total
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-5 text-gray-400" />
          {filterTypes.map((type) => (
            <Button
              key={type.value}
              variant={filterType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type.value)}
              className={
                filterType === type.value
                  ? ""
                  : "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
              }
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="size-12 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">
                No announcements found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card
                key={announcement._id}
                className={`hover:shadow-lg transition-shadow cursor-pointer bg-gray-800 border-gray-700 ${
                  announcement.isPinned ? "border-yellow-600 border-2" : ""
                }`}
                onClick={() => viewAnnouncement(announcement)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getTypeBadge(announcement.type)}>
                        {announcement.type.toUpperCase()}
                      </Badge>
                      {announcement.isPinned && (
                        <Badge className="bg-yellow-900/30 text-yellow-300 border-yellow-700">
                          <Pin className="size-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                      {announcement.faculty && (
                        <Badge
                          variant="outline"
                          className="bg-gray-700 text-gray-300 border-gray-600"
                        >
                          {announcement.faculty}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Eye className="size-3" />
                        <span>{announcement.views}</span>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-xl text-white line-clamp-2">
                    {announcement.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-gray-400">
                    {announcement.content}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        <span>
                          {announcement.author.firstName}{" "}
                          {announcement.author.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{formatDate(announcement.createdAt)}</span>
                      </div>
                    </div>
                    {announcement.attachments.length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-gray-700 text-gray-300 border-gray-600"
                      >
                        <FileText className="size-3 mr-1" />
                        {announcement.attachments.length} file(s)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={
                  selectedAnnouncement
                    ? getTypeBadge(selectedAnnouncement.type)
                    : ""
                }
              >
                {selectedAnnouncement?.type.toUpperCase()}
              </Badge>
              {selectedAnnouncement?.isPinned && (
                <Badge className="bg-yellow-900/30 text-yellow-300 border-yellow-700">
                  <Pin className="size-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
            <DialogTitle className="text-2xl text-white">
              {selectedAnnouncement?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Posted by {selectedAnnouncement?.author.firstName}{" "}
              {selectedAnnouncement?.author.lastName} on{" "}
              {selectedAnnouncement &&
                formatDate(selectedAnnouncement.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6">
              {/* Content */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-200 whitespace-pre-wrap">
                  {selectedAnnouncement?.content}
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">Author</p>
                  <p className="text-white font-semibold">
                    {selectedAnnouncement?.author.firstName}{" "}
                    {selectedAnnouncement?.author.lastName}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {selectedAnnouncement?.author.email}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">Views</p>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Eye className="size-4" />
                    {selectedAnnouncement?.views}
                  </p>
                </div>
                {selectedAnnouncement?.expiryDate && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 mb-1">Expires On</p>
                    <p className="text-white font-semibold">
                      {formatDate(selectedAnnouncement.expiryDate)}
                    </p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedAnnouncement?.attachments &&
                selectedAnnouncement.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                      <FileText className="size-5" />
                      Attachments
                    </h3>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map(
                        (attachment, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="size-5 text-blue-400" />
                              <span className="text-sm text-gray-300">
                                Attachment {idx + 1}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => downloadAttachment(attachment.url)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Download className="size-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
