"use client";

import { useState, useEffect } from "react";
import {
  Star,
  BookOpen,
  User,
  ChevronRight,
  Award,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

interface RatingAspects {
  contentQuality?: number;
  teachingMethod?: number;
  availability?: number;
  fairness?: number;
}

interface AverageData {
  averageRating: number;
  totalRatings: number;
  aspects: {
    contentQuality: number;
    teachingMethod: number;
    availability: number;
    fairness: number;
  };
}

interface LecturerData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  faculty?: string;
}

interface CourseData {
  course: string;
  courseCode: string;
}

// ─── Course Picker ────────────────────────────────────────────────────────────
function CoursePicker({
  courses,
  isLoading,
  selected,
  onSelect,
  search,
  onSearchChange,
}: {
  courses: CourseData[];
  isLoading: boolean;
  selected: CourseData | null;
  onSelect: (course: CourseData | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const filteredCourses = courses.filter((c) =>
    `${c.course} ${c.courseCode}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const searchInput = (
    <input
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Type to search course by name or code..."
      className="w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all mb-2"
    />
  );

  if (isLoading) {
    return (
      <div>
        {searchInput}
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <div className="h-4 w-4 border-2 border-gray-600 border-t-orange-400 rounded-full animate-spin" />
          Loading courses...
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div>
        {searchInput}
        <div className="py-6 text-center text-sm text-gray-500">
          No courses found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {searchInput}
      {filteredCourses.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-500">
          No courses match &quot;{search}&quot;.
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredCourses.map((c) => {
          const isSelected = selected?.courseCode === c.courseCode;
          return (
            <button
              key={c.courseCode}
              type="button"
              onClick={() => onSelect(isSelected ? null : c)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                  : "bg-gray-900/50 border-gray-700/40 hover:bg-gray-800/60 hover:border-gray-600/50"
              }`}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-orange-500 shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}
                >
                  {c.course}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {c.courseCode}
                </p>
              </div>
              {isSelected && (
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lecturer Picker ──────────────────────────────────────────────────────────
function LecturerPicker({
  lecturers,
  isLoading,
  selected,
  onSelect,
  search,
  onSearchChange,
}: {
  lecturers: LecturerData[];
  isLoading: boolean;
  selected: { id: string; name: string } | null;
  onSelect: (lecturer: { id: string; name: string } | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const filteredLecturers = lecturers.filter((lec) =>
    `${lec.firstName} ${lec.lastName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const searchInput = (
    <input
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Type to search lecturer by name..."
      className="w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all mb-2"
    />
  );

  if (isLoading) {
    return (
      <div>
        {searchInput}
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <div className="h-4 w-4 border-2 border-gray-600 border-t-orange-400 rounded-full animate-spin" />
          Loading lecturers...
        </div>
      </div>
    );
  }

  if (lecturers.length === 0) {
    return (
      <div>
        {searchInput}
        <div className="py-6 text-center text-sm text-gray-500">
          No lecturers found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {searchInput}
      {filteredLecturers.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-500">
          No lecturers match &quot;{search}&quot;.
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredLecturers.map((lec) => {
          const name = `${lec.firstName} ${lec.lastName}`;
          const isSelected = selected?.id === lec._id;
          return (
            <button
              key={lec._id}
              type="button"
              onClick={() =>
                onSelect(isSelected ? null : { id: lec._id, name })
              }
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30"
                  : "bg-gray-900/50 border-gray-700/40 hover:bg-gray-800/60 hover:border-gray-600/50"
              }`}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-orange-500 shrink-0">
                <span className="text-xs font-bold text-white">
                  {lec.firstName[0]}
                  {lec.lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}
                >
                  {name}
                </p>
                {lec.faculty && (
                  <p className="text-xs text-gray-500 truncate">
                    {lec.faculty}
                  </p>
                )}
              </div>
              {isSelected && (
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SEMESTERS = ["First Semester", "Second Semester", "Summer Semester"];
const ACADEMIC_YEARS = ["2023/2024", "2024/2025", "2025/2026"];

const aspectLabels: Record<string, string> = {
  contentQuality: "Content Quality",
  teachingMethod: "Teaching Method",
  availability: "Availability",
  fairness: "Fairness",
};

const aspectIcons: Record<string, React.ReactNode> = {
  contentQuality: <BookOpen className="h-4 w-4" />,
  teachingMethod: <TrendingUp className="h-4 w-4" />,
  availability: <Award className="h-4 w-4" />,
  fairness: <CheckCircle2 className="h-4 w-4" />,
};

// ─── Star Rating Input ────────────────────────────────────────────────────────
function StarInput({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`${sz} transition-colors duration-150 ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-600 fill-transparent"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-400">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-800/60 border border-gray-700/50 p-5 backdrop-blur-sm">
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${color}`}
      />
      <div
        className={`inline-flex items-center justify-center rounded-xl p-2.5 mb-3 ${color} bg-opacity-20`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Aspect Bar ───────────────────────────────────────────────────────────────
function AspectBar({ label, value }: { label: string; value: number }) {
  const pct = (Number(value) / 5) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-white">
          {Number(value).toFixed(1)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-blue-500 to-orange-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudentsRatingsPage = () => {
  const [activeTab, setActiveTab] = useState<"course" | "lecturer">("course");
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(
    null,
  );
  const [selectedLecturer, setSelectedLecturer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [semester, setSemester] = useState("First Semester");
  const [aspects, setAspects] = useState<RatingAspects>({
    contentQuality: 0,
    teachingMethod: 0,
    availability: 0,
    fairness: 0,
  });

  // Stats & lecturers
  const [avgData, setAvgData] = useState<AverageData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lecturers, setLecturers] = useState<LecturerData[]>([]);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [lecturerSearch, setLecturerSearch] = useState("");
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  useEffect(() => {
    fetchAverage();
  }, [activeTab]);

  useEffect(() => {
    fetchLecturers();
    fetchCourses();
  }, []);

  const fetchLecturers = async () => {
    setLecturersLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/users/lecturers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) setLecturers(data.data);
    } catch {
      // silently fail
    } finally {
      setLecturersLoading(false);
    }
  };

  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/notes/my-notes?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const seen = new Set<string>();
        const unique: CourseData[] = [];
        for (const note of data.data) {
          if (note.courseCode && !seen.has(note.courseCode)) {
            seen.add(note.courseCode);
            unique.push({ course: note.course, courseCode: note.courseCode });
          }
        }
        setCourses(unique);
      }
    } catch {
      // silently fail
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchAverage = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/ratings/average?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAvgData(data.data);
    } catch {
      // silently fail
    }
  };

  const resetForm = () => {
    setSelectedCourse(null);
    setCourseSearch("");
    setSelectedLecturer(null);
    setLecturerSearch("");
    setRating(0);
    setComment("");
    setIsAnonymous(true);
    setAspects({
      contentQuality: 0,
      teachingMethod: 0,
      availability: 0,
      fairness: 0,
    });
    setStep(1);
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }
    if (activeTab === "course" && !selectedCourse) {
      toast.error("Please select a course");
      return;
    }
    if (activeTab === "lecturer" && !selectedLecturer) {
      toast.error("Please select a lecturer");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload: Record<string, unknown> = {
        type: activeTab,
        rating,
        comment,
        isAnonymous,
        academicYear,
        semester,
        aspects,
      };
      if (activeTab === "course") {
        payload.course = selectedCourse!.course;
        payload.courseCode = selectedCourse!.courseCode;
      } else {
        payload.lecturer = selectedLecturer!.id;
      }

      const res = await fetch(`${apiUrl}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        fetchAverage();
        toast.success("Rating submitted successfully!");
      } else {
        toast.error(data.message || "Failed to submit rating");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-800 via-gray-800/80 to-gray-900 border border-gray-700/50 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-blue-500/10 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-orange-500">
              <Star className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
              Feedback Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Rate Your Experience
          </h1>
          <p className="mt-1 text-gray-400 text-sm sm:text-base max-w-lg">
            Your anonymous feedback helps improve the quality of education at
            CUG. Every rating matters.
          </p>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      {avgData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Average Rating"
            value={`${Number(avgData.averageRating).toFixed(1)} / 5`}
            icon={<Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
            color="bg-amber-500"
          />
          <StatCard
            label="Total Ratings"
            value={avgData.totalRatings}
            icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
            color="bg-blue-500"
          />
          <StatCard
            label="Content Quality"
            value={`${Number(avgData.aspects?.contentQuality || 0).toFixed(1)}`}
            icon={<BookOpen className="h-5 w-5 text-green-400" />}
            color="bg-green-500"
          />
          <StatCard
            label="Teaching Method"
            value={`${Number(avgData.aspects?.teachingMethod || 0).toFixed(1)}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
            color="bg-purple-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form Card ──────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-700/60">
              {(["course", "lecturer"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    resetForm();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab
                      ? "text-white border-b-2 border-orange-500 bg-gray-800/80"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                  }`}
                >
                  {tab === "course" ? (
                    <BookOpen className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  Rate {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-6">
              {submitted ? (
                /* ── Success State ── */
                <div className="text-center py-10 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Thank you for your feedback!
                  </h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Your rating has been submitted successfully. It helps us
                    improve the quality of education.
                  </p>
                  <button
                    onClick={resetForm}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Submit Another Rating
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Step Indicator */}
                  <div className="flex items-center gap-3">
                    {[1, 2].map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            step >= s
                              ? "bg-linear-to-br from-blue-500 to-orange-500 text-white"
                              : "bg-gray-700 text-gray-500"
                          }`}
                        >
                          {s}
                        </div>
                        <span
                          className={`text-xs font-medium ${step >= s ? "text-gray-300" : "text-gray-600"}`}
                        >
                          {s === 1 ? "Details" : "Aspects & Review"}
                        </span>
                        {s < 2 && (
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  {step === 1 ? (
                    /* ── Step 1: Basic Info ── */
                    <div className="space-y-5">
                      {/* Course / Lecturer fields */}
                      {activeTab === "course" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Select Course *
                            </label>
                            {selectedCourse && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {selectedCourse.course} (
                                {selectedCourse.courseCode})
                              </span>
                            )}
                          </div>
                          <CoursePicker
                            courses={courses}
                            isLoading={coursesLoading}
                            selected={selectedCourse}
                            onSelect={setSelectedCourse}
                            search={courseSearch}
                            onSearchChange={setCourseSearch}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Select Lecturer *
                            </label>
                            {selectedLecturer && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {selectedLecturer.name}
                              </span>
                            )}
                          </div>
                          <LecturerPicker
                            lecturers={lecturers}
                            isLoading={lecturersLoading}
                            selected={selectedLecturer}
                            onSelect={setSelectedLecturer}
                            search={lecturerSearch}
                            onSearchChange={setLecturerSearch}
                          />
                        </div>
                      )}

                      {/* Academic Year & Semester */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Academic Year *
                          </label>
                          <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all"
                          >
                            {ACADEMIC_YEARS.map((y) => (
                              <option key={y} value={y} className="bg-gray-900">
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Semester *
                          </label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all"
                          >
                            {SEMESTERS.map((s) => (
                              <option key={s} value={s} className="bg-gray-900">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Overall Rating */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Overall Rating *
                        </label>
                        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/50">
                          <StarInput
                            value={rating}
                            onChange={setRating}
                            size="lg"
                          />
                        </div>
                      </div>

                      {/* Anonymous toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-700/50">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Submit Anonymously
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Your identity will be hidden from lecturers and
                            admins
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAnonymous(!isAnonymous)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                            isAnonymous
                              ? "bg-linear-to-r from-blue-500 to-orange-500"
                              : "bg-gray-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                              isAnonymous ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (rating === 0) {
                            toast.error("Please give an overall rating first");
                            return;
                          }
                          if (
                            activeTab === "course" &&
                            !selectedCourse
                          ) {
                            toast.error("Please select a course");
                            return;
                          }
                          if (activeTab === "lecturer" && !selectedLecturer) {
                            toast.error("Please select a lecturer");
                            return;
                          }
                          setStep(2);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-blue-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* ── Step 2: Aspects & Comment ── */
                    <div className="space-y-5">
                      {/* Aspect Ratings */}
                      <div className="space-y-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Rate Specific Aspects (Optional)
                        </p>
                        {Object.keys(aspectLabels).map((key) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-700/40 hover:border-gray-600/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-blue-400">
                                {aspectIcons[key]}
                              </span>
                              <span className="text-sm text-gray-300">
                                {aspectLabels[key]}
                              </span>
                            </div>
                            <StarInput
                              size="sm"
                              value={aspects[key as keyof RatingAspects] ?? 0}
                              onChange={(v) =>
                                setAspects((prev) => ({ ...prev, [key]: v }))
                              }
                            />
                          </div>
                        ))}
                      </div>

                      {/* Comment */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Additional Comments (Optional)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={4}
                          placeholder="Share your experience in detail..."
                          className="w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all resize-none"
                        />
                        <p className="text-xs text-gray-600 text-right">
                          {comment.length}/500
                        </p>
                      </div>

                      {/* Anonymous info banner */}
                      {isAnonymous && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-blue-300">
                            This rating will be submitted anonymously. Your
                            identity will not be revealed.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(1)}
                          className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-blue-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Submit Rating
                              <Star className="h-4 w-4 fill-white" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar: Aspect Overview ─────────────────────── */}
        <div className="space-y-4">
          {/* Aspect Breakdown */}
          {avgData && avgData.totalRatings > 0 && (
            <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">
                  Aspect Breakdown
                </h3>
              </div>
              <div className="space-y-3">
                {Object.entries(avgData.aspects || {}).map(([key, val]) => (
                  <AspectBar
                    key={key}
                    label={aspectLabels[key] || key}
                    value={Number(val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tips Card */}
          <div className="rounded-2xl bg-linear-to-br from-gray-800/60 to-gray-900/80 border border-gray-700/50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Rating Tips</h3>
            </div>
            <ul className="space-y-2">
              {[
                "Be honest and constructive in your feedback",
                "Ratings are anonymous by default",
                "You can rate once per course/lecturer per semester",
                "Specific comments are more helpful than generic ones",
              ].map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Overall Score Display */}
          {avgData && avgData.totalRatings > 0 && (
            <div className="rounded-2xl bg-linear-to-br from-blue-500/10 to-orange-500/10 border border-blue-500/20 p-5 text-center">
              <div className="inline-flex items-center justify-center mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= Math.round(Number(avgData.averageRating))
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-600 fill-transparent"
                    }`}
                  />
                ))}
              </div>
              <p className="text-3xl font-bold text-white">
                {Number(avgData.averageRating).toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Based on {avgData.totalRatings} {activeTab} rating
                {avgData.totalRatings !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentsRatingsPage;
