"use client";

import React, { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

// TypeScript Interfaces
interface LoginFormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      faculty?: string;
      program?: string;
      yearOfStudy?: number;
      profileImage?: string;
    };
    token: string;
  };
}

// Zod Schema for Login
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async () => {
    setErrors({});

    try {
      loginSchema.parse(formData);
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", formData.email);
        }

        toast.success(`Welcome back, ${data.data.user.firstName}!`);

        // Redirect based on role
        setTimeout(() => {
          if (data.data?.user.role === "admin") {
            router.push("/admin-dashboard");
          } else if (data.data?.user.role === "lecturer") {
            router.push("/lecturer-dashboard");
          } else {
            router.push("/student-dashboard");
          }
        }, 1000);
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FormErrors = {};
        error.issues.forEach((err) => {
          fieldErrors[err.path[0] as keyof FormErrors] = err.message;
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors in the form");
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 border border-gray-100">
          {/* Header Section */}
          <div className="text-center mb-8">
            <Image
              src="/assets/cuglogo.png"
              alt="CUG SmartLearn"
              className="h-24 mx-auto mb-4"
              width={100}
              height={100}
            />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`w-full px-4 py-3 rounded-xl border-2 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center">
                  <span className="mr-1">⚠</span> {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`w-full px-4 py-3 rounded-xl border-2 ${
                  errors.password ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center">
                  <span className="mr-1">⚠</span> {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 via-blue-700 to-blue-800 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
          {/* Register Link */}
          <div className="mt-8 text-center pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="text-orange-600 hover:text-orange-700 font-bold hover:underline"
              >
                Register as Student
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
