"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Eye, Edit, Trash2, UserPlus, GraduationCap } from "lucide-react";
import { toast } from "sonner";

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

const FACULTIES = [
  "Engineering",
  "Business",
  "Arts",
  "Science",
  "Health Sciences",
  "Law",
  "Education",
];

const AdminStudentsPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    studentId: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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

      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }

      const data = await response.json();
      const studentsList = data.data || data;
      setStudents(studentsList);
      filterStudents(studentsList, searchTerm, facultyFilter);
    } catch (error) {
      toast.error("Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = (
    studentList: Student[],
    search: string,
    faculty: string
  ) => {
    let filtered = studentList;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.firstName.toLowerCase().includes(searchLower) ||
          student.lastName.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower) ||
          (student.studentId?.toLowerCase().includes(searchLower) ?? false) ||
          student.program.toLowerCase().includes(searchLower)
      );
    }

    if (faculty !== "all") {
      filtered = filtered.filter((student) => student.faculty === faculty);
    }

    setFilteredStudents(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterStudents(students, value, facultyFilter);
  };

  const handleFacultyFilterChange = (value: string) => {
    setFacultyFilter(value);
    filterStudents(students, searchTerm, value);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudent) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/users/${selectedStudent._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete student");
      }

      const updatedStudents = students.filter(
        (s) => s._id !== selectedStudent._id
      );
      setStudents(updatedStudents);
      filterStudents(updatedStudents, searchTerm, facultyFilter);
      toast.success("Student deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      toast.error("Failed to delete student");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (student: Student) => {
    try {
      const response = await fetch(
        `${apiUrl}/users/${student._id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle student status");
      }

      const result = await response.json();
      const updatedStudent = result.data;

      const updatedStudents = students.map((s) =>
        s._id === student._id ? updatedStudent : s
      );
      setStudents(updatedStudents);
      filterStudents(updatedStudents, searchTerm, facultyFilter);
      toast.success(
        `Student ${
          updatedStudent.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      toast.error("Failed to update student status");
      console.error(error);
    }
  };

  const handleOpenAddDialog = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      studentId: "",
      faculty: "",
      program: "",
      yearOfStudy: "",
    });
    setSelectedStudent(null);
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (student: Student) => {
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      password: "",
      studentId: student.studentId || "",
      faculty: student.faculty,
      program: student.program,
      yearOfStudy: student.yearOfStudy.toString(),
    });
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveStudent = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.faculty || !formData.program || !formData.yearOfStudy) {
      toast.error("Faculty, program, and year of study are required");
      return;
    }

    if (!selectedStudent && !formData.password) {
      toast.error("Password is required for new students");
      return;
    }

    try {
      setActionLoading(true);
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: "student",
        faculty: formData.faculty,
        program: formData.program,
        yearOfStudy: Number.parseInt(formData.yearOfStudy),
      };

      if (formData.studentId) {
        payload.studentId = formData.studentId;
      }

      if (formData.password) {
        payload.password = formData.password;
      }

      if (selectedStudent) {
        const response = await fetch(`${apiUrl}/users/${selectedStudent._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update student");
        }

        await fetchStudents();
        toast.success("Student updated successfully");
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
          throw new Error(errorData.message || "Failed to create student");
        }

        await fetchStudents();
        toast.success("Student created successfully");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          studentId: "",
          faculty: "",
          program: "",
          yearOfStudy: "",
        });

        setAddDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (selectedStudent
            ? "Failed to update student"
            : "Failed to create student")
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

  const getYearBadgeColor = (year: number) => {
    const colors: Record<number, string> = {
      1: "from-blue-600 to-cyan-600",
      2: "from-green-600 to-emerald-600",
      3: "from-yellow-600 to-orange-600",
      4: "from-purple-600 to-pink-600",
      5: "from-red-600 to-rose-600",
    };
    return colors[year] || "from-gray-600 to-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-blue-600 to-cyan-600 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Students Management
              </h1>
              <p className="text-gray-400 text-sm">
                Total Students: {filteredStudents.length}
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search students by name, email, student ID, or program..."
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

        {/* Students Table */}
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Year
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
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading students...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-linear-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-200">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-gray-400">Student</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {student.studentId || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {student.faculty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {student.program}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white bg-linear-to-r ${getYearBadgeColor(
                            student.yearOfStudy
                          )}`}
                        >
                          Year {student.yearOfStudy}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(student)}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${getStatusBadgeColor(
                            student.isActive
                          )}`}
                        >
                          {student.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStudent(student)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(student)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(student)}
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
              <DialogTitle>Student Details</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">First Name</p>
                    <p className="text-white font-medium">
                      {selectedStudent.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Name</p>
                    <p className="text-white font-medium">
                      {selectedStudent.lastName}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">
                    {selectedStudent.email}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Student ID</p>
                  <p className="text-white font-medium">
                    {selectedStudent.studentId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Faculty</p>
                  <p className="text-white font-medium">
                    {selectedStudent.faculty}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Program</p>
                  <p className="text-white font-medium">
                    {selectedStudent.program}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Year of Study</p>
                  <p className="text-white font-medium">
                    Year {selectedStudent.yearOfStudy}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-white font-medium">
                    {selectedStudent.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                {selectedStudent.createdAt && (
                  <div>
                    <p className="text-gray-400 text-sm">Joined</p>
                    <p className="text-white font-medium">
                      {new Date(selectedStudent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedStudent.lastLogin && (
                  <div>
                    <p className="text-gray-400 text-sm">Last Login</p>
                    <p className="text-white font-medium">
                      {new Date(selectedStudent.lastLogin).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setViewDialogOpen(false)}
                variant="ghost"
                className="text-gray-300 hover:bg-gray-700"
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
              <DialogTitle>Delete Student</DialogTitle>
            </DialogHeader>
            <p className="text-gray-300">
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </span>
              ? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                onClick={() => setDeleteDialogOpen(false)}
                variant="ghost"
                className="text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
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
                {selectedStudent ? "Edit Student" : "Add New Student"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    First Name *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      handleFormChange("firstName", e.target.value)
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Last Name *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      handleFormChange("lastName", e.target.value)
                    }
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                  placeholder="Email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Password {!selectedStudent && "*"}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange("password", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                  placeholder={
                    selectedStudent
                      ? "Leave blank to keep current password"
                      : "Password"
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Student ID
                </label>
                <Input
                  value={formData.studentId}
                  onChange={(e) =>
                    handleFormChange("studentId", e.target.value)
                  }
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                  placeholder="Student ID (optional)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Faculty *
                </label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) => handleFormChange("faculty", value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {FACULTIES.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Program *
                </label>
                <Input
                  value={formData.program}
                  onChange={(e) => handleFormChange("program", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                  placeholder="Program"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Year of Study *
                </label>
                <Select
                  value={formData.yearOfStudy}
                  onValueChange={(value) =>
                    handleFormChange("yearOfStudy", value)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                    <SelectItem value="5">Year 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setAddDialogOpen(false);
                  setEditDialogOpen(false);
                }}
                variant="ghost"
                className="text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStudent}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminStudentsPage;
