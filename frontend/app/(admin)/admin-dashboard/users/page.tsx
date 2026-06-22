"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Eye, Plus, Edit, X } from "lucide-react";
import { toast } from "sonner";
import {
  FACULTY_NAMES as FACULTIES,
  FACULTY_PROGRAMS,
} from "@/constants/faculties";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  isActive: boolean;
  studentId?: string;
  faculty?: string;
  program?: string;
  yearOfStudy?: number;
  profileImage?: string;
  createdAt?: string;
  lastLogin?: string;
}

// ---------------------------------------------------------------------------
// Custom Portal Modal
// Renders into document.body via a portal so it is 100% outside the page's
// React tree.  The overlay intercepts ALL pointer and keyboard events so
// nothing leaks through to background elements (e.g. the search input).
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
  maxWidth = "480px",
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  // Keep the latest onClose in a ref so the focus/keydown effect below does NOT
  // depend on it. Otherwise the parent passes a new onClose arrow on every
  // render (e.g. on each keystroke while typing in a form field), which would
  // re-run the effect and re-trigger the auto-focus timer — stealing focus
  // back to the first field after every character typed.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Trap focus inside modal and close on Escape
  useEffect(() => {
    if (!open) return;

    // Auto-focus first focusable element so keyboard never goes to background
    const timer = setTimeout(() => {
      const modal = overlayRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        firstFocusableRef.current = focusable[0];
        focusable[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Always stop propagation — no keystrokes escape the modal
      e.stopPropagation();
      if (e.key === "Escape") onCloseRef.current();
      // Tab trap
      if (e.key === "Tab") {
        const modal = overlayRef.current;
        if (!modal) return;
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Capture phase so we intercept before anything else
    document.addEventListener("keydown", handleKeyDown, true);
    // Prevent scroll on body
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const modal = (
    <div
      ref={overlayRef}
      // Overlay — intercepts all pointer events
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "12px",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
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
              fontSize: "18px",
              fontWeight: 600,
              color: "#f9fafb",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f9fafb";
              (e.currentTarget as HTMLButtonElement).style.background =
                "#374151";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
            aria-label="Close"
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
              padding: "16px 24px 20px",
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
    </div>
  );

  // Portal renders outside the page tree — no event leakage possible
  return ReactDOM.createPortal(modal, document.body);
};

// ---------------------------------------------------------------------------
// Shared form field styles
// ---------------------------------------------------------------------------
const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#d1d5db",
  marginBottom: "6px",
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "#374151",
  border: "1px solid #4b5563",
  borderRadius: "8px",
  padding: "9px 12px",
  color: "#f9fafb",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const fieldSelect: React.CSSProperties = {
  ...fieldInput,
  cursor: "pointer",
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: "32px",
};

const FieldGroup: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={fieldLabel}>
      {label} {required && <span style={{ color: "#f87171" }}>*</span>}
    </label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student" as "student" | "lecturer" | "admin",
    studentId: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      const usersList = data.data || data;
      setUsers(usersList);
      filterUsers(usersList, searchTerm, roleFilter);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = useCallback(
    (userList: User[], search: string, role: string) => {
      let filtered = userList;
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.firstName.toLowerCase().includes(s) ||
            u.lastName.toLowerCase().includes(s) ||
            u.email.toLowerCase().includes(s) ||
            (u.studentId?.toLowerCase().includes(s) ?? false),
        );
      }
      if (role !== "all") filtered = filtered.filter((u) => u.role === role);
      setFilteredUsers(filtered);
    },
    [],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterUsers(users, value, roleFilter);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    filterUsers(users, searchTerm, value);
  };

  // -------------------------------------------------------------------------
  // Modal openers — blur background before opening
  // -------------------------------------------------------------------------
  const blurBackground = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleViewUser = (user: User) => {
    blurBackground();
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    blurBackground();
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleOpenAddModal = () => {
    blurBackground();
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
      studentId: "",
      faculty: "",
      program: "",
      yearOfStudy: "",
    });
    setSelectedUser(null);
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    blurBackground();
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role,
      studentId: user.studentId || "",
      faculty: user.faculty || "",
      program: user.program || "",
      yearOfStudy: user.yearOfStudy?.toString() || "",
    });
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/users/${selectedUser._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete user");
      const updatedUsers = users.filter((u) => u._id !== selectedUser._id);
      setUsers(updatedUsers);
      filterUsers(updatedUsers, searchTerm, roleFilter);
      toast.success("User deleted successfully");
      setDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(
        `${apiUrl}/users/${user._id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to toggle user status");
      const result = await response.json();
      const updatedUser = result.data;
      const updatedUsers = users.map((u) =>
        u._id === user._id ? updatedUser : u,
      );
      setUsers(updatedUsers);
      filterUsers(updatedUsers, searchTerm, roleFilter);
      toast.success(
        `User ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      );
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!selectedUser && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }
    if (formData.role === "student") {
      if (!formData.faculty || !formData.program || !formData.yearOfStudy) {
        toast.error(
          "Faculty, program, and year of study are required for students",
        );
        return;
      }
    }
    if (formData.role === "lecturer" && !formData.faculty) {
      toast.error("Faculty is required for lecturers");
      return;
    }

    try {
      setActionLoading(true);
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) payload.password = formData.password;
      if (formData.role === "student") {
        if (formData.studentId) payload.studentId = formData.studentId;
        payload.faculty = formData.faculty;
        payload.program = formData.program;
        payload.yearOfStudy = parseInt(formData.yearOfStudy);
      } else if (formData.role === "lecturer") {
        payload.faculty = formData.faculty;
      }

      if (selectedUser) {
        const response = await fetch(`${apiUrl}/users/${selectedUser._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update user");
        }
        const result = await response.json();
        const updatedUser = result.data;
        const updatedUsers = users.map((u) =>
          u._id === selectedUser._id ? updatedUser : u,
        );
        setUsers(updatedUsers);
        filterUsers(updatedUsers, searchTerm, roleFilter);
        toast.success("User updated successfully");
        setEditModalOpen(false);
      } else {
        const response = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create user");
        }
        // Clear search so newly created user is immediately visible
        setSearchTerm("");
        setRoleFilter("all");
        await fetchUsers();
        toast.success("User created successfully");
        setAddModalOpen(false);
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (selectedUser ? "Failed to update user" : "Failed to create user"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Styling helpers
  // -------------------------------------------------------------------------
  const getRoleBadgeStyle = (role: string): React.CSSProperties => {
    const gradients: Record<string, string> = {
      admin: "linear-gradient(135deg,#7c3aed,#db2777)",
      lecturer: "linear-gradient(135deg,#2563eb,#0891b2)",
      student: "linear-gradient(135deg,#16a34a,#059669)",
    };
    return {
      display: "inline-flex",
      padding: "3px 10px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: 500,
      color: "#fff",
      background: gradients[role] || "linear-gradient(135deg,#4b5563,#4b5563)",
    };
  };

  const getStatusStyle = (isActive: boolean): React.CSSProperties => ({
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    border: isActive
      ? "1px solid rgba(74,222,128,0.3)"
      : "1px solid rgba(248,113,113,0.3)",
    background: isActive ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
    color: isActive ? "#4ade80" : "#f87171",
    transition: "opacity 0.15s",
  });

  // -------------------------------------------------------------------------
  // Add/Edit form (shared)
  // -------------------------------------------------------------------------
  const renderAddEditForm = () => (
    <div>
      <FieldGroup label="First Name" required>
        <input
          style={fieldInput}
          value={formData.firstName}
          onChange={(e) => handleFormChange("firstName", e.target.value)}
          placeholder="Enter first name"
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
        />
      </FieldGroup>
      <FieldGroup label="Last Name" required>
        <input
          style={fieldInput}
          value={formData.lastName}
          onChange={(e) => handleFormChange("lastName", e.target.value)}
          placeholder="Enter last name"
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
        />
      </FieldGroup>
      <FieldGroup label="Email" required>
        <input
          style={fieldInput}
          type="email"
          value={formData.email}
          onChange={(e) => handleFormChange("email", e.target.value)}
          placeholder="Enter email"
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
        />
      </FieldGroup>
      {!selectedUser && (
        <FieldGroup label="Password" required>
          <input
            style={fieldInput}
            type="password"
            value={formData.password}
            onChange={(e) => handleFormChange("password", e.target.value)}
            placeholder="Enter password (min 6 characters)"
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
          />
        </FieldGroup>
      )}
      <FieldGroup label="Role" required>
        <select
          style={fieldSelect}
          value={formData.role}
          onChange={(e) => handleFormChange("role", e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
        </select>
      </FieldGroup>

      {(formData.role === "student" || formData.role === "lecturer") && (
        <FieldGroup label="Faculty" required>
          <select
            style={fieldSelect}
            value={formData.faculty}
            onChange={(e) => {
              handleFormChange("faculty", e.target.value);
              handleFormChange("program", "");
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
          >
            <option value="">Select faculty</option>
            {FACULTIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FieldGroup>
      )}

      {formData.role === "student" && (
        <>
          <FieldGroup label="Student ID">
            <input
              style={fieldInput}
              value={formData.studentId}
              onChange={(e) => handleFormChange("studentId", e.target.value)}
              placeholder="Enter student ID"
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
            />
          </FieldGroup>
          <FieldGroup label="Program" required>
            {formData.faculty &&
            (FACULTY_PROGRAMS[formData.faculty]?.length ?? 0) > 0 ? (
              <select
                style={fieldSelect}
                value={formData.program}
                onChange={(e) => handleFormChange("program", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
              >
                <option value="">Select program</option>
                {(FACULTY_PROGRAMS[formData.faculty] ?? []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={{ ...fieldInput, opacity: !formData.faculty ? 0.5 : 1 }}
                value={formData.program}
                onChange={(e) => handleFormChange("program", e.target.value)}
                placeholder={
                  formData.faculty ? "Enter program" : "Select a faculty first"
                }
                disabled={!formData.faculty}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
              />
            )}
          </FieldGroup>
          <FieldGroup label="Year of Study" required>
            <select
              style={fieldSelect}
              value={formData.yearOfStudy}
              onChange={(e) => handleFormChange("yearOfStudy", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#4b5563")}
            >
              <option value="">Select year</option>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={String(y)}>
                  Year {y}
                </option>
              ))}
            </select>
          </FieldGroup>
        </>
      )}
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", background: "#111827", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
              color: "#f9fafb",
            }}
          >
            Users Management
          </h1>
          <button
            onClick={handleOpenAddModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg,#2563eb,#0891b2)",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px",
            gap: "12px",
            marginBottom: "20px",
          }}
          className="filter-grid"
        >
          <Input
            placeholder="Search by name, email, or student ID..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
          <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="lecturer">Lecturer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
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
                <tr style={{ borderBottom: "1px solid #374151" }}>
                  {["Name", "Email", "Role", "Status", "Actions"].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 20px",
                          textAlign: i === 4 ? "right" : "left",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#9ca3af",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background: "#111827",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr
                      key={user._id}
                      style={{
                        borderBottom:
                          idx < filteredUsers.length - 1
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
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "14px",
                          color: "#e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.firstName} {user.lastName}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "14px",
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.email}
                      </td>
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <span style={getRoleBadgeStyle(user.role)}>
                          {user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)}
                        </span>
                      </td>
                      <td
                        style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={getStatusStyle(user.isActive)}
                          onClick={() => handleToggleStatus(user)}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.opacity = "0.75")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.opacity = "1")
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          onClick={() => handleViewUser(user)}
                          title="View"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#60a5fa",
                            padding: "6px",
                            borderRadius: "6px",
                            marginRight: "4px",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#374151")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          title="Edit"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#fbbf24",
                            padding: "6px",
                            borderRadius: "6px",
                            marginRight: "4px",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#374151")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          title="Delete"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#f87171",
                            padding: "6px",
                            borderRadius: "6px",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#374151")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          <Trash2 size={16} />
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
      {/* VIEW MODAL                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="User Details"
        footer={
          <button
            onClick={() => setViewModalOpen(false)}
            style={{
              background: "#374151",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              color: "#f9fafb",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        }
      >
        {selectedUser && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {[
              ["First Name", selectedUser.firstName],
              ["Last Name", selectedUser.lastName],
              ["Email", selectedUser.email],
              ["Role", selectedUser.role],
              ["Status", selectedUser.isActive ? "Active" : "Inactive"],
              selectedUser.studentId
                ? ["Student ID", selectedUser.studentId]
                : null,
              selectedUser.faculty ? ["Faculty", selectedUser.faculty] : null,
              selectedUser.program ? ["Program", selectedUser.program] : null,
              selectedUser.yearOfStudy
                ? ["Year of Study", `Year ${selectedUser.yearOfStudy}`]
                : null,
              selectedUser.createdAt
                ? [
                    "Created At",
                    new Date(selectedUser.createdAt).toLocaleDateString(),
                  ]
                : null,
              selectedUser.lastLogin
                ? [
                    "Last Login",
                    new Date(selectedUser.lastLogin).toLocaleString(),
                  ]
                : null,
            ]
              .filter((item): item is [string, string] => item !== null)
              .map(([label, value]) => (
                <div key={label as string}>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#f9fafb",
                      fontWeight: 500,
                      textTransform: label === "Role" ? "capitalize" : "none",
                    }}
                  >
                    {value as string}
                  </p>
                </div>
              ))}
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* DELETE MODAL                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        maxWidth="420px"
        footer={
          <>
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={actionLoading}
              style={{
                background: "#374151",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                opacity: actionLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              style={{
                background: "#dc2626",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              {actionLoading ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p
          style={{
            margin: 0,
            color: "#d1d5db",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "#f9fafb" }}>
            {selectedUser?.firstName} {selectedUser?.lastName}
          </strong>
          ? This action cannot be undone.
        </p>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* ADD MODAL                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New User"
        footer={
          <>
            <button
              onClick={() => setAddModalOpen(false)}
              disabled={actionLoading}
              style={{
                background: "#374151",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                opacity: actionLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUser}
              disabled={actionLoading}
              style={{
                background: "linear-gradient(135deg,#2563eb,#0891b2)",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              {actionLoading ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        {renderAddEditForm()}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* EDIT MODAL                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
        footer={
          <>
            <button
              onClick={() => setEditModalOpen(false)}
              disabled={actionLoading}
              style={{
                background: "#374151",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                opacity: actionLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUser}
              disabled={actionLoading}
              style={{
                background: "linear-gradient(135deg,#2563eb,#0891b2)",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              {actionLoading ? "Saving…" : "Update"}
            </button>
          </>
        }
      >
        {renderAddEditForm()}
      </Modal>

      {/* Responsive tweak */}
      <style>{`
        @media (max-width: 640px) {
          .filter-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminUsersPage;
