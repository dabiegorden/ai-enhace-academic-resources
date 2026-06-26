"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES as FACULTIES } from "@/constants/faculties";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId?: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  isActive: boolean;
  profileImage?: string;
  createdAt?: string;
  lastLogin?: string;
}

// ---------------------------------------------------------------------------
// Custom Portal Modal — renders on document.body, fully isolated from page tree
// Keyboard events are trapped inside and NEVER reach background elements.
// ---------------------------------------------------------------------------
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "520px",
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Auto-focus first focusable element inside modal
    const timer = setTimeout(() => {
      const modal = overlayRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) focusable[0].focus();
    }, 50);

    // Capture-phase listener — intercepts ALL keystrokes before page receives them
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Tab trap
      if (e.key === "Tab") {
        const modal = overlayRef.current;
        if (!modal) return;
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const modal = (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "14px",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
          animation: "modalIn 0.18s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #374151",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 600,
              color: "#f9fafb",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f9fafb";
              e.currentTarget.style.background = "#374151";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
              e.currentTarget.style.background = "none";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", flexGrow: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 24px 20px",
              borderTop: "1px solid #374151",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------
const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div style={{ marginBottom: "14px" }}>
    <p
      style={{
        margin: "0 0 3px",
        fontSize: "12px",
        color: "#9ca3af",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </p>
    <p
      style={{ margin: 0, fontSize: "14px", color: "#f9fafb", fontWeight: 500 }}
    >
      {value}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const LecturerStudentPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  // Only ONE modal: view
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/users/students/by-program`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      const list = data.data || data;
      setStudents(list);
      applyFilters(list, searchTerm, facultyFilter, yearFilter, programFilter);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (
    list: Student[],
    search: string,
    faculty: string,
    year: string,
    program: string,
  ) => {
    let filtered = list;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (st) =>
          st.firstName.toLowerCase().includes(s) ||
          st.lastName.toLowerCase().includes(s) ||
          st.email.toLowerCase().includes(s) ||
          (st.studentId?.toLowerCase().includes(s) ?? false) ||
          st.program.toLowerCase().includes(s),
      );
    }
    if (faculty !== "all")
      filtered = filtered.filter((st) => st.faculty === faculty);
    if (year !== "all")
      filtered = filtered.filter((st) => String(st.yearOfStudy) === year);
    if (program !== "all")
      filtered = filtered.filter((st) => st.program === program);
    setFilteredStudents(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(students, value, facultyFilter, yearFilter, programFilter);
  };

  const handleFacultyFilter = (value: string) => {
    setFacultyFilter(value);
    applyFilters(students, searchTerm, value, yearFilter, programFilter);
  };

  const handleYearFilter = (value: string) => {
    setYearFilter(value);
    applyFilters(students, searchTerm, facultyFilter, value, programFilter);
  };

  const handleProgramFilter = (value: string) => {
    setProgramFilter(value);
    applyFilters(students, searchTerm, facultyFilter, yearFilter, value);
  };

  // Unique program list derived from the loaded students, optionally scoped to
  // the selected faculty — powers the Program sorting dropdown.
  const programOptions = Array.from(
    new Set(
      students
        .filter(
          (st) => facultyFilter === "all" || st.faculty === facultyFilter,
        )
        .map((st) => st.program)
        .filter(Boolean),
    ),
  ).sort();

  // -------------------------------------------------------------------------
  // Open view modal — blur background first
  // -------------------------------------------------------------------------
  const handleViewStudent = (student: Student) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedStudent(student);
    setViewModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // Badge helpers
  // -------------------------------------------------------------------------
  const yearGradient: Record<number, string> = {
    1: "linear-gradient(135deg,#2563eb,#0891b2)",
    2: "linear-gradient(135deg,#16a34a,#059669)",
    3: "linear-gradient(135deg,#d97706,#ea580c)",
    4: "linear-gradient(135deg,#7c3aed,#db2777)",
    5: "linear-gradient(135deg,#dc2626,#e11d48)",
  };

  const statusStyle = (isActive: boolean): React.CSSProperties => ({
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: 500,
    border: isActive
      ? "1px solid rgba(74,222,128,0.3)"
      : "1px solid rgba(248,113,113,0.3)",
    background: isActive ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
    color: isActive ? "#4ade80" : "#f87171",
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", background: "#111827", padding: "24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Header — view only, no Add button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              padding: "10px",
              borderRadius: "10px",
              background: "linear-gradient(135deg,#2563eb,#0891b2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 700,
                color: "#f9fafb",
              }}
            >
              Students Management
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              Total Students: {filteredStudents.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px 160px 200px",
            gap: "12px",
            marginBottom: "20px",
          }}
          className="lecturer-filter-grid"
        >
          <Input
            placeholder="Search by name, email, student ID, or program..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
          <Select value={facultyFilter} onValueChange={handleFacultyFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by faculty" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Faculties</SelectItem>
              {FACULTIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={handleYearFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
              <SelectItem value="5">Year 5</SelectItem>
            </SelectContent>
          </Select>
          <Select value={programFilter} onValueChange={handleProgramFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Programs</SelectItem>
              {programOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div
          style={{
            border: "1px solid #374151",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#1f2937",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #374151",
                    background: "#111827",
                  }}
                >
                  {[
                    "Student",
                    "Student ID",
                    "Faculty",
                    "Program",
                    "Year",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "12px 20px",
                        textAlign: i === 6 ? "right" : "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "48px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Loading students…
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "48px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr
                      key={student._id}
                      style={{
                        borderBottom:
                          idx < filteredStudents.length - 1
                            ? "1px solid #374151"
                            : "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {/* Student name + avatar */}
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg,#2563eb,#0891b2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#fff",
                            }}
                          >
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#e5e7eb",
                              }}
                            >
                              {student.firstName} {student.lastName}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "13px",
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.studentId || "N/A"}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "13px",
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.faculty}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "13px",
                          color: "#9ca3af",
                        }}
                      >
                        {student.program}
                      </td>
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#fff",
                            background:
                              yearGradient[student.yearOfStudy] ||
                              "linear-gradient(135deg,#4b5563,#374151)",
                          }}
                        >
                          Year {student.yearOfStudy}
                        </span>
                      </td>
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <span style={statusStyle(student.isActive)}>
                          {student.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* View only — no edit or delete */}
                      <td
                        style={{
                          padding: "14px 20px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          onClick={() => handleViewStudent(student)}
                          title="View student"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#60a5fa",
                            padding: "7px",
                            borderRadius: "7px",
                            display: "inline-flex",
                            alignItems: "center",
                            transition: "background 0.1s, color 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#374151";
                            e.currentTarget.style.color = "#93c5fd";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "none";
                            e.currentTarget.style.color = "#60a5fa";
                          }}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* VIEW MODAL — portal, fully isolated                                */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Student Details"
        footer={
          <button
            onClick={() => setViewModalOpen(false)}
            style={{
              background: "#374151",
              border: "none",
              borderRadius: "8px",
              padding: "9px 20px",
              color: "#f9fafb",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4b5563")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#374151")}
          >
            Close
          </button>
        }
      >
        {selectedStudent && (
          <div>
            {/* Avatar + name banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: "#111827",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#2563eb,#0891b2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {selectedStudent.firstName[0]}
                {selectedStudent.lastName[0]}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#f9fafb",
                  }}
                >
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {selectedStudent.email}
                </p>
              </div>
              {/* Status pill */}
              <span
                style={{
                  ...statusStyle(selectedStudent.isActive),
                  marginLeft: "auto",
                  flexShrink: 0,
                }}
              >
                {selectedStudent.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Two-column detail grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
              }}
            >
              <DetailRow
                label="Student ID"
                value={selectedStudent.studentId || "N/A"}
              />
              <DetailRow
                label="Year of Study"
                value={
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#fff",
                      background:
                        yearGradient[selectedStudent.yearOfStudy] || "#374151",
                    }}
                  >
                    Year {selectedStudent.yearOfStudy}
                  </span>
                }
              />
              <DetailRow label="Faculty" value={selectedStudent.faculty} />
              <DetailRow label="Program" value={selectedStudent.program} />
              {selectedStudent.createdAt && (
                <DetailRow
                  label="Joined"
                  value={new Date(
                    selectedStudent.createdAt,
                  ).toLocaleDateString()}
                />
              )}
              {selectedStudent.lastLogin && (
                <DetailRow
                  label="Last Login"
                  value={new Date(selectedStudent.lastLogin).toLocaleString()}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Responsive */}
      <style>{`
        @media (max-width: 640px) {
          .lecturer-filter-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default LecturerStudentPage;
