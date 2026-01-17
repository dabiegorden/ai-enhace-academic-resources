"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Star } from "lucide-react";
import { toast } from "sonner";

interface Rating {
  _id: string;
  student?: { firstName: string; lastName: string; email: string };
  type: "course" | "lecturer";
  course?: string;
  courseCode?: string;
  lecturer?: { firstName: string; lastName: string };
  rating: number;
  comment?: string;
  aspects?: {
    contentQuality: number;
    teachingMethod: number;
    availability: number;
    fairness: number;
  };
  isAnonymous: boolean;
  academicYear: string;
  semester: string;
  createdAt: string;
}

const AdminRatingsPage = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/ratings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch ratings");

      const data = await response.json();
      setRatings(data.data || []);
      filterRatings(data.data || [], searchTerm, typeFilter, semesterFilter);
    } catch (error) {
      toast.error("Failed to load ratings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterRatings = (
    list: Rating[],
    search: string,
    type: string,
    semester: string,
  ) => {
    let filtered = list;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((r) => {
        if (r.type === "course") {
          return (
            r.course?.toLowerCase().includes(searchLower) ||
            r.courseCode?.toLowerCase().includes(searchLower)
          );
        } else {
          return (
            (r.lecturer?.firstName ?? "").toLowerCase().includes(searchLower) ||
            (r.lecturer?.lastName ?? "").toLowerCase().includes(searchLower)
          );
        }
      });
    }

    if (type !== "all") filtered = filtered.filter((r) => r.type === type);
    if (semester !== "all")
      filtered = filtered.filter((r) => r.semester === semester);

    setFilteredRatings(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterRatings(ratings, value, typeFilter, semesterFilter);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-400";
    if (rating >= 3) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ratings & Feedback
        </h1>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Search ratings..."
            value={searchTerm}
            onChange={handleSearch}
            className="border-gray-700 bg-gray-800"
          />
          <div className="flex gap-2">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                filterRatings(ratings, searchTerm, value, semesterFilter);
              }}
            >
              <SelectTrigger className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="lecturer">Lecturer</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={semesterFilter}
              onValueChange={(value) => {
                setSemesterFilter(value);
                filterRatings(ratings, searchTerm, typeFilter, value);
              }}
            >
              <SelectTrigger className="border-gray-700 bg-gray-800">
                <SelectValue placeholder="Filter by semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                <SelectItem value="1">Semester 1</SelectItem>
                <SelectItem value="2">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            Loading ratings...
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="py-8 text-center text-gray-400">No ratings found</div>
        ) : (
          <div className="space-y-4">
            {filteredRatings.map((rating) => (
              <div
                key={rating._id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {rating.type === "course"
                        ? `${rating.course} (${rating.courseCode})`
                        : `${rating.lecturer?.firstName} ${rating.lecturer?.lastName}`}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        rating.type === "course"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {rating.type}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(rating.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                      <span
                        className={`ml-2 font-semibold ${getRatingColor(
                          rating.rating,
                        )}`}
                      >
                        {rating.rating}/5
                      </span>
                    </div>
                    {!rating.isAnonymous && rating.student && (
                      <span className="text-xs text-gray-500">
                        By {rating.student.firstName} {rating.student.lastName}
                      </span>
                    )}
                    {rating.isAnonymous && (
                      <span className="text-xs text-gray-500">Anonymous</span>
                    )}
                  </div>
                  {rating.comment && (
                    <p className="mt-2 text-sm text-gray-400">
                      "{rating.comment.substring(0, 100)}..."
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRating(rating);
                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
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
              {selectedRating?.type === "course"
                ? `${selectedRating?.course} (${selectedRating?.courseCode})`
                : `${selectedRating?.lecturer?.firstName} ${selectedRating?.lecturer?.lastName}`}
            </DialogTitle>
          </DialogHeader>
          {selectedRating && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(selectedRating.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-xl font-bold text-white">
                    {selectedRating.rating}/5
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="text-white">{selectedRating.type}</p>
              </div>
              {!selectedRating.isAnonymous && selectedRating.student && (
                <div>
                  <p className="text-sm text-gray-400">Student</p>
                  <p className="text-white">
                    {selectedRating.student.firstName}{" "}
                    {selectedRating.student.lastName}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Semester</p>
                  <p className="text-white">{selectedRating.semester}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Academic Year</p>
                  <p className="text-white">{selectedRating.academicYear}</p>
                </div>
              </div>
              {selectedRating.comment && (
                <div>
                  <p className="text-sm text-gray-400">Comment</p>
                  <p className="whitespace-pre-wrap text-gray-300">
                    {selectedRating.comment}
                  </p>
                </div>
              )}
              {selectedRating.aspects && (
                <div>
                  <p className="mb-2 text-sm text-gray-400">Aspect Ratings</p>
                  <div className="space-y-2">
                    {selectedRating.aspects.contentQuality > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Content Quality
                        </span>
                        <span className="text-white">
                          {selectedRating.aspects.contentQuality}/5
                        </span>
                      </div>
                    )}
                    {selectedRating.aspects.teachingMethod > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Teaching Method
                        </span>
                        <span className="text-white">
                          {selectedRating.aspects.teachingMethod}/5
                        </span>
                      </div>
                    )}
                    {selectedRating.aspects.availability > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Availability
                        </span>
                        <span className="text-white">
                          {selectedRating.aspects.availability}/5
                        </span>
                      </div>
                    )}
                    {selectedRating.aspects.fairness > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Fairness</span>
                        <span className="text-white">
                          {selectedRating.aspects.fairness}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRatingsPage;
