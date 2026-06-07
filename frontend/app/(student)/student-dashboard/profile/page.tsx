"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  AlertCircle,
  Save,
  IdCard,
  Calendar,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES as FACULTIES, FACULTY_PROGRAMS } from "@/constants/faculties";
import Image from "next/image";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const YEARS = [1, 2, 3, 4, 5];

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  faculty?: string;
  program?: string;
  yearOfStudy?: number;
  profileImage?: string;
  studentId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
  accent = "blue",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: "blue" | "orange" | "green" | "red";
}) {
  const accents = {
    blue: "from-blue-500/20 to-blue-500/0 border-blue-500/20",
    orange: "from-orange-500/20 to-orange-500/0 border-orange-500/20",
    green: "from-green-500/20 to-green-500/0 border-green-500/20",
    red: "from-red-500/20 to-red-500/0 border-red-500/20",
  };
  const iconColors = {
    blue: "text-blue-400",
    orange: "text-orange-400",
    green: "text-green-400",
    red: "text-red-400",
  };
  return (
    <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
      <div
        className={`px-6 py-4 border-b border-gray-700/50 bg-linear-to-r ${accents[accent]}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={iconColors[accent]}>{icon}</span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const selectCls =
  "w-full rounded-xl bg-gray-900/70 border border-gray-700 text-white px-4 py-3 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/30 transition-all";

// ─── Password Field ────────────────────────────────────────────────────────────
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "••••••••"}
          className={`${inputCls} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

// ─── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];
  const textColors = [
    "",
    "text-red-400",
    "text-amber-400",
    "text-blue-400",
    "text-green-400",
  ];

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-gray-700"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[score]}`}>
        {labels[score]}
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const StudentsProfilePage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState<number | "">("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem("token") || "";

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const u = data.data;
        setUser(u);
        setFirstName(u.firstName || "");
        setLastName(u.lastName || "");
        setFaculty(u.faculty || "");
        setProgram(u.program || "");
        setYearOfStudy(u.yearOfStudy || "");
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Save profile info ──────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${apiUrl}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          faculty,
          program,
          yearOfStudy: yearOfStudy || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${apiUrl}/users/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password changed successfully!");
      } else {
        toast.error(data.message || "Failed to change password");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Upload avatar ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploadingAvatar(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${apiUrl}/users/profile-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) =>
          prev ? { ...prev, profileImage: data.data.profileImage } : prev,
        );
        toast.success("Profile photo updated!");
      } else {
        toast.error(data.message || "Upload failed");
        setAvatarPreview(null);
      }
    } catch {
      toast.error("Upload failed");
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getInitials = () =>
    user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "?";

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

  const roleBadge: Record<string, string> = {
    student: "bg-green-500/15 text-green-400 border-green-500/30",
    lecturer: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    admin: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const avatarSrc = avatarPreview || user.profileImage || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-linear-to-br from-gray-800 via-gray-800/90 to-gray-900">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-linear-to-br from-blue-500/10 to-orange-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-orange-500/40 ring-offset-2 ring-offset-gray-800">
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-blue-500 to-orange-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {getInitials()}
                    </span>
                  </div>
                )}
              </div>
              {/* Camera button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {isUploadingAvatar ? (
                  <div className="h-3 w-3 border-2 border-gray-600 border-t-orange-400 rounded-full animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-gray-300" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {user.firstName} {user.lastName}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                    roleBadge[user.role] || roleBadge.student
                  }`}
                >
                  {user.role}
                </span>
                {user.isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{user.email}</p>
              {user.studentId && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <IdCard className="h-3 w-3" />
                  {user.studentId}
                </p>
              )}
            </div>

            {/* Meta stats */}
            <div className="hidden sm:flex flex-col gap-2 text-right shrink-0">
              <div className="text-xs text-gray-500 flex items-center justify-end gap-1.5">
                <Calendar className="h-3 w-3" />
                Joined {formatDate(user.createdAt)}
              </div>
              {user.lastLogin && (
                <div className="text-xs text-gray-500 flex items-center justify-end gap-1.5">
                  <Shield className="h-3 w-3" />
                  Last login {formatDate(user.lastLogin)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid: Personal Info + Academic Info ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <SectionCard
          title="Personal Information"
          icon={<User className="h-4 w-4" />}
          accent="blue"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={inputCls}
                />
              </Field>
              <Field label="Last Name">
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={user.email}
                  disabled
                  className={`${inputCls} pl-10 opacity-50 cursor-not-allowed`}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Email cannot be changed. Contact admin if needed.
              </p>
            </Field>

            {user.studentId && (
              <Field label="Student ID">
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    value={user.studentId}
                    disabled
                    className={`${inputCls} pl-10 opacity-50 cursor-not-allowed`}
                  />
                </div>
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Academic Info */}
        <SectionCard
          title="Academic Information"
          icon={<GraduationCap className="h-4 w-4" />}
          accent="orange"
        >
          <div className="space-y-4">
            <Field label="Faculty">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                <select
                  value={faculty}
                  onChange={(e) => {
                    setFaculty(e.target.value);
                    setProgram("");
                  }}
                  className={`${selectCls} pl-10`}
                >
                  <option value="" className="bg-gray-900">
                    Select faculty
                  </option>
                  {FACULTIES.map((f) => (
                    <option key={f} value={f} className="bg-gray-900">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            {user.role === "student" && (
              <>
                <Field label="Program / Course">
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    {faculty && FACULTY_PROGRAMS[faculty]?.length > 0 ? (
                      <select
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        className={`${selectCls} pl-10`}
                      >
                        <option value="" className="bg-gray-900">
                          Select program
                        </option>
                        {FACULTY_PROGRAMS[faculty].map((p) => (
                          <option key={p} value={p} className="bg-gray-900">
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        placeholder={
                          faculty ? "e.g. Computer Science" : "Select a faculty first"
                        }
                        disabled={!faculty}
                        className={`${inputCls} pl-10`}
                      />
                    )}
                  </div>
                </Field>

                <Field label="Year of Study">
                  <select
                    value={yearOfStudy}
                    onChange={(e) =>
                      setYearOfStudy(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className={selectCls}
                  >
                    <option value="" className="bg-gray-900">
                      Select year
                    </option>
                    {YEARS.map((y) => (
                      <option key={y} value={y} className="bg-gray-900">
                        Year {y}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Save Profile Button ──────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-blue-600 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSavingProfile ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Profile
            </>
          )}
        </button>
      </div>

      {/* ── Change Password ──────────────────────────────────── */}
      <SectionCard
        title="Change Password"
        icon={<Lock className="h-4 w-4" />}
        accent="red"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Your current password"
          />
          <div className="space-y-1">
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 6 characters"
            />
            <PasswordStrength password={newPassword} />
          </div>
          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat new password"
          />
        </div>

        {/* Match indicator */}
        {confirmPassword && (
          <div
            className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
              newPassword === confirmPassword
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {newPassword === confirmPassword ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Passwords match
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords do not match
              </>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={isSavingPassword}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingPassword ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Update Password
              </>
            )}
          </button>
        </div>
      </SectionCard>

      {/* ── Account Info (read-only) ─────────────────────────── */}
      <SectionCard
        title="Account Details"
        icon={<Shield className="h-4 w-4" />}
        accent="green"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Account Status",
              value: user.isActive ? "Active" : "Inactive",
              color: user.isActive ? "text-green-400" : "text-red-400",
            },
            {
              label: "Role",
              value: user.role.charAt(0).toUpperCase() + user.role.slice(1),
              color: "text-white",
            },
            {
              label: "Member Since",
              value: formatDate(user.createdAt),
              color: "text-gray-300",
            },
            {
              label: "Last Login",
              value: formatDate(user.lastLogin),
              color: "text-gray-300",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/40"
            >
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-sm font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default StudentsProfilePage;
