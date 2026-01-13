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
import { Eye, Edit, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface Lecturer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  faculty: string;
  isActive: boolean;
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

const AdminLecturersPage = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Selected lecturer
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(
    null
  );
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    faculty: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/users/lecturers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch lecturers");
      }

      const data = await response.json();
      const lecturersList = data.data || data;
      setLecturers(lecturersList);
      filterLecturers(lecturersList, searchTerm, facultyFilter);
    } catch (error) {
      toast.error("Failed to load lecturers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterLecturers = (
    lecturerList: Lecturer[],
    search: string,
    faculty: string
  ) => {
    let filtered = lecturerList;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (lecturer) =>
          lecturer.firstName.toLowerCase().includes(searchLower) ||
          lecturer.lastName.toLowerCase().includes(searchLower) ||
          lecturer.email.toLowerCase().includes(searchLower) ||
          lecturer.faculty.toLowerCase().includes(searchLower)
      );
    }

    if (faculty !== "all") {
      filtered = filtered.filter((lecturer) => lecturer.faculty === faculty);
    }

    setFilteredLecturers(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterLecturers(lecturers, value, facultyFilter);
  };

  const handleFacultyFilterChange = (value: string) => {
    setFacultyFilter(value);
    filterLecturers(lecturers, searchTerm, value);
  };

  const handleViewLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLecturer) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/users/${selectedLecturer._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete lecturer");
      }

      const updatedLecturers = lecturers.filter(
        (l) => l._id !== selectedLecturer._id
      );
      setLecturers(updatedLecturers);
      filterLecturers(updatedLecturers, searchTerm, facultyFilter);
      toast.success("Lecturer deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedLecturer(null);
    } catch (error) {
      toast.error("Failed to delete lecturer");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (lecturer: Lecturer) => {
    try {
      const response = await fetch(
        `${apiUrl}/users/${lecturer._id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle lecturer status");
      }

      const result = await response.json();
      const updatedLecturer = result.data;

      const updatedLecturers = lecturers.map((l) =>
        l._id === lecturer._id ? updatedLecturer : l
      );
      setLecturers(updatedLecturers);
      filterLecturers(updatedLecturers, searchTerm, facultyFilter);
      toast.success(
        `Lecturer ${
          updatedLecturer.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      toast.error("Failed to update lecturer status");
      console.error(error);
    }
  };

  const handleOpenAddDialog = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      faculty: "",
    });
    setSelectedLecturer(null);
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (lecturer: Lecturer) => {
    setFormData({
      firstName: lecturer.firstName,
      lastName: lecturer.lastName,
      email: lecturer.email,
      password: "",
      faculty: lecturer.faculty,
    });
    setSelectedLecturer(lecturer);
    setEditDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveLecturer = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.faculty) {
      toast.error("Faculty is required");
      return;
    }

    if (!selectedLecturer && !formData.password) {
      toast.error("Password is required for new lecturers");
      return;
    }

    try {
      setActionLoading(true);
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: "lecturer",
        faculty: formData.faculty,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (selectedLecturer) {
        const response = await fetch(
          `${apiUrl}/users/${selectedLecturer._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update lecturer");
        }

        await fetchLecturers();
        toast.success("Lecturer updated successfully");
        setEditDialogOpen(false);
      } else {
        const response = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create lecturer");
        }

        await fetchLecturers();
        toast.success("Lecturer created successfully");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          faculty: "",
        });
        setSelectedLecturer(null);
        setAddDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (selectedLecturer
            ? "Failed to update lecturer"
            : "Failed to create lecturer")
      );
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getFacultyColor = (faculty: string) => {
    const colors: Record<string, string> = {
      Engineering: "from-blue-600 to-cyan-600",
      Business: "from-green-600 to-emerald-600",
      Arts: "from-purple-600 to-pink-600",
      Science: "from-yellow-600 to-orange-600",
      "Health Sciences": "from-red-600 to-rose-600",
      Law: "from-indigo-600 to-violet-600",
      Education: "from-teal-600 to-cyan-600",
    };
    return colors[faculty] || "from-gray-600 to-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-purple-600 to-pink-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Lecturers Management
              </h1>
              <p className="text-gray-400 text-sm">
                Total Lecturers: {filteredLecturers.length}
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Lecturer
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search lecturers by name, email, or faculty..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
          <Select
            value={facultyFilter}
            onValueChange={handleFacultyFilterChange}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by faculty" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Faculties</SelectItem>
              {FACULTIES.map((faculty) => (
                <SelectItem key={faculty} value={faculty}>
                  {faculty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lecturers Table */}
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lecturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Login
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
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading lecturers...
                    </td>
                  </tr>
                ) : filteredLecturers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No lecturers found
                    </td>
                  </tr>
                ) : (
                  filteredLecturers.map((lecturer) => (
                    <tr
                      key={lecturer._id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-linear-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {lecturer.firstName[0]}
                              {lecturer.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-200">
                              {lecturer.firstName} {lecturer.lastName}
                            </div>
                            <div className="text-sm text-gray-400">
                              Lecturer
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {lecturer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white bg-linear-to-r ${getFacultyColor(
                            lecturer.faculty
                          )}`}
                        >
                          {lecturer.faculty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(lecturer)}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${getStatusBadgeColor(
                            lecturer.isActive
                          )}`}
                        >
                          {lecturer.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {lecturer.lastLogin
                          ? new Date(lecturer.lastLogin).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLecturer(lecturer)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(lecturer)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(lecturer)}
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
              <DialogTitle>Lecturer Details</DialogTitle>
            </DialogHeader>
            {selectedLecturer && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">First Name</p>
                    <p className="text-white font-medium">
                      {selectedLecturer.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Name</p>
                    <p className="text-white font-medium">
                      {selectedLecturer.lastName}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">
                    {selectedLecturer.email}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Faculty</p>
                  <p className="text-white font-medium">
                    {selectedLecturer.faculty}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-white font-medium">
                    {selectedLecturer.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                {selectedLecturer.createdAt && (
                  <div>
                    <p className="text-gray-400 text-sm">Joined</p>
                    <p className="text-white font-medium">
                      {new Date(
                        selectedLecturer.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedLecturer.lastLogin && (
                  <div>
                    <p className="text-gray-400 text-sm">Last Login</p>
                    <p className="text-white font-medium">
                      {new Date(selectedLecturer.lastLogin).toLocaleString()}
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

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Lecturer</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {selectedLecturer?.firstName}{" "}
                {selectedLecturer?.lastName}? This action cannot be undone.
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
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedLecturer ? "Edit Lecturer" : "Add New Lecturer"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    First Name *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      handleFormChange("firstName", e.target.value)
                    }
                    placeholder="First name"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Last Name *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      handleFormChange("lastName", e.target.value)
                    }
                    placeholder="Last name"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="lecturer@example.com"
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              {!selectedLecturer && (
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
                    placeholder="Min 6 characters"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Faculty *
                </label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) => handleFormChange("faculty", value)}
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
                onClick={handleSaveLecturer}
                disabled={actionLoading}
                className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {actionLoading
                  ? "Saving..."
                  : selectedLecturer
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

export default AdminLecturersPage;
