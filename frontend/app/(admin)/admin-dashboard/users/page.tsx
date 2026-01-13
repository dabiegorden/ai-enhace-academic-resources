"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Trash2, Eye, Plus, Edit } from "lucide-react";
import { toast } from "sonner";

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

const FACULTIES = [
  "Engineering",
  "Business",
  "Arts",
  "Science",
  "Health Sciences",
  "Law",
  "Education",
];

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Selected user
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

  // Fetch users
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

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

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

  const filterUsers = (userList: User[], search: string, role: string) => {
    let filtered = userList;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.studentId?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    if (role !== "all") {
      filtered = filtered.filter((user) => user.role === role);
    }

    setFilteredUsers(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterUsers(users, value, roleFilter);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    filterUsers(users, searchTerm, value);
  };

  // View user
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  // Delete user
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

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

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      const updatedUsers = users.filter((u) => u._id !== selectedUser._id);
      setUsers(updatedUsers);
      filterUsers(updatedUsers, searchTerm, roleFilter);
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to delete user");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(
        `${apiUrl}/users/${user._id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle user status");
      }

      const result = await response.json();
      const updatedUser = result.data;

      const updatedUsers = users.map((u) =>
        u._id === user._id ? updatedUser : u
      );
      setUsers(updatedUsers);
      filterUsers(updatedUsers, searchTerm, roleFilter);
      toast.success(
        `User ${
          updatedUser.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      toast.error("Failed to update user status");
      console.error(error);
    }
  };

  // Add/Edit user
  const handleOpenAddDialog = () => {
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
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
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
    setEditDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

    // Validate student-specific fields
    if (formData.role === "student") {
      if (!formData.faculty || !formData.program || !formData.yearOfStudy) {
        toast.error(
          "Faculty, program, and year of study are required for students"
        );
        return;
      }
    }

    // Validate lecturer-specific fields
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

      // Add password only for new users or if provided
      if (formData.password) {
        payload.password = formData.password;
      }

      // Add role-specific fields
      if (formData.role === "student") {
        if (formData.studentId) payload.studentId = formData.studentId;
        payload.faculty = formData.faculty;
        payload.program = formData.program;
        payload.yearOfStudy = parseInt(formData.yearOfStudy);
      } else if (formData.role === "lecturer") {
        payload.faculty = formData.faculty;
      }

      if (selectedUser) {
        // Edit user
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
          u._id === selectedUser._id ? updatedUser : u
        );
        setUsers(updatedUsers);
        filterUsers(updatedUsers, searchTerm, roleFilter);
        toast.success("User updated successfully");
        setEditDialogOpen(false);
      } else {
        // Add new user - use auth/register endpoint
        const response = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create user");
        }

        // Refresh users list
        await fetchUsers();
        toast.success("User created successfully");
        // 🔥 RESET FORM STATE
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
        setAddDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (selectedUser ? "Failed to update user" : "Failed to create user")
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  // Role badge styling
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "from-purple-600 to-pink-600",
      lecturer: "from-blue-600 to-cyan-600",
      student: "from-green-600 to-emerald-600",
    };
    return colors[role] || "from-gray-600 to-gray-600";
  };

  // Status badge styling
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Users Management</h1>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Users Table */}
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white bg-linear-to-r ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${getStatusBadgeColor(
                            user.isActive
                          )}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(user)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">First Name</p>
                  <p className="text-white font-medium">
                    {selectedUser.firstName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Last Name</p>
                  <p className="text-white font-medium">
                    {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Role</p>
                  <p className="text-white font-medium capitalize">
                    {selectedUser.role}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-white font-medium">
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                {selectedUser.studentId && (
                  <div>
                    <p className="text-gray-400 text-sm">Student ID</p>
                    <p className="text-white font-medium">
                      {selectedUser.studentId}
                    </p>
                  </div>
                )}
                {selectedUser.faculty && (
                  <div>
                    <p className="text-gray-400 text-sm">Faculty</p>
                    <p className="text-white font-medium">
                      {selectedUser.faculty}
                    </p>
                  </div>
                )}
                {selectedUser.program && (
                  <div>
                    <p className="text-gray-400 text-sm">Program</p>
                    <p className="text-white font-medium">
                      {selectedUser.program}
                    </p>
                  </div>
                )}
                {selectedUser.yearOfStudy && (
                  <div>
                    <p className="text-gray-400 text-sm">Year of Study</p>
                    <p className="text-white font-medium">
                      Year {selectedUser.yearOfStudy}
                    </p>
                  </div>
                )}
                {selectedUser.createdAt && (
                  <div>
                    <p className="text-gray-400 text-sm">Created At</p>
                    <p className="text-white font-medium">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedUser.lastLogin && (
                  <div>
                    <p className="text-gray-400 text-sm">Last Login</p>
                    <p className="text-white font-medium">
                      {new Date(selectedUser.lastLogin).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setViewDialogOpen(false)}
                className="hover:bg-gray-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {selectedUser?.firstName}{" "}
                {selectedUser?.lastName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={actionLoading}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog
          open={addDialogOpen || editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAddDialogOpen(false);
              setEditDialogOpen(false);
            }
          }}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Edit User" : "Add New User"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  First Name *
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    handleFormChange("firstName", e.target.value)
                  }
                  placeholder="Enter first name"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Last Name *
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleFormChange("lastName", e.target.value)}
                  placeholder="Enter last name"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="Enter email"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              {!selectedUser && (
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Password *
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      handleFormChange("password", e.target.value)
                    }
                    placeholder="Enter password (min 6 characters)"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Role *
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleFormChange("role", value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="lecturer">Lecturer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.role === "student" ||
                formData.role === "lecturer") && (
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Faculty *
                  </label>
                  <Select
                    value={formData.faculty}
                    onValueChange={(value) =>
                      handleFormChange("faculty", value)
                    }
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {FACULTIES.map((faculty) => (
                        <SelectItem key={faculty} value={faculty}>
                          {faculty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.role === "student" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Student ID
                    </label>
                    <Input
                      value={formData.studentId}
                      onChange={(e) =>
                        handleFormChange("studentId", e.target.value)
                      }
                      placeholder="Enter student ID"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Program *
                    </label>
                    <Input
                      value={formData.program}
                      onChange={(e) =>
                        handleFormChange("program", e.target.value)
                      }
                      placeholder="Enter program (e.g., Computer Science)"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Year of Study *
                    </label>
                    <Select
                      value={formData.yearOfStudy}
                      onValueChange={(value) =>
                        handleFormChange("yearOfStudy", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                        <SelectItem value="5">Year 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setAddDialogOpen(false);
                  setEditDialogOpen(false);
                }}
                disabled={actionLoading}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={actionLoading}
                className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {actionLoading
                  ? "Saving..."
                  : selectedUser
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminUsersPage;
